import { makeAutoObservable, runInAction } from 'mobx';
import {
  fetchProducts,
  getProductById,
  createProduct,
  updateProductById,
  deleteProductById,
  NotFoundError,
} from '../api/products';
import { notifySuccess, notifyError } from '../services/notifications';

export interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
  thumbnail: string;
  description?: string;
}

type LocalPatch = Product | 'deleted';

class ProductsStore {
  products: Product[] = [];
  total = 0;
  isLoading = false;
  listError = '';

  selectedProduct: Product | null = null;
  isProductLoading = false;
  productError = '';
  productNotFound = false;

  isDeleting = false;

  private localPatches = new Map<number, LocalPatch>();

  private createdIds = new Set<number>();

  private listAbortController: AbortController | null = null;
  private productAbortController: AbortController | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  private matchesFilters(p: Product, searchQuery: string, category: string): boolean {
    if (category && p.category !== category) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }

  private applyPatches(
    serverProducts: Product[],
    searchQuery: string,
    category: string,
    page: number,
    limit: number,
    serverTotal: number
  ): Product[] {
    const skip = (page - 1) * limit;

    const aliveServerProducts = serverProducts
      .filter((p) => this.localPatches.get(p.id) !== 'deleted')
      .map((p) => {
        const patch = this.localPatches.get(p.id);
        return patch && patch !== 'deleted' ? { ...p, ...patch } : p;
      });

    const createdMatched = Array.from(this.localPatches.entries())
      .filter(([id, patch]) => patch !== 'deleted' && this.createdIds.has(id))
      .map(([, patch]) => patch as Product)
      .filter((p) => this.matchesFilters(p, searchQuery, category))
      .sort((a, b) => a.id - b.id);

    let localItemsForPage: Product[] = [];

    if (skip < serverTotal) {
      if (skip + limit > serverTotal) {
        const itemsToFill = limit - serverProducts.length;
        localItemsForPage = createdMatched.slice(0, itemsToFill);
      }
    } else {
      const localStartIndex = skip - serverTotal;
      localItemsForPage = createdMatched.slice(localStartIndex, localStartIndex + limit);
    }

    return [...aliveServerProducts, ...localItemsForPage];
  }

  private sortProducts(products: Product[], sort: string): Product[] {
    if (!sort) return products;
    const [sortBy, order] = sort.split('_') as [keyof Product, 'asc' | 'desc'];
    const dir = order === 'desc' ? -1 : 1;

    return [...products].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * dir;
      }
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }

  async fetchProductsList(
    page: number,
    limit: number,
    searchQuery: string = '',
    category: string = '',
    sort: string = ''
  ) {
    this.isLoading = true;
    this.listError = '';

    if (this.listAbortController) this.listAbortController.abort();
    this.listAbortController = new AbortController();

    try {
      const data = await fetchProducts({
        page,
        limit,
        searchQuery,
        category,
        sort,
        signal: this.listAbortController.signal,
      });

      runInAction(() => {
        const merged = this.applyPatches(data.products, searchQuery, category, page, limit, data.total);
        this.products = this.sortProducts(merged, sort);

        const createdMatchedCount = Array.from(this.localPatches.entries())
          .filter(([id, patch]) => patch !== 'deleted' && this.createdIds.has(id))
          .map(([, patch]) => patch as Product)
          .filter((p) => this.matchesFilters(p, searchQuery, category)).length;
          
        const deletedCount = Array.from(this.localPatches.entries())
          .filter(([, patch]) => patch === 'deleted').length;

        this.total = Math.max(0, data.total + createdMatchedCount - deletedCount);
        this.isLoading = false;
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      runInAction(() => {
        this.listError = err.message;
        this.isLoading = false;
      });
    }
  }

  async fetchSingleProduct(id: string) {
    const numId = Number(id);
    const patch = this.localPatches.get(numId);

    this.isProductLoading = true;
    this.productError = '';
    this.productNotFound = false;
    this.selectedProduct = null;

    if (patch === 'deleted') {
      runInAction(() => {
        this.productNotFound = true;
        this.isProductLoading = false;
      });
      return;
    }

    // Если товар был создан самостоятельно, сервер о нём не знает, Берем его сразу из локального кэша и прерываем функцию, минуя сеть
    if (this.createdIds.has(numId) && patch) {
      runInAction(() => {
        this.selectedProduct = patch as Product;
        this.isProductLoading = false;
      });
      return;
    }

    if (this.productAbortController) this.productAbortController.abort();
    this.productAbortController = new AbortController();

    try {
      const data = await getProductById(id, this.productAbortController.signal);

      runInAction(() => {
        this.selectedProduct = patch ? { ...data, ...patch } : data;
        this.isProductLoading = false;
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      if (err instanceof NotFoundError && patch) {
        runInAction(() => {
          this.selectedProduct = patch as Product;
          this.isProductLoading = false;
        });
        return;
      }

      runInAction(() => {
        if (err instanceof NotFoundError) {
          this.productNotFound = true;
        } else {
          this.productError = err.message;
        }
        this.isProductLoading = false;
      });
    }
  }

  // --- CRUD ---

  async addProduct(newProduct: Partial<Product>) {
    try {
      const data = await createProduct(newProduct);
      const created: Product = { ...(newProduct as Product), ...(data as Product), id: Date.now() };
      runInAction(() => {
        this.localPatches.set(created.id, created);
        this.createdIds.add(created.id);
      });
      notifySuccess('Товар успешно создан');
      return created;
    } catch (err: any) {
      notifyError(err.message);
      throw err;
    }
  }

  async updateProduct(id: number, updatedFields: Partial<Product>) {
    try {
      let data = {};
      
      // Если товар создан самостоятельно, сервер про него не знает, пропускаем API-запрос, чтобы не получить ошибку
      if (!this.createdIds.has(id)) {
        data = await updateProductById(id, updatedFields);
      }

      runInAction(() => {
        const existing = this.products.find((p) => p.id === id) ?? this.selectedProduct ?? this.localPatches.get(id) ?? undefined;
        const merged: Product = { ...(existing as Product), ...(data as Product), ...updatedFields, id };
        
        this.localPatches.set(id, merged);
        const index = this.products.findIndex((p) => p.id === id);
        if (index !== -1) this.products[index] = merged;
        if (this.selectedProduct?.id === id) this.selectedProduct = merged;
      });
      notifySuccess('Изменения сохранены');
    } catch (err: any) {
      notifyError(err.message);
      throw err;
    }
  }

  async deleteProduct(id: number) {
    this.isDeleting = true;
    try {
      // Не дергаем сервер при удалении локального товара, который создал сам
      if (!this.createdIds.has(id)) {
        await deleteProductById(id);
      }

      runInAction(() => {
        this.localPatches.set(id, 'deleted');
        this.products = this.products.filter((p) => p.id !== id);
        this.total = Math.max(0, this.total - 1);
        if (this.selectedProduct?.id === id) {
          this.selectedProduct = null;
        }
        this.isDeleting = false;
      });
      notifySuccess('Товар успешно удалён');
    } catch (err: any) {
      runInAction(() => {
        this.isDeleting = false;
      });
      notifyError(err.message);
      throw err;
    }
  }

  resetLocalPatches() {
    this.localPatches.clear();
    this.createdIds.clear();
  }
}

export const productsStore = new ProductsStore();
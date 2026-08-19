import { describe, it, expect, beforeEach, vi } from 'vitest';
import { productsStore } from './productsStore';

vi.mock('antd', () => ({
  notification: { success: vi.fn(), error: vi.fn() }
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

describe('ProductsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsStore.products = [];
    productsStore.resetLocalPatches();
  });

  it('должен успешно удалять товар из локального массива', async () => {
    productsStore.products = [
      { id: 1, title: 'Товар 1', category: 'smartphones', price: 10, stock: 5, rating: 5, thumbnail: '' },
      { id: 2, title: 'Товар 2', category: 'laptops', price: 20, stock: 5, rating: 5, thumbnail: '' }
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ isDeleted: true })
    } as unknown as Response);

    await productsStore.deleteProduct(1);

    expect(productsStore.products.length).toBe(1); 
    expect(productsStore.products[0].id).toBe(2);  
  });

  it('должен генерировать уникальный временный ID при создании товара', async () => {
    const newProductData = { title: 'Новый Смартфон', category: 'smartphones', price: 999, stock: 10, rating: 5, description: '', thumbnail: '' };
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...newProductData, id: 101 })
    } as unknown as Response);

    const created = await productsStore.addProduct(newProductData);

    expect(created.title).toBe('Новый Смартфон');
    expect(created.id).toBeGreaterThan(1000000); 
  });

  it('должен сбрасывать isDeleting после успешного удаления', async () => {
    productsStore.products = [
      { id: 1, title: 'Товар 1', category: 'smartphones', price: 10, stock: 5, rating: 5, thumbnail: '' },
    ];
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ isDeleted: true }) } as unknown as Response);

    const promise = productsStore.deleteProduct(1);
    expect(productsStore.isDeleting).toBe(true);
    await promise;
    expect(productsStore.isDeleting).toBe(false);
  });

  it('должен помечать productNotFound при 404, не смешивая с productError', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as unknown as Response);

    await productsStore.fetchSingleProduct('999');

    expect(productsStore.productNotFound).toBe(true);
    expect(productsStore.productError).toBe('');
  });

  it('должен писать сетевую ошибку карточки в productError, не трогая productNotFound', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as unknown as Response);

    await productsStore.fetchSingleProduct('1');

    expect(productsStore.productNotFound).toBe(false);
    expect(productsStore.productError).toBe('Не удалось загрузить карточку товара');
  });

  it('Не должен "воскрешать" удалённый товар при повторном fetchProductsList', async () => {
    productsStore.products = [
      { id: 12, title: 'Товар 12', category: 'smartphones', price: 10, stock: 5, rating: 5, thumbnail: '' },
    ];
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ isDeleted: true }) } as unknown as Response);
    await productsStore.deleteProduct(12);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [{ id: 12, title: 'Товар 12', category: 'smartphones', price: 10, stock: 5, rating: 5, thumbnail: '' }],
        total: 1,
      }),
    } as unknown as Response);

    await productsStore.fetchProductsList(1, 10);

    expect(productsStore.products.find((p) => p.id === 12)).toBeUndefined();
  });

  it('Не должен "воскрешать" удалённый товар при повторном fetchSingleProduct', async () => {
    productsStore.products = [
      { id: 12, title: 'Товар 12', category: 'smartphones', price: 10, stock: 5, rating: 5, thumbnail: '' },
    ];
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ isDeleted: true }) } as unknown as Response);
    await productsStore.deleteProduct(12);

    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 12, title: 'Товар 12', category: 'smartphones', price: 10, stock: 5, rating: 5, thumbnail: '' }),
    } as unknown as Response);

    await productsStore.fetchSingleProduct('12');

    expect(productsStore.productNotFound).toBe(true);
    expect(productsStore.selectedProduct).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('должен показывать локально отредактированные поля при старых ответах сервера', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 5, title: 'Старое название', category: 'smartphones', price: 10, stock: 5, rating: 5, thumbnail: '' }),
    } as unknown as Response);
    await productsStore.updateProduct(5, { title: 'Новое название' });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 5, title: 'Старое название', category: 'smartphones', price: 10, stock: 5, rating: 5, thumbnail: '' }),
    } as unknown as Response);
    await productsStore.fetchSingleProduct('5');

    expect(productsStore.selectedProduct?.title).toBe('Новое название');
  });

  it('должен сохранять локально созданный товар при повторном fetchProductsList', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Локальный товар', category: 'smartphones', price: 1, stock: 1, rating: 0, thumbnail: '', id: 101 }),
    } as unknown as Response);
    
    const created = await productsStore.addProduct({ title: 'Локальный товар', category: 'smartphones', price: 1, stock: 1, rating: 0, description: '', thumbnail: '' });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ products: [], total: 0 }),
    } as unknown as Response);
    await productsStore.fetchProductsList(1, 10);

    expect(productsStore.products.some((p) => p.id === created.id)).toBe(true);
  });

  it('Не должен показывать отредактированный товар в результатах несвязанного поиска', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 2, title: 'Ноутбук', category: 'laptops', price: 999, stock: 5, rating: 5, thumbnail: '' }),
    } as unknown as Response);
    await productsStore.updateProduct(2, { price: 999 });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [{ id: 1, title: 'Смартфон', category: 'smartphones', price: 500, stock: 5, rating: 5, thumbnail: '' }],
        total: 1,
      }),
    } as unknown as Response);
    await productsStore.fetchProductsList(1, 10, 'смартфон');

    expect(productsStore.products.map((p) => p.id)).toEqual([1]);
    expect(productsStore.products.some((p) => p.id === 2)).toBe(false);
  });

  it('Не должен показывать локально созданный товар в результатах поиска, под который он не подходит', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Уникальный гаджет', category: 'smartphones', price: 1, stock: 1, rating: 0, thumbnail: '', id: 101 }),
    } as unknown as Response);
    await productsStore.addProduct({ title: 'Уникальный гаджет', category: 'smartphones', price: 1, stock: 1, rating: 0, description: '', thumbnail: '' });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ products: [], total: 0 }),
    } as unknown as Response);
    await productsStore.fetchProductsList(1, 10, 'ноутбук');

    expect(productsStore.products.length).toBe(0);
  });

  it('должен пересортировывать список на клиенте после наложения патча', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, title: 'Товар 1', category: 'smartphones', price: 999999, stock: 5, rating: 5, thumbnail: '' }),
    } as unknown as Response);
    await productsStore.updateProduct(1, { price: 999999 });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          { id: 3, title: 'Товар 3', category: 'smartphones', price: 50, stock: 5, rating: 5, thumbnail: '' },
          { id: 1, title: 'Товар 1', category: 'smartphones', price: 10, stock: 5, rating: 5, thumbnail: '' },
        ],
        total: 2,
      }),
    } as unknown as Response);
    await productsStore.fetchProductsList(1, 10, '', '', 'price_desc');

    expect(productsStore.products[0].id).toBe(1);
  });
});
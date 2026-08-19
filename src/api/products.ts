import type { Product } from '../stores/productsStore';

const BASE_URL = 'https://dummyjson.com/products';

export interface ProductsListParams {
  page: number;
  limit: number;
  searchQuery?: string;
  category?: string;
  sort?: string;
  signal?: AbortSignal;
}

export interface ProductsListResponse {
  products: Product[];
  total: number;
}

export class NotFoundError extends Error {
  constructor(message = 'Товар не найден') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export const fetchProducts = async ({
  page,
  limit,
  searchQuery = '',
  category = '',
  sort = '',
  signal,
}: ProductsListParams): Promise<ProductsListResponse> => {
  const skip = (page - 1) * limit;

  let url = BASE_URL;
  if (searchQuery) url += `/search?q=${encodeURIComponent(searchQuery)}&`;
  else if (category) url += `/category/${encodeURIComponent(category)}?`;
  else url += '?';

  url += `skip=${skip}&limit=${limit}`;

  if (sort) {
    const [sortBy, order] = sort.split('_');
    url += `&sortBy=${encodeURIComponent(sortBy)}&order=${encodeURIComponent(order)}`;
  }

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Не удалось загрузить товары');
  return res.json();
};

export const getProductById = async (id: string, signal?: AbortSignal): Promise<Product> => {
  const res = await fetch(`${BASE_URL}/${id}`, { signal });
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error('Не удалось загрузить карточку товара');
  return res.json();
};

export const createProduct = async (newProduct: Partial<Product>): Promise<Product> => {
  const res = await fetch(`${BASE_URL}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProduct),
  });
  if (!res.ok) throw new Error('Ошибка при создании товара');
  return res.json();
};

export const updateProductById = async (
  id: number,
  updatedFields: Partial<Product>
): Promise<Product> => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedFields),
  });
  if (!res.ok) throw new Error('Ошибка при обновлении товара');
  return res.json();
};

export const deleteProductById = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Ошибка при удалении');
};

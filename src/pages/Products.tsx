import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Table, Input, Button, Space, Typography, Image, Alert, Select, Popconfirm } from 'antd';
import { productsStore, type Product } from '../stores/productsStore';
import { useDebounce } from '../hooks/useDebounce';
import { authStore } from '../stores/authStore';
import { PRODUCT_CATEGORIES } from '../constants/categories';


export const Products = observer(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const page = Number(searchParams.get('page')) || 1;
  const searchUrl = searchParams.get('search') || '';
  const categoryUrl = searchParams.get('category') || '';
  const sortUrl = searchParams.get('sort') || '';

  const [inputValue, setInputValue] = useState(searchUrl);
  const debouncedSearch = useDebounce(inputValue, 500);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (debouncedSearch !== searchUrl) {
      searchParams.set('search', debouncedSearch);
      searchParams.set('page', '1');
      setSearchParams(searchParams);
    }
  }, [debouncedSearch, searchUrl, searchParams, setSearchParams]);

  useEffect(() => {
    productsStore.fetchProductsList(page, 10, searchUrl, categoryUrl, sortUrl);
  }, [page, searchUrl, categoryUrl, sortUrl]);

  const handleParamChange = (key: string, value: string) => {
    if (value) searchParams.set(key, value);
    else searchParams.delete(key);
    
    if (key !== 'page') {
      searchParams.set('page', '1');
    }
    
    setSearchParams(searchParams);
  };

  const handleDelete = async (product: Product) => {
    setDeletingId(product.id);
    try {
      await productsStore.deleteProduct(product.id);
    } catch {
      /* Игнор */
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { title: 'Фото', dataIndex: 'thumbnail', render: (src: string) => <Image width={50} src={src} /> },
    { title: 'ID', dataIndex: 'id' },
    { title: 'Название', dataIndex: 'title' },
    { title: 'Категория', dataIndex: 'category' },
    { title: 'Цена', dataIndex: 'price', render: (price: number) => `$${price}` },
    { title: 'Остаток', dataIndex: 'stock' },
    { title: 'Рейтинг', dataIndex: 'rating' },
    {
      title: 'Действия',
      render: (_: unknown, record: Product) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/products/${record.id}` + location.search)}>
            Открыть
          </Button>
          <Button size="small" onClick={() => navigate(`/products/${record.id}/edit` + location.search)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удаление товара"
            description={`Вы уверены, что хотите удалить «${record.title}»? Это действие нельзя отменить.`}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={() => handleDelete(record)}
          >
            <Button size="small" danger loading={deletingId === record.id}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Typography.Title level={2}>Товары</Typography.Title>
        <Space>
        <Button type="primary" onClick={() => navigate('/products/new' + location.search)}>Создать товар</Button>
          <Button onClick={() => { authStore.logout(); navigate('/login'); }}>Выйти</Button>
        </Space>
      </div>

      {productsStore.listError && (
        <Alert
          message={productsStore.listError}
          type="error"
          style={{ marginBottom: 20 }}
          action={
            <Button
              size="small"
              danger
              onClick={() => productsStore.fetchProductsList(page, 10, searchUrl, categoryUrl, sortUrl)}
            >
              Повторить
            </Button>
          }
        />
      )}

      <Space style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Поиск товаров..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />

        <Select
          placeholder="Категория"
          allowClear
          style={{ width: 150 }}
          value={categoryUrl || undefined}
          onChange={(val) => handleParamChange('category', val)}
          options={[...PRODUCT_CATEGORIES]}
        />

        <Select
          placeholder="Сортировка"
          allowClear
          style={{ width: 200 }}
          value={sortUrl || undefined}
          onChange={(val) => handleParamChange('sort', val)}
          options={[
            { value: 'price_asc', label: 'Сначала дешевые' },
            { value: 'price_desc', label: 'Сначала дорогие' },
            { value: 'rating_desc', label: 'По высокому рейтингу' },
          ]}
        />
      </Space>

      <Table
        rowKey="id"
        dataSource={productsStore.products}
        columns={columns}
        loading={productsStore.isLoading}
        locale={{
          emptyText: searchUrl || categoryUrl ? 'Ничего не найдено по заданным условиям' : 'Список товаров пуст',
        }}
        pagination={{
          current: page,
          pageSize: 10,
          total: productsStore.total,
          onChange: (newPage) => handleParamChange('page', String(newPage)),
        }}
      />
      <Outlet />
    </div>
  );
});

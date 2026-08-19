import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { productsStore } from '../stores/productsStore';
import { Drawer, Spin, Typography, Descriptions, Image, Button, Space, Popconfirm, Result } from 'antd';

export const ProductSidebar = observer(() => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (productId) {
      productsStore.fetchSingleProduct(productId);
    }
  }, [productId]);

  const handleClose = () => {
    navigate({ pathname: '/products', search: location.search });
  };

  const handleRetry = () => {
    if (productId) productsStore.fetchSingleProduct(productId);
  };

  const handleDelete = async () => {
    if (!product) return;
    try {
      await productsStore.deleteProduct(product.id);
      handleClose();
    } catch {
      /* Игнор */
    }
  };

  const product = productsStore.selectedProduct;

  const renderContent = () => {
    if (productsStore.isProductLoading) {
      return (
        <div style={{ textAlign: 'center', marginTop: 50 }}>
          <Spin size="large" />
        </div>
      );
    }

    if (productsStore.productNotFound) {
      return (
        <Result
          status="404"
          title="Товар не найден"
          subTitle="Возможно, товар был удалён или ссылка указана неверно."
          extra={<Button onClick={handleClose}>Вернуться к списку</Button>}
        />
      );
    }

    if (productsStore.productError) {
      return (
        <Result
          status="error"
          title="Не удалось загрузить карточку товара"
          subTitle={productsStore.productError}
          extra={
            <Button type="primary" onClick={handleRetry}>
              Повторить
            </Button>
          }
        />
      );
    }

    if (!product) return null;

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Image src={product.thumbnail} width={200} />
        <Typography.Title level={4}>{product.title}</Typography.Title>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="ID">{product.id}</Descriptions.Item>
          <Descriptions.Item label="Категория">{product.category}</Descriptions.Item>
          <Descriptions.Item label="Цена">${product.price}</Descriptions.Item>
          <Descriptions.Item label="Остаток">{product.stock} шт.</Descriptions.Item>
          <Descriptions.Item label="Рейтинг">{product.rating}</Descriptions.Item>
          <Descriptions.Item label="Описание">{product.description}</Descriptions.Item>
        </Descriptions>

        <Space>
          <Button type="primary" onClick={() => navigate(`/products/${product.id}/edit` + location.search)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удаление товара"
            description={`Вы уверены, что хотите удалить «${product.title}»? Это действие нельзя отменить.`}
            okText="Да, удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true, loading: productsStore.isDeleting }}
            onConfirm={handleDelete}
          >
            <Button danger loading={productsStore.isDeleting}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      </Space>
    );
  };

  return (
    <Drawer title="Карточка товара" placement="right" width={500} open={true} onClose={handleClose}>
      {renderContent()}
    </Drawer>
  );
});

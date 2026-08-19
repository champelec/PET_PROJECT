import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { observer } from 'mobx-react-lite';
import { Button, Input, InputNumber, Form, Select, Typography, Spin, Result } from 'antd';
import { productsStore } from '../stores/productsStore';
import { PRODUCT_CATEGORIES } from '../constants/categories';


export const productSchema = z.object({
  title: z.string().trim().min(3, 'Минимум 3 символа').max(100, 'Максимум 100 символов'),
  description: z.string().trim().min(10, 'Минимум 10 символов').max(500, 'Максимум 500 символов'),
  category: z.string().min(1, 'Выберите категорию'),
  price: z.number({ invalid_type_error: 'Обязательное поле' })
    .positive('Больше 0')
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(String(val)), 'Не более 2 знаков после запятой'),
  stock: z.number({ invalid_type_error: 'Обязательное поле' })
    .int('Только целые числа')
    .min(0, 'Не меньше 0'),
  rating: z.number({ invalid_type_error: 'Обязательное поле' })
    .min(0, 'Мин 0')
    .max(5, 'Макс 5')
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(String(val)), 'Не более 2 знаков после запятой')
    .optional()
    .default(0),
  thumbnail: z.union([z.literal(''), z.string().url('Некорректный URL')]).optional(),
});

type FormValues = z.infer<typeof productSchema>;

export const ProductForm = observer(() => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = !!productId;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { title: '', description: '', category: '', price: 1, stock: 0, rating: 0,thumbnail: '' },
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  useEffect(() => {
    if (isEditMode && productId) {
      productsStore.fetchSingleProduct(productId).then(() => {
        if (productsStore.selectedProduct) {
          reset(productsStore.selectedProduct as FormValues);
        }
      });
    }
  }, [isEditMode, productId, reset]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && productId) {
        await productsStore.updateProduct(Number(productId), data);
        navigate(`/products/${productId}${location.search}`);
      } else {
        await productsStore.addProduct(data);
        navigate(`/products${location.search}`);
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (productId) productsStore.fetchSingleProduct(productId);
  };

  if (isEditMode && productsStore.isProductLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isEditMode && productsStore.productNotFound) {
    return (
      <Result
        status="404"
        title="Товар не найден"
        subTitle="Редактируемый товар не существует или был удалён."
        extra={<Button onClick={() => navigate('/products')}>Вернуться к списку</Button>}
      />
    );
  }

  if (isEditMode && productsStore.productError) {
    return (
      <Result
        status="error"
        title="Не удалось загрузить товар для редактирования"
        subTitle={productsStore.productError}
        extra={
          <Button type="primary" onClick={handleRetry}>
            Повторить
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <Typography.Title level={2}>
        {isEditMode ? 'Редактирование товара' : 'Создание нового товара'}
      </Typography.Title>

      {isEditMode && productsStore.selectedProduct && (
        <div style={{ marginBottom: 20, color: 'gray' }}>
          <p>ID: {productsStore.selectedProduct.id} | Рейтинг: {productsStore.selectedProduct.rating}</p>
        </div>
      )}

      <Form layout="vertical" onSubmitCapture={handleSubmit(onSubmit)}>
        <Form.Item label="Название" validateStatus={errors.title ? 'error' : ''} help={errors.title?.message}>
          <Controller name="title" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>

        <Form.Item label="Описание" validateStatus={errors.description ? 'error' : ''} help={errors.description?.message}>
          <Controller name="description" control={control} render={({ field }) => <Input.TextArea {...field} rows={4} />} />
        </Form.Item>

        <Form.Item label="Категория" validateStatus={errors.category ? 'error' : ''} help={errors.category?.message}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => <Select {...field} options={[...PRODUCT_CATEGORIES]} />}
          />
        </Form.Item>

        <Form.Item label="Цена ($)" validateStatus={errors.price ? 'error' : ''} help={errors.price?.message}>
          <Controller name="price" control={control} render={({ field }) => <InputNumber {...field} style={{ width: '100%' }} parser={(value) => value?.replace(',', '.') as unknown as number} />} />
        </Form.Item>

        <Form.Item label="Количество на складе" validateStatus={errors.stock ? 'error' : ''} help={errors.stock?.message}>
          <Controller name="stock" control={control} render={({ field }) => <InputNumber {...field} style={{ width: '100%' }} />} />
        </Form.Item>

        <Form.Item label="URL основного изображения" validateStatus={errors.thumbnail ? 'error' : ''} help={errors.thumbnail?.message}>
          <Controller name="thumbnail" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>

        <Form.Item label="Рейтинг (от 0 до 5)" validateStatus={errors.rating ? 'error' : ''} help={errors.rating?.message}>
          <Controller 
            name="rating" 
            control={control} 
            render={({ field }) => (
              <InputNumber 
                {...field} 
                step={0.01} 
                style={{ width: '100%' }} 
                parser={(value) => value?.replace(',', '.') as unknown as number}
              />
            )} 
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={isSubmitting} block size="large">
          {isEditMode ? 'Сохранить изменения' : 'Создать товар'}
        </Button>
      </Form>
    </div>
  );
});

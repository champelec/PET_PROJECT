import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { observer } from 'mobx-react-lite';
import { Button, Input, Form, Typography, Alert } from 'antd';
import { authStore } from '../stores/authStore';
import { loginToApi } from '../api/auth';

const loginSchema = z.object({
  username: z.string().min(1, 'Имя пользователя обязательно'),
  password: z.string().min(1, 'Пароль обязателен'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login = observer(() => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
 	 resolver: zodResolver(loginSchema),
  });


  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setApiError('');
      
      const response = await loginToApi(data.username, data.password);
      const { accessToken, ...user } = response;
      authStore.login(accessToken, user);

      const redirect = searchParams.get('redirect') || '/products';
      navigate(decodeURIComponent(redirect), { replace: true });
    } 
      catch (error: unknown) {
      if (error instanceof Error) {
        setApiError(error.message);
      } else {
        setApiError('Произошла неизвестная ошибка');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <Typography.Title level={2}>Вход в панель</Typography.Title>
      
      {apiError && <Alert message={apiError} type="error" showIcon style={{ marginBottom: 20 }} />}

      
      <Form layout="vertical" onSubmitCapture={handleSubmit(onSubmit)}>
        <Form.Item 
          label="Имя пользователя (test: emilys)" 
          validateStatus={errors.username ? 'error' : ''} 
          help={errors.username?.message}
        >
          
          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Введите логин" />
            )}
          />
        </Form.Item>

        <Form.Item 
          label="Пароль (test: emilyspass)" 
          validateStatus={errors.password ? 'error' : ''} 
          help={errors.password?.message}
        >
          
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password {...field} placeholder="Введите пароль" />
            )}
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={isLoading} block>
          Войти
        </Button>
      </Form>
    </div>
  );
});

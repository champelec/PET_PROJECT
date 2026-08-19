import type { AuthUser } from '../stores/authStore';

export interface LoginResponse extends AuthUser {
  accessToken: string;
  refreshToken: string;
}

export const loginToApi = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch('https://dummyjson.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      expiresInMins: 60,
    }),
  });

  if (!response.ok) {
    throw new Error('Неверный логин или пароль');
  }

  return response.json();
};

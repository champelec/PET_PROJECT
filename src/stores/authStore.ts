import { makeAutoObservable } from 'mobx';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
}

const readStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    // повреждённые данные в localStorage не должны ломать приложение
    return null;
  }
};

class AuthStore {
  isAuth = !!localStorage.getItem(TOKEN_KEY);
  user: AuthUser | null = readStoredUser();

  constructor() {
    makeAutoObservable(this);
  }

  login(token: string, userData: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    this.isAuth = true;
    this.user = userData;
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.isAuth = false;
    this.user = null;
  }
}

export const authStore = new AuthStore();

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import api, { setTokens, clearTokens, getAccessToken } from '@/lib/api';
import { User, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; full_name: string; password: string; confirm_password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    const token = getAccessToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me/');
      setUser(response.data.data);
    } catch (error) {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const response = await api.post<AuthResponse>('/auth/login/', {
      username,
      password,
    });

    const { access, refresh, user: loggedInUser } = response.data.data;

    setTokens(access, refresh);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    document.cookie = `user_role=${loggedInUser.role}; path=/; max-age=604800; SameSite=Lax`;

    if (loggedInUser.role === 'admin') {
      router.push('/admin/instruments');
    } else {
      router.push('/dashboard');
    }
  }

  async function register(data: { username: string; email: string; full_name: string; password: string; confirm_password: string }) {
    const response = await api.post<AuthResponse>('/auth/register/', data);

    const { access, refresh, user: newUser } = response.data.data;

    setTokens(access, refresh);
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    document.cookie = `user_role=${newUser.role}; path=/; max-age=604800; SameSite=Lax`;

    // Registered users always go to the user dashboard
    router.push('/dashboard');
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refresh_token');

    try {
      if (refreshToken) {
        await api.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      // Even if the API call fails, proceed with local logout
    } finally {
      clearTokens();
      setUser(null);
      document.cookie = 'user_role=; path=/; max-age=0';
      router.push('/login');
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

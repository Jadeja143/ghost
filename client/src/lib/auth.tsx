import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from './queryClient';
import type { User, UserProfile } from '@shared/schema';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/users/me'],
    enabled: !!token,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const data = await apiRequest('POST', '/api/auth/login', { username, password });
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ username, email, password }: { username: string; email: string; password: string }) => {
      const data = await apiRequest('POST', '/api/auth/register', { username, email, password });
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const register = async (username: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ username, email, password });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isAuthenticated: !!user,
        isLoading,
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
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

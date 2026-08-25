import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { AuthUser, LoginPayload, RegisterPayload, AuthResponse } from '../types/user';
import api from '../api/axios';
import { AUTH } from '../api/endpoints';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateUser: (partialUser: Partial<AuthUser>) => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (stored && token) return { ...JSON.parse(stored), token };
    } catch {}
    return null;
  });   

  const login = useCallback(async (payload: LoginPayload) => {
    const { data } = await api.post<AuthResponse>(AUTH.LOGIN, payload);
    localStorage.setItem('token', data.token);             
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser({ ...data.user, token: data.token });           
  }, []);         

  const register = useCallback(async (payload: RegisterPayload) => {
    const { data } = await api.post<AuthResponse>(AUTH.REGISTER, payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser({ ...data.user, token: data.token });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = useCallback((partialUser: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partialUser };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

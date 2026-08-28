import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import apiClient from '../config/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [userType, setUserType] = useState(() => localStorage.getItem('user_type'));

  // Настройка перехватчика Axios для подстановки Bearer токена во все последующие запросы
  useEffect(() => {
    const interceptor = apiClient.interceptors.request.use((config) => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
      return config;
    });

    return () => apiClient.interceptors.request.eject(interceptor);
  }, []);

  const login = async (username, password) => {
    // Шаг 1: Авторизация через Djoser
    const { access, refresh } = await authService.login(username, password);

    try {
      // Шаг 2: Проверка типа пользователя
      const typeData = await authService.checkUserType(access);

      if (typeData?.type !== 'teacher') {
        throw new Error('Доступ разрешен только для преподавателей.');
      }

      // Шаг 3: Сохранение токена и типа пользователя только после успешной проверки
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user_type', typeData.type);

      setToken(access);
      setUserType(typeData.type);

      return { success: true };
    } catch (error) {
      // Откат авторизации, если тип не подходит или ручка вернет ошибку
      logout();
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_type');
    setToken(null);
    setUserType(null);
  };

  return (
    <AuthContext.Provider value={{ token, userType, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
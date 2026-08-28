import apiClient from '../config/client';

export const authService = {
  // 1. Получение JWT токенов (Djoser)
  async login(email, password) {
    const response = await apiClient.post('auth/jwt/create/', {
      email,
      password,
    });
    return response.data; // { access: "...", refresh: "..." }
  },

  // 2. Проверка типа пользователя
  async checkUserType(accessToken) {
    const response = await apiClient.get('type/', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data; // Ожидается { type: "teacher" | ... }
  },
};
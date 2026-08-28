import apiClient from '../config/client';

export const userService = {
  // Создание нового пользователя преподавателем
  async createUser(userData) {
    const response = await apiClient.post('admin/create-user/', userData);
    return response.data;
  },
};
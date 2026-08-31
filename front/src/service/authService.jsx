// authService.jsx
import apiClient from '../config/client';

export const authService = {
  async login(email, password) {
    try {
      const response = await apiClient.post('auth/jwt/create/', {
        email,
        password,
      });
      return response.data; // { access: "...", refresh: "..." }
    } catch (error) {
      // Прокидываем ошибку с полным контекстом
      if (error.response) {
        // Сервер ответил с кодом ошибки
        throw {
          ...error,
          message: error.response.data?.detail || 'Ошибка авторизации',
          status: error.response.status,
        };
      } else if (error.request) {
        // Запрос был сделан, но ответа нет
        throw new Error('Сервер не отвечает. Проверьте подключение к интернету.');
      } else {
        // Что-то пошло не так при настройке запроса
        throw new Error('Ошибка при отправке запроса.');
      }
    }
  },

  async checkUserType(accessToken) {
    try {
      const response = await apiClient.get('type/', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error checking user type:', error);
      throw new Error('Не удалось проверить тип пользователя');
    }
  },
};
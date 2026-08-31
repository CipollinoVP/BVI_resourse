import axios from 'axios';
import { API_CONFIG } from './api.js';

const apiClient = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: API_CONFIG.headers,
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

const onRefreshed = (token) => {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
};

// Функция для очистки токенов
const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_type');
};

apiClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        // Проверяем, что это 401 и не запрос на обновление токена
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/jwt/refresh/')
        ) {
            const refreshToken = localStorage.getItem('refresh_token');

            // Если нет refresh токена - просто пробрасываем ошибку
            if (!refreshToken) {
                clearTokens();
                // Не делаем редирект, просто пробрасываем ошибку
                return Promise.reject(error);
            }

            // Если уже идет обновление - ждем
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((newToken) => {
                        originalRequest.headers.Authorization =
                            `Bearer ${newToken}`;

                        resolve(apiClient(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Пытаемся обновить токен
                const response = await axios.post(
                    `${API_CONFIG.baseURL}auth/jwt/refresh/`,
                    {
                        refresh: refreshToken,
                    }
                );

                const newAccessToken = response.data.access;

                localStorage.setItem(
                    'access_token',
                    newAccessToken
                );

                apiClient.defaults.headers.common.Authorization =
                    `Bearer ${newAccessToken}`;

                originalRequest.headers.Authorization =
                    `Bearer ${newAccessToken}`;

                onRefreshed(newAccessToken);

                // Повторяем оригинальный запрос с новым токеном
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Если обновление не удалось - очищаем токены
                clearTokens();

                // Пробрасываем ошибку, чтобы компонент мог ее обработать
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Пробрасываем ошибку для обработки в компоненте
        return Promise.reject(error);
    }
);

export default apiClient;
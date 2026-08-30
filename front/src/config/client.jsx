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

apiClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry
        ) {
            const refreshToken = localStorage.getItem('refresh_token');

            if (!refreshToken) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_type');

                window.location.href = '/login';
                return Promise.reject(error);
            }

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
                // ВАЖНО: обычный axios, а не apiClient,
                // чтобы refresh-запрос не попал снова в interceptor
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

                return apiClient(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user_type');

                window.location.href = '/login';

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
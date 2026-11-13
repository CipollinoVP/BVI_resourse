// galleryService.jsx
import apiClient from '../config/client';
import { API_CONFIG } from '../config/api';

const ENDPOINTS = {
  drawings: 'gallery/drawings/',
  photos: 'gallery/photos/',
};

// Бэкенд отдаёт путь вида /media/drawings/xxx.jpg — достраиваем до адреса бэкенда
export const mediaUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  try {
    return new URL(path, API_CONFIG.baseURL).href;
  } catch {
    return path;
  }
};

export const galleryService = {
  /**
   * @param {'drawings'|'photos'} type
   * @param {{page?: number, pageSize?: number, search?: string}} params
   * @returns {Promise<{count:number, next:string|null, previous:string|null, results:Array}>}
   */
  async list(type, { page = 1, pageSize = 12, search = '' } = {}) {
    const params = { page, page_size: pageSize };
    if (search) params.search = search;
    const response = await apiClient.get(ENDPOINTS[type], { params });
    return response.data;
  },
};

import apiClient from '../config/client';

export const announcementsService = {
  // Получение списка тегов
  async getTags() {
    const response = await apiClient.get('admin/announcement/tags/');
    return response.data;
  },

  // Создание тега
  async createTag(name) {
    const response = await apiClient.post('admin/announcement/tags/', { name });
    return response.data;
  },

  // Удаление тега
  async deleteTag(id) {
    await apiClient.delete('admin/announcement/tags/', { data: { id } });
  },

  // Создание объявления (multipart/form-data)
  async createAnnouncement(formData) {
    const response = await apiClient.post('admin/announcement/create/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
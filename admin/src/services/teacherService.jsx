import apiClient from '../config/client';

export const teacherService = {
  async getMainData() {
    const response = await apiClient.get('admin/main/');
    return response.data;
  },

  async getClassInfo(classUuid) {
    const response = await apiClient.get(`admin/get_class_info/${classUuid}/`);
    return response.data; // Возвращает { data: { ... } }
  },
};
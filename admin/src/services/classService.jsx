import apiClient from '../config/client';

export const classService = {
  // Создание класса (POST /api/admin/)
  async createClass(name) {
    const response = await apiClient.post('admin/class/', { name });
    return response.data; // { uuid: "...", name: "..." }
  },

  // Обновление названия класса (PUT /api/admin/)
  async updateClass(uuid, name) {
    const response = await apiClient.put('admin/class/', { uuid, name });
    return response.data;
  },

  // Удаление класса (DELETE /api/admin/)
  async deleteClass(uuid) {
    const response = await apiClient.delete('admin/class/', { data: { uuid } });
    return response.data;
  },

  // Получение всех доступных и привязанных тегов класса
  async getClassTags(classId) {
    const response = await apiClient.get(`admin/announcement/groups/${classId}/tags/`);
    return response.data; // { all_tags: [...], linked_tags: [...] }
  },

  // Присваивание тегов классу (POST /api/admin/announcement/groups/<class_id>/tags/)
  async assignGroupTags(classId, tagIds) {
    const response = await apiClient.post(`admin/announcement/groups/${classId}/tags/`, {
      tags: tagIds,
    });
    return response.data;
  },

  // Отвязка конкретного тега от класса (DELETE /api/admin/announcement/groups/<class_id>/tags/)
  async deleteGroupTag(classId, tagId) {
    const response = await apiClient.delete(`admin/announcement/groups/${classId}/tags/`, {
      data: { id: tagId },
    });
    return response.data;
  },
};
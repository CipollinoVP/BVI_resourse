import apiClient from '../config/client';

export const groupService = {
  // Получение доступных пользователей
  async getAvailableParticipants(groupUuid) {
    const response = await apiClient.get(`admin/add_participant/${groupUuid}/`);
    return response.data; // { data: { meta: [...], users: [[id, name], ...] } }
  },

  // Добавление пользователя в группу
  async addParticipant(groupUuid, userUuid) {
    const response = await apiClient.post(`admin/add_participant/${groupUuid}/`, {
      uuid_user: userUuid,
    });
    return response.data;
  },

  // Удаление пользователя из группы
  async removeParticipant(groupUuid, userUuid) {
    const response = await apiClient.delete(`admin/add_participant/${groupUuid}/`, {
      data: { uuid_user: userUuid },
    });
    return response.data;
  },
};
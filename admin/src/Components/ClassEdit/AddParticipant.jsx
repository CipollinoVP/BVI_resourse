import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupService } from '../../services/groupService';
import { NavLink } from 'react-router-dom';

const AddParticipant = () => {
  const { id: groupUuid } = useParams();
  const [availableUsers, setAvailableUsers] = useState([]);
  const [currentUsers, setCurrentUsers] = useState([]);
  const [selectedUserUuid, setSelectedUserUuid] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Загрузка доступных для добавления пользователей
  const loadParticipants = useCallback(async () => {
    try {
      setError('');
      const res = await groupService.getAvailableParticipants(groupUuid);
      // res.data.users имеет вид: [[id, "Surname Name"], ...]
      const usersList = res?.data?.users || [];
      setAvailableUsers(usersList);
      if (usersList.length > 0) {
        setSelectedUserUuid(usersList[0][0]);
      } else {
        setSelectedUserUuid('');
      }
      const usersListCurrent = res?.data?.users_current || [];
      setCurrentUsers(usersListCurrent);
    } catch (err) {
      setError('Ошибка при загрузке списка пользователей');
    } finally {
      setLoading(false);
    }
  }, [groupUuid]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Обработка добавления
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedUserUuid) return;

    setActionLoading(true);
    try {
      await groupService.addParticipant(groupUuid, selectedUserUuid);
      await loadParticipants(); // Обновляем список
    } catch (err) {
      setError('Не удалось добавить пользователя в группу');
    } finally {
      setActionLoading(false);
    }
  };

  // Обработка удаления
  const handleRemove = async (userUuid) => {
    setActionLoading(true);
    try {
      await groupService.removeParticipant(groupUuid, userUuid);
      await loadParticipants(); // Обновляем список
    } catch (err) {
      setError('Не удалось удалить пользователя из группы');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={styles.padding}>Загрузка участников...</div>;

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>← На главную</Link>
      <h2 style={{ marginTop: '1rem' }}>Управление участниками группы</h2>

      {error && <div style={styles.error}>{error}</div>}

      {/* Форма добавления участника */}
      <div style={styles.card}>
        <h3>Добавить участника</h3>
        {availableUsers.length > 0 ? (
          <form onSubmit={handleAdd} style={styles.addForm}>
            <select
              value={selectedUserUuid}
              onChange={(e) => setSelectedUserUuid(e.target.value)}
              style={styles.select}
              disabled={actionLoading}
            >
              {availableUsers.map(([id, fullName]) => (
                <option key={id} value={id}>
                  {fullName} ({id})
                </option>
              ))}
            </select>
            <button type="submit" disabled={actionLoading} style={styles.addBtn}>
              {actionLoading ? 'Сохранение...' : 'Добавить'}
            </button>
          </form>
        ) : (
          <p style={{ color: '#6c757d' }}>Нет доступных пользователей для добавления</p>
        )}
      </div>

      {/* Список доступных/добавленных пользователей */}
      <div style={styles.card}>
        <h3>Список участников</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>UUID</th>
              <th style={styles.th}>ФИО</th>
              <th style={styles.th}>Действие</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map(([id, fullName]) => (
              <tr key={id} style={styles.tr}>
                <td style={styles.td}>{id}</td>
                <td style={styles.td}>{fullName}</td>
                <td style={styles.td}>
                  <button
                    onClick={() => handleRemove(id)}
                    disabled={actionLoading}
                    style={styles.deleteBtn}
                  >
                    Удалить из группы
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AddParticipant

const styles = {
  container: { maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' },
  padding: { padding: '2rem' },
  backLink: { textDecoration: 'none', color: '#007bff', fontWeight: 'bold' },
  card: { border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem', backgroundColor: '#fff', marginBottom: '1.5rem' },
  addForm: { display: 'flex', gap: '1rem', marginTop: '1rem' },
  select: { flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  addBtn: { padding: '0.5rem 1.5rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { padding: '0.3rem 0.8rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  error: { padding: '0.75rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
  th: { borderBottom: '2px solid #dee2e6', padding: '0.75rem', textAlign: 'left' },
  td: { borderBottom: '1px solid #dee2e6', padding: '0.75rem' },
  tr: { hover: { backgroundColor: '#f8f9fa' } },
};
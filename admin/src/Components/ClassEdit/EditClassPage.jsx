import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { classService } from '../../services/classService';

const EditClassPage = () => {
  const { id: classId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [linkedTags, setLinkedTags] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Загрузка информации о тегах класса
  const loadClassData = useCallback(async () => {
    try {
      const data = await classService.getClassTags(classId);
      setAllTags(data.all_tags || []);
      setLinkedTags(data.linked_tags || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка при загрузке тегов класса' });
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  // Обновление названия класса
  const handleUpdateName = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await classService.updateClass(classId, name.trim());
      setMessage({ type: 'success', text: 'Название класса обновлено' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Не удалось обновить название' });
    } finally {
      setSaving(false);
    }
  };

  // Переключение выбранных тегов и их массовая отправка (POST)
  const handleToggleTag = async (tagId) => {
    const isAlreadyLinked = linkedTags.some((t) => t.id === tagId);
    let newTagIds = [];

    if (isAlreadyLinked) {
      newTagIds = linkedTags.filter((t) => t.id !== tagId).map((t) => t.id);
    } else {
      newTagIds = [...linkedTags.map((t) => t.id), tagId];
    }

    try {
      await classService.assignGroupTags(classId, newTagIds);
      await loadClassData(); // Перезагружаем данные с бэкенда
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка при обновлении тегов' });
    }
  };

  // Удаление отдельного тега (DELETE)
  const handleDeleteTag = async (tagId) => {
    try {
      await classService.deleteGroupTag(classId, tagId);
      await loadClassData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка при отвязке тега' });
    }
  };

  // Удаление класса полностью
  const handleDeleteClass = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить этот класс?')) return;

    try {
      await classService.deleteClass(classId);
      navigate('/');
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка при удалении класса' });
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>← На главную</Link>
      <h2 style={{ marginTop: '1rem' }}>Редактирование класса</h2>

      {message.text && (
        <div style={message.type === 'error' ? styles.error : styles.success}>
          {message.text}
        </div>
      )}

      {/* Форма изменения названия */}
      <div style={styles.card}>
        <h3>Основная информация</h3>
        <form onSubmit={handleUpdateName} style={styles.rowForm}>
          <input
            type="text"
            placeholder="Имя класса"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" disabled={saving} style={styles.saveBtn}>
            {saving ? 'Сохранение...' : 'Сохранить название'}
          </button>
        </form>
      </div>

      {/* Управление тегами класса */}
      <div style={styles.card}>
        <h3>Привязать теги к группе</h3>
        <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>
          Нажмите на тег, чтобы добавить или удалить его из привязанных
        </p>

        <div style={styles.tagsGrid}>
          {allTags.map((tag) => {
            const isLinked = linkedTags.some((lt) => lt.id === tag.id);
            return (
              <div
                key={tag.id}
                style={{
                  ...styles.tagChip,
                  backgroundColor: isLinked ? '#007bff' : '#e9ecef',
                  color: isLinked ? '#fff' : '#212529',
                }}
              >
                <span onClick={() => handleToggleTag(tag.id)} style={{ cursor: 'pointer' }}>
                  {tag.name} {isLinked && '✓'}
                </span>
                {isLinked && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
                    style={styles.removeTagBtn}
                    title="Отвязать тег"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Опасная зона */}
      <div style={{ ...styles.card, borderColor: '#f5c6cb' }}>
        <h3 style={{ color: '#dc3545' }}>Удаление</h3>
        <p style={{ fontSize: '0.9rem' }}>Удаление класса приведет к сбросу привязанных групп и расписания.</p>
        <button onClick={handleDeleteClass} style={styles.deleteBtn}>
          Удалить класс
        </button>
      </div>
    </div>
  );
};

export default EditClassPage

const styles = {
  container: { maxWidth: '700px', margin: '2rem auto', padding: '0 1rem' },
  backLink: { textDecoration: 'none', color: '#007bff', fontWeight: 'bold' },
  card: { border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem', backgroundColor: '#fff', marginBottom: '1.5rem' },
  rowForm: { display: 'flex', gap: '1rem', marginTop: '1rem' },
  input: { flex: 1, padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  saveBtn: { padding: '0.6rem 1.2rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { padding: '0.6rem 1.2rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  tagsGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' },
  tagChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.8rem',
    borderRadius: '20px',
    fontSize: '0.9rem',
    userSelect: 'none',
  },
  removeTagBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    padding: 0,
  },
  success: { padding: '0.75rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '1rem' },
  error: { padding: '0.75rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem' },
};
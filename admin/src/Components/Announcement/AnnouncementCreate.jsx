import React, { useState } from 'react';
import TagManager from './TagManager';
import { announcementsService } from '../../services/announcementsService';

const AnnouncementCreate = () => {
  const [title, setTitle] = useState('');
  const [announce, setAnnounce] = useState('');
  const [forAll, setForAll] = useState(false);
  const [image, setImage] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const [status, setStatus] = useState({ loading: false, success: false, error: '' });

  const handleToggleTag = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: '' });

    const formData = new FormData();
    formData.append('title', title);
    formData.append('announce', announce);
    formData.append('for_all', forAll);

    if (image) {
      formData.append('img', image);
    }

    // Передаем каждый выбранный id тега с ключом tags
    selectedTagIds.forEach((tagId) => {
      formData.append('tags', tagId);
    });

    try {
      await announcementsService.createAnnouncement(formData);
      setStatus({ loading: false, success: true, error: '' });
      // Очистка формы
      setTitle('');
      setAnnounce('');
      setForAll(false);
      setImage(null);
      setSelectedTagIds([]);
    } catch (err) {
      setStatus({ loading: false, success: false, error: 'Ошибка создания объявления' });
    }
  };

  return (
    <div style={styles.page}>
      <h2>Создание объявления</h2>

      {status.success && <div style={styles.success}>Объявление успешно создано!</div>}
      {status.error && <div style={styles.error}>{status.error}</div>}

      <div style={styles.grid}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label>Заголовок:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label>Текст (HTML/Text):</label>
            <textarea
              value={announce}
              onChange={(e) => setAnnounce(e.target.value)}
              rows={4}
              style={styles.input}
            />
          </div>

          <div style={styles.fieldRow}>
            <input
              type="checkbox"
              id="for_all"
              checked={forAll}
              onChange={(e) => setForAll(e.target.checked)}
            />
            <label htmlFor="for_all">Для всех (Общее)</label>
          </div>

          <div style={styles.field}>
            <label>Изображение:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
            />
          </div>

          <div style={styles.field}>
            <label>Выбранные ID тегов:</label>
            <div>{selectedTagIds.length ? selectedTagIds.join(', ') : 'Теги не выбраны'}</div>
          </div>

          <button type="submit" disabled={status.loading} style={styles.submitBtn}>
            {status.loading ? 'Сохранение...' : 'Создать объявление'}
          </button>
        </form>

        {/* Окно управления тегами */}
        <div>
          <TagManager selectedTagIds={selectedTagIds} onToggleTag={handleToggleTag} />
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCreate

const styles = {
  page: { maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  fieldRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  input: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
  submitBtn: { padding: '0.75rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
  success: { padding: '0.75rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '1rem' },
  error: { padding: '0.75rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem' },
};
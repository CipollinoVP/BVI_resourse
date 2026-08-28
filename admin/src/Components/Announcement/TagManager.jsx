import React, { useState, useEffect } from 'react';
import { announcementsService } from '../../services/announcementsService';

const TagManager = ({ selectedTagIds, onToggleTag }) => {
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTags = async () => {
    try {
      const data = await announcementsService.getTags();
      setTags(data);
    } catch (err) {
      console.error('Ошибка загрузки тегов', err);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setLoading(true);
    try {
      const createdTag = await announcementsService.createTag(newTagName.trim());
      setTags((prev) => [...prev, createdTag]);
      setNewTagName('');
    } catch (err) {
      console.error('Ошибка создания тега', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (id) => {
    try {
      await announcementsService.deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      if (selectedTagIds.includes(id)) {
        onToggleTag(id);
      }
    } catch (err) {
      console.error('Ошибка удаления тега', err);
    }
  };

  return (
    <div style={styles.container}>
      <h4>Управление тегами</h4>
      <div style={styles.tagList}>
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <div key={tag.id} style={{ ...styles.tagItem, backgroundColor: isSelected ? '#e2e6ea' : '#f8f9fa' }}>
              <span>{tag.name}</span>
              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={() => onToggleTag(tag.id)}
                  style={{ ...styles.btn, color: isSelected ? 'green' : '#007bff' }}
                  title={isSelected ? 'Убрать из объявления' : 'Добавить в объявление'}
                >
                  {isSelected ? '✓' : '+'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTag(tag.id)}
                  style={{ ...styles.btn, color: '#dc3545' }}
                  title="Удалить тег"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleCreateTag} style={styles.addForm}>
        <input
          type="text"
          placeholder="Новый тег"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.addBtn}>
          Добавить
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: { border: '1px solid #ccc', borderRadius: '6px', padding: '1rem', backgroundColor: '#fff' },
  tagList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' },
  tagItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px' },
  actions: { display: 'flex', gap: '0.4rem' },
  btn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' },
  addForm: { display: 'flex', gap: '0.5rem' },
  input: { flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' },
  addBtn: { padding: '0.4rem 0.8rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
};

export default TagManager
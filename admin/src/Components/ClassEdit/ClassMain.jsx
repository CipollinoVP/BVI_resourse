import React, { useEffect, useState } from 'react';
import { useParams, Link, NavLink } from 'react-router-dom';
import { teacherService } from '../../services/teacherService';

const ClassMain = () => {
  const { id } = useParams();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClassInfo = async () => {
      try {
        setLoading(true);
        const response = await teacherService.getClassInfo(id);
        setClassData(response.data);
      } catch (err) {
        setError('Не удалось загрузить данные о классе');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClassInfo();
    }
  }, [id]);

  if (loading) return <div style={styles.padding}>Загрузка данных класса...</div>;
  if (error) return <div style={{ ...styles.padding, color: '#dc3545' }}>{error}</div>;
  if (!classData) return <div style={styles.padding}>Класс не найден</div>;

  const { name, parents_chat, sort_parents, child_chat, sort_children, announcements, schedule } = classData;

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>← На главную</Link>

      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Класс: {name}</h1>
        <NavLink to={`/edit_class/${id}`} style={styles.secondaryBtn}>
          Редактировать класс
        </NavLink>
      </div>

      {/* Чаты */}
      <div style={styles.gridTwo}>
        {/* Чаты родителей */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h3>Чаты родителей</h3>
            {parents_chat?.uuid && (
              <NavLink to={`/add_participant/${parents_chat.uuid}`} style={styles.linkBtn}>
                + Добавить родителя
              </NavLink>
            )}
          </div>
          <div style={styles.chatBox}>
            <strong>Общий чат родителей:</strong>
            <p style={styles.chatStatus}>
              {parents_chat?.last_message !== 'NONE' ? parents_chat?.last_message : 'Сообщений пока нет'}
            </p>
          </div>
          <h4>Личные чаты:</h4>
          <ul style={styles.list}>
            {sort_parents?.map((parent) => (
              <li key={parent.uuid} style={styles.listItem}>
                <span>{parent.surname || 'Без фамилии'}</span>
                <small style={{ color: '#6c757d' }}>{parent.last_message || 'Нет сообщений'}</small>
              </li>
            ))}
          </ul>
        </section>

        {/* Чаты учеников */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h3>Чаты учеников</h3>
            {child_chat?.uuid && (
              <NavLink to={`/add_participant/${child_chat.uuid}`} style={styles.linkBtn}>
                + Добавить ученика
              </NavLink>
            )}
          </div>
          <div style={styles.chatBox}>
            <strong>Общий чат класса:</strong>
            <p style={styles.chatStatus}>
              {child_chat?.last_message !== 'NONE' ? child_chat?.last_message : 'Сообщений пока нет'}
            </p>
          </div>
          <h4>Личные чаты:</h4>
          <ul style={styles.list}>
            {sort_children?.map((child) => (
              <li key={child.uuid} style={styles.listItem}>
                <span>{child.surname || 'Ученик без фамилии'}</span>
                <small style={{ color: '#6c757d' }}>{child.last_message || 'Нет сообщений'}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Объявления */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>Объявления класса</h2>
          <NavLink to={`/announce/create?classId=${id}`} style={styles.primaryBtn}>
            + Создать объявление
          </NavLink>
        </div>

        <div style={styles.announcementsGrid}>
          {/* Кнопка создания объявления как интерактивная карточка */}
          <NavLink to={`/announce/create?classId=${id}`} style={styles.createCard}>
            <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>+</span>
            <strong>Создать объявление</strong>
          </NavLink>

          {announcements?.result?.map((item) => (
            <div key={item.uuid} style={styles.announcementCard}>
              {item.img && <img src={item.img} alt={item.title} style={styles.announcementImg} />}
              <div style={{ padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{item.title}</h4>
                <small style={{ color: '#6c757d' }}>{item.date}</small>
                <div
                  dangerouslySetInnerHTML={{ __html: item.text }}
                  style={{ marginTop: '0.5rem' }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Расписание */}
      <section style={styles.section}>
        <h2>Расписание занятий</h2>
        {schedule?.length > 0 ? (
          <div style={styles.scheduleList}>
            {schedule.map((item, idx) => (
              <div key={idx} style={styles.scheduleCard}>
                <div>
                  <strong>{item.day}</strong> ({item.exact_day})
                </div>
                <div>
                  {item.start_time.slice(0, 5)} - {item.finish_time.slice(0, 5)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6c757d' }}>Расписание не задано</p>
        )}
      </section>
    </div>
  );
};

export default ClassMain;

const styles = {
  container: { padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  padding: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 2rem 0' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  backLink: { textDecoration: 'none', color: '#007bff', fontWeight: 'bold' },
  primaryBtn: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  secondaryBtn: {
    backgroundColor: '#6c757d',
    color: '#fff',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '0.9rem',
  },
  linkBtn: { textDecoration: 'none', color: '#007bff', fontSize: '0.85rem', fontWeight: '500' },
  gridTwo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' },
  card: { border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem', backgroundColor: '#fff' },
  chatBox: { backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' },
  chatStatus: { margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#495057' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: {
   display: 'flex',
   justifyContent: 'space-between', // Исправлено: justifyContent вместо justify.content
   padding: '0.5rem 0',
   borderBottom: '1px solid #f1f3f5',
  },
  section: { marginBottom: '2.5rem' },
  announcementsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' },
  announcementCard: { border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' },
  createCard: {
    border: '2px dashed #007bff',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '140px',
    color: '#007bff',
    textDecoration: 'none',
    padding: '1rem',
    boxSizing: 'border-box',
  },
  announcementImg: { width: '100%', height: '140px', objectFit: 'cover' },
  scheduleList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  scheduleCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: '#eef2f5',
    borderRadius: '6px',
    borderLeft: '4px solid #007bff',
  },
};
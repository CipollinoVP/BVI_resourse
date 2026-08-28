import React, { useEffect, useState } from 'react';
import { teacherService } from '../../services/teacherService';
import { NavLink } from 'react-router-dom';

const Main = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await teacherService.getMainData();
        setData(res);
      } catch (err) {
        setError('Не удалось загрузить данные главной страницы');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={styles.padding}>Загрузка...</div>;
  if (error) return <div style={{ ...styles.padding, color: '#dc3545' }}>{error}</div>;

  const today = new Date();
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const START_HOUR = 8;
  const END_HOUR = 20;
  const HOUR_HEIGHT = 60;

  const getLessonStyle = (startTime, finishTime) => {
    const startMin = timeToMinutes(startTime);
    const finishMin = timeToMinutes(finishTime);
    const dayStartMin = START_HOUR * 60;

    const top = Math.max(0, ((startMin - dayStartMin) / 60) * HOUR_HEIGHT);
    const height = Math.max(30, ((finishMin - startMin) / 60) * HOUR_HEIGHT);

    return { top: `${top}px`, height: `${height}px` };
  };

  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'numeric' });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>Панель управления</h1>
        <NavLink to="/create_class" style={styles.primaryBtn}>
          + Создать класс
        </NavLink>
      </header>

      {/* Блок объявлений */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>Объявления</h2>
        </div>
        <div style={styles.announcementsGrid}>
          {/* Кнопка создания рендерится ВСЕГДА первее или вместе с остальными */}
          <NavLink to="announce/create" style={styles.createCard}>
            <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>+</span>
            <strong>Новое объявление</strong>
          </NavLink>

          {data?.announcements?.map((item) => (
            <div key={item.uuid} style={styles.announcementCard}>
              {item.img && <img src={item.img} alt={item.title} style={styles.announcementImg} />}
              <div style={{ padding: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{item.title}</h3>
                <small style={{ color: '#6c757d' }}>{item.date}</small>
                <div dangerouslySetInnerHTML={{ __html: item.announce }} style={{ marginTop: '0.5rem' }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Блок классов */}
      <section style={styles.section}>
        <h2>Мои классы</h2>
        <div style={styles.classesList}>
          {data?.classes?.length > 0 ? (
            data.classes.map((c) => (
              <NavLink key={c.uuid} to={`/group/${c.uuid}`} style={styles.classBadge}>
                {c.name}
              </NavLink>
            ))
          ) : (
            <p style={{ color: '#6c757d' }}>Классы еще не созданы</p>
          )}
        </div>
      </section>

      {/* Календарь расписания */}
      <section style={styles.section}>
        <h2>Расписание на ближайшую неделю</h2>
        <div style={styles.calendarContainer}>
          <div style={styles.timeColumn}>
            <div style={styles.columnHeader}>Время</div>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i).map((hour) => (
              <div key={hour} style={{ ...styles.timeCell, height: `${HOUR_HEIGHT}px` }}>
                {`${hour.toString().padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          <div style={styles.daysGrid}>
            {next7Days.map((dateStr) => {
              const daySchedule = (data?.shedule || []).filter((item) => item.exact_day === dateStr);

              return (
                <div key={dateStr} style={styles.dayColumn}>
                  <div style={styles.columnHeader}>{getDayName(dateStr)}</div>
                  <div style={{ position: 'relative', height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
                    {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                      <div key={i} style={{ ...styles.gridLine, top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }} />
                    ))}

                    {daySchedule.map((lesson, idx) => {
                      const posStyle = getLessonStyle(lesson.start_time, lesson.finish_time);
                      return (
                        <div key={lesson.uuid || idx} style={{ ...styles.lessonCard, ...posStyle }}>
                          <strong style={{ display: 'block', fontSize: '0.85rem' }}>{lesson.name}</strong>
                          <span style={{ fontSize: '0.75rem' }}>
                            {lesson.group?.name} ({lesson.start_time.slice(0, 5)} - {lesson.finish_time.slice(0, 5)})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

const styles = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  padding: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  section: { marginBottom: '2.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  primaryBtn: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  classesList: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  classBadge: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e9ecef',
    color: '#212529',
    borderRadius: '20px',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  announcementsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  announcementCard: {
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  createCard: {
    border: '2px dashed #007bff',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '160px',
    color: '#007bff',
    textDecoration: 'none',
    padding: '1rem',
    boxSizing: 'border-box',
  },
  announcementImg: { width: '100%', height: '160px', objectFit: 'cover' },
  calendarContainer: { display: 'flex', border: '1px solid #dee2e6', borderRadius: '8px', overflowX: 'auto', backgroundColor: '#fff' },
  timeColumn: { width: '60px', minWidth: '60px', borderRight: '1px solid #dee2e6', backgroundColor: '#f8f9fa' },
  columnHeader: {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    borderBottom: '1px solid #dee2e6',
    backgroundColor: '#eef2f5',
    fontSize: '0.85rem',
  },
  timeCell: {
    fontSize: '0.75rem',
    color: '#6c757d',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '2px',
    boxSizing: 'border-box',
  },
  daysGrid: { display: 'flex', flexGrow: 1, minWidth: '700px' },
  dayColumn: { flex: 1, borderRight: '1px solid #dee2e6', position: 'relative' },
  gridLine: { borderBottom: '1px dashed #e9ecef', boxSizing: 'border-box', width: '100%', position: 'absolute' },
  lessonCard: {
    position: 'absolute',
    left: '4px',
    right: '4px',
    backgroundColor: '#007bff',
    color: '#fff',
    borderRadius: '4px',
    padding: '4px 6px',
    overflow: 'hidden',
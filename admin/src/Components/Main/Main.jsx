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

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;

  // --- ЛОГИКА КАЛЕНДАРЯ (7 ДНЕЙ НАЧИНАЯ С СЕГОДНЯ) ---
  const today = new Date();
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
  });

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const START_HOUR = 8;  // Начало шкалы времени (08:00)
  const END_HOUR = 20;   // Конец шкалы времени (20:00)
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
  const HOUR_HEIGHT = 60; // px на 1 час

  // Расчет стилей для позиционирования карточки урока
  const getLessonStyle = (startTime, finishTime) => {
    const startMin = timeToMinutes(startTime);
    const finishMin = timeToMinutes(finishTime);
    const dayStartMin = START_HOUR * 60;

    const top = Math.max(0, ((startMin - dayStartMin) / 60) * HOUR_HEIGHT);
    const height = Math.max(30, ((finishMin - startMin) / 60) * HOUR_HEIGHT);

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'numeric' });
  };

  return (
    <div style={styles.container}>
      <h1>Панель управления</h1>

      {/* Блок объявлений */}
      {data?.announcements?.length > 0 && (
        <section style={styles.section}>
          <h2>Объявления</h2>
          <div style={styles.announcementsGrid}>
            {data.announcements.map((item) => (
              <div key={item.uuid} style={styles.announcementCard}>
                {item.img && <img src={item.img} alt={item.title} style={styles.announcementImg} />}
                <div style={{ padding: '1rem' }}>
                  <h3>{item.title}</h3>
                  <small style={{ color: '#6c757d' }}>{item.date}</small>
                  <div dangerouslySetInnerHTML={{ __html: item.announce }} style={{ marginTop: '0.5rem' }} />
                </div>
              </div>
            ))}
            <div style={styles.announcementCard}>
                <NavLink to="announce/create">
                    <h3> Новое объявление </h3>
                </NavLink>
            </div>
          </div>
        </section>
      )}

      {/* Блок классов */}
      {data?.classes?.length > 0 && (
        <section style={styles.section}>
          <h2>Мои классы</h2>
          <div style={styles.classesList}>
            {data.classes.map((c) => (
              <NavLink to={`/group/${c.uuid}`}>
                <span key={c.uuid} style={styles.classBadge}>
                    {c.name}
                </span>
              </NavLink>
            ))}
          </div>
        </section>
      )}

      {/* Календарь расписания на 7 дней */}
      <section style={styles.section}>
        <h2>Расписание на ближайшую неделю</h2>
        <div style={styles.calendarContainer}>
          {/* Шкала часов слева */}
          <div style={styles.timeColumn}>
            <div style={styles.columnHeader}>Время</div>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i).map((hour) => (
              <div key={hour} style={{ ...styles.timeCell, height: `${HOUR_HEIGHT}px` }}>
                {`${hour.toString().padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Сетка дней */}
          <div style={styles.daysGrid}>
            {next7Days.map((dateStr) => {
              const daySchedule = (data?.shedule || []).filter((item) => item.exact_day === dateStr);

              return (
                <div key={dateStr} style={styles.dayColumn}>
                  <div style={styles.columnHeader}>{getDayName(dateStr)}</div>
                  <div style={{ position: 'relative', height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
                    {/* Линии часов */}
                    {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                      <div key={i} style={{ ...styles.gridLine, top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }} />
                    ))}

                    {/* Карточки занятий */}
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
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  section: { marginBottom: '2.5rem' },
  classesList: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  classBadge: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#e9ecef',
    borderRadius: '16px',
    fontWeight: 'bold',
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
  announcementImg: { width: '100%', height: '160px', objectFit: 'cover' },

  // Стили расписания
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 2,
  },
};

export default Main
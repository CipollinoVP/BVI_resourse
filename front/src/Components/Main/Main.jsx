import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import apiClient from '../../config/client';
import { useAuth } from '../../context/AuthContext';

import './Main.css';


const Main = () => {
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMain = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = isAuthenticated
          ? await apiClient.get('students/main/')
          : await apiClient.get('students/announcement/default/');

        setData(response.data);
      } catch (error) {
        console.error(error);

        setError(
          error.response?.data?.message ||
          'Не удалось загрузить данные.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadMain();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <main className="main-page">
        <div className="main-loading">
          Загрузка...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="main-page">
        <div className="main-error">
          {error}
        </div>
      </main>
    );
  }

  // =========================================================
  // НЕАВТОРИЗОВАННЫЙ
  // =========================================================

  if (!isAuthenticated) {
    return (
      <main className="main-page">
        <section className="main-section">
          <h1>Объявления</h1>

          <Announcements
            announcements={data || []}
          />
        </section>
      </main>
    );
  }

  // =========================================================
  // АВТОРИЗОВАННЫЙ
  // =========================================================

  return (
    <main className="main-page">

      {/* =====================================================
          КЛАССЫ
          ===================================================== */}

      <section className="main-section">
        <h1>Мои классы</h1>

        {data?.classes?.length > 0 ? (
          <div className="classes-list">
            {data.classes.map((classItem) => (
              <ClassCard
                key={classItem.class.uuid}
                classItem={classItem}
              />
            ))}
          </div>
        ) : (
          <p>Вы не состоите ни в одном классе.</p>
        )}
      </section>


      {/* =====================================================
          ОБЩИЕ ОБЪЯВЛЕНИЯ
          ===================================================== */}

      <section className="main-section">
        <h2>Объявления</h2>

        <Announcements
          announcements={data?.announcements?.global || []}
        />
      </section>


      {/* =====================================================
          ПРЕПОДАВАТЕЛИ
          ===================================================== */}

      <section className="main-section">
        <h2>Преподаватели</h2>

        <Teachers
          teachers={data?.teachers || []}
        />
      </section>

    </main>
  );
};


// =============================================================
// КЛАСС
// =============================================================

const ClassCard = ({ classItem }) => {
  const classData = classItem.class;
  const chat = classItem.chat;

  return (
    <article className="class-card">

      <div className="class-card-header">
        <h2>{classData.name}</h2>

        <NavLink
          to={`/group_chat/${chat.uuid}/`}
          className="main-chat-link"
        >
          Открыть чат
        </NavLink>
      </div>


      {/* =====================================================
          РАСПИСАНИЕ
          ===================================================== */}

      <div className="class-block">
        <h3>Расписание</h3>

        {classItem.schedule?.length > 0 ? (
          <Schedule
            schedule={classItem.schedule}
          />
        ) : (
          <p>Расписание отсутствует.</p>
        )}
      </div>


      {/* =====================================================
          ОБЪЯВЛЕНИЯ КЛАССА
          ===================================================== */}

      <div className="class-block">
        <h3>Объявления класса</h3>

        <Announcements
          announcements={
            classItem.announcements?.class || []
          }
        />
      </div>

    </article>
  );
};


// =============================================================
// РАСПИСАНИЕ
// =============================================================

const Schedule = ({ schedule }) => {
  return (
    <div className="schedule-list">

      {schedule.map((lesson, index) => (
        <div
          className="schedule-item"
          key={
            lesson.id ||
            `${lesson.exact_day}-${lesson.start_time}-${index}`
          }
        >

          <div className="schedule-date">
            {lesson.exact_day}
          </div>

          <div className="schedule-info">

            <div className="schedule-name">
              {lesson.name || 'Занятие'}
            </div>

            <div className="schedule-time">
              {lesson.start_time}
              {' — '}
              {lesson.finish_time}
            </div>

          </div>

        </div>
      ))}

    </div>
  );
};


// =============================================================
// ОБЪЯВЛЕНИЯ
// =============================================================

const Announcements = ({ announcements }) => {
  if (!announcements?.length) {
    return (
      <p>Объявлений нет.</p>
    );
  }

  return (
    <div className="announcements-list">

      {announcements.map((announcement) => (
        <article
          className="announcement-card"
          key={announcement.uuid}
        >

          {announcement.img && (
            <img
              src={announcement.img}
              alt=""
              className="announcement-image"
            />
          )}

          <div className="announcement-content">

            <div className="announcement-date">
              {announcement.date}
            </div>

            <h3>
              {announcement.title}
            </h3>

            {announcement.announce && (
              <div
                className="announcement-text"
                dangerouslySetInnerHTML={{
                  __html: announcement.announce,
                }}
              />
            )}

          </div>

        </article>
      ))}

    </div>
  );
};


// =============================================================
// ПРЕПОДАВАТЕЛИ
// =============================================================

const Teachers = ({ teachers }) => {
  if (!teachers?.length) {
    return (
      <p>Преподавателей нет.</p>
    );
  }

  return (
    <div className="teachers-list">

      {teachers.map((teacher) => (
        <NavLink
          key={teacher.uuid}
          to={`/personal_chat/${teacher.uuid}/`}
          className="teacher-card"
        >
          {teacher.fio}
        </NavLink>
      ))}

    </div>
  );
};


export default Main;
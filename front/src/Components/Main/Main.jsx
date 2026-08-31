import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import apiClient from '../../config/client';
import { useAuth } from '../../context/AuthContext';
import NewsList from '../News/NewsList';

const Main = () => {
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Активный выбранный класс (для тех, кто состоит в нескольких группах)
  const [activeClassIdx, setActiveClassIdx] = useState(0);

  useEffect(() => {
    const loadMain = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = isAuthenticated
          ? await apiClient.get('students/main/')
          : await apiClient.get('students/announcement/default/');

        setData(response.data);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message || 'Не удалось загрузить данные.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadMain();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">
            Загрузка вашего кабинета...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full p-6 bg-card border border-destructive/30 rounded-2xl text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-3 text-destructive bg-destructive/10 rounded-full flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Произошла ошибка</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Обновить страницу
          </button>
        </div>
      </main>
    );
  }

  // =========================================================
  // НЕАВТОРИЗОВАННЫЙ
  // =========================================================
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background">
        <NewsList />
      </main>
    );
  }

  // =========================================================
  // АВТОРИЗОВАННЫЙ
  // =========================================================
  const classes = data?.classes || [];
  const currentClass = classes[activeClassIdx] || null;
  const globalAnnouncements = data?.announcements?.global || [];
  const teachers = data?.teachers || [];

  return (
    <main className="min-h-screen bg-background py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Шапка рабочего кабинета */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-serif text-foreground">
              Учебный кабинет
            </h1>
            <p className="text-sm text-muted-foreground">
              Ваше, расписание и важные объявления
            </p>
          </div>

          {/* Переключатель классов, если их несколько */}
          {classes.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Класс:
              </span>
              {classes.map((item, idx) => (
                <button
                  key={item.class.uuid}
                  onClick={() => setActiveClassIdx(idx)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                    activeClassIdx === idx
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {item.class.name}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Сетка главного дашборда */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ЛЕВАЯ КОЛОНКА: Текущий класс, Расписание и Объявления класса (2/3 ширины) */}
          <div className="lg:col-span-2 space-y-6">
            {currentClass ? (
              <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xs space-y-6">

                {/* Информационный заголовок класса */}
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <span className="text-xs font-bold text-accent-foreground bg-accent/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Класс
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold font-serif text-foreground mt-2">
                      {currentClass.class.name}
                    </h2>
                  </div>

                  <NavLink
                    to={`/group_chat/${currentClass.chat.uuid}/`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-xs"
                  >
                    <span>Открыть чат</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </NavLink>
                </div>

                {/* Расписание заглядывающей недели */}
                <div>
                  <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                    <span>📅</span> Расписание
                  </h3>
                  <ScheduleList schedule={currentClass.schedule} />
                </div>

                {/* Объявления класса */}
                <div className="pt-2">
                  <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                    <span>📌</span> Объявления класса
                  </h3>
                  <AnnouncementsList
                    announcements={currentClass.announcements?.class || []}
                    emptyMessage="В вашем классе пока нет объявлений."
                  />
                </div>

              </section>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
                Вы не состоите ни в одном классе.
              </div>
            )}
          </div>

          {/* ПРАВАЯ КОЛОНКА: Общие объявления и Преподаватели (1/3 ширины) */}
          <div className="space-y-6">

            {/* Общие объявления школы */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xs">
              <h2 className="text-lg font-bold font-serif text-foreground mb-4 flex items-center justify-between">
                <span>🔔 Общие объявления</span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {globalAnnouncements.length}
                </span>
              </h2>

              <AnnouncementsList
                announcements={globalAnnouncements}
                emptyMessage="Общих объявлений нет."
                isGlobal
              />
            </section>

            {/* Преподаватели */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xs">
              <h2 className="text-lg font-bold font-serif text-foreground mb-4 flex items-center justify-between">
                <span>👨‍🏫 Преподаватели</span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {teachers.length}
                </span>
              </h2>

              <TeachersList teachers={teachers} />
            </section>

          </div>

        </div>
      </div>
    </main>
  );
};


// =============================================================
// КОМПОНЕНТ: РАСПИСАНИЕ
// =============================================================
const ScheduleList = ({ schedule }) => {
  if (!schedule?.length) {
    return (
      <div className="p-4 rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
        Расписание на эту неделю отсутствует.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {schedule.map((lesson, index) => {
        const lessonName = lesson.name?.trim() || 'Предмет не указан';

        return (
          <div
            key={lesson.id || `${lesson.exact_day}-${lesson.start_time}-${index}`}
            className="p-3.5 bg-background border border-border rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-primary/40 transition-colors"
          >
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-0.5">
                {lesson.exact_day}
              </span>
              <h4 className="text-sm font-semibold text-foreground truncate">
                {lessonName}
              </h4>
            </div>

            <div className="text-right flex-shrink-0 bg-muted px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-muted-foreground">
              {lesson.start_time} - {lesson.finish_time}
            </div>
          </div>
        );
      })}
    </div>
  );
};


// =============================================================
// КОМПОНЕНТ: ОБЪЯВЛЕНИЯ
// =============================================================
// =============================================================
// КОМПОНЕНТ: ОБЪЯВЛЕНИЯ (с раскрытием)
// =============================================================
const AnnouncementsList = ({ announcements, emptyMessage, isGlobal = false }) => {
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (uuid) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uuid)) {
        newSet.delete(uuid);
      } else {
        newSet.add(uuid);
      }
      return newSet;
    });
  };

  if (!announcements?.length) {
    return (
      <div className="p-4 rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((item) => {
        const isExpanded = expandedIds.has(item.uuid);
        const hasLongText = item.announce && item.announce.length > 150; // порог для показа кнопки

        return (
          <article
            key={item.uuid}
            className="p-4 bg-background border border-border rounded-xl shadow-2xs hover:border-primary/30 transition-all space-y-2"
          >
            {item.img && (
              <img
                src={item.img}
                alt=""
                className="w-full h-36 object-cover rounded-lg mb-2"
              />
            )}

            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-foreground line-clamp-1">
                {item.title}
              </h4>
              {isGlobal && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-accent/20 text-accent-foreground rounded-md flex-shrink-0">
                  Школа
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground font-mono">
              {new Date(item.date).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>

            {item.announce && (
              <div className="space-y-2">
                <div
                  className={`text-xs text-foreground/80 leading-relaxed ${
                    !isExpanded ? 'line-clamp-3' : ''
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: item.announce,
                  }}
                />

                {hasLongText && (
                  <button
                    onClick={() => toggleExpand(item.uuid)}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <span>Скрыть</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Читать полностью</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};


// =============================================================
// КОМПОНЕНТ: ПРЕПОДАВАТЕЛИ
// =============================================================
const TeachersList = ({ teachers }) => {
  if (!teachers?.length) {
    return (
      <div className="p-4 rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
        Список преподавателей пуст.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {teachers.map((teacher) => (
        <NavLink
          key={teacher.uuid}
          to={`/personal_chat/${teacher.uuid}/`}
          className="flex items-center justify-between p-3 bg-background border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 hover:border-primary/40 transition-all group shadow-2xs"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
              {teacher.fio?.charAt(0) || 'Т'}
            </div>
            <span className="truncate">{teacher.fio}</span>
          </div>

          <span className="text-xs text-primary font-semibold group-hover:translate-x-0.5 transition-transform flex-shrink-0">
            Написать →
          </span>
        </NavLink>
      ))}
    </div>
  );
};

export default Main;
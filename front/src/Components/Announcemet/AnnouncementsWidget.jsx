import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../config/client';
import { useAuth } from '../../context/AuthContext';

const AnnouncementsWidget = ({ className = '' }) => {
  const { isAuthenticated } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ordering, setOrdering] = useState('-date');
  const [expandedIds, setExpandedIds] = useState(new Set());

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);

    const endpoint = !isAuthenticated ? 'students/announcement/default/' : '/students/announcement/user/';

    try {
      const response = await apiClient.get(endpoint, {
        params: { ordering }
      });
      setAnnouncements(response.data);
    } catch (err) {
      if (isAuthenticated) {
        try {
          const fallbackResponse = await apiClient.get('students/announcement/default/', {
            params: { ordering }
          });
          setAnnouncements(fallbackResponse.data);
        } catch (fallbackErr) {
          setError('Не удалось загрузить объявления.');
        }
      } else {
        setError('Не удалось загрузить объявления.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, ordering]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const toggleOrdering = () => {
    setOrdering((prev) => (prev === '-date' ? 'date' : '-date'));
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Функция для проверки, нужно ли показывать кнопку "Читать полностью"
  const shouldShowExpandButton = (htmlContent) => {
    if (!htmlContent) return false;
    // Удаляем HTML-теги для подсчета символов
    const text = htmlContent.replace(/<[^>]*>/g, '');
    return text.length > 150; // порог
  };

  // Функция для очистки HTML от тегов для безопасного отображения в preview
  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 bg-card text-foreground rounded-2xl shadow-md border border-border ${className}`}>
      {/* Шапка */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <h2 className="text-xl font-bold font-serif text-foreground">Объявления</h2>
        <button
          onClick={toggleOrdering}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
        >
          {ordering === '-date' ? 'Сначала новые ↓' : 'Сначала старые ↑'}
        </button>
      </div>

      {/* Список объявлений */}
      <div className="mt-4">
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {!loading && !error && announcements.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">
            Объявлений пока нет.
          </p>
        )}

        {!loading && !error && announcements.length > 0 && (
          <div className="space-y-4">
            {announcements.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              const showExpandButton = shouldShowExpandButton(item.announce);
              const plainText = stripHtml(item.announce);

              return (
                <article
                  key={item.id}
                  className="p-4 rounded-xl bg-background border border-border hover:border-primary/50 transition-all shadow-xs"
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    {item.img && (
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full md:w-32 h-32 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-base font-semibold truncate text-foreground">
                          {item.title}
                        </h3>
                        {item.for_all && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground flex-shrink-0">
                            Общее
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(item.date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>

                      {/* Контент объявления с возможностью раскрытия */}
                      <div className="space-y-2">
                        <div
                          className={`text-sm text-foreground/90 whitespace-pre-line ${
                            !isExpanded ? 'line-clamp-3' : ''
                          }`}
                          dangerouslySetInnerHTML={{ __html: item.announce }}
                        />

                        {showExpandButton && (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mt-1"
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
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsWidget
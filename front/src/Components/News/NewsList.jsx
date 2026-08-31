// components/NewsList.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../../config/client';

const NewsList = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10,
  });

  const fetchNews = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/news/', {
        params: {
          page: page,
          page_size: pagination.pageSize,
        },
      });

      // Адаптируйте под структуру ответа вашего API
      // Если API возвращает { results: [...], count: total, next: url, previous: url }
      const data = response.data;

      setNews(data.results || data);

      // Если API возвращает пагинацию в стандартном DRF формате
      if (data.count !== undefined) {
        const totalPages = Math.ceil(data.count / pagination.pageSize);
        setPagination({
          ...pagination,
          currentPage: page,
          totalPages: totalPages,
          totalItems: data.count,
        });
      } else {
        // Если API возвращает массив без пагинации
        setPagination({
          ...pagination,
          currentPage: page,
          totalPages: 1,
          totalItems: data.length,
        });
      }
    } catch (err) {
      setError('Не удалось загрузить новости. Пожалуйста, попробуйте позже.');
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(1);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchNews(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading && news.length === 0) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Загрузка новостей...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-destructive text-lg font-medium mb-2">❌ {error}</div>
        <button
          onClick={() => fetchNews(pagination.currentPage)}
          className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">Новостей пока нет</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Заголовок */}
      <h1 className="text-3xl font-bold text-foreground mb-8 font-serif">
        Новости
      </h1>

      {/* Список новостей */}
      <div className="space-y-6">
        {news.map((item) => (
          <article
            key={item.id}
            className="bg-card rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-border"
          >
            <div className="p-6">
              {/* Дата */}
              {item.date && (
                <time
                  dateTime={item.date}
                  className="text-sm text-muted-foreground font-medium block mb-2"
                >
                  {formatDate(item.date)}
                </time>
              )}

              {/* Заголовок */}
              {item.title && (
                <h2 className="text-xl font-semibold text-foreground mb-3 font-serif leading-tight">
                  {item.title}
                </h2>
              )}

              {/* Анонс/текст */}
              {item.announce && (
                <div
                  className="prose prose-sm max-w-none text-foreground/90"
                  dangerouslySetInnerHTML={{ __html: item.announce }}
                />
              )}

              {/* Кнопка "Читать далее" (опционально) */}
              {item.id && (
                <div className="mt-4">
                  <a
                    href={`/news/${item.id}`}
                    className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Читать далее
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Пагинация */}
      {pagination.totalPages > 1 && (
        <div className="mt-10 flex justify-center items-center gap-2">
          {/* Кнопка "Назад" */}
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Предыдущая страница"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Номера страниц */}
          <div className="flex gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (pageNum) => {
                // Показываем текущую страницу, первую, последнюю и соседние
                const isCurrent = pageNum === pagination.currentPage;
                const isFirst = pageNum === 1;
                const isLast = pageNum === pagination.totalPages;
                const isNearCurrent = Math.abs(pageNum - pagination.currentPage) <= 1;
                const isNearEdge = Math.abs(pageNum - 1) <= 1 || Math.abs(pageNum - pagination.totalPages) <= 1;

                if (isCurrent || isFirst || isLast || isNearCurrent || isNearEdge) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`
                        min-w-[40px] h-10 px-3 rounded-lg font-medium transition-all duration-200
                        ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-card text-foreground hover:bg-muted border border-border'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                }

                // Показываем многоточие
                if (
                  (pageNum === 2 && pagination.currentPage > 3) ||
                  (pageNum === pagination.totalPages - 1 &&
                    pagination.currentPage < pagination.totalPages - 2)
                ) {
                  return (
                    <span
                      key={pageNum}
                      className="w-10 h-10 flex items-center justify-center text-muted-foreground"
                    >
                      …
                    </span>
                  );
                }

                return null;
              }
            )}
          </div>

          {/* Кнопка "Вперед" */}
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Следующая страница"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Информация о количестве */}
      {pagination.totalItems > 0 && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Всего новостей: {pagination.totalItems}
        </p>
      )}
    </div>
  );
};

export default NewsList;
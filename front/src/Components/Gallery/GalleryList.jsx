// components/Gallery/GalleryList.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { galleryService, mediaUrl } from '../../service/galleryService';

const PAGE_SIZE = 12;

const TEXTS = {
  drawings: {
    title: 'Рисунки',
    empty: 'Рисунков пока нет',
    loading: 'Загрузка рисунков...',
    error: 'Не удалось загрузить рисунки. Пожалуйста, попробуйте позже.',
    total: 'Всего рисунков',
  },
  photos: {
    title: 'Фото',
    empty: 'Фотографий пока нет',
    loading: 'Загрузка фотографий...',
    error: 'Не удалось загрузить фотографии. Пожалуйста, попробуйте позже.',
    total: 'Всего фотографий',
  },
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Номера страниц с многоточиями: 1 … 4 5 6 … 10
const getPageItems = (current, total) => {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
};

const Lightbox = ({ items, index, onClose, onPrev, onNext }) => {
  const item = items[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 size-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
        aria-label="Закрыть"
      >
        <X className="size-5" />
      </button>

      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-2 sm:left-6 size-11 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
            aria-label="Предыдущее"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-2 sm:right-6 size-11 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
            aria-label="Следующее"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      <figure className="max-w-5xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={mediaUrl(item.file)}
          alt={item.title || item.theme || ''}
          className="max-h-[80vh] max-w-full object-contain rounded-lg"
        />
        <figcaption className="mt-3 text-center text-white/90 text-sm space-y-0.5">
          {item.title && <div className="text-base font-semibold text-white">{item.title}</div>}
          {item.theme && <div className="text-white/70">Тема: {item.theme}</div>}
          {item.date && <div className="text-white/60">{formatDate(item.date)}</div>}
        </figcaption>
      </figure>
    </div>
  );
};

const GalleryList = ({ type = 'drawings' }) => {
  const t = TEXTS[type];

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await galleryService.list(type, { page, pageSize: PAGE_SIZE, search });
      setItems(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [type, page, search, t.error]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Поиск с задержкой, чтобы не дёргать API на каждую букву
  useEffect(() => {
    const id = setTimeout(() => {
      const value = searchInput.trim();
      if (value !== search) {
        setSearch(value);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput, search]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevItem = useCallback(
    () => setLightboxIndex((i) => (i - 1 + items.length) % items.length),
    [items.length]
  );
  const nextItem = useCallback(
    () => setLightboxIndex((i) => (i + 1) % items.length),
    [items.length]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-foreground font-serif">{t.title}</h1>

        <label className="relative w-full sm:w-80">
          <span className="sr-only">Поиск по теме занятия</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Тема занятия"
            className="w-full h-10 pl-9 pr-3 rounded-full border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">{t.loading}</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="text-destructive text-lg font-medium mb-2">{error}</div>
          <button
            onClick={fetchItems}
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            {search ? 'По вашему запросу ничего не найдено' : t.empty}
          </p>
        </div>
      ) : (
        <>
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 transition-opacity ${
              loading ? 'opacity-60' : ''
            }`}
          >
            {items.map((item, idx) => (
              <figure
                key={item.id}
                className="group bg-card rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-border"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="block w-full aspect-square overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Открыть: ${item.title || item.theme || 'изображение'}`}
                >
                  <img
                    src={mediaUrl(item.file)}
                    alt={item.title || item.theme || ''}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
                <figcaption className="p-3 space-y-0.5">
                  {item.title && (
                    <div className="font-semibold text-foreground leading-tight truncate">{item.title}</div>
                  )}
                  {item.theme && (
                    <div className="text-xs text-muted-foreground truncate">Тема: {item.theme}</div>
                  )}
                  {item.date && (
                    <time dateTime={item.date} className="block text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </time>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                aria-label="Предыдущая страница"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex gap-1">
                {getPageItems(page, totalPages).map((p) =>
                  typeof p === 'string' ? (
                    <span key={p} className="w-10 h-10 flex items-center justify-center text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      aria-current={p === page ? 'page' : undefined}
                      className={`min-w-[40px] h-10 px-3 rounded-lg font-medium transition-all duration-200 ${
                        p === page
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-card text-foreground hover:bg-muted border border-border'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                aria-label="Следующая страница"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-4">
            {t.total}: {count}
          </p>
        </>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevItem}
          onNext={nextItem}
        />
      )}
    </div>
  );
};

export default GalleryList;

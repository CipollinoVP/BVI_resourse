import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../config/client'; // Ваш настроенный axios клиент

const ClassAnnouncementPage = () => {
  const { uuid } = useParams(); // UUID класса
  const [searchParams] = useSearchParams();
  const announcementUuid = searchParams.get('announcementUuid'); // UUID объявления для редактирования/удаления
  const navigate = useNavigate();

  const isEditMode = Boolean(announcementUuid);

  // Состояние формы
  const [formData, setFormData] = useState({
    title: '',
    htmlText: '',
    date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Загрузка данных для редактирования, если есть announcementUuid
  useEffect(() => {
    if (!isEditMode) return;

    const fetchAnnouncementData = async () => {
      setFetching(true);
      setError('');
      try {
        // Бэкенд возвращает список с пагинацией, ищем нужное объявление по uuid
        const response = await apiClient.get(`class/announcements/${uuid}/`, {
          params: { pagination: 100 },
        });

        const list = response.data?.data?.announcements || [];
        // Формат массива из Django APIView: [uuid, title, html-text, date]
        const target = list.find((item) => item[0] === announcementUuid);

        if (target) {
          const [, title, htmlText, date] = target;
          
          // Приведение даты к локальному формату для <input type="datetime-local" />
          let formattedDate = date;
          if (date) {
            const d = new Date(date);
            formattedDate = !isNaN(d.getTime()) 
              ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
              : date;
          }

          setFormData({
            title: title || '',
            htmlText: htmlText || '',
            date: formattedDate || '',
          });
        } else {
          setError('Объявление не найдено в списке класса');
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Не удалось загрузить объявление');
      } finally {
        setFetching(false);
      }
    };

    fetchAnnouncementData();
  }, [uuid, announcementUuid, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Создание (POST) или Редактирование (PATCH)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isEditMode) {
        // PATCH запрос
        await apiClient.patch(`class/announcements/${uuid}/`, {
          uuid: announcementUuid,
          title: formData.title,
          'html-text': formData.htmlText,
          date: formData.date,
        });
        setSuccessMsg('Объявление успешно обновлено!');
      } else {
        // POST запрос
        await apiClient.post(`class/announcements/${uuid}/`, {
          title: formData.title,
          'html-text': formData.htmlText,
          date: formData.date,
        });
        setSuccessMsg('Объявление успешно создано!');
        // Очищаем форму после успешного создания
        setFormData({
          title: '',
          htmlText: '',
          date: new Date().toISOString().slice(0, 16),
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  // Удаление (DELETE)
  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить это объявление?')) return;

    setLoading(true);
    setError('');

    try {
      await apiClient.delete(`class/announcements/${uuid}/`, {
        data: { uuid: announcementUuid },
      });
      // Перенаправляем на страницу класса после удаления
      navigate(`/class/${uuid}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Ошибка при удалении');
      setLoading(false);
    }
  };

  if (fetching) {
    return <div style={styles.container}>Загрузка данных объявления...</div>;
  }

  return (
    <div style={styles.container}>
      <Link to={`/class/${uuid}`} style={styles.backLink}>
        ← Назад к классу
      </Link>

      <h1 style={styles.title}>
        {isEditMode ? 'Редактировать объявление' : 'Создать объявление'}
      </h1>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Заголовок (Title):</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Введите заголовок"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Дата публикации:</label>
          <input
            type="datetime-local"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Текст объявления (HTML):</label>
          <textarea
            name="htmlText"
            value={formData.htmlText}
            onChange={handleChange}
            required
            rows={8}
            placeholder="Введите текст объявления (поддерживаются HTML-теги)"
            style={styles.textarea}
          />
        </div>

        <div style={styles.actions}>
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading
              ? 'Сохранение...'
              : isEditMode
              ? 'Сохранить изменения'
              : 'Опубликовать'}
          </button>

          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              style={styles.deleteBtn}
            >
              Удалить новость
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ClassAnnouncementPage;

const styles = {
  container: {
    maxWidth: '700px',
    margin: '2rem auto',
    padding: '2rem',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    fontFamily: 'system-ui, sans-serif',
  },
  backLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  title: {
    margin: '1rem 0 1.5rem 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  input: {
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid #ced4da',
    fontSize: '1rem',
  },
  textarea: {
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid #ced4da',
    fontSize: '1rem',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
  },
  submitBtn: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteBtn: {
    backgroundColor: '#dc3545',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorBanner: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    marginBottom: '1rem',
  },
  successBanner: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    marginBottom: '1rem',
  },
};
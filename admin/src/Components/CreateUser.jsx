import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/userService';

const CreateUser = () => {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    user_type: 'child', // Значение по умолчанию
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await userService.createUser(formData);
      setSuccessMessage(
        `${response.message} (Email: ${response.email})`
      );
      // Сброс формы после успешного создания
      setFormData({
        name: '',
        surname: '',
        email: '',
        user_type: 'child',
      });
    } catch (err) {
      if (err.response?.data?.detail) {
        setErrorMessage(err.response.data.detail);
      } else if (err.response?.data) {
        // Если сериализатор вернул ошибки по конкретным полям
        const errors = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join('; ');
        setErrorMessage(errors || 'Ошибка валидации данных');
      } else {
        setErrorMessage('Не удалось создать пользователя');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>← На главную</Link>
      <h2 style={{ marginTop: '1rem' }}>Создание нового пользователя</h2>

      {successMessage && <div style={styles.success}>{successMessage}</div>}
      {errorMessage && <div style={styles.error}>{errorMessage}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label htmlFor="name">Имя:</label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="surname">Фамилия:</label>
          <input
            id="surname"
            type="text"
            name="surname"
            value={formData.surname}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="user_type">Тип пользователя:</label>
          <select
            id="user_type"
            name="user_type"
            value={formData.user_type}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="child">Ученик</option>
            <option value="parent">Родитель</option>
            <option value="teacher">Преподаватель</option>
          </select>
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Создание...' : 'Создать пользователя'}
        </button>
      </form>
    </div>
  );
};

export default CreateUser

const styles = {
  container: { maxWidth: '600px', margin: '2rem auto', padding: '0 1rem' },
  backLink: { textDecoration: 'none', color: '#007bff', fontWeight: 'bold' },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
    marginTop: '1.5rem',
    padding: '1.5rem',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  input: { padding: '0.6rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
  select: { padding: '0.6rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
  submitBtn: {
    padding: '0.75rem',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  success: {
    padding: '0.75rem',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
    marginTop: '1rem',
  },
  error: {
    padding: '0.75rem',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginTop: '1rem',
  },
};
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { classService } from '../../services/classService';

const CreateClassPage = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const createdClass = await classService.createClass(name.trim());
      // Переход на страницу редактирования созданного класса
      navigate(`/class/${createdClass.uuid}/edit`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при создании класса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>← На главную</Link>
      <h2 style={{ marginTop: '1rem' }}>Создание нового класса</h2>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.field}>
          <label htmlFor="className">Название класса:</label>
          <input
            id="className"
            type="text"
            placeholder="Например: 5Б"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Создание...' : 'Создать класс'}
        </button>
      </form>
    </div>
  );
};

export default CreateClassPage

const styles = {
  container: { maxWidth: '500px', margin: '2rem auto', padding: '0 1rem' },
  backLink: { textDecoration: 'none', color: '#007bff', fontWeight: 'bold' },
  card: { border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem', backgroundColor: '#fff', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  input: { padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  submitBtn: { padding: '0.75rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' },
  error: { padding: '0.75rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginTop: '1rem' },
};
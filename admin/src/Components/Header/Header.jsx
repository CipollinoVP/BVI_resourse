import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../../logo_min.png'
import { useUnread } from '../../context/UnreadContext';
import UnreadBadge from '../common/UnreadBadge';

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { total: unreadTotal } = useUnread();

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  const handleCreateClick = () => {
    if (isAuthenticated) {
      navigate('/add_user');
    }
  };

  return (
    <header style={styles.header}>
      <Link to="/" style={styles.logoLink}>
        <img src={logo} alt="На главную" style={styles.logo} />
      </Link>
      <div style={styles.actions}>
        {isAuthenticated && unreadTotal > 0 &&
            <Link to="/" style={styles.unreadLink} title="Непрочитанные сообщения">
                <span>Новые сообщения</span>
                <UnreadBadge count={unreadTotal} />
            </Link>
        }
        {isAuthenticated &&
            <button onClick={handleCreateClick} style={styles.button}>
                Создать пользователя
            </button>
        }
        <button onClick={handleAuthClick} style={styles.button}>
            {isAuthenticated ? 'Выйти' : 'Войти'}
        </button>
      </div>
    </header>
  );
};

export default Header

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e9ecef',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  unreadLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    textDecoration: 'none',
    color: '#212529',
    fontWeight: 500,
    marginRight: '0.5rem',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    height: '40px',
    cursor: 'pointer',
  },
  button: {
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#007bff',
    color: '#fff',
    fontSize: '1rem',
  },
};
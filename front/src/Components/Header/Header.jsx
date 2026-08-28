import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../../logo_min.png'

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <header style={styles.header}>
      <Link to="/" style={styles.logoLink}>
        <img src={logo} alt="На главную" style={styles.logo} />
      </Link>
      <h1>
          Изостудия Белоцерковской Валерии Игоревны
      </h1>
      <div>
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
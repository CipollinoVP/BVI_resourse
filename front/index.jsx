import React from "react";
import ReactDOM from "react-dom/client";
import './index.css'
import FrontApp from './src/App';

if (typeof window !== 'undefined') {
  // Формы
  window.__WVC_FORMS__ = window.__WVC_FORMS__ || {
    'login_form': {
      form_key: 'login_form',
      form_label: 'Форма авторизации',
      fields: [
        {
          field_key: 'username',
          label: 'Email',
          field_type: 'email',
          required: true
        },
        {
          field_key: 'password',
          label: 'Пароль',
          field_type: 'password',
          required: true
        },
      ]
    }
  };

  // Клиент для форм
  window.wvcClient = window.wvcClient || {
    getSessionId: () => {
      let sessionId = localStorage.getItem('wvc_session_id');
      if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('wvc_session_id', sessionId);
      }
      return sessionId;
    },
    formSubmission: async (data) => {
      try {
        const response = await fetch('/api/forms/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Form submission failed:', error);
        throw error;
      }
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FrontApp />
  </React.StrictMode>
);
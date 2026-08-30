import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../config/client'; // импортируем кастомный клиент

const TeacherChat = () => {
  const { uuid: companionUuid } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [lastId, setLastId] = useState(null);
  const [pagination, setPagination] = useState({ first: null, last: null, has_previous: false });
  const [loading, setLoading] = useState(false);

  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!companionUuid) return;
    initChat();

    const interval = setInterval(() => {
      checkMonitoring();
    }, 3000);

    return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: 'min(720px, calc(100vh - 140px))',
      minHeight: '520px', background: '#f7f8fc', border: '1px solid #e6e9f0',
      borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(31, 41, 55, .08)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{
        padding: '18px 22px', background: '#fff', borderBottom: '1px solid #e9ecf2',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: '#eef2ff', color: '#4f46e5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21
          }}>👨‍🏫</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#202635' }}>Чат со студентом</div>
            <div style={{ fontSize: 12, color: '#8a92a3', marginTop: 3 }}>Личная переписка</div>
          </div>
        </div>
        {pagination.has_previous && (
          <button onClick={loadEarlierMessages} disabled={loading} style={{
            border: '1px solid #e1e5ed', background: '#fff', color: '#596273',
            borderRadius: 10, padding: '9px 13px', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'default' : 'pointer'
          }}>
            {loading ? 'Загрузка...' : '↑ Предыдущие сообщения'}
          </button>
        )}
      </div>

      <div ref={chatContainerRef} style={{
        flex: 1, overflowY: 'auto', padding: '24px clamp(16px, 4vw, 42px)',
        background: 'linear-gradient(180deg, #f8f9fc 0%, #f3f5f9 100%)'
      }}>
        {messages.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa1af' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>💬</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#687083' }}>Сообщений пока нет</div>
              <div style={{ fontSize: 13, marginTop: 5 }}>Начните переписку со студентом</div>
            </div>
          </div>
        ) : messages.map((msg) => {
          const isMe = msg.sender === 'me';
          return (
            <div key={msg.id} style={{
              display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 14
            }}>
              <div style={{
                maxWidth: 'min(72%, 620px)', padding: '11px 14px 9px',
                background: isMe ? '#4f46e5' : '#fff',
                color: isMe ? '#fff' : '#252a36',
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                boxShadow: isMe ? '0 5px 14px rgba(79,70,229,.18)' : '0 3px 12px rgba(31,41,55,.07)',
                border: isMe ? 'none' : '1px solid #e9ecf2'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: .72, marginBottom: 5 }}>
                  {isMe ? 'Вы' : 'Студент'}
                </div>
                <div style={{ fontSize: 14.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {msg.text}
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5,
                  fontSize: 10.5, marginTop: 5, opacity: .62
                }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <span>{msg.is_read ? '✓✓' : '✓'}</span>}
                </div>
                {isMe && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, marginTop: 5 }}>
                    <button onClick={() => { setEditingMessage(msg); setInputText(msg.text); }} style={{
                      border: 0, background: 'rgba(255,255,255,.14)', color: '#fff',
                      borderRadius: 7, padding: '4px 8px', fontSize: 11, cursor: 'pointer'
                    }}>Изменить</button>
                    <button onClick={() => handleDelete(msg.id)} style={{
                      border: 0, background: 'rgba(255,255,255,.14)', color: '#fff',
                      borderRadius: 7, padding: '4px 8px', fontSize: 11, cursor: 'pointer'
                    }}>Удалить</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingMessage && (
        <div style={{
          padding: '10px 20px', background: '#fff8e8', borderTop: '1px solid #f2dfad',
          color: '#8a6515', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>✎ Редактирование сообщения</span>
          <button type="button" onClick={() => { setEditingMessage(null); setInputText(''); }} style={{
            border: 0, background: 'transparent', color: '#8a6515', fontWeight: 700, cursor: 'pointer'
          }}>Отмена</button>
        </div>
      )}

      <form onSubmit={handleSend} style={{
        display: 'flex', gap: 10, padding: '14px 18px', background: '#fff', borderTop: '1px solid #e9ecf2'
      }}>
        <input
          type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
          placeholder={editingMessage ? 'Измените сообщение...' : 'Введите сообщение...'}
          style={{
            flex: 1, minWidth: 0, border: '1px solid #dfe3eb', borderRadius: 12,
            padding: '12px 14px', outline: 'none', fontSize: 14, color: '#252a36',
            background: '#f8f9fb', boxSizing: 'border-box'
          }}
        />
        <button type="submit" disabled={!inputText.trim()} style={{
          border: 0, borderRadius: 12, padding: '0 20px', minWidth: 112,
          background: inputText.trim() ? '#4f46e5' : '#cfd4df', color: '#fff',
          fontWeight: 700, fontSize: 13, cursor: inputText.trim() ? 'pointer' : 'default',
          boxShadow: inputText.trim() ? '0 5px 14px rgba(79,70,229,.22)' : 'none'
        }}>
          {editingMessage ? 'Сохранить' : 'Отправить'}
        </button>
      </form>
    </div>
  );
};

export default TeacherChat;
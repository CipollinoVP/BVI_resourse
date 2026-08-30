import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../config/client'; // импортируем кастомный клиент

const TeacherChat = ({ companionUuid }) => {
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

    return () => clearInterval(interval);
  }, [companionUuid, lastId]);

  // 1. Инициализация чата
  const initChat = async () => {
    try {
    // Делаем GET запрос к основной ручке GetAdminPersonal
       const res = await apiClient.get(`admin/user_chat/${companionUuid}/`);

       if (res.data?.data) {
           const { messages: rawMessages, pagination: pag } = res.data.data;

                // Преобразуем входящие массивы [id, text, sender, date, is_read] в объекты
           const formattedMessages = rawMessages.map((m) => ({
                    id: m[0],
                    text: m[1],
                    sender: m[2], // "me" или "not_me"
                    created_at: m[3],
                    is_read: m[4]
           })).reverse(); // Реверсим, чтобы новые сообщения были внизу

           setMessages(formattedMessages);
           setPagination(pag);


           if (pag.last) {
                setLastId(pag.last);
           }
        }
        } catch (err) {
            console.error("Ошибка при инициализации чата:", err);
        }
    };

  // 2. Мониторинг новых сообщений
  const checkMonitoring = async () => {
    if (!lastId) return;
    try {
      const res = await apiClient.get(`admin/message_personal_monitoring/${companionUuid}/?last=${lastId}`);
      if (res.data.message === "Update" && res.data.new_messages) {
        setMessages((prev) => [...prev, ...res.data.new_messages]);
        setLastId(res.data.last_id);
      }
    } catch (err) {
      console.error("Ошибка при мониторинге:", err);
    }
  };

  // 3. Пагинация (подгрузка старых сообщений)
  const loadEarlierMessages = async () => {
    if (!pagination.first || loading) return;
    setLoading(true);
    try {
      const res = await apiClient.get(
        `admin/message_personal_pagination/${companionUuid}/?earlier=true&current_limit=${pagination.first}`
      );
      const { messages: olderMessages, pagination: newPag } = res.data;

      const formattedOlder = olderMessages.map((m) => ({
        id: m[0],
        text: m[1],
        sender: m[2],
        created_at: m[3],
        is_read: m[4]
      })).reverse();

      setMessages((prev) => [...formattedOlder, ...prev]);
      setPagination(newPag);
    } catch (err) {
      console.error("Ошибка загрузки истории:", err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Отправка и редактирование
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (editingMessage) {
      try {
        await apiClient.patch(`admin/user_chat/${companionUuid}/`, {
          uuid: editingMessage.id,
          text: inputText
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === editingMessage.id ? { ...m, text: inputText } : m))
        );
        setEditingMessage(null);
        setInputText('');
      } catch (err) {
        console.error("Ошибка при редактировании:", err);
      }
    } else {
      try {
        await apiClient.post(`admin/user_chat/${companionUuid}/`, { text: inputText });
        setInputText('');
        checkMonitoring();
      } catch (err) {
        console.error("Ошибка при отправке:", err);
      }
    }
  };

  // 5. Удаление сообщения
  const handleDelete = async (msgId) => {
    if (!window.confirm("Удалить сообщение?")) return;
    try {
      await apiClient.delete(`admin/user_chat/${companionUuid}/`, {
        data: { uuid: msgId }
      });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error("Ошибка при удалении:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '500px', border: '1px solid #ccc' }}>
      <div style={{ padding: '10px', background: '#f5f5f5', borderBottom: '1px solid #ccc' }}>
        <h3>Чат со студентом</h3>
        {pagination.has_previous && (
          <button onClick={loadEarlierMessages} disabled={loading}>
            {loading ? 'Загрузка...' : 'Загрузить предыдущие сообщения'}
          </button>
        )}
      </div>

      <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                marginBottom: '10px'
              }}
            >
              <div
                style={{
                  background: isMe ? '#dcf8c6' : '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  maxWidth: '70%'
                }}
              >
                <div style={{ fontSize: '0.8em', color: '#666' }}>{msg.sender}</div>
                <div>{msg.text}</div>
                <div style={{ fontSize: '0.7em', color: '#999', textAlign: 'right' }}>
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>

                {isMe && (
                  <div style={{ fontSize: '0.8em', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        setEditingMessage(msg);
                        setInputText(msg.text);
                      }}
                    >
                      Изм.
                    </button>
                    <button onClick={() => handleDelete(msg.id)}>Уд.</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', padding: '10px', borderTop: '1px solid #ccc' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={editingMessage ? "Редактирование..." : "Введите сообщение..."}
          style={{ flex: 1, marginRight: '10px' }}
        />
        {editingMessage && (
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
          >
            Отмена
          </button>
        )}
        <button type="submit">{editingMessage ? 'Сохранить' : 'Отправить'}</button>
      </form>
    </div>
  );
};

export default TeacherChat;
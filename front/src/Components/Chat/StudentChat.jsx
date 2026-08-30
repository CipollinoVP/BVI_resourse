import React, { useParams, useState, useEffect, useRef } from 'react';
import apiClient from '../../config/client'; // импортируем кастомный клиент


const StudentChat = () => {
  const { uuid: teacherUuid } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [lastId, setLastId] = useState(null);
  const [pagination, setPagination] = useState({ first: null, last: null, has_previous: false });
  const [loading, setLoading] = useState(false);

  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!teacherUuid) return;
    initChat();

    const interval = setInterval(() => {
      checkMonitoring();
    }, 3000);

    return () => clearInterval(interval);
  }, [teacherUuid, lastId]);

  // 1. Инициализация чата ученика
  const initChat = async () => {
    try {
      const res = await apiClient.get(`students/parent/chats/${teacherUuid}/`);
      if (res.data.data) {
        const { messages: initialMessages, pagination: pag } = res.data.data;
        const formatted = initialMessages.map((m) => ({
          id: m[0],
          text: m[1],
          sender: m[2],
          created_at: m[3],
          is_read: m[4]
        })).reverse();

        setMessages(formatted);
        setPagination(pag);
        if (pag.last) setLastId(pag.last);
      }
    } catch (err) {
      console.error("Ошибка при открытии чата:", err);
    }
  };

  // 2. Мониторинг сообщений у ученика
  const checkMonitoring = async () => {
    if (!lastId) return;
    try {
      const res = await apiClient.get(`students/parent/chats/${teacherUuid}/monitoring/?last=${lastId}`);
      if (res.data.message === "Update" && res.data.new_messages) {
        setMessages((prev) => [...prev, ...res.data.new_messages]);
        setLastId(res.data.last_id);
      }
    } catch (err) {
      console.error("Ошибка при мониторинге:", err);
    }
  };

  // 3. Пагинация старых сообщений
  const loadEarlierMessages = async () => {
    if (!pagination.first || loading) return;
    setLoading(true);
    try {
      const res = await apiClient.get(
        `students/parent/chats/${teacherUuid}/pagination/?earlier=true&current_limit=${pagination.first}`
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
      console.error("Ошибка при подгрузке истории:", err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Отправка и редактирование своего сообщения
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (editingMessage) {
      try {
        await apiClient.patch(`students/parent/chats/${teacherUuid}/`, {
          uuid: editingMessage.id,
          text: inputText
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === editingMessage.id ? { ...m, text: inputText } : m))
        );
        setEditingMessage(null);
        setInputText('');
      } catch (err) {
        console.error("Ошибка редактирования:", err);
      }
    } else {
      try {
        await apiClient.post(`students/parent/chats/${teacherUuid}/`, { text: inputText });
        setInputText('');
        checkMonitoring();
      } catch (err) {
        console.error("Ошибка отправки:", err);
      }
    }
  };

  // 5. Удаление своего сообщения
  const handleDelete = async (msgId) => {
    if (!window.confirm("Удалить сообщение?")) return;
    try {
      await apiClient.delete(`students/parent/chats/${teacherUuid}/`, {
        data: { uuid: msgId }
      });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error("Ошибка удаления:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '500px', border: '1px solid #ccc' }}>
      <div style={{ padding: '10px', background: '#f5f5f5', borderBottom: '1px solid #ccc' }}>
        <h3>Чат с учителем</h3>
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
                  background: isMe ? '#e1f5fe' : '#fff',
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
          placeholder={editingMessage ? "Редактирование..." : "Написать учителю..."}
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

export default StudentChat;
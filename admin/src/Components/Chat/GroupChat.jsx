import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../config/client';

const GroupChat = () => {
  const { uuid: chatUuid } = useParams(); // UUID группового чата (GroupModel)
  const navigate = useNavigate();

  const [chatName, setChatName] = useState('');
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState({ first: null, last: null, has_next: false });

  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null); // { id, text }
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const chatContainerRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Преобразование массива ответа от Django в удобный объект
  // Django meta: ["UUID", "text", "arriver", "sent_datetime", "is_read"]
  const parseMessage = (arr) => ({
    id: arr[0],
    text: arr[1],
    arriver: arr[2], // "me" если педагог, либо фамилия отправителя
    sentDatetime: arr[3],
    isRead: arr[4],
  });

  // 1. Первая загрузка чата через apiClient
  const fetchChatInfo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`admin/chat/${chatUuid}/`);
      const { name_chat, messages: rawMessages, pagination: pagData } = res.data.data;

      setChatName(name_chat);
      setPagination(pagData);

      // Поворачиваем массив (сервер отдаёт от новых к старым)
      const parsed = (rawMessages || []).map(parseMessage).reverse();
      setMessages(parsed);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить чат или нет прав доступа');
    } finally {
      setLoading(false);
    }
  }, [chatUuid]);

  useEffect(() => {
    isInitialLoad.current = true;
    fetchChatInfo();
  }, [fetchChatInfo]);

  // Скролл вниз при загрузке или при отправке новых сообщений
  useEffect(() => {
    if (chatContainerRef.current && (isInitialLoad.current || !loading)) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      isInitialLoad.current = false;
    }
  }, [messages, loading]);

  // 2. Периодический мониторинг (long-polling) новых сообщений
  useEffect(() => {
    if (loading || error) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      const lastMsgId = pagination.last;
      if (!lastMsgId) return;

      try {
        const res = await apiClient.get(`admin/message_group_monitoring/${chatUuid}/`, {
          params: { last: lastMsgId }
        });

        if (res.data.message === 'Update' && isSubscribed) {
          const newRawMessages = res.data.messages || [];
          const newParsed = newRawMessages.map(parseMessage).reverse();

          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const filteredNew = newParsed.filter((m) => !existingIds.has(m.id));
            return [...prev, ...filteredNew];
          });

          if (res.data.pagination) {
            setPagination((prev) => ({ ...prev, last: res.data.pagination.last }));
          }
        }
      } catch (err) {
        console.error('Monitoring error:', err);
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [chatUuid, pagination.last, loading, error]);

  // 3. Подгрузка старых сообщений при скролле к самому верху
  const handleScroll = async () => {
    if (!chatContainerRef.current || loadingMore || !pagination.has_next) return;

    if (chatContainerRef.current.scrollTop === 0 && pagination.first) {
      try {
        setLoadingMore(true);
        const currentScrollHeight = chatContainerRef.current.scrollHeight;

        const res = await apiClient.get(`admin/message_group_pagination/${chatUuid}/`, {
          params: {
            current_limit: pagination.first,
            earlier: 'true',
          },
        });

        const olderRaw = res.data.messages || [];
        const olderParsed = olderRaw.map(parseMessage).reverse();

        setMessages((prev) => [...olderParsed, ...prev]);
        setPagination((prev) => ({
          ...prev,
          first: res.data.pagination.first,
          has_next: res.data.pagination.has_previous,
        }));

        requestAnimationFrame(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight - currentScrollHeight;
          }
        });
      } catch (err) {
        console.error('Ошибка пагинации:', err);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  // 4. Отправка / Редактирование сообщений
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      if (editingMessage) {
        // PATCH: Редактировать можно только свои сообщения
        const res = await apiClient.patch(`admin/chat/${chatUuid}/`, {
          uuid: editingMessage.id,
          text: inputText,
        });

        const updatedData = res.data.data;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === updatedData.uuid ? { ...msg, text: updatedData.text } : msg
          )
        );
        setEditingMessage(null);
      } else {
        // POST: Создание сообщения
        const res = await apiClient.post(`admin/chat/${chatUuid}/`, {
          text: inputText,
        });

        const newMsgData = res.data.data;
        const newMsgObj = {
          id: newMsgData.uuid,
          text: newMsgData.text,
          arriver: 'me',
          sentDatetime: new Date().toISOString(),
          isRead: false,
        };

        setMessages((prev) => [...prev, newMsgObj]);
        setPagination((prev) => ({ ...prev, last: newMsgData.uuid }));
      }
      setInputText('');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка отправки сообщения');
    }
  };

  // 5. DELETE: Педагог может удалять ВСЕ сообщения
  const handleDelete = async (messageId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это сообщение?')) return;

    try {
      await apiClient.delete(`admin/chat/${chatUuid}/`, {
        data: { uuid: messageId },
      });

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при удалении');
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setInputText(msg.text);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  if (loading) return <div style={styles.centerContainer}>Загрузка чата...</div>;
  if (error) return <div style={{ ...styles.centerContainer, color: '#dc3545' }}>{error}</div>;

  return (
    <div style={styles.chatWrapper}>
      {/* Шапка чата */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>← Назад</button>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{chatName || 'Групповой чат'}</h2>
      </header>

      {/* Контейнер сообщений */}
      <div style={styles.messagesContainer} ref={chatContainerRef} onScroll={handleScroll}>
        {loadingMore && <div style={styles.loaderMore}>Загрузка более старых сообщений...</div>}

        {messages.map((msg) => {
          const isMe = msg.arriver === 'me';
          return (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                justifyContent: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{ ...styles.messageBubble, ...(isMe ? styles.myMessage : styles.otherMessage) }}>
                {!isMe && <div style={styles.senderName}>{msg.arriver}</div>}

                <div style={styles.messageText}>{msg.text}</div>

                <div style={styles.metaRow}>
                  <span style={styles.timeText}>
                    {new Date(msg.sentDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* ДЕЙСТВИЯ: Редактировать (только свои), Удалить (все) */}
                  <div style={styles.actionsBlock}>
                    {isMe && (
                      <button style={styles.actionBtn} onClick={() => handleStartEdit(msg)} title="Редактировать">
                        ✏️
                      </button>
                    )}
                    <button style={styles.actionBtn} onClick={() => handleDelete(msg.id)} title="Удалить">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ввод текста */}
      <form style={styles.inputForm} onSubmit={handleSubmit}>
        {editingMessage && (
          <div style={styles.editBar}>
            <span>Редактирование сообщения</span>
            <button type="button" onClick={handleCancelEdit} style={styles.cancelEditBtn}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <input
            type="text"
            style={styles.input}
            placeholder="Напишите сообщение..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" style={styles.sendBtn}>
            {editingMessage ? 'Сохранить' : 'Отправить'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GroupChat;

const styles = {
  chatWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '85vh',
    maxWidth: '800px',
    margin: '0 auto',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif',
  },
  centerContainer: { padding: '2rem', textAlign: 'center' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#fff',
    borderBottom: '1px solid #dee2e6',
  },
  backBtn: { background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontWeight: 'bold' },
  messagesContainer: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  loaderMore: { textAlign: 'center', fontSize: '0.8rem', color: '#6c757d', padding: '0.5rem' },
  messageRow: { display: 'flex' },
  messageBubble: {
    maxWidth: '70%',
    padding: '0.6rem 0.8rem',
    borderRadius: '12px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    position: 'relative',
  },
  myMessage: { backgroundColor: '#d1e7dd', color: '#0f5132', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#fff', color: '#212529', alignSelf: 'flex-start' },
  senderName: { fontSize: '0.75rem', fontWeight: 'bold', color: '#0d6efd', marginBottom: '0.25rem' },
  messageText: { fontSize: '0.95rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap' },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.4rem',
    gap: '0.5rem',
  },
  timeText: { fontSize: '0.7rem', color: '#6c757d' },
  actionsBlock: { display: 'flex', gap: '0.2rem' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px' },
  inputForm: {
    padding: '0.75rem',
    backgroundColor: '#fff',
    borderTop: '1px solid #dee2e6',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  editBar: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: '#0d6efd',
    backgroundColor: '#e7f1ff',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
  },
  cancelEditBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#0d6efd', fontWeight: 'bold' },
  input: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #ced4da',
    outline: 'none',
  },
  sendBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
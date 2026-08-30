import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../config/client';
import { useParams } from 'react-router-dom';

const StudentChat = () => {
  const { uuid: teacherUuid } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [lastId, setLastId] = useState(null);
  const [pagination, setPagination] = useState({ first: null, last: null, has_previous: false });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!teacherUuid) return;
    initChat();

    const interval = setInterval(() => {
      checkMonitoring();
    }, 3000);

    return () => clearInterval(interval);
  }, [teacherUuid, lastId]);

  useEffect(() => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages]);

  const initChat = async () => {
    setInitialLoading(true);
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
      console.error('Ошибка при открытии чата:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const checkMonitoring = async () => {
    if (!lastId) return;
    try {
      const res = await apiClient.get(
        `students/parent/chats/${teacherUuid}/monitoring/?last=${lastId}`
      );
      if (res.data.message === 'Update' && res.data.new_messages) {
        setMessages((prev) => [...prev, ...res.data.new_messages]);
        setLastId(res.data.last_id);
      }
    } catch (err) {
      console.error('Ошибка при мониторинге:', err);
    }
  };

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
      console.error('Ошибка при подгрузке истории:', err);
    } finally {
      setLoading(false);
    }
  };

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
          prev.map((m) =>
            m.id === editingMessage.id ? { ...m, text: inputText } : m
          )
        );
        setEditingMessage(null);
        setInputText('');
      } catch (err) {
        console.error('Ошибка редактирования:', err);
      }
    } else {
      try {
        await apiClient.post(`students/parent/chats/${teacherUuid}/`, {
          text: inputText
        });
        setInputText('');
        checkMonitoring();
      } catch (err) {
        console.error('Ошибка отправки:', err);
      }
    }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm('Удалить сообщение?')) return;

    try {
      await apiClient.delete(`students/parent/chats/${teacherUuid}/`, {
        data: { uuid: msgId }
      });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  const startEditing = (msg) => {
    setEditingMessage(msg);
    setInputText(msg.text);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long'
    });

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] min-h-[500px] w-full max-w-4xl flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-lg">
      {/* Шапка */}
      <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-sm">
            Ч
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-serif text-xl font-semibold text-card-foreground">
              Чат с учителем
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Личные сообщения
            </p>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Онлайн-чат
        </div>
      </header>

      {/* Область сообщений */}
      <main
        ref={chatContainerRef}
        className="hide-scrollbar flex-1 overflow-y-auto bg-background px-3 py-5 sm:px-6"
      >
        {pagination.has_previous && (
          <div className="mb-5 flex justify-center">
            <button
              type="button"
              onClick={loadEarlierMessages}
              disabled={loading}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Загрузка...' : '↑ Загрузить предыдущие сообщения'}
            </button>
          </div>
        )}

        {initialLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              Загрузка чата...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center">
            <div className="max-w-xs text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl">
                💬
              </div>
              <p className="font-serif text-lg font-semibold text-foreground">
                Пока нет сообщений
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Напишите учителю — сообщение появится здесь.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isMe = msg.sender === 'me';
              const previousMessage = messages[index - 1];
              const showDate =
                !previousMessage ||
                new Date(previousMessage.created_at).toLocaleDateString() !==
                  new Date(msg.created_at).toLocaleDateString();

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {formatDate(msg.created_at)}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  <div className={`group flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={[
                        'relative max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%]',
                        isMe
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md border border-border bg-card text-card-foreground'
                      ].join(' ')}
                    >
                      {!isMe && (
                        <div className="mb-1 text-xs font-bold text-secondary">
                          {msg.sender}
                        </div>
                      )}

                      <div className="whitespace-pre-wrap break-words text-sm leading-6">
                        {msg.text}
                      </div>

                      <div
                        className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                          isMe
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <span>{formatTime(msg.created_at)}</span>
                        {isMe && <span>{msg.is_read ? '✓✓' : '✓'}</span>}
                      </div>

                      {isMe && (
                        <div className="mt-2 flex justify-end gap-1 border-t border-primary-foreground/15 pt-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => startEditing(msg)}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-primary-foreground/85 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-primary-foreground/85 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>

      {/* Панель ввода */}
      <footer className="border-t border-border bg-card p-3 sm:p-4">
        {editingMessage && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-secondary" />
              <span className="truncate text-xs font-semibold text-foreground">
                Редактирование сообщения
              </span>
            </div>
            <button
              type="button"
              onClick={cancelEditing}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-card hover:text-foreground"
            >
              Отмена
            </button>
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 rounded-2xl border border-input bg-background p-1.5 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              editingMessage ? 'Измените сообщение...' : 'Написать учителю...'
            }
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {editingMessage ? 'Сохранить' : 'Отправить'}
          </button>
        </form>
      </footer>
    </div>
  );
};

export default StudentChat;

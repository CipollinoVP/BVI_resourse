import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useLocation } from 'react-router-dom';

import apiClient from '../config/client';
import { useAuth } from './AuthContext';

// Как часто обновлять счётчики, пока страница открыта
const REFRESH_INTERVAL_MS = 20000;

const EMPTY_UNREAD = {
    total: 0,
    group_total: 0,
    personal_total: 0,
    group_chats: {},
    personal_chats: {},
    classes: {},
    personal_outside_classes: [],
};

const UnreadContext = createContext({
    ...EMPTY_UNREAD,
    refreshUnread: () => {},
});

export const UnreadProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    const [unread, setUnread] = useState(EMPTY_UNREAD);

    // Номер последнего запроса: ответ более старого запроса
    // не должен затирать более свежие данные.
    const requestId = useRef(0);

    const refreshUnread = useCallback(async () => {
        if (!localStorage.getItem('access_token')) return;

        const currentRequest = ++requestId.current;

        try {
            const response = await apiClient.get('unread/');

            if (currentRequest === requestId.current) {
                setUnread({ ...EMPTY_UNREAD, ...response.data });
            }
        } catch (err) {
            console.error('Не удалось загрузить непрочитанные:', err);
        }
    }, []);

    // При входе на ресурс и при каждом переходе между страницами
    useEffect(() => {
        if (!isAuthenticated) {
            requestId.current++;
            setUnread(EMPTY_UNREAD);
            return;
        }

        refreshUnread();
    }, [isAuthenticated, location.pathname, refreshUnread]);

    // Периодически и при возвращении на вкладку
    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(refreshUnread, REFRESH_INTERVAL_MS);

        const handleVisible = () => {
            if (document.visibilityState === 'visible') {
                refreshUnread();
            }
        };

        document.addEventListener('visibilitychange', handleVisible);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisible);
        };
    }, [isAuthenticated, refreshUnread]);

    return (
        <UnreadContext.Provider value={{ ...unread, refreshUnread }}>
            {children}
        </UnreadContext.Provider>
    );
};

export const useUnread = () => useContext(UnreadContext);

import React, {
    createContext,
    useContext,
    useState,
} from 'react';

import { authService } from '../service/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(
        () => localStorage.getItem('access_token')
    );

    const [userType, setUserType] = useState(
        () => localStorage.getItem('user_type')
    );

    const login = async (username, password) => {
        const { access, refresh } =
            await authService.login(username, password);

        try {
            const typeData =
                await authService.checkUserType(access);

            if ((typeData?.type !== 'child') && (typeData?.type !== 'parent')) {
                throw new Error(
                    'Доступ запрещён. Обратитесь в поддержку: info@bviisostudia.ru'
                );
            }

            localStorage.setItem(
                'access_token',
                access
            );

            localStorage.setItem(
                'refresh_token',
                refresh
            );

            localStorage.setItem(
                'user_type',
                typeData.type
            );

            setToken(access);
            setUserType(typeData.type);

            return {
                success: true,
            };
        } catch (error) {
            logout();
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_type');

        setToken(null);
        setUserType(null);
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                userType,
                login,
                logout,
                isAuthenticated: !!token,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
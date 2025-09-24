import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Permission } from '../types';
import { authService, hasPermission } from '../services/auth';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    logout: () => Promise<void>;
    register: (userData: RegisterData) => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;
    hasPermission: (permission: Permission) => boolean;
    isLoading: boolean;
}

interface RegisterData {
    name: string;
    email: string;
    password: string;
    companyName: string;
    role: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string, rememberMe?: boolean) => {
        try {
            const loggedInUser = await authService.login(email, password, rememberMe);
            setUser(loggedInUser);
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
            setUser(null);
        } catch (error) {
            throw error;
        }
    };

    const register = async (userData: RegisterData) => {
        try {
            const newUser = await authService.register(userData);
            setUser(newUser);
        } catch (error) {
            throw error;
        }
    };

    const requestPasswordReset = async (email: string) => {
        try {
            await authService.requestPasswordReset(email);
        } catch (error) {
            throw error;
        }
    };

    const resetPassword = async (token: string, newPassword: string) => {
        try {
            await authService.resetPassword(token, newPassword);
        } catch (error) {
            throw error;
        }
    };

    const checkPermission = (permission: Permission) => {
        return user ? hasPermission(user, permission) : false;
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        requestPasswordReset,
        resetPassword,
        hasPermission: checkPermission,
        isLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;

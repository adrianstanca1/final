import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { firebaseAuthService } from '../services/firebaseAuth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    loginWithGoogle: () => Promise<User>;
    register: (email: string, password: string, userData: Partial<User>, companyData: any) => Promise<User>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const FirebaseAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = firebaseAuthService.onAuthStateChange((user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string): Promise<User> => {
        const user = await firebaseAuthService.login(email, password);
        setUser(user);
        return user;
    };

    const loginWithGoogle = async (): Promise<User> => {
        const user = await firebaseAuthService.loginWithGoogle();
        setUser(user);
        return user;
    };

    const register = async (
        email: string,
        password: string,
        userData: Partial<User>,
        companyData: any
    ): Promise<User> => {
        const user = await firebaseAuthService.register(email, password, userData, companyData);
        setUser(user);
        return user;
    };

    const logout = async (): Promise<void> => {
        await firebaseAuthService.logout();
        setUser(null);
    };

    const resetPassword = async (email: string): Promise<void> => {
        return firebaseAuthService.resetPassword(email);
    };

    const updateProfile = async (updates: Partial<User>): Promise<User> => {
        const updatedUser = await firebaseAuthService.updateProfile(updates);
        setUser(updatedUser);
        return updatedUser;
    };

    const value = {
        user,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        resetPassword,
        updateProfile
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default FirebaseAuthProvider;
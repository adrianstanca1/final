import React from 'react';
import { AuthProvider as MockAuthProvider } from '../contexts/AuthContext';
import { AuthProvider as SupabaseAuthProvider } from '../contexts/SupabaseAuthContext';

interface AppAuthProviderProps {
    children: React.ReactNode;
    useSupabase?: boolean;
}

export const AppAuthProvider: React.FC<AppAuthProviderProps> = ({
    children,
    useSupabase = false
}) => {
    if (useSupabase) {
        return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
    }

    return <MockAuthProvider>{children}</MockAuthProvider>;
};
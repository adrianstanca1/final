import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

/**
 * A component for testing authentication flows with Supabase
 */
export const AuthTest: React.FC = () => {
    const {
        isAuthenticated,
        user,
        login,
        loginWithGoogle,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
        error: authError,
        loading
    } = useAuth();

    const [email, setEmail] = useState('test@example.com');
    const [password, setPassword] = useState('Password123!');
    const [newPassword, setNewPassword] = useState('NewPassword123!');
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset' | 'profile'>('login');

    useEffect(() => {
        if (authError) {
            setMessage(`Error: ${authError}`);
        }
    }, [authError]);

    useEffect(() => {
        setIsLoading(loading);
    }, [loading]);

    // Test Login
    const handleLogin = async () => {
        setMessage(null);
        try {
            setIsLoading(true);
            const result = await login({ email, password });
            setMessage(result.success ? 'Login successful!' : 'Login failed');
        } catch (err: any) {
            setMessage(`Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Test Google Login
    const handleGoogleLogin = async () => {
        setMessage(null);
        try {
            await loginWithGoogle();
            setMessage('Redirecting to Google login...');
        } catch (err: any) {
            setMessage(`Error: ${err.message}`);
        }
    };

    // Test Registration
    const handleRegister = async () => {
        setMessage(null);
        try {
            setIsLoading(true);
            await register({
                email,
                password,
                firstName: 'Test',
                lastName: 'User',
                role: 'PROJECT_MANAGER'
            });
            setMessage('Registration successful!');
        } catch (err: any) {
            setMessage(`Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Test Logout
    const handleLogout = async () => {
        setMessage(null);
        try {
            setIsLoading(true);
            await logout();
            setMessage('Logged out successfully');
        } catch (err: any) {
            setMessage(`Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Test Password Reset Request
    const handleRequestReset = async () => {
        setMessage(null);
        try {
            setIsLoading(true);
            await requestPasswordReset(email);
            setMessage('Password reset email sent!');
        } catch (err: any) {
            setMessage(`Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Test Password Reset
    const handleResetPassword = async () => {
        setMessage(null);
        try {
            setIsLoading(true);
            await resetPassword(newPassword);
            setMessage('Password reset successful!');
        } catch (err: any) {
            setMessage(`Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="max-w-md mx-auto">
                <Card className="p-6">
                    <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>

                    {message && (
                        <div className={`p-3 mb-4 rounded ${message.includes('Error') ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-800'}`}>
                            {message}
                        </div>
                    )}

                    <div className="mb-4">
                        <div className="flex border-b mb-4">
                            <button
                                className={`px-4 py-2 ${activeTab === 'login' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
                                onClick={() => setActiveTab('login')}
                            >
                                Login
                            </button>
                            <button
                                className={`px-4 py-2 ${activeTab === 'register' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
                                onClick={() => setActiveTab('register')}
                            >
                                Register
                            </button>
                            <button
                                className={`px-4 py-2 ${activeTab === 'reset' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
                                onClick={() => setActiveTab('reset')}
                            >
                                Reset
                            </button>
                            <button
                                className={`px-4 py-2 ${activeTab === 'profile' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                Profile
                            </button>
                        </div>

                        {activeTab === 'login' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <Button onClick={handleLogin} isLoading={isLoading} className="w-full">
                                    Login
                                </Button>
                                <Button onClick={handleGoogleLogin} variant="outline" className="w-full flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                                        />
                                    </svg>
                                    Login with Google
                                </Button>
                            </div>
                        )}

                        {activeTab === 'register' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <Button onClick={handleRegister} isLoading={isLoading} className="w-full">
                                    Register
                                </Button>
                            </div>
                        )}

                        {activeTab === 'reset' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Email for Reset</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <Button onClick={handleRequestReset} isLoading={isLoading} className="w-full">
                                    Send Reset Link
                                </Button>

                                <div className="pt-4 border-t mt-4">
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <Button onClick={handleResetPassword} isLoading={isLoading} className="w-full">
                                    Reset Password
                                </Button>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="space-y-4">
                                {isAuthenticated ? (
                                    <div>
                                        <h3 className="font-medium mb-2">User Profile</h3>
                                        <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-60">
                                            {JSON.stringify(user, null, 2)}
                                        </pre>
                                        <Button onClick={handleLogout} className="w-full mt-4" isLoading={isLoading}>
                                            Logout
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center p-4 text-muted-foreground">
                                        Not logged in
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                <div className="mt-4 text-sm text-muted-foreground text-center">
                    <p>This component is for testing purposes only.</p>
                </div>
            </div>
        </div>
    );
};
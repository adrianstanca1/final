import React, { useState, useEffect } from 'react';
import { LoginCredentials } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

type LoginStep = 'credentials';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
  const { login, loginWithGoogle, error: authError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    setError(authError);
  }, [authError]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const newErrors: { email?: string; password?: string } = {};
    if (!validateEmail(email)) newErrors.email = "Please enter a valid email.";
    if (password.length < 6) newErrors.password = "Password is too short.";

    setValidationErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setIsLoading(true);
      const res = await login({ email, password, rememberMe });
      if (!res.success) {
        setError("Login failed. Please check your credentials.");
      }
      // Auth context handles successful login state change
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsLoading(true);
      await loginWithGoogle();
      // Redirect will happen automatically
    } catch (err: any) {
      setError(err.message || "Google login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleCredentialSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">Email Address</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${validationErrors.email ? 'border-destructive' : 'border-border'}`} />
        {validationErrors.email && <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">Password</label>
        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${validationErrors.password ? 'border-destructive' : 'border-border'}`} />
        {validationErrors.password && <p className="text-xs text-destructive mt-1">{validationErrors.password}</p>}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input id="remember-me" type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 text-primary focus:ring-ring border-border rounded" />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-muted-foreground">Remember me</label>
        </div>
        <div className="text-sm">
          <button type="button" onClick={onSwitchToForgotPassword} className="font-medium text-primary hover:text-primary/90">Forgot your password?</button>
        </div>
      </div>
      <div>
        <Button type="submit" className="w-full" isLoading={isLoading}>Sign in</Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div>
        <Button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
          variant="outline"
          isLoading={isLoading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
            />
          </svg>
          Sign in with Google
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10 text-primary">
            <path fill="currentColor" d="M12 2L2 22h20L12 2z" />
          </svg>
          <h1 className="text-3xl font-bold text-foreground">AS Agents</h1>
        </div>
        <h2 className="text-muted-foreground">
          Sign in to your account
        </h2>
      </div>
      <Card className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">{error}</div>}
        {renderLoginForm()}
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Not a member?{' '}
        <button onClick={onSwitchToRegister} className="font-semibold text-primary hover:text-primary/80">
          Create an account
        </button>
      </p>
    </div>
  );
};

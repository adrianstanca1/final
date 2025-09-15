import React, { useState, useEffect, useRef } from 'react';
import { User, LoginCredentials } from '../types';
import { authApi } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface LoginProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
}

type LoginStep = 'credentials' | 'mfa';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
    const [step, setStep] = useState<LoginStep>('credentials');
    const [email, setEmail] = useState('david@constructco.com');
    const [password, setPassword] = useState('password123');
    const [mfaCode, setMfaCode] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string, mfa?: string }>({});
    
    const [userId, setUserId] = useState<string | null>(null);

    const mfaInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (step === 'mfa') {
        mfaInputRef.current?.focus();
      }
    }, [step]);
    
    const handleCredentialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const newErrors: { email?: string; password?: string } = {};
        if (!validateEmail(email)) newErrors.email = "Please enter a valid email.";
        if (password.length < 6) newErrors.password = "Password is too short.";
        
        setValidationErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        
        setIsLoading(true);
        try {
            // FIX: Corrected API call to use the exported authApi object.
            const res = await authApi.login({ email, password });
            if (res.success && res.userId) {
                if (res.mfaRequired) {
                    setUserId(res.userId);
                    setStep('mfa');
                } else {
                    // This path is not implemented in mock data, as we need a user object.
                    // A real API would return the user object here.
                    setError("Login successful, but user data could not be retrieved.");
                }
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (mfaCode.length !== 6) {
            setValidationErrors({ mfa: "Code must be 6 digits." });
            return;
        }
        
        setIsLoading(true);
        try {
            if (!userId) throw new Error("User ID not found");
            // FIX: Corrected API call to use the exported authApi object.
            const res = await authApi.verifyMfa(userId, mfaCode);
            if (res.success && res.user) {
                onLogin(res.user);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred during MFA verification.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderCredentialStep = () => (
      <form onSubmit={handleCredentialSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">Email Address</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required 
                 className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${validationErrors.email ? 'border-destructive' : 'border-border'}`} />
          {validationErrors.email && <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>}
        </div>
        <div>
          <label htmlFor="password"  className="block text-sm font-medium text-muted-foreground">Password</label>
          <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required 
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${validationErrors.password ? 'border-destructive' : 'border-border'}`} />
          {validationErrors.password && <p className="text-xs text-destructive mt-1">{validationErrors.password}</p>}
        </div>
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <input id="remember-me" type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 text-primary focus:ring-ring border-border rounded"/>
                <label htmlFor="remember-me" className="ml-2 block text-sm text-muted-foreground">Remember me</label>
            </div>
            <div className="text-sm">
                <a href="#" className="font-medium text-primary hover:text-primary/90">Forgot your password?</a>
            </div>
        </div>
        <div>
          <Button type="submit" className="w-full" isLoading={isLoading}>Sign in</Button>
        </div>
      </form>
    );

    const renderMfaStep = () => (
      <form onSubmit={handleMfaSubmit} className="space-y-6">
        <div className="text-center">
            <h3 className="text-lg font-medium text-foreground">Two-Factor Authentication</h3>
            <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
        </div>
        <div>
          <label htmlFor="mfa" className="sr-only">Authentication Code</label>
          <input id="mfa" type="text" ref={mfaInputRef} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))} maxLength={6} required
                 className={`block w-full text-center text-2xl tracking-[0.5em] px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${validationErrors.mfa ? 'border-destructive' : 'border-border'}`} />
          {validationErrors.mfa && <p className="text-xs text-destructive mt-1 text-center">{validationErrors.mfa}</p>}
        </div>
         <div>
          <Button type="submit" className="w-full" isLoading={isLoading}>Verify</Button>
        </div>
         <div className="text-center">
            <button type="button" onClick={() => setStep('credentials')} className="text-sm font-medium text-primary hover:text-primary/90">Back to login</button>
        </div>
      </form>
    );
  
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
             <div className="inline-flex items-center justify-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10 text-primary">
                    <path fill="currentColor" d="M12 2L2 22h20L12 2z"/>
                </svg>
                <h1 className="text-3xl font-bold text-foreground">AS Agents</h1>
            </div>
          <h2 className="text-muted-foreground">
            Sign in to your account
          </h2>
        </div>
        <Card className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">{error}</div>}
            {step === 'credentials' ? renderCredentialStep() : renderMfaStep()}
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

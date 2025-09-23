import React, { useState, useEffect, useRef } from 'react';
import { LoginCredentials } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { persistRememberedEmail, readRememberedEmail } from '../utils/authRememberMe';
import { AuthEnvironmentNotice } from './auth/AuthEnvironmentNotice';
import { identity } from '../services/identityProvider';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

type LoginStep = 'credentials' | 'mfa';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
  const { login, verifyMfaAndFinalize, error: authError, loading: isLoading } = useAuth();
  const [step, setStep] = useState<LoginStep>('credentials');
  const initialRememberedEmail = readRememberedEmail();
  const [email, setEmail] = useState(initialRememberedEmail);
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [rememberMe, setRememberMe] = useState(initialRememberedEmail !== '');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string; mfa?: string }>({});

  const [userId, setUserId] = useState<string | null>(null);

  const mfaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setError(authError);
  }, [authError]);

  useEffect(() => {
    if (!rememberMe) {
      persistRememberedEmail(false, '');
    }
  }, [rememberMe]);

  useEffect(() => {
    if (step === 'mfa') {
      mfaInputRef.current?.focus();
    }
  }, [step]);

  const clearValidationError = (field: 'email' | 'password' | 'mfa') => {
    setValidationErrors(prev => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const newErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) newErrors.email = "Please enter a valid email.";
    if (password.length < 6) newErrors.password = "Password is too short.";

    setValidationErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setIsSubmittingCredentials(true);
      setEmail(trimmedEmail);
      const res = await login({ email: trimmedEmail, password, rememberMe });
      if (res.mfaRequired && res.userId) {
        setUserId(res.userId);
        setStep('mfa');
        setMfaCode('');
        setValidationErrors(prev => {
          if (!prev.mfa) {
            return prev;
          }
          const next = { ...prev };
          delete next.mfa;
          return next;
        });
      } else {
        persistRememberedEmail(rememberMe, trimmedEmail.toLowerCase());
      }
      setPassword('');
      // If not MFA, the AuthProvider handles the redirect and state change.
    } catch (err) {
      // Error is handled and set by the AuthContext, no need to set it here.
    } finally {
      setIsSubmittingCredentials(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mfaCode.length !== 6) {
      setValidationErrors({ mfa: "Code must be 6 digits." });
      return;
    }

    try {
      setIsSubmittingCredentials(true);
      if (!userId) throw new Error("User ID not found");
      await verifyMfaAndFinalize(userId, mfaCode);
      persistRememberedEmail(rememberMe, email.trim().toLowerCase());
      setMfaCode('');
      // On success, AuthProvider will handle redirect.
    } catch (err) {
      // Error is handled and set by the AuthContext
    } finally {
      setIsSubmittingCredentials(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setIsGoogleLoading(true);
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      await identity.loginWithGoogle(redirectTo);
    } catch (e: any) {
      setError(e?.message || 'Google login failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebook = async () => {
    try {
      setIsFacebookLoading(true);
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      await identity.loginWithFacebook(redirectTo);
    } catch (e: any) {
      setError(e?.message || 'Facebook login failed');
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const handleApple = async () => {
    try {
      setIsAppleLoading(true);
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      await identity.loginWithApple(redirectTo);
    } catch (e: any) {
      setError(e?.message || 'Apple login failed');
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleMagicLink = async () => {
    try {
      setIsMagicLoading(true);
      const trimmedEmail = email.trim();
      if (!validateEmail(trimmedEmail)) {
        setValidationErrors({ email: 'Enter a valid email to receive a magic link.' });
        return;
      }
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      await identity.loginWithMagicLink(trimmedEmail, redirectTo);
      setError(null);
      alert('Magic link sent! Check your email.');
    } catch (e: any) {
      setError(e?.message || 'Could not send magic link');
    } finally {
      setIsMagicLoading(false);
    }
  };

  const renderCredentialStep = () => (
    <form onSubmit={handleCredentialSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            clearValidationError('email');
            setError(null);
          }}
          required
          autoComplete="email"
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${validationErrors.email ? 'border-destructive' : 'border-border'}`}
        />
        {validationErrors.email && <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">Password</label>
        <div className="relative mt-1">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              clearValidationError('password');
              setError(null);
            }}
            required
            autoComplete="current-password"
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm pr-12 ${validationErrors.password ? 'border-destructive' : 'border-border'}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            className="absolute inset-y-0 right-2 flex items-center text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
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
      <div className="space-y-2">
        <Button type="submit" className="w-full" isLoading={isSubmittingCredentials || isLoading} disabled={isGoogleLoading || isMagicLoading || isFacebookLoading || isAppleLoading}>Sign in</Button>
        <button type="button" onClick={handleGoogle} disabled={isSubmittingCredentials || isMagicLoading || isFacebookLoading || isAppleLoading || isLoading} className="w-full rounded-md border border-border p-2 text-sm">
          {isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>
        <button type="button" onClick={handleFacebook} disabled={isSubmittingCredentials || isGoogleLoading || isMagicLoading || isAppleLoading || isLoading} className="w-full rounded-md border border-border p-2 text-sm">
          {isFacebookLoading ? 'Redirecting…' : 'Continue with Facebook'}
        </button>
        <button type="button" onClick={handleApple} disabled={isSubmittingCredentials || isGoogleLoading || isMagicLoading || isFacebookLoading || isLoading} className="w-full rounded-md border border-border p-2 text-sm">
          {isAppleLoading ? 'Redirecting…' : 'Continue with Apple'}
        </button>
        <button type="button" onClick={handleMagicLink} disabled={isSubmittingCredentials || isGoogleLoading || isFacebookLoading || isAppleLoading || isLoading} className="w-full rounded-md border border-dashed p-2 text-sm">
          {isMagicLoading ? 'Sending magic link…' : 'Email me a magic link'}
        </button>
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
        <input
          id="mfa"
          type="text"
          ref={mfaInputRef}
          value={mfaCode}
          onChange={e => {
            const sanitized = e.target.value.replace(/\D/g, '');
            setMfaCode(sanitized);
            clearValidationError('mfa');
            setError(null);
          }}
          maxLength={6}
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`block w-full text-center text-2xl tracking-[0.5em] px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${validationErrors.mfa ? 'border-destructive' : 'border-border'}`}
        />
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
            <path fill="currentColor" d="M12 2L2 22h20L12 2z" />
          </svg>
          <h1 className="text-3xl font-bold text-foreground">AS Agents</h1>
        </div>
        <h2 className="text-muted-foreground">
          Sign in to your account
        </h2>
      </div>
      <Card className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <AuthEnvironmentNotice className="mb-4" />
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

import React, { useState, useEffect, useRef } from 'react';
import { LoginCredentials, SocialProvider } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

type LoginStep = 'credentials' | 'mfa';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
    const { login, verifyMfaAndFinalize, socialLogin, error: authError, loading: isLoading } = useAuth();
    const [step, setStep] = useState<LoginStep>('credentials');
    const [email, setEmail] = useState('admin@ascladding.com');
    const [password, setPassword] = useState('password123');
    const [mfaCode, setMfaCode] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string, mfa?: string }>({});

    const [userId, setUserId] = useState<string | null>(null);
    const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(null);
    const [socialForm, setSocialForm] = useState({
        email: '',
        firstName: '',
        lastName: '',
        companyName: '',
    });
    const [socialErrors, setSocialErrors] = useState<{ email?: string; firstName?: string; lastName?: string; form?: string }>({});
    const [socialSubmitting, setSocialSubmitting] = useState(false);
    const providerLabels: Record<SocialProvider, string> = {
        google: 'Google',
        facebook: 'Facebook',
    };

    const mfaInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setError(authError);
    }, [authError]);

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
        
        try {
            const res = await login({ email, password, rememberMe });
            if (res.mfaRequired && res.userId) {
                setUserId(res.userId);
                setStep('mfa');
            }
            // If not MFA, the AuthProvider handles the redirect and state change.
        } catch (err) {
            // Error is handled and set by the AuthContext, no need to set it here.
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
            if (!userId) throw new Error("User ID not found");
            await verifyMfaAndFinalize(userId, mfaCode);
            // On success, AuthProvider will handle redirect.
        } catch (err) {
             // Error is handled and set by the AuthContext
        }
    };

    const openSocialDialog = (provider: SocialProvider) => {
        setActiveProvider(provider);
        setSocialForm({ email: '', firstName: '', lastName: '', companyName: '' });
        setSocialErrors({});
    };

    const closeSocialDialog = () => {
        if (socialSubmitting) return;
        setActiveProvider(null);
        setSocialErrors({});
    };

    const handleSocialFieldChange = (field: 'email' | 'firstName' | 'lastName' | 'companyName', value: string) => {
        setSocialForm(prev => ({ ...prev, [field]: value }));
        if (socialErrors[field]) {
            setSocialErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
        if (socialErrors.form) {
            setSocialErrors(prev => ({ ...prev, form: undefined }));
        }
    };

    const handleSocialSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!activeProvider) return;

        const newErrors: typeof socialErrors = {};
        if (!validateEmail(socialForm.email)) newErrors.email = 'Please enter a valid email address.';
        if (!socialForm.firstName.trim()) newErrors.firstName = 'First name is required.';
        if (!socialForm.lastName.trim()) newErrors.lastName = 'Last name is required.';
        setSocialErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        try {
            setSocialSubmitting(true);
            const companyName = socialForm.companyName.trim() || `${socialForm.firstName.trim()} Projects`;
            await socialLogin(activeProvider, {
                provider: activeProvider,
                email: socialForm.email.trim(),
                firstName: socialForm.firstName.trim(),
                lastName: socialForm.lastName.trim(),
                companyName,
                companySelection: 'create',
                token: `${activeProvider}-${Date.now()}`,
            });
            setActiveProvider(null);
        } catch (err: any) {
            setSocialErrors(prev => ({ ...prev, form: err?.message || 'Social sign-in failed. Please try again.' }));
        } finally {
            setSocialSubmitting(false);
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
                <button type="button" onClick={onSwitchToForgotPassword} className="font-medium text-primary hover:text-primary/90">Forgot your password?</button>
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
            {step === 'credentials' ? (
                <>
                    {renderCredentialStep()}
                    <div className="mt-6">
                        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                            <span className="flex-1 h-px bg-border" aria-hidden="true"></span>
                            <span>Or continue with</span>
                            <span className="flex-1 h-px bg-border" aria-hidden="true"></span>
                        </div>
                        <div className="mt-4 grid gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full border border-border bg-background text-foreground hover:bg-accent"
                                onClick={() => openSocialDialog('google')}
                                disabled={isLoading}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-[#4285F4]">
                                        <path fill="currentColor" d="M21.35 11.1h-9.17v2.96h5.44c-.24 1.42-1.64 4.17-5.44 4.17-3.27 0-5.94-2.71-5.94-6.05 0-3.34 2.67-6.05 5.94-6.05 1.86 0 3.11.79 3.82 1.48l2.61-2.52C17.22 3.71 15.1 2.7 12.62 2.7 7.8 2.7 3.99 6.47 3.99 11.18c0 4.71 3.81 8.48 8.63 8.48 4.99 0 8.29-3.5 8.29-8.43 0-.57-.06-1-.14-1.46Z" />
                                    </svg>
                                    Continue with Google
                                </span>
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full border border-border bg-background text-foreground hover:bg-accent"
                                onClick={() => openSocialDialog('facebook')}
                                disabled={isLoading}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-[#1877F2]">
                                        <path fill="currentColor" d="M22 12.07C22 6.53 17.52 2 12 2S2 6.53 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H7.9v-2.9h2.54V9.41c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22c4.78-.75 8.44-4.91 8.44-9.93Z" />
                                    </svg>
                                    Continue with Facebook
                                </span>
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                renderMfaStep()
            )}
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
            Not a member?{' '}
            <button onClick={onSwitchToRegister} className="font-semibold text-primary hover:text-primary/80">
                Create an account
            </button>
        </p>
        {activeProvider && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={closeSocialDialog}>
                <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Continue with {providerLabels[activeProvider]}</h3>
                            <p className="text-sm text-muted-foreground">Link your {providerLabels[activeProvider]} identity to access the platform.</p>
                        </div>
                        <button onClick={closeSocialDialog} className="text-muted-foreground hover:text-foreground" aria-label="Close social login dialog">×</button>
                    </div>
                    {socialErrors.form && (
                        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                            {socialErrors.form}
                        </div>
                    )}
                    <form onSubmit={handleSocialSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground" htmlFor="social-email">Work email</label>
                            <input
                                id="social-email"
                                type="email"
                                value={socialForm.email}
                                onChange={e => handleSocialFieldChange('email', e.target.value)}
                                className={`mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${socialErrors.email ? 'border-destructive' : 'border-border'}`}
                                placeholder="you@company.com"
                                required
                            />
                            {socialErrors.email && <p className="mt-1 text-xs text-destructive">{socialErrors.email}</p>}
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground" htmlFor="social-first-name">First name</label>
                                <input
                                    id="social-first-name"
                                    type="text"
                                    value={socialForm.firstName}
                                    onChange={e => handleSocialFieldChange('firstName', e.target.value)}
                                    className={`mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${socialErrors.firstName ? 'border-destructive' : 'border-border'}`}
                                    required
                                />
                                {socialErrors.firstName && <p className="mt-1 text-xs text-destructive">{socialErrors.firstName}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground" htmlFor="social-last-name">Last name</label>
                                <input
                                    id="social-last-name"
                                    type="text"
                                    value={socialForm.lastName}
                                    onChange={e => handleSocialFieldChange('lastName', e.target.value)}
                                    className={`mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${socialErrors.lastName ? 'border-destructive' : 'border-border'}`}
                                    required
                                />
                                {socialErrors.lastName && <p className="mt-1 text-xs text-destructive">{socialErrors.lastName}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground" htmlFor="social-company">Workspace name</label>
                            <input
                                id="social-company"
                                type="text"
                                value={socialForm.companyName}
                                onChange={e => handleSocialFieldChange('companyName', e.target.value)}
                                className="mt-1 w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g. Skyline Delivery Team"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button type="button" variant="secondary" onClick={closeSocialDialog} disabled={socialSubmitting}>Cancel</Button>
                            <Button type="submit" isLoading={socialSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                Continue with {providerLabels[activeProvider]}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        )}
      </div>
    );
};

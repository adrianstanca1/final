import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { authClient, InvitePreview } from '../services/authClient';
import { CompanyType, RegistrationPayload, Role } from '../types';
import { AuthEnvironmentNotice } from './auth/AuthEnvironmentNotice';
import {
    clearRegistrationDraft,
    loadRegistrationDraft,
    saveRegistrationDraft,
    type RegistrationStep,
    registrationDraftHasContent,
} from '../utils/registrationDraft';
import { persistRememberedEmail } from '../utils/authRememberMe';

interface UserRegistrationProps {
    onSwitchToLogin: () => void;
}

type FormErrors = Partial<Record<keyof RegistrationState, string>>;

interface RegistrationState {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    companySelection: 'create' | 'join' | '';
    companyName: string;
    companyType: CompanyType | '';
    companyEmail: string;
    companyPhone: string;
    companyWebsite: string;
    inviteToken: string;
    role: Role | '';
    updatesOptIn: boolean;
    termsAccepted: boolean;
}

const INITIAL_STATE: RegistrationState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companySelection: '',
    companyName: '',
    companyType: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    inviteToken: '',
    role: '',
    updatesOptIn: true,
    termsAccepted: false,
};

const PasswordStrengthIndicator: React.FC<{ password?: string }> = ({ password = '' }) => {
    const getStrength = () => {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    };

    const strength = getStrength();
    const width = (strength / 5) * 100;

    let color = 'bg-destructive';
    if (strength >= 5) color = 'bg-green-500';
    else if (strength >= 3) color = 'bg-yellow-500';

    const widthClass = width === 0 ? 'w-0' : width <= 20 ? 'w-1/5' : width <= 40 ? 'w-2/5' : width <= 60 ? 'w-3/5' : width <= 80 ? 'w-4/5' : 'w-full';

    return (
        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${color} ${widthClass}`}></div>
        </div>
    );
};

const CreateCompanyModal: React.FC<{
    onClose: () => void;
    onSave: (data: { name: string; type: CompanyType; email: string; phone: string; website: string; }) => void;
    initialData: { name?: string; type?: CompanyType; email?: string; phone?: string; website?: string; };
}> = ({ onClose, onSave, initialData }) => {
    const [name, setName] = useState(initialData.name || '');
    const [type, setType] = useState<CompanyType | ''>(initialData.type || '');
    const [email, setEmail] = useState(initialData.email || '');
    const [phone, setPhone] = useState(initialData.phone || '');
    const [website, setWebsite] = useState(initialData.website || '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const companyTypeOptions = [
        { value: 'GENERAL_CONTRACTOR', label: 'General Contractor' },
        { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
        { value: 'SUPPLIER', label: 'Supplier' },
        { value: 'CONSULTANT', label: 'Consultant' },
        { value: 'CLIENT', label: 'Client' },
        { value: 'OTHER', label: 'Other' },
    ];

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Company name is required';
        if (!type) newErrors.type = 'Company type is required';
        if (!email.trim()) newErrors.email = 'Company email is required';
        if (email && !/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validate()) {
            onSave({ name, type: type as CompanyType, email, phone, website });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Create New Company</h3>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="company-name" className="block text-sm font-medium mb-1">Company Name *</label>
                            <input
                                id="company-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={`w-full p-2 border rounded-md ${errors.name ? 'border-destructive' : 'border-border'}`}
                                placeholder="Enter company name"
                            />
                            {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="company-type" className="block text-sm font-medium mb-1">Company Type *</label>
                            <select
                                id="company-type"
                                aria-label="Company Type"
                                value={type}
                                onChange={(e) => setType(e.target.value as CompanyType)}
                                className={`w-full p-2 border rounded-md ${errors.type ? 'border-destructive' : 'border-border'}`}
                            >
                                <option value="">Select company type</option>
                                {companyTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.type && <p className="text-destructive text-sm mt-1">{errors.type}</p>}
                        </div>

                        <div>
                            <label htmlFor="company-email" className="block text-sm font-medium mb-1">Company Email *</label>
                            <input
                                id="company-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full p-2 border rounded-md ${errors.email ? 'border-destructive' : 'border-border'}`}
                                placeholder="company@example.com"
                            />
                            {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label htmlFor="company-phone" className="block text-sm font-medium mb-1">Phone</label>
                            <input
                                id="company-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full p-2 border border-border rounded-md"
                                placeholder="(555) 123-4567"
                            />
                        </div>

                        <div>
                            <label htmlFor="company-website" className="block text-sm font-medium mb-1">Website</label>
                            <input
                                id="company-website"
                                type="url"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="w-full p-2 border border-border rounded-md"
                                placeholder="https://www.company.com"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="flex-1">
                            Create Company
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

const QuickOptionButton: React.FC<{
    title: string;
    description: string;
    onClick: () => void;
    className?: string;
}> = ({ title, description, onClick, className = '' }) => (
    <button
        onClick={onClick}
        className={`p-4 text-left border border-border rounded-lg hover:border-primary transition-colors ${className}`}
    >
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
);

export const UserRegistration: React.FC<UserRegistrationProps> = ({ onSwitchToLogin }) => {
    const { register, error: authError, loading: isSubmitting } = useAuth();

    const [step, setStep] = useState<RegistrationStep>('account');
    const [form, setForm] = useState<RegistrationState>(INITIAL_STATE);
    const [errors, setErrors] = useState<FormErrors>({});
    const [generalError, setGeneralError] = useState<string | null>(null);

    const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
    const [invitePreview, setInvitePreview] = useState<any | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [isCheckingInvite, setIsCheckingInvite] = useState(false);
    const [draftRestored, setDraftRestored] = useState(false);

    const hasHydratedDraftRef = useRef(false);

    useEffect(() => {
        setGeneralError(authError);
    }, [authError]);

    useEffect(() => {
        if (emailStatus === 'available') {
            setErrors(prev => {
                if (!prev.email) {
                    return prev;
                }
                const next = { ...prev };
                delete next.email;
                return next;
            });
        }
    }, [emailStatus]);

    useEffect(() => {
        if (hasHydratedDraftRef.current) {
            return;
        }

        let isMounted = true;
        const draft = loadRegistrationDraft();
        if (draft) {
            if (isMounted) {
                setForm({
                    firstName: draft.firstName,
                    lastName: draft.lastName,
                    email: draft.email,
                    phone: draft.phone,
                    password: '',
                    confirmPassword: '',
                    companySelection: draft.companySelection,
                    companyName: draft.companyName,
                    companyType: draft.companyType,
                    companyEmail: draft.companyEmail,
                    companyPhone: draft.companyPhone,
                    companyWebsite: draft.companyWebsite,
                    inviteToken: draft.inviteToken,
                    role: draft.role,
                    updatesOptIn: draft.updatesOptIn,
                    termsAccepted: draft.termsAccepted
                });
                setStep(draft.step);
                setDraftRestored(true);
            }
        }

        hasHydratedDraftRef.current = true;

        return () => {
            isMounted = false;
        };
    }, []);

    const isStepComplete = useMemo(() => {
        switch (step) {
            case 'account':
                return !!(form.firstName && form.lastName && form.email && form.password && form.confirmPassword);
            case 'workspace': {
                if (form.companySelection === 'join') return !!form.inviteToken;
                if (form.companySelection === 'create') return !!(form.companyName && form.companyType && form.companyEmail);
                return false;
            }
            case 'confirm':
                return form.termsAccepted && !!form.role;
            default:
                return false;
        }
    }, [step, form]);

    const updateField = <K extends keyof RegistrationState>(field: K, value: RegistrationState[K]) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
        setGeneralError(null);
    };

    const checkEmailAvailability = async (email: string) => {
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setEmailStatus('idle');
            return;
        }

        setEmailStatus('checking');
        try {
            const available = await authClient.checkEmailAvailability(email);
            setEmailStatus(available ? 'available' : 'unavailable');
            if (!available) {
                setErrors(prev => ({ ...prev, email: 'Email is already registered' }));
            }
        } catch (error) {
            setEmailStatus('idle');
            console.error('Failed to check email availability:', error);
        }
    };

    const checkInviteToken = async (token: string) => {
        if (!token.trim()) {
            setInvitePreview(null);
            setInviteError(null);
            return;
        }

        setIsCheckingInvite(true);
        setInviteError(null);

        try {
            // Simple validation for now
            if (token.length < 10) {
                throw new Error('Invalid invite token format');
            }
            setInvitePreview({ companyName: 'Construction Company', role: 'OPERATIVE', inviterName: 'John Doe' });
        } catch (error) {
            setInviteError(error instanceof Error ? error.message : 'Invalid invite token');
            setInvitePreview(null);
        } finally {
            setIsCheckingInvite(false);
        }
    };

    const validateStep = (): boolean => {
        const newErrors: FormErrors = {};

        switch (step) {
            case 'account':
                if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
                if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
                if (!form.email.trim()) newErrors.email = 'Email is required';
                else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Please enter a valid email';
                else if (emailStatus === 'unavailable') newErrors.email = 'Email is already registered';

                if (!form.password) newErrors.password = 'Password is required';
                else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';

                if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
                else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
                break;

            case 'workspace':
                if (!form.companySelection) newErrors.companySelection = 'Please select an option';

                if (form.companySelection === 'create') {
                    if (!form.companyName.trim()) newErrors.companyName = 'Company name is required';
                    if (!form.companyType) newErrors.companyType = 'Company type is required';
                    if (!form.companyEmail.trim()) newErrors.companyEmail = 'Company email is required';
                    else if (!/\S+@\S+\.\S+/.test(form.companyEmail)) newErrors.companyEmail = 'Please enter a valid email';
                }

                if (form.companySelection === 'join') {
                    if (!form.inviteToken.trim()) newErrors.inviteToken = 'Invite token is required';
                    else if (inviteError) newErrors.inviteToken = inviteError;
                }
                break;

            case 'confirm':
                if (!form.role) newErrors.role = 'Please select your role';
                if (!form.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions';
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep()) {
            saveRegistrationDraft({ data: form, step });

            const stepOrder: RegistrationStep[] = ['account', 'company', 'role', 'review'];
            const currentIndex = stepOrder.indexOf(step);
            if (currentIndex < stepOrder.length - 1) {
                setStep(stepOrder[currentIndex + 1]);
            }
        }
    };

    const handleBack = () => {
        const stepOrder: RegistrationStep[] = ['account', 'company', 'role', 'review'];
        const currentIndex = stepOrder.indexOf(step);
        if (currentIndex > 0) {
            setStep(stepOrder[currentIndex - 1]);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;

        const payload: RegistrationPayload = {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            password: form.password,
            phone: form.phone,
            companySelection: form.companySelection as 'create' | 'join',
            inviteToken: form.companySelection === 'join' ? form.inviteToken : undefined,
            company: form.companySelection === 'create' ? {
                name: form.companyName,
                type: form.companyType as CompanyType,
                email: form.companyEmail,
                phone: form.companyPhone,
                website: form.companyWebsite,
            } : undefined,
            role: form.role as Role,
            updatesOptIn: form.updatesOptIn,
        };

        try {
            await register(payload);
            persistRememberedEmail(form.email);
            clearRegistrationDraft();
        } catch (error) {
            console.error('Registration failed:', error);
        }
    };

    const renderAccountStep = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-center mb-2">Create Account</h2>
                <p className="text-muted-foreground text-center">Let's get started with your basic information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">First Name *</label>
                    <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        className={`w-full p-3 border rounded-md ${errors.firstName ? 'border-destructive' : 'border-border'}`}
                        placeholder="John"
                    />
                    {errors.firstName && <p className="text-destructive text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Last Name *</label>
                    <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        className={`w-full p-3 border rounded-md ${errors.lastName ? 'border-destructive' : 'border-border'}`}
                        placeholder="Smith"
                    />
                    {errors.lastName && <p className="text-destructive text-sm mt-1">{errors.lastName}</p>}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Email Address *</label>
                <div className="relative">
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => {
                            updateField('email', e.target.value);
                            if (e.target.value) {
                                const timeoutId = setTimeout(() => checkEmailAvailability(e.target.value), 500);
                                return () => clearTimeout(timeoutId);
                            }
                        }}
                        className={`w-full p-3 border rounded-md pr-10 ${errors.email ? 'border-destructive' : 'border-border'}`}
                        placeholder="john@company.com"
                    />
                    {emailStatus === 'checking' && (
                        <div className="absolute right-3 top-3">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    {emailStatus === 'available' && (
                        <div className="absolute right-3 top-3 text-green-500">✓</div>
                    )}
                    {emailStatus === 'unavailable' && (
                        <div className="absolute right-3 top-3 text-destructive">✗</div>
                    )}
                </div>
                {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Phone (optional)</label>
                <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full p-3 border border-border rounded-md"
                    placeholder="(555) 123-4567"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`w-full p-3 border rounded-md ${errors.password ? 'border-destructive' : 'border-border'}`}
                    placeholder="Create a strong password"
                />
                <PasswordStrengthIndicator password={form.password} />
                {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Confirm Password *</label>
                <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className={`w-full p-3 border rounded-md ${errors.confirmPassword ? 'border-destructive' : 'border-border'}`}
                    placeholder="Confirm your password"
                />
                {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
            </div>
        </div>
    );

    const renderCompanyStep = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-center mb-2">Company Setup</h2>
                <p className="text-muted-foreground text-center">How would you like to set up your company?</p>
            </div>

            <div className="space-y-4">
                <QuickOptionButton
                    title="Create New Company"
                    description="I'm setting up a new company account"
                    onClick={() => updateField('companySelection', 'create')}
                    className={form.companySelection === 'create' ? 'border-primary bg-primary/5' : ''}
                />

                <QuickOptionButton
                    title="Join Existing Company"
                    description="I have an invitation to join a company"
                    onClick={() => updateField('companySelection', 'join')}
                    className={form.companySelection === 'join' ? 'border-primary bg-primary/5' : ''}
                />
            </div>

            {errors.companySelection && <p className="text-destructive text-sm">{errors.companySelection}</p>}

            {form.companySelection === 'create' && (
                <div className="mt-6 space-y-4 p-4 border border-border rounded-lg">
                    <h3 className="font-semibold">Company Information</h3>

                    <div>
                        <label className="block text-sm font-medium mb-1">Company Name *</label>
                        <input
                            type="text"
                            value={form.companyName}
                            onChange={(e) => updateField('companyName', e.target.value)}
                            className={`w-full p-3 border rounded-md ${errors.companyName ? 'border-destructive' : 'border-border'}`}
                            placeholder="ABC Construction"
                        />
                        {errors.companyName && <p className="text-destructive text-sm mt-1">{errors.companyName}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Company Type *</label>
                        <select
                            value={form.companyType}
                            onChange={(e) => updateField('companyType', e.target.value as CompanyType)}
                            className={`w-full p-3 border rounded-md ${errors.companyType ? 'border-destructive' : 'border-border'}`}
                        >
                            <option value="">Select company type</option>
                            <option value="GENERAL_CONTRACTOR">General Contractor</option>
                            <option value="SUBCONTRACTOR">Subcontractor</option>
                            <option value="SUPPLIER">Supplier</option>
                            <option value="CONSULTANT">Consultant</option>
                            <option value="CLIENT">Client</option>
                            <option value="OTHER">Other</option>
                        </select>
                        {errors.companyType && <p className="text-destructive text-sm mt-1">{errors.companyType}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Company Email *</label>
                        <input
                            type="email"
                            value={form.companyEmail}
                            onChange={(e) => updateField('companyEmail', e.target.value)}
                            className={`w-full p-3 border rounded-md ${errors.companyEmail ? 'border-destructive' : 'border-border'}`}
                            placeholder="contact@company.com"
                        />
                        {errors.companyEmail && <p className="text-destructive text-sm mt-1">{errors.companyEmail}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <input
                                type="tel"
                                value={form.companyPhone}
                                onChange={(e) => updateField('companyPhone', e.target.value)}
                                className="w-full p-3 border border-border rounded-md"
                                placeholder="(555) 123-4567"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Website</label>
                            <input
                                type="url"
                                value={form.companyWebsite}
                                onChange={(e) => updateField('companyWebsite', e.target.value)}
                                className="w-full p-3 border border-border rounded-md"
                                placeholder="https://www.company.com"
                            />
                        </div>
                    </div>
                </div>
            )}

            {form.companySelection === 'join' && (
                <div className="mt-6 space-y-4 p-4 border border-border rounded-lg">
                    <h3 className="font-semibold">Company Invitation</h3>

                    <div>
                        <label className="block text-sm font-medium mb-1">Invite Token *</label>
                        <input
                            type="text"
                            value={form.inviteToken}
                            onChange={(e) => {
                                updateField('inviteToken', e.target.value);
                                const timeoutId = setTimeout(() => checkInviteToken(e.target.value), 500);
                                return () => clearTimeout(timeoutId);
                            }}
                            className={`w-full p-3 border rounded-md ${errors.inviteToken ? 'border-destructive' : 'border-border'}`}
                            placeholder="Enter your invitation token"
                        />
                        {isCheckingInvite && <p className="text-muted-foreground text-sm mt-1">Checking invitation...</p>}
                        {errors.inviteToken && <p className="text-destructive text-sm mt-1">{errors.inviteToken}</p>}
                    </div>

                    {invitePreview && (
                        <div className="p-3 bg-muted rounded-md">
                            <p className="font-medium">{invitePreview.companyName}</p>
                            <p className="text-sm text-muted-foreground">Role: {invitePreview.role}</p>
                            <p className="text-sm text-muted-foreground">Invited by: {invitePreview.inviterName}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderRoleStep = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-center mb-2">Select Your Role</h2>
                <p className="text-muted-foreground text-center">What's your primary role in construction projects?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuickOptionButton
                    title="Project Manager"
                    description="Oversee projects, manage teams, track progress"
                    onClick={() => updateField('role', 'PROJECT_MANAGER')}
                    className={form.role === 'PROJECT_MANAGER' ? 'border-primary bg-primary/5' : ''}
                />

                <QuickOptionButton
                    title="Foreman"
                    description="Lead on-site operations and crews"
                    onClick={() => updateField('role', 'FOREMAN')}
                    className={form.role === 'FOREMAN' ? 'border-primary bg-primary/5' : ''}
                />

                <QuickOptionButton
                    title="Operative"
                    description="Skilled tradesperson or worker"
                    onClick={() => updateField('role', 'OPERATIVE')}
                    className={form.role === 'OPERATIVE' ? 'border-primary bg-primary/5' : ''}
                />

                <QuickOptionButton
                    title="Owner/Executive"
                    description="Company owner or executive"
                    onClick={() => updateField('role', 'OWNER')}
                    className={form.role === 'OWNER' ? 'border-primary bg-primary/5' : ''}
                />

                <QuickOptionButton
                    title="Client"
                    description="Project client or stakeholder"
                    onClick={() => updateField('role', 'CLIENT')}
                    className={form.role === 'CLIENT' ? 'border-primary bg-primary/5' : ''}
                />

                <QuickOptionButton
                    title="Administrator"
                    description="System administrator"
                    onClick={() => updateField('role', 'ADMIN')}
                    className={form.role === 'ADMIN' ? 'border-primary bg-primary/5' : ''}
                />
            </div>

            {errors.role && <p className="text-destructive text-sm text-center">{errors.role}</p>}
        </div>
    );

    const renderReviewStep = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-center mb-2">Review & Confirm</h2>
                <p className="text-muted-foreground text-center">Please review your information before completing registration</p>
            </div>

            <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                    <h3 className="font-semibold mb-2">Personal Information</h3>
                    <p className="text-sm"><strong>Name:</strong> {form.firstName} {form.lastName}</p>
                    <p className="text-sm"><strong>Email:</strong> {form.email}</p>
                    {form.phone && <p className="text-sm"><strong>Phone:</strong> {form.phone}</p>}
                    <p className="text-sm"><strong>Role:</strong> {form.role?.replace('_', ' ')}</p>
                </div>

                {form.companySelection === 'create' && (
                    <div className="p-4 border border-border rounded-lg">
                        <h3 className="font-semibold mb-2">Company Information</h3>
                        <p className="text-sm"><strong>Company:</strong> {form.companyName}</p>
                        <p className="text-sm"><strong>Type:</strong> {form.companyType?.replace('_', ' ')}</p>
                        <p className="text-sm"><strong>Email:</strong> {form.companyEmail}</p>
                        {form.companyPhone && <p className="text-sm"><strong>Phone:</strong> {form.companyPhone}</p>}
                        {form.companyWebsite && <p className="text-sm"><strong>Website:</strong> {form.companyWebsite}</p>}
                    </div>
                )}

                {form.companySelection === 'join' && invitePreview && (
                    <div className="p-4 border border-border rounded-lg">
                        <h3 className="font-semibold mb-2">Company Invitation</h3>
                        <p className="text-sm"><strong>Company:</strong> {invitePreview.companyName}</p>
                        <p className="text-sm"><strong>Invited Role:</strong> {invitePreview.role}</p>
                        <p className="text-sm"><strong>Invited by:</strong> {invitePreview.inviterName}</p>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={form.updatesOptIn}
                        onChange={(e) => updateField('updatesOptIn', e.target.checked)}
                        className="mt-1"
                    />
                    <span className="text-sm">Send me product updates and construction industry insights</span>
                </label>

                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={form.termsAccepted}
                        onChange={(e) => updateField('termsAccepted', e.target.checked)}
                        className="mt-1"
                    />
                    <span className="text-sm">
                        I accept the{' '}
                        <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                        {' '}*
                    </span>
                </label>
                {errors.termsAccepted && <p className="text-destructive text-sm">{errors.termsAccepted}</p>}
            </div>
        </div>
    );

    const renderCurrentStep = () => {
        switch (step) {
            case 'account':
                return renderAccountStep();
            case 'company':
                return renderCompanyStep();
            case 'role':
                return renderRoleStep();
            case 'review':
                return renderReviewStep();
            default:
                return null;
        }
    };

    const stepOrder: RegistrationStep[] = ['account', 'company', 'role', 'review'];
    const currentStepIndex = stepOrder.indexOf(step);
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === stepOrder.length - 1;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <Card className="p-8">
                    {draftRestored && registrationDraftHasContent() && (
                        <div className="mb-6 p-3 bg-muted rounded-md">
                            <p className="text-sm">Your previous registration progress has been restored.</p>
                        </div>
                    )}

                    <AuthEnvironmentNotice />

                    {/* Progress indicator */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center">
                            {stepOrder.map((stepKey, index) => (
                                <div
                                    key={stepKey}
                                    className={`flex items-center ${index < stepOrder.length - 1 ? 'flex-1' : ''}`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index <= currentStepIndex
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                            }`}
                                    >
                                        {index + 1}
                                    </div>
                                    {index < stepOrder.length - 1 && (
                                        <div
                                            className={`h-0.5 flex-1 mx-2 ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                                                }`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span>Account</span>
                            <span>Company</span>
                            <span>Role</span>
                            <span>Review</span>
                        </div>
                    </div>

                    {generalError && (
                        <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="text-destructive text-sm">{generalError}</p>
                        </div>
                    )}

                    {renderCurrentStep()}

                    <div className="flex justify-between mt-8">
                        <Button
                            variant="outline"
                            onClick={isFirstStep ? onSwitchToLogin : handleBack}
                        >
                            {isFirstStep ? 'Back to Login' : 'Back'}
                        </Button>

                        <Button
                            onClick={isLastStep ? handleSubmit : handleNext}
                            disabled={!isStepComplete || isSubmitting}
                            loading={isSubmitting}
                        >
                            {isLastStep ? 'Create Account' : 'Next'}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
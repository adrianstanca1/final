import React, { useState, useEffect, useMemo } from 'react';
import { Role, RolePermissions, CompanyType, RegistrationPayload } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { authApi } from '../services/mockApi';

interface UserRegistrationProps {
    onSwitchToLogin: () => void;
}

type StepId = 'account' | 'security' | 'company' | 'role' | 'verification' | 'review';

type RegistrationField = keyof RegistrationFormState;

interface InvitePreview {
    companyId: string;
    companyName: string;
    companyType?: CompanyType;
    allowedRoles: Role[];
    suggestedRole?: Role;
}

interface RegistrationFormState {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    companySelection: 'create' | 'join' | null;
    companyName: string;
    companyType: CompanyType | '';
    companyEmail: string;
    companyPhone: string;
    companyWebsite: string;
    inviteToken: string;
    role?: Role;
    verificationCode: string;
    termsAccepted: boolean;
    updatesOptIn: boolean;
}

const DEMO_VERIFICATION_CODE = '123456';

const STEPS: { id: StepId; title: string; description: string }[] = [
    { id: 'account', title: 'Account', description: 'Introduce yourself' },
    { id: 'security', title: 'Security', description: 'Secure your access' },
    { id: 'company', title: 'Workspace', description: 'Create or join a company' },
    { id: 'role', title: 'Role', description: 'Tailor your experience' },
    { id: 'verification', title: 'Verify', description: 'Confirm your email access' },
    { id: 'review', title: 'Review', description: 'Agree and launch' },
];

const STEP_FIELDS: Record<StepId, RegistrationField[]> = {
    account: ['firstName', 'lastName', 'email', 'phone'],
    security: ['password', 'confirmPassword'],
    company: ['companySelection', 'companyName', 'companyType', 'companyEmail', 'companyPhone', 'companyWebsite', 'inviteToken'],
    role: ['role'],
    verification: ['verificationCode'],
    review: ['termsAccepted'],
};

const COMPANY_TYPE_OPTIONS: { value: CompanyType; label: string }[] = [
    { value: 'GENERAL_CONTRACTOR', label: 'General Contractor' },
    { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
    { value: 'SUPPLIER', label: 'Supplier' },
    { value: 'CONSULTANT', label: 'Consultant' },
    { value: 'CLIENT', label: 'Client' },
];

const DEFAULT_JOIN_ROLES: Role[] = [Role.ADMIN, Role.PROJECT_MANAGER, Role.FOREMAN, Role.OPERATIVE];

const ROLE_COPY: Record<Role, { label: string; description: string }> = {
    [Role.OWNER]: {
        label: 'Owner',
        description: 'Full platform control with access to settings, billing, and all project data.',
    },
    [Role.ADMIN]: {
        label: 'Administrator',
        description: 'Manage users, approvals, financials, and day-to-day project operations.',
    },
    [Role.PROJECT_MANAGER]: {
        label: 'Project Manager',
        description: 'Coordinate schedules, subcontractors, budgets, and site updates across jobs.',
    },
    [Role.FOREMAN]: {
        label: 'Foreman',
        description: 'Supervise on-site crews, track progress, and raise safety or quality alerts.',
    },
    [Role.OPERATIVE]: {
        label: 'Operative',
        description: 'Capture field progress, log time, and collaborate on daily tasks.',
    },
    [Role.CLIENT]: {
        label: 'Client',
        description: 'Review milestones, approve work, and stay informed on project delivery.',
    },
    [Role.PRINCIPAL_ADMIN]: {
        label: 'Principal Admin',
        description: 'Corporate oversight role reserved for the AS Agents platform team.',
    },
};

const FEATURE_POINTS = [
    'AI-assisted scheduling, forecasting, and project health insights.',
    'Secure document control and approval workflows across every team.',
    'Real-time safety, quality, and financial dashboards in one hub.',
    'Tailored access controls so field and back-office teams stay aligned.',
];

const INITIAL_FORM_STATE: RegistrationFormState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companySelection: null,
    companyName: '',
    companyType: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    inviteToken: '',
    role: undefined,
    verificationCode: '',
    termsAccepted: false,
    updatesOptIn: true,
};

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string) => !phone || /^[+()\d\s-]{6,}$/.test(phone);
const validateUrl = (url: string) => !url || /^https?:\/\//i.test(url.trim());

const formatCompanyType = (type?: CompanyType | string) =>
    type ? type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()) : 'Company';

const getPermissionHighlights = (role: Role) =>
    Array.from(RolePermissions[role] || [])
        .slice(0, 3)
        .map(permission => permission.replace(/_/g, ' ').toLowerCase());

const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
    const rules = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /\d/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ];
    const score = rules.filter(Boolean).length;
    const width = (score / rules.length) * 100;
    const color = score < 3 ? 'bg-destructive' : score < 5 ? 'bg-yellow-500' : 'bg-green-500';
    const labels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

    return (
        <div className="mt-2 space-y-1">
            <div className="w-full bg-muted rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${color}`} style={{ width: `${width}%` }}></div>
            </div>
            <p className="text-xs text-muted-foreground">
                Password strength: <span className="font-medium text-foreground">{labels[Math.max(score - 1, 0)]}</span>
            </p>
        </div>
    );
};

const Stepper: React.FC<{ steps: typeof STEPS; currentStep: StepId }> = ({ steps, currentStep }) => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    return (
        <ol className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {steps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;
                return (
                    <li key={step.id} className="flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${isCompleted ? 'border-primary bg-primary text-primary-foreground' : isActive ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
                            {isCompleted ? '✓' : index + 1}
                        </div>
                        <div className="sm:text-center">
                            <p className={`text-sm font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                        {index < steps.length - 1 && (
                            <div className="hidden sm:block sm:h-px sm:flex-1 sm:bg-border sm:opacity-50"></div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
};

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    name: RegistrationField;
    value: string;
    error?: string;
    hint?: string;
    onValueChange: (field: RegistrationField, value: string) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onValueChange, error, hint, className = '', ...props }) => (
    <div className={className}>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">
            {label}
        </label>
        <input
            id={name}
            name={name}
            value={value}
            onChange={event => onValueChange(name, event.target.value)}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${error ? 'border-destructive focus:ring-offset-destructive/10' : 'border-border'} ${props.disabled ? 'bg-muted text-muted-foreground' : 'bg-background text-foreground'}`}
            {...props}
        />
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
);

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    name: RegistrationField;
    value: string;
    options: { value: string; label: string }[];
    error?: string;
    onValueChange: (field: RegistrationField, value: string) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, name, value, options, onValueChange, error, className = '', ...props }) => (
    <div className={className}>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">
            {label}
        </label>
        <select
            id={name}
            name={name}
            value={value}
            onChange={event => onValueChange(name, event.target.value)}
            className={`mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${error ? 'border-destructive focus:ring-offset-destructive/10' : 'border-border'}`}
            {...props}
        >
            <option value="">Select an option</option>
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
);

const RadioTile: React.FC<{
    name: RegistrationField;
    value: 'create' | 'join';
    selectedValue: 'create' | 'join' | null;
    title: string;
    description: string;
    onChange: (field: RegistrationField, value: 'create' | 'join') => void;
}> = ({ name, value, selectedValue, title, description, onChange }) => {
    const isSelected = selectedValue === value;
    return (
        <button
            type="button"
            onClick={() => onChange(name, value)}
            className={`w-full rounded-lg border p-4 text-left transition-all ${isSelected ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary ring-offset-1' : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'}`}
        >
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </button>
    );
};

const RoleOption: React.FC<{
    role: Role;
    selected: boolean;
    onSelect: (role: Role) => void;
    disabled?: boolean;
}> = ({ role, selected, onSelect, disabled }) => {
    const copy = ROLE_COPY[role] ?? { label: role.replace(/_/g, ' '), description: 'Role description pending.' };
    const highlights = getPermissionHighlights(role);
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(role)}
            className={`w-full rounded-lg border p-4 text-left transition-all ${selected ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary ring-offset-1' : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-semibold text-foreground">{copy.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
                </div>
                {selected && <span className="text-sm font-medium text-primary">Selected</span>}
            </div>
            {highlights.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {highlights.map(item => (
                        <li key={item} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"></span>
                            <span className="capitalize">{item}</span>
                        </li>
                    ))}
                </ul>
            )}
        </button>
    );
};

const SummaryRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
    </div>
);

export const UserRegistration: React.FC<UserRegistrationProps> = ({ onSwitchToLogin }) => {
    const { register, error: authError, loading: isSubmitting } = useAuth();

    const [currentStep, setCurrentStep] = useState<StepId>('account');
    const [formData, setFormData] = useState<RegistrationFormState>(INITIAL_FORM_STATE);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegistrationField, string>>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);

    const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
    const [inviteLookup, setInviteLookup] = useState<InvitePreview | null>(null);
    const [inviteLookupState, setInviteLookupState] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [inviteLookupError, setInviteLookupError] = useState<string | null>(null);

    useEffect(() => {
        setGeneralError(authError);
    }, [authError]);

    const companySelection = formData.companySelection;

    useEffect(() => {
        if (companySelection === 'create') {
            setFormData(prev => ({
                ...prev,
                role: Role.OWNER,
                inviteToken: '',
            }));
            setInviteLookup(null);
            setInviteLookupState('idle');
            setInviteLookupError(null);
            setFieldErrors(prev => {
                const updated = { ...prev };
                delete updated.inviteToken;
                delete updated.role;
                return updated;
            });
        } else if (companySelection === 'join') {
            setFormData(prev => ({
                ...prev,
                role: prev.role === Role.OWNER ? undefined : prev.role,
                companyName: '',
                companyType: '',
                companyEmail: '',
                companyPhone: '',
                companyWebsite: '',
            }));
        }
    }, [companySelection]);

    const updateField = (field: RegistrationField, value: string | boolean | Role | null | undefined) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        } as RegistrationFormState));
        setFieldErrors(prev => {
            if (!(field in prev)) {
                return prev;
            }
            const updated = { ...prev };
            delete updated[field];
            return updated;
        });

        if (field === 'email') {
            setEmailStatus('idle');
        }
        if (field === 'inviteToken') {
            setInviteLookup(null);
            setInviteLookupState('idle');
            setInviteLookupError(null);
        }
    };

    const handleEmailBlur = async () => {
        const trimmed = formData.email.trim();
        if (!trimmed || !validateEmail(trimmed)) {
            return;
        }
        setEmailStatus('checking');
        try {
            const { available } = await authApi.checkEmailAvailability(trimmed);
            setEmailStatus(available ? 'available' : 'unavailable');
            if (!available) {
                setFieldErrors(prev => ({ ...prev, email: 'An account with this email already exists.' }));
            }
        } catch (error: any) {
            setEmailStatus('idle');
            setGeneralError(error?.message || 'Unable to verify email right now. Please try again.');
        }
    };

    const handleInviteLookup = async () => {
        const token = formData.inviteToken.trim();
        if (!token) {
            setFieldErrors(prev => ({ ...prev, inviteToken: 'Enter the invite token provided to you.' }));
            setInviteLookupState('error');
            setInviteLookupError('Invite token is required.');
            return;
        }
        setInviteLookupState('checking');
        setInviteLookupError(null);
        try {
            const result = await authApi.lookupInviteToken(token);
            setInviteLookup(result);
            setInviteLookupState('success');
            if (!result.allowedRoles.includes(formData.role as Role)) {
                const suggestedRole = result.suggestedRole || result.allowedRoles[0];
                updateField('role', suggestedRole);
            }
        } catch (error: any) {
            setInviteLookup(null);
            setInviteLookupState('error');
            const message = error?.message || 'We could not validate that invite token. Please confirm it and try again.';
            setInviteLookupError(message);
            setFieldErrors(prev => ({ ...prev, inviteToken: message }));
        }
    };

    const allowedRoles = useMemo(() => {
        if (companySelection === 'create') {
            return [Role.OWNER];
        }
        if (companySelection === 'join' && inviteLookup) {
            return inviteLookup.allowedRoles;
        }
        if (companySelection === 'join') {
            return DEFAULT_JOIN_ROLES;
        }
        return [Role.ADMIN, Role.PROJECT_MANAGER, Role.FOREMAN, Role.OPERATIVE];
    }, [companySelection, inviteLookup]);

    const validateStep = (step: StepId) => {
        const errors: Partial<Record<RegistrationField, string>> = {};
        const addError = (field: RegistrationField, message: string) => {
            errors[field] = message;
        };

        switch (step) {
            case 'account':
                if (!formData.firstName.trim()) addError('firstName', 'Enter your first name.');
                if (!formData.lastName.trim()) addError('lastName', 'Enter your last name.');
                if (!formData.email.trim() || !validateEmail(formData.email)) {
                    addError('email', 'Provide a valid work email.');
                } else if (emailStatus === 'unavailable') {
                    addError('email', 'This email is already registered. Sign in or use another.');
                }
                if (!validatePhone(formData.phone)) {
                    addError('phone', 'Enter a valid phone number or leave it blank.');
                }
                break;
            case 'security':
                if (formData.password.length < 8) {
                    addError('password', 'Use at least 8 characters with upper and lower case letters, a number, and a symbol.');
                } else {
                    const complexityChecks = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/];
                    const failed = complexityChecks.filter(regex => !regex.test(formData.password));
                    if (failed.length > 0) {
                        addError('password', 'Add upper-case, lower-case, number, and special character for a stronger password.');
                    }
                }
                if (formData.password !== formData.confirmPassword) {
                    addError('confirmPassword', 'Passwords must match.');
                }
                break;
            case 'company':
                if (!formData.companySelection) {
                    addError('companySelection', 'Choose whether to create a new workspace or join an existing one.');
                } else if (formData.companySelection === 'create') {
                    if (!formData.companyName.trim()) addError('companyName', 'Provide a company name.');
                    if (!formData.companyType) addError('companyType', 'Select a company type.');
                    if (formData.companyEmail && !validateEmail(formData.companyEmail)) {
                        addError('companyEmail', 'Provide a valid company email or leave this blank.');
                    }
                    if (!validatePhone(formData.companyPhone)) {
                        addError('companyPhone', 'Enter a valid phone number or leave it blank.');
                    }
                    if (!validateUrl(formData.companyWebsite)) {
                        addError('companyWebsite', 'Include https:// in the company website address.');
                    }
                } else if (formData.companySelection === 'join') {
                    if (!formData.inviteToken.trim()) {
                        addError('inviteToken', 'Enter the invite token provided to you.');
                    } else if (inviteLookupState !== 'success') {
                        addError('inviteToken', 'Validate the invite token before continuing.');
                    }
                }
                break;
            case 'role':
                if (!formData.role) {
                    addError('role', 'Select the role that best matches your responsibilities.');
                } else if (!allowedRoles.includes(formData.role)) {
                    addError('role', 'This role is not available for the workspace you selected.');
                }
                break;
            case 'verification':
                if (formData.verificationCode.trim() !== DEMO_VERIFICATION_CODE) {
                    addError('verificationCode', 'Enter the six-digit code from your inbox (hint: 123456 for this demo).');
                }
                break;
            case 'review':
                if (!formData.termsAccepted) {
                    addError('termsAccepted', 'You must agree to the terms to continue.');
                }
                break;
            default:
                break;
        }

        const targetFields = STEP_FIELDS[step];
        setFieldErrors(prev => {
            const updated = { ...prev };
            targetFields.forEach(field => {
                delete updated[field];
            });
            return { ...updated, ...errors };
        });

        return Object.keys(errors).length === 0;
    };

    const currentIndex = STEPS.findIndex(step => step.id === currentStep);
    const isLastStep = currentIndex === STEPS.length - 1;

    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentIndex < STEPS.length - 1) {
                setCurrentStep(STEPS[currentIndex + 1].id);
            }
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentStep(STEPS[currentIndex - 1].id);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep('review')) {
            return;
        }
        setGeneralError(null);
        const payload: RegistrationPayload = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            phone: formData.phone.trim() || undefined,
            companySelection: formData.companySelection || undefined,
            role: formData.role,
            termsAccepted: formData.termsAccepted,
            updatesOptIn: formData.updatesOptIn,
        };

        if (formData.companySelection === 'create') {
            payload.companyName = formData.companyName.trim();
            payload.companyType = formData.companyType || undefined;
            payload.companyEmail = formData.companyEmail.trim().toLowerCase() || undefined;
            payload.companyPhone = formData.companyPhone.trim() || undefined;
            payload.companyWebsite = formData.companyWebsite.trim() || undefined;
        } else if (formData.companySelection === 'join') {
            payload.inviteToken = formData.inviteToken.trim();
        }

        try {
            await register(payload);
        } catch (error) {
            // Errors are captured by the AuthContext and surfaced via authError
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 'account':
                return (
                    <div className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <InputField
                                label="First name"
                                name="firstName"
                                value={formData.firstName}
                                onValueChange={updateField}
                                error={fieldErrors.firstName}
                                autoComplete="given-name"
                            />
                            <InputField
                                label="Last name"
                                name="lastName"
                                value={formData.lastName}
                                onValueChange={updateField}
                                error={fieldErrors.lastName}
                                autoComplete="family-name"
                            />
                        </div>
                        <InputField
                            label="Work email"
                            name="email"
                            value={formData.email}
                            onValueChange={updateField}
                            onBlur={handleEmailBlur}
                            error={fieldErrors.email}
                            autoComplete="email"
                            hint="We’ll keep you signed in securely and notify you about workspace activity."
                            type="email"
                        />
                        {emailStatus === 'checking' && <p className="text-xs text-muted-foreground">Checking availability…</p>}
                        {emailStatus === 'available' && !fieldErrors.email && <p className="text-xs text-green-600">Great! This email is available.</p>}
                        {emailStatus === 'unavailable' && <p className="text-xs text-destructive">This email is already in use. Sign in instead or try another.</p>}
                        <InputField
                            label="Phone number (optional)"
                            name="phone"
                            value={formData.phone}
                            onValueChange={updateField}
                            error={fieldErrors.phone}
                            type="tel"
                            autoComplete="tel"
                            placeholder="Include country code for SMS alerts"
                        />
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-5">
                        <InputField
                            label="Password"
                            name="password"
                            value={formData.password}
                            onValueChange={updateField}
                            error={fieldErrors.password}
                            type="password"
                            autoComplete="new-password"
                        />
                        <PasswordStrengthIndicator password={formData.password} />
                        <InputField
                            label="Confirm password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onValueChange={updateField}
                            error={fieldErrors.confirmPassword}
                            type="password"
                            autoComplete="new-password"
                        />
                        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-xs text-muted-foreground">
                            Use at least 8 characters with a mix of uppercase, lowercase, numbers, and a special character.
                        </div>
                    </div>
                );
            case 'company':
                return (
                    <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <RadioTile
                                name="companySelection"
                                value="create"
                                selectedValue={formData.companySelection}
                                title="Create a new workspace"
                                description="Set up a workspace for your organisation and invite teammates later."
                                onChange={(field, value) => updateField(field, value)}
                            />
                            <RadioTile
                                name="companySelection"
                                value="join"
                                selectedValue={formData.companySelection}
                                title="Join an existing workspace"
                                description="Use the invite token shared by your administrator to join instantly."
                                onChange={(field, value) => updateField(field, value)}
                            />
                        </div>
                        {fieldErrors.companySelection && <p className="text-xs text-destructive">{fieldErrors.companySelection}</p>}

                        {formData.companySelection === 'create' && (
                            <div className="space-y-4">
                                <InputField
                                    label="Company name"
                                    name="companyName"
                                    value={formData.companyName}
                                    onValueChange={updateField}
                                    error={fieldErrors.companyName}
                                    autoComplete="organization"
                                />
                                <SelectField
                                    label="Company type"
                                    name="companyType"
                                    value={formData.companyType}
                                    options={COMPANY_TYPE_OPTIONS}
                                    onValueChange={updateField}
                                    error={fieldErrors.companyType}
                                />
                                <InputField
                                    label="Company email (optional)"
                                    name="companyEmail"
                                    value={formData.companyEmail}
                                    onValueChange={updateField}
                                    error={fieldErrors.companyEmail}
                                    type="email"
                                />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <InputField
                                        label="Company phone (optional)"
                                        name="companyPhone"
                                        value={formData.companyPhone}
                                        onValueChange={updateField}
                                        error={fieldErrors.companyPhone}
                                        type="tel"
                                    />
                                    <InputField
                                        label="Company website (optional)"
                                        name="companyWebsite"
                                        value={formData.companyWebsite}
                                        onValueChange={updateField}
                                        error={fieldErrors.companyWebsite}
                                        placeholder="https://yourcompany.com"
                                    />
                                </div>
                                <div className="rounded-md bg-muted p-4 text-xs text-muted-foreground">
                                    We'll generate an invite token automatically after setup so your teammates can join securely.
                                </div>
                            </div>
                        )}

                        {formData.companySelection === 'join' && (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                    <div className="flex-1">
                                        <InputField
                                            label="Invite token"
                                            name="inviteToken"
                                            value={formData.inviteToken}
                                            onValueChange={updateField}
                                            error={fieldErrors.inviteToken}
                                            placeholder="e.g. JOIN-CONSTRUCTCO"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <Button type="button" variant="secondary" onClick={handleInviteLookup} className="sm:w-auto" isLoading={inviteLookupState === 'checking'}>
                                        Validate token
                                    </Button>
                                </div>
                                {inviteLookupState === 'success' && inviteLookup && (
                                    <Card className="bg-muted/60">
                                        <p className="text-sm font-semibold text-foreground">You're joining {inviteLookup.companyName}</p>
                                        <p className="text-xs text-muted-foreground">Workspace type: {formatCompanyType(inviteLookup.companyType)}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">Available roles: {inviteLookup.allowedRoles.map(role => ROLE_COPY[role]?.label || role).join(', ')}</p>
                                    </Card>
                                )}
                                {inviteLookupState === 'error' && inviteLookupError && (
                                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                                        {inviteLookupError}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            case 'role':
                return (
                    <div className="space-y-4">
                        {formData.companySelection === 'create' ? (
                            <div className="space-y-2">
                                <RoleOption
                                    role={Role.OWNER}
                                    selected={formData.role === Role.OWNER}
                                    onSelect={() => updateField('role', Role.OWNER)}
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">As the workspace creator you'll start as the owner. You can delegate responsibilities after launch.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                {allowedRoles.map(optionRole => (
                                    <RoleOption
                                        key={optionRole}
                                        role={optionRole}
                                        selected={formData.role === optionRole}
                                        onSelect={selectedRole => updateField('role', selectedRole)}
                                    />
                                ))}
                            </div>
                        )}
                        {fieldErrors.role && <p className="text-xs text-destructive">{fieldErrors.role}</p>}
                    </div>
                );
            case 'verification':
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            We've sent a verification email to <span className="font-semibold text-foreground">{formData.email || 'your address'}</span>.
                            Enter the six-digit code to continue. (Use <strong>{DEMO_VERIFICATION_CODE}</strong> in this demo.)
                        </p>
                        <InputField
                            label="Verification code"
                            name="verificationCode"
                            value={formData.verificationCode}
                            onValueChange={(field, value) => updateField(field, value.replace(/[^0-9]/g, ''))}
                            error={fieldErrors.verificationCode}
                            maxLength={6}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="123456"
                        />
                    </div>
                );
            case 'review':
                return (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <SummaryRow label="Name" value={`${formData.firstName || '—'} ${formData.lastName || ''}`} />
                            <SummaryRow label="Email" value={formData.email || '—'} />
                            <SummaryRow label="Workspace" value={formData.companySelection === 'create' ? formData.companyName || 'New workspace' : inviteLookup?.companyName || 'Existing company'} />
                            <SummaryRow label="Role" value={formData.role ? (ROLE_COPY[formData.role]?.label || formData.role) : '—'} />
                        </div>
                        <div className="space-y-3 rounded-md border border-border bg-muted/60 p-4 text-sm">
                            <label className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.termsAccepted}
                                    onChange={event => updateField('termsAccepted', event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-muted-foreground">
                                    I agree to the <a href="#" className="font-medium text-primary hover:text-primary/80">Terms of Service</a> and <a href="#" className="font-medium text-primary hover:text-primary/80">Privacy Policy</a>.
                                </span>
                            </label>
                            {fieldErrors.termsAccepted && <p className="text-xs text-destructive">{fieldErrors.termsAccepted}</p>}
                            <label className="flex items-start gap-2 text-xs">
                                <input
                                    type="checkbox"
                                    checked={formData.updatesOptIn}
                                    onChange={event => updateField('updatesOptIn', event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-muted-foreground">Keep me posted on feature launches and best practices.</span>
                            </label>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 py-12">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 lg:flex-row">
                <div className="space-y-6 lg:w-2/5">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <span className="h-2 w-2 rounded-full bg-primary"></span>
                            Guided onboarding
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">Build your AS Agents workspace in minutes</h1>
                        <p className="text-sm text-muted-foreground">
                            Align your field teams, operations staff, and stakeholders in one secure hub with intelligent automation backing every project.
                        </p>
                    </div>
                    <Card className="space-y-3 bg-card/60 backdrop-blur">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Why teams choose us</h2>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {FEATURE_POINTS.map(point => (
                                <li key={point} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card className="bg-muted/60 text-sm text-muted-foreground">
                        <p className="font-semibold text-foreground">Need help?</p>
                        <p>Our onboarding team can migrate your data and configure integrations. Reach out at <a href="mailto:onboarding@asagents.com" className="text-primary hover:text-primary/80">onboarding@asagents.com</a>.</p>
                    </Card>
                </div>
                <div className="lg:flex-1">
                    <Card className="space-y-8 p-8 shadow-xl">
                        <Stepper steps={STEPS} currentStep={currentStep} />
                        {generalError && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                {generalError}
                            </div>
                        )}
                        {renderStep()}
                        <div className="flex items-center justify-between">
                            {currentIndex > 0 ? (
                                <Button type="button" variant="secondary" onClick={handleBack}>
                                    Back
                                </Button>
                            ) : (
                                <button type="button" className="text-sm font-medium text-muted-foreground" onClick={onSwitchToLogin}>
                                    Already have an account?
                                </button>
                            )}
                            {isLastStep ? (
                                <Button type="button" onClick={handleSubmit} isLoading={isSubmitting}>
                                    Launch workspace
                                </Button>
                            ) : (
                                <Button type="button" onClick={handleNext}>
                                    Continue
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

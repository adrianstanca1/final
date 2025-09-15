import React, { useState, useEffect } from 'react';
// FIX: Added verificationCode and termsAccepted to the RegisterCredentials type extension.
import { Role, Permission, RolePermissions, CompanyType, RegisterCredentials } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface UserRegistrationProps {
  onSwitchToLogin: () => void;
}

type Step = 'personal' | 'company' | 'role' | 'verify' | 'terms';

const STEPS: { id: Step; name: string }[] = [
    { id: 'personal', name: 'Personal Info' },
    { id: 'company', name: 'Company' },
    { id: 'role', name: 'Your Role' },
    { id: 'verify', name: 'Verification' },
    { id: 'terms', name: 'Finish' },
];

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
    const color = strength < 3 ? 'bg-destructive' : strength < 5 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${color}`} style={{ width: `${width}%` }}></div>
        </div>
    );
};

export const UserRegistration: React.FC<UserRegistrationProps> = ({ onSwitchToLogin }) => {
    const { register } = useAuth();
    const [step, setStep] = useState<Step>('personal');
    // FIX: Added missing properties to the formData type.
    const [formData, setFormData] = useState<Partial<RegisterCredentials & { companyName?: string; companyType?: CompanyType; companySelection?: 'create' | 'join', role?: Role, verificationCode?: string, termsAccepted?: boolean }>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const validateStep = (currentStep: Step): boolean => {
        const newErrors: Record<string, string> = {};
        switch (currentStep) {
            case 'personal':
                if (!formData.firstName || formData.firstName.length < 2) newErrors.firstName = "First name is required.";
                if (!formData.lastName || formData.lastName.length < 2) newErrors.lastName = "Last name is required.";
                if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "A valid email is required.";
                if (!formData.password || formData.password.length < 8) newErrors.password = "Password must be at least 8 characters.";
                if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
                break;
            case 'company':
                if (!formData.companySelection) newErrors.companySelection = "Please choose an option.";
                else if (formData.companySelection === 'create' && (!formData.companyName || !formData.companyType)) {
                    newErrors.companyName = "Company details are required.";
                } else if (formData.companySelection === 'join' && !formData.inviteToken) {
                    newErrors.inviteToken = "An invite token is required.";
                }
                break;
            case 'role':
                 if (!formData.role) newErrors.role = "Please select a role.";
                break;
            case 'verify':
                 if (!formData.verificationCode || formData.verificationCode.length !== 6) newErrors.verificationCode = "Enter the 6-digit code.";
                break;
            case 'terms':
                if (!formData.termsAccepted) newErrors.termsAccepted = "You must accept the terms.";
                break;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            const currentIndex = STEPS.findIndex(s => s.id === step);
            if (currentIndex < STEPS.length - 1) {
                setStep(STEPS[currentIndex + 1].id);
            }
        }
    };

    const handleBack = () => {
        const currentIndex = STEPS.findIndex(s => s.id === step);
        if (currentIndex > 0) {
            setStep(STEPS[currentIndex - 1].id);
        }
    };
    
    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };
    
    const handleSubmit = async () => {
        if (!validateStep('terms')) return;
        setIsLoading(true);
        setGeneralError(null);
        try {
            await register(formData as RegisterCredentials);
            // On success, the AuthProvider will handle navigation.
        } catch (error: any) {
            setGeneralError(error.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 'personal': return (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} />
                        <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} />
                    </div>
                    <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} />
                    <InputField label="Phone (Optional)" name="phone" type="tel" value={formData.phone} onChange={handleChange} error={errors.phone} />
                    <InputField label="Password" name="password" type="password" value={formData.password} onChange={handleChange} error={errors.password} />
                    <PasswordStrengthIndicator password={formData.password} />
                    <InputField label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
                </>
            );
            case 'company': return (
                <>
                   <div className="space-y-2">
                        <RadioCard name="companySelection" value="create" label="Create a new company" description="Set up a new workspace for your team." checked={formData.companySelection === 'create'} onChange={handleChange} />
                        <RadioCard name="companySelection" value="join" label="Join an existing company" description="Use an invite code to join a team." checked={formData.companySelection === 'join'} onChange={handleChange} />
                        {errors.companySelection && <p className="text-xs text-destructive mt-1">{errors.companySelection}</p>}
                    </div>
                    {formData.companySelection === 'create' && (
                        <div className="space-y-4 mt-4 p-4 border rounded-md">
                            <InputField label="Company Name" name="companyName" value={formData.companyName} onChange={handleChange} error={errors.companyName} />
                            {/* FIX: Correctly map over CompanyType enum values. */}
                            <SelectField label="Company Type" name="companyType" value={formData.companyType} onChange={handleChange} error={errors.companyType} options={Object.values(CompanyType).map(ct => ({ value: ct, label: (ct as string).replace(/_/g, ' ') }))}/>
                        </div>
                    )}
                     {formData.companySelection === 'join' && (
                        <div className="mt-4 p-4 border rounded-md">
                             <InputField label="Invite Code" name="inviteToken" value={formData.inviteToken} onChange={handleChange} error={errors.inviteToken} />
                        </div>
                    )}
                </>
            );
            case 'role':
                const selectedRolePermissions = formData.role ? RolePermissions[formData.role] : new Set();
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                             {[Role.PROJECT_MANAGER, Role.FOREMAN, Role.OPERATIVE].map(role => (
                                // FIX: Added a placeholder description to satisfy the RadioCard props.
                                <RadioCard key={role} name="role" value={role} label={role.replace(/_/g, ' ')} description="" checked={formData.role === role} onChange={handleChange} />
                            ))}
                            {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
                         </div>
                         <Card className="bg-muted">
                            <h4 className="font-semibold mb-2">Role Permissions Preview</h4>
                            {formData.role ? (
                                <ul className="text-sm space-y-1 list-disc list-inside">
                                    {/* FIX: Correctly map over permission enum values. */}
                                    {Array.from(selectedRolePermissions).map(p => <li key={p as string}>{(p as string).replace(/_/g, ' ').toLowerCase()}</li>)}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">Select a role to see its permissions.</p>}
                         </Card>
                    </div>
                );
            case 'verify': return (
                <div className="text-center">
                    <h3 className="font-semibold">Verify Your Email</h3>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">We've sent a 6-digit code to {formData.email}. Please enter it below.</p>
                     <InputField label="Verification Code" name="verificationCode" value={formData.verificationCode} onChange={(name: string, val: string) => handleChange(name, val.replace(/\D/g, ''))} error={errors.verificationCode} maxLength={6} inputClassName="text-center tracking-[0.5em] text-2xl" isLabelSrOnly />
                </div>
            );
            case 'terms': return (
                <div>
                     <div className="flex items-start">
                        <input id="terms" type="checkbox" checked={!!formData.termsAccepted} onChange={e => handleChange('termsAccepted', e.target.checked)} className="h-4 w-4 text-primary focus:ring-ring border-border rounded mt-1"/>
                        <label htmlFor="terms" className="ml-2 block text-sm text-muted-foreground">I agree to the <a href="#" className="font-medium text-primary hover:text-primary/90">Terms and Conditions</a> and <a href="#" className="font-medium text-primary hover:text-primary/90">Privacy Policy</a>.</label>
                    </div>
                    {errors.termsAccepted && <p className="text-xs text-destructive mt-1">{errors.termsAccepted}</p>}
                </div>
            );
            default: return null;
        }
    };

    const currentStepIndex = STEPS.findIndex(s => s.id === step);

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10 text-primary"><path fill="currentColor" d="M12 2L2 22h20L12 2z"/></svg>
                        <h1 className="text-3xl font-bold text-foreground">AS Agents</h1>
                    </div>
                    <h2 className="text-muted-foreground">Create your account</h2>
                </div>

                <div className="mb-8 px-4">
                    <div className="flex items-center">
                        {STEPS.map((s, index) => (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${index <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                        {index < currentStepIndex ? '✓' : index + 1}
                                    </div>
                                    <p className={`text-xs mt-1 text-center ${index <= currentStepIndex ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{s.name}</p>
                                </div>
                                {index < STEPS.length - 1 && <div className={`flex-grow h-0.5 transition-colors ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}`}></div>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <Card>
                    {generalError && <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">{generalError}</div>}
                    <div className="space-y-6">
                        {renderStepContent()}
                    </div>
                    <div className="mt-8 flex justify-between items-center">
                        {step !== 'personal' ? (
                            <Button variant="secondary" onClick={handleBack}>Back</Button>
                        ) : <div></div>}
                        
                        {step === 'terms' ? (
                            <Button onClick={handleSubmit} isLoading={isLoading} disabled={!formData.termsAccepted}>Complete Registration</Button>
                        ) : (
                            <Button onClick={handleNext}>Next</Button>
                        )}
                    </div>
                </Card>
                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="font-semibold text-primary hover:text-primary/80">
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
};


// --- Form Field Components ---
// FIX: Made maxLength prop optional.
const InputField = ({ label, name, type = 'text', value = '', onChange, error, maxLength, inputClassName = '', isLabelSrOnly = false }: { label: any; name: any; type?: string; value?: string; onChange: any; error: any; maxLength?: number; inputClassName?: string; isLabelSrOnly?: boolean; }) => (
    <div>
        <label htmlFor={name} className={isLabelSrOnly ? 'sr-only' : 'block text-sm font-medium text-muted-foreground'}>{label}</label>
        <input id={name} name={name} type={type} value={value} maxLength={maxLength} onChange={e => onChange(name, e.target.value)} required 
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${error ? 'border-destructive' : 'border-border'} ${inputClassName}`} />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
);

const SelectField = ({ label, name, value, onChange, error, options }: {label: string, name: string, value: any, onChange: any, error: string, options: {value:string, label:string}[]}) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{label}</label>
        <select id={name} name={name} value={value} onChange={e => onChange(name, e.target.value)} required
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-card ${error ? 'border-destructive' : 'border-border'}`}>
            <option value="">Select an option</option>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
);

const RadioCard = ({ name, value, label, description, checked, onChange }: { name: string, value: string, label: string, description: string, checked: boolean, onChange: any }) => (
    <label className={`block p-4 border rounded-md cursor-pointer transition-all ${checked ? 'bg-primary/10 border-primary ring-2 ring-primary' : 'hover:bg-accent'}`}>
        <input type="radio" name={name} value={value} checked={checked} onChange={e => onChange(name, e.target.value)} className="sr-only"/>
        <p className="font-semibold">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </label>
);

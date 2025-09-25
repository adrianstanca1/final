import React, { useState, useEffect, useRef } from 'react';
import { Role, RolePermissions, CompanyType, RegisterCredentials } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InputField, SelectField, RadioCard } from './ui/FormFields';
import { RegistrationStep, RegistrationFormData, CompanyData, FormFieldErrors } from './types/registrationTypes';
import './userRegistration.css';

interface UserRegistrationProps {
    onSwitchToLogin: () => void;
}

const STEPS: { id: RegistrationStep; name: string }[] = [
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
    // Map the strength score to one of our predefined percentages
    const widthMap: Record<number, string> = {
        0: "0%",
        1: "20%",
        2: "40%",
        3: "60%",
        4: "80%",
        5: "100%"
    };

    const width = widthMap[strength];

    let color: string;
    if (strength < 3) {
        color = 'bg-destructive';
    } else if (strength < 5) {
        color = 'bg-yellow-500';
    } else {
        color = 'bg-green-500';
    }

    // For accessibility, describe the strength level
    const strengthLabels = [
        "Very weak", "Weak", "Moderate", "Strong", "Very strong", "Excellent"
    ];

    return (
        <div className="password-strength-container">
            <p className="text-sm text-muted-foreground" id="password-strength-label">
                Password strength: {strengthLabels[strength]}
            </p>
            <div
                className="progress-bar"
                role="progressbar"
                aria-labelledby="password-strength-label"
            >
                <div
                    className={`progress-bar-fill ${color}`}
                    data-width={width}
                />
            </div>
        </div>
    );
};

const CreateCompanyModal: React.FC<{
    onClose: () => void;
    onSave: (data: CompanyData) => void;
    initialData: Partial<CompanyData>;
}> = ({ onClose, onSave, initialData }) => {
    const [name, setName] = useState(initialData.name || '');
    const [type, setType] = useState<CompanyType | ''>(initialData.type || '');
    const [email, setEmail] = useState(initialData.email || '');
    const [phone, setPhone] = useState(initialData.phone || '');
    const [website, setWebsite] = useState(initialData.website || '');
    const [errors, setErrors] = useState<FormFieldErrors>({});

    // Use React's useEffect for keyboard handling and focus management
    const nameInputId = "company-name";

    // Handle keyboard trap and focus management
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Close on escape
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            // Trap focus within modal
            if (e.key === 'Tab') {
                // Get all focusable elements in modal
                const modal = document.querySelector('[role="dialog"]');
                if (!modal) return;

                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );

                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                // If shift+tab on first element, move to last
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
                // If tab on last element, move to first
                else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Set initial focus on company name field
        const nameInput = document.getElementById(nameInputId);
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 50);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Create a type-safe handler for the select field
    const handleTypeChange = (name: string, val: string) => {
        setType(val as CompanyType);
    };

    const companyTypeOptions = [
        { value: 'GENERAL_CONTRACTOR', label: 'General Contractor' },
        { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
        { value: 'SUPPLIER', label: 'Supplier' },
        { value: 'CONSULTANT', label: 'Consultant' },
        { value: 'CLIENT', label: 'Client' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: FormFieldErrors = {};
        if (!name.trim()) newErrors.name = "Company name is required.";
        if (!type) newErrors.type = "Company type is required.";
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "A valid company email is required.";
        if (!phone.trim()) newErrors.phone = "Company phone number is required.";

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            onSave({ name, type: type as CompanyType, email, phone, website });
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-modal-title"
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        >
            {/* Backdrop that closes modal when clicked */}
            <div
                className="absolute inset-0 bg-transparent border-0 cursor-default"
                onClick={onClose}
                aria-hidden="true"
            />
            <Card className="w-full max-w-lg relative">
                <h3 id="company-modal-title" className="text-lg font-bold mb-4">Create Your Company</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField
                        id="company-name"
                        label="Company Name"
                        name="name"
                        value={name}
                        onChange={(name, val) => setName(val)}
                        error={errors.name}
                        required
                    />
                    <SelectField
                        id="company-type"
                        label="Company Type"
                        name="type"
                        value={type}
                        onChange={handleTypeChange}
                        error={errors.type}
                        options={companyTypeOptions}
                        required
                    />
                    <InputField
                        id="company-email"
                        label="Company Email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(name, val) => setEmail(val)}
                        error={errors.email}
                        required
                    />
                    <InputField
                        id="company-phone"
                        label="Company Phone"
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={(name, val) => setPhone(val)}
                        error={errors.phone}
                        required
                    />
                    <InputField
                        id="company-website"
                        label="Company Website (Optional)"
                        name="website"
                        type="url"
                        value={website}
                        onChange={(name, val) => setWebsite(val)}
                    />
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Company</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export const UserRegistration: React.FC<UserRegistrationProps> = ({ onSwitchToLogin }) => {
    const { register, error: authError, loading: isLoading } = useAuth();
    const [step, setStep] = useState<RegistrationStep>('personal');
    const [formData, setFormData] = useState<RegistrationFormData>({});
    const [errors, setErrors] = useState<FormFieldErrors>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

    useEffect(() => {
        setGeneralError(authError);
    }, [authError]);

    // Individual validation functions to reduce complexity
    const validatePersonalStep = (formData: RegistrationFormData): FormFieldErrors => {
        const errors: FormFieldErrors = {};
        if (!formData.firstName || formData.firstName.length < 2) errors.firstName = "First name is required.";
        if (!formData.lastName || formData.lastName.length < 2) errors.lastName = "Last name is required.";
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "A valid email is required.";
        if (!formData.password || formData.password.length < 8) errors.password = "Password must be at least 8 characters.";
        if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match.";
        return errors;
    };

    const validateCompanyStep = (formData: RegistrationFormData): FormFieldErrors => {
        const errors: FormFieldErrors = {};
        if (!formData.companySelection) {
            errors.companySelection = "Please choose an option.";
        } else if (formData.companySelection === 'create' && (!formData.companyName || !formData.companyType)) {
            errors.companyName = "Company details are required. Please create or edit your company.";
        } else if (formData.companySelection === 'join' && !formData.inviteToken) {
            errors.inviteToken = "An invite token is required.";
        }
        return errors;
    };

    const validateRoleStep = (formData: RegistrationFormData): FormFieldErrors => {
        const errors: FormFieldErrors = {};
        if (!formData.role) errors.role = "Please select a role.";
        return errors;
    };

    const validateVerifyStep = (formData: RegistrationFormData): FormFieldErrors => {
        const errors: FormFieldErrors = {};
        if (formData.verificationCode !== '123456') errors.verificationCode = "Enter the mock code: 123456.";
        return errors;
    };

    const validateTermsStep = (formData: RegistrationFormData): FormFieldErrors => {
        const errors: FormFieldErrors = {};
        if (!formData.termsAccepted) errors.termsAccepted = "You must accept the terms.";
        return errors;
    };

    const validateStep = (currentStep: RegistrationStep): boolean => {
        let newErrors: FormFieldErrors = {};

        switch (currentStep) {
            case 'personal':
                newErrors = validatePersonalStep(formData);
                break;
            case 'company':
                newErrors = validateCompanyStep(formData);
                break;
            case 'role':
                newErrors = validateRoleStep(formData);
                break;
            case 'verify':
                newErrors = validateVerifyStep(formData);
                break;
            case 'terms':
                newErrors = validateTermsStep(formData);
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Helper functions for step navigation with type safety
    const getNextStep = (currentStep: RegistrationStep): RegistrationStep | null => {
        const currentIndex = STEPS.findIndex(s => s.id === currentStep);
        return currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1].id : null;
    };

    const getPreviousStep = (currentStep: RegistrationStep): RegistrationStep | null => {
        const currentIndex = STEPS.findIndex(s => s.id === currentStep);
        return currentIndex > 0 ? STEPS[currentIndex - 1].id : null;
    };

    // Create refs for step-specific first focusable elements
    const stepHeadingRef = React.useRef<HTMLHeadingElement>(null);

    // Set focus when step changes
    React.useEffect(() => {
        // Short delay to allow the DOM to update
        const focusTimer = setTimeout(() => {
            // First try to focus on the first input element in the form
            const firstInput = document.querySelector(`[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] button`);

            if (firstInput instanceof HTMLElement) {
                firstInput.focus();
            } else if (stepHeadingRef.current) {
                // If no input found, focus on the heading for the step
                stepHeadingRef.current.focus();
            }
        }, 50);

        return () => clearTimeout(focusTimer);
    }, [step]);

    // Handle keyboard shortcuts for navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Allow Alt+ArrowRight to move to next step if valid
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            }

            // Allow Alt+ArrowLeft to move to previous step
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                handleBack();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [step]);

    const handleNext = () => {
        if (validateStep(step)) {
            const nextStep = getNextStep(step);
            if (nextStep) {
                setStep(nextStep);

                // Announce step change to screen readers
                const stepInfo = STEPS.find(s => s.id === nextStep);
                if (stepInfo) {
                    // This would ideally use a live region for screen reader announcement
                    document.title = `Create Account - ${stepInfo.name} | AS Agents`;
                }
            }
        }
    };

    const handleBack = () => {
        const previousStep = getPreviousStep(step);
        if (previousStep) {
            setStep(previousStep);

            // Announce step change to screen readers
            const stepInfo = STEPS.find(s => s.id === previousStep);
            if (stepInfo) {
                document.title = `Create Account - ${stepInfo.name} | AS Agents`;
            }
        }
    };

    // Helper function to clear specific form errors
    const clearErrors = (fieldNames: (keyof RegistrationFormData)[]) => {
        setErrors(prev => {
            const newErrors = { ...prev };
            fieldNames.forEach(field => {
                delete newErrors[field as string];
            });
            return newErrors;
        });
    };

    const handleCompanySave = (companyData: CompanyData) => {
        const { name, type, email, phone, website } = companyData;

        setFormData(prev => ({
            ...prev,
            companyName: name,
            companyType: type,
            companyEmail: email,
            companyPhone: phone,
            companyWebsite: website,
            companySelection: 'create'
        }));

        setIsCompanyModalOpen(false);

        // Clear relevant company field errors
        clearErrors(['companyName', 'companyType', 'companyEmail', 'companyPhone']);
    };

    const handleChange = (field: keyof RegistrationFormData, value: any) => {
        // Handle special case for company creation
        if (field === 'companySelection' && value === 'create') {
            setIsCompanyModalOpen(true);
        }

        // Special password handling for form validation
        if (field === 'password') {
            // If password changes and there was a confirmPassword error, we should clear it
            if (errors.confirmPassword) {
                clearErrors(['confirmPassword']);
            }
        }

        // Update form data
        setFormData(prev => ({
            ...prev,
            [field]: value
        } as RegistrationFormData));

        // Clear error for the changed field
        if (errors[field as string]) {
            clearErrors([field]);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep('terms')) return;

        try {
            await register({
                firstName: formData.firstName || '',
                lastName: formData.lastName || '',
                email: formData.email || '',
                password: formData.password || '',
                role: formData.role || Role.PROJECT_MANAGER, // Default role if somehow missing
                companyName: formData.companyName,
                companyType: formData.companyType,
                inviteToken: formData.inviteToken,
                // Other fields aren't part of the registration API
            });
        } catch (error) {
            setGeneralError(error instanceof Error ? error.message : 'An error occurred during registration');
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 'personal': return (
                <div data-step="personal">
                    <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold mb-4">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="First Name" name="firstName" value={formData.firstName || ''} onChange={handleChange} error={errors.firstName} required />
                        <InputField label="Last Name" name="lastName" value={formData.lastName || ''} onChange={handleChange} error={errors.lastName} required />
                    </div>
                    <InputField label="Email" name="email" type="email" value={formData.email || ''} onChange={handleChange} error={errors.email} required />
                    <InputField label="Phone (Optional)" name="phone" type="tel" value={formData.phone || ''} onChange={handleChange} error={errors.phone} />
                    <InputField label="Password" name="password" type="password" value={formData.password || ''} onChange={handleChange} error={errors.password} required />
                    <PasswordStrengthIndicator password={formData.password} />
                    <InputField label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword || ''} onChange={handleChange} error={errors.confirmPassword} required />
                </div>
            );
            case 'company': return (
                <div data-step="company">
                    <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold mb-4">Company Information</h3>
                    <div className="space-y-2">
                        <fieldset>
                            <legend className="text-sm font-medium text-muted-foreground mb-2">How would you like to get started?</legend>
                            <RadioCard name="companySelection" value="create" label="Create a new company" description="Set up a new workspace for your team." checked={formData.companySelection === 'create'} onChange={handleChange} />
                            <RadioCard name="companySelection" value="join" label="Join an existing company" description="You'll need an invite token from the company." checked={formData.companySelection === 'join'} onChange={handleChange} />
                            {errors.companySelection && <p className="text-xs text-destructive mt-1" role="alert" id="company-selection-error">{errors.companySelection}</p>}
                        </fieldset>
                    </div>
                    {formData.companySelection === 'create' && formData.companyName && (
                        <Card className="mt-4 bg-muted animate-card-enter">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="font-semibold">{formData.companyName}</h4>
                                    <p className="text-sm text-muted-foreground">{formData.companyType?.replace(/_/g, ' ')}</p>
                                </div>
                                <Button type="button" variant="outline" onClick={() => setIsCompanyModalOpen(true)}>Edit</Button>
                            </div>
                            <dl className="grid grid-cols-2 gap-1">
                                <dt className="text-xs text-muted-foreground">Email:</dt>
                                <dd className="text-xs">{formData.companyEmail}</dd>
                                <dt className="text-xs text-muted-foreground">Phone:</dt>
                                <dd className="text-xs">{formData.companyPhone}</dd>
                                {formData.companyWebsite && (
                                    <>
                                        <dt className="text-xs text-muted-foreground">Website:</dt>
                                        <dd className="text-xs">{formData.companyWebsite}</dd>
                                    </>
                                )}
                            </dl>
                        </Card>
                    )}
                    {errors.companyName && <p className="text-xs text-destructive mt-1" role="alert">{errors.companyName}</p>}
                    {formData.companySelection === 'join' && (
                        <div className="mt-4 animate-card-enter">
                            <InputField label="Company Invite Token" name="inviteToken" value={formData.inviteToken || ''} onChange={handleChange} error={errors.inviteToken} placeholder="Enter the token provided to you" required />
                        </div>
                    )}
                </div>
            );
            case 'role': {
                const selectedRolePermissions = formData.role ? RolePermissions[formData.role] : new Set();

                return (
                    <div data-step="role">
                        <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold mb-4">Select Your Role</h3>
                        <fieldset>
                            <legend className="text-muted-foreground mb-4">Select your role in the company:</legend>
                            <div className="space-y-2">
                                {Object.values(Role).map(role => (
                                    <RadioCard key={role} name="role" value={role} label={role.replace(/_/g, ' ')} description="" checked={formData.role === role} onChange={handleChange} />
                                ))}
                            </div>
                            {errors.role && <p className="text-xs text-destructive mt-1" role="alert">{errors.role}</p>}
                        </fieldset>

                        {formData.role && (
                            <div className="mt-4 bg-muted p-4 rounded-md">
                                <h4 className="font-semibold mb-2">Role Permissions</h4>
                                <ul className="list-disc pl-5 text-sm">
                                    {Array.from(selectedRolePermissions).map((permission, index) => (
                                        <li key={index}>{(permission as string).replace(/_/g, ' ').toLowerCase()}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            }
            case 'verify': return (
                <div data-step="verify" className="text-center">
                    <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold mb-4">Verification</h3>
                    <p className="mb-6 text-muted-foreground">Enter the verification code sent to your email (use mock code: 123456)</p>
                    <div className="w-52 mx-auto">
                        <InputField label="Verification Code" name="verificationCode" value={formData.verificationCode || ''} onChange={(name: string, val: string) => handleChange(name as keyof RegistrationFormData, val.replace(/\D/g, ''))} error={errors.verificationCode} maxLength={6} inputClassName="text-center tracking-[0.5em] text-2xl" isLabelSrOnly required />
                    </div>
                </div>
            );
            case 'terms': return (
                <div data-step="terms">
                    <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold mb-4">Accept Terms</h3>
                    <div className="space-y-4">
                        <Card className="p-4 max-h-60 overflow-y-auto">
                            <h4 className="font-semibold mb-2">Terms of Service</h4>
                            <p className="text-sm text-muted-foreground">By creating an account, you agree to our Terms of Service and Privacy Policy. This is a demo application with mock data for demonstration purposes only.</p>
                        </Card>
                        <div className="flex items-start space-x-2">
                            <input id="terms" type="checkbox" checked={!!formData.termsAccepted} onChange={e => handleChange('termsAccepted', e.target.checked)} className="h-4 w-4 text-primary focus:ring-ring border-border rounded mt-1" />
                            <label htmlFor="terms" className="text-sm">I have read and agree to the Terms of Service and Privacy Policy.</label>
                        </div>
                        {errors.termsAccepted && <p className="text-xs text-destructive mt-1" role="alert">{errors.termsAccepted}</p>}
                    </div>
                </div>
            );
            default: return null;
        }
    };

    const currentStepIndex = STEPS.findIndex(s => s.id === step);

    return (
        <>
            {isCompanyModalOpen && (
                <CreateCompanyModal
                    onClose={() => setIsCompanyModalOpen(false)}
                    onSave={handleCompanySave}
                    initialData={{ name: formData.companyName, type: formData.companyType, email: formData.companyEmail, phone: formData.companyPhone, website: formData.companyWebsite }}
                />
            )}
            <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center gap-2 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10 text-primary"><path fill="currentColor" d="M12 2L2 22h20L12 2z" /></svg>
                            <h1 className="text-3xl font-bold text-foreground">AS Agents</h1>
                        </div>
                        <h2 className="text-muted-foreground">Create your account</h2>
                    </div>

                    <div className="mb-8 px-4">
                        <nav aria-label="Registration progress">
                            <ol className="flex items-center justify-between">
                                {STEPS.map((s, index) => (
                                    <React.Fragment key={s.id}>
                                        <li
                                            className="flex flex-col items-center"
                                            aria-current={index === currentStepIndex ? "step" : undefined}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${index === currentStepIndex ? 'bg-primary text-primary-foreground' :
                                                    index < currentStepIndex ? 'bg-green-500 text-primary-foreground' :
                                                        'bg-muted text-muted-foreground'
                                                    }`}
                                                aria-hidden="true"
                                            >
                                                {index < currentStepIndex ? '✓' : index + 1}
                                            </div>
                                            <p className={`text-xs mt-1 text-center ${index === currentStepIndex ? 'font-semibold text-primary' :
                                                index < currentStepIndex ? 'font-medium' :
                                                    'text-muted-foreground'
                                                }`}>
                                                <span className="sr-only">Step {index + 1}: </span>
                                                {s.name}
                                            </p>
                                        </li>
                                        {index < STEPS.length - 1 && (
                                            <div
                                                className={`flex-grow h-0.5 transition-colors ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}`}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                            </ol>
                        </nav>
                    </div>

                    <Card>
                        {generalError && (
                            <div
                                className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md"
                                role="alert"
                                aria-live="assertive"
                            >
                                <p className="font-medium">Error</p>
                                <p>{generalError}</p>
                            </div>
                        )}
                        <div className="space-y-6">
                            {renderStepContent()}
                        </div>
                        <div className="mt-8 flex justify-between items-center">
                            <div>
                                {currentStepIndex > 0 && (
                                    <Button type="button" variant="ghost" onClick={handleBack} disabled={isLoading}>
                                        Back
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={onSwitchToLogin} disabled={isLoading}>
                                    Have an account? Log in
                                </Button>
                                {currentStepIndex < STEPS.length - 1 ? (
                                    <Button type="button" variant="primary" onClick={handleNext} disabled={isLoading}>
                                        Next
                                    </Button>
                                ) : (
                                    <Button type="button" variant="primary" onClick={handleSubmit} disabled={isLoading}>
                                        {isLoading ? 'Creating...' : 'Create Account'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
                <p className="mt-6 text-center text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} AS Agents. All rights reserved.
                </p>
            </div>
        </>
    );
};
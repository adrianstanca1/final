import React from 'react';

interface InputFieldProps {
    label: string;
    name: string;
    type?: string;
    value?: string;
    onChange: (name: string, value: string) => void;
    error?: string;
    maxLength?: number;
    inputClassName?: string;
    isLabelSrOnly?: boolean;
    placeholder?: string;
    required?: boolean;
    id?: string;
    'aria-describedby'?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
    label,
    name,
    type = 'text',
    value = '',
    onChange,
    error,
    maxLength,
    inputClassName = '',
    isLabelSrOnly = false,
    placeholder,
    required = false,
    id,
    ...rest
}) => {
    const inputId = id || name;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
        <div>
            <label
                htmlFor={inputId}
                className={isLabelSrOnly ? 'sr-only' : 'block text-sm font-medium text-muted-foreground'}
            >
                {label}{required && <span aria-hidden="true" className="text-destructive ml-1">*</span>}
            </label>
            <input
                id={inputId}
                name={name}
                type={type}
                value={value}
                maxLength={maxLength}
                onChange={e => onChange(name, e.target.value)}
                placeholder={placeholder}
                required={required}
                aria-invalid={!!error}
                aria-describedby={errorId}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${error ? 'border-destructive' : 'border-border'} ${inputClassName}`}
                {...rest}
            />
            {error && <p id={errorId} className="text-xs text-destructive mt-1" role="alert">{error}</p>}
        </div>
    );
};

interface SelectFieldProps {
    label: string;
    name: string;
    value: any;
    onChange: (name: string, value: string) => void;
    error?: string;
    options: { value: string, label: string }[];
    required?: boolean;
    id?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
    label,
    name,
    value,
    onChange,
    error,
    options,
    required = false,
    id
}) => {
    const selectId = id || name;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
        <div>
            <label
                htmlFor={selectId}
                className="block text-sm font-medium text-muted-foreground"
            >
                {label}{required && <span aria-hidden="true" className="text-destructive ml-1">*</span>}
            </label>
            <select
                id={selectId}
                name={name}
                value={value}
                onChange={e => onChange(name, e.target.value)}
                required={required}
                aria-invalid={!!error}
                aria-describedby={errorId}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-card ${error ? 'border-destructive' : 'border-border'}`}
            >
                <option value="">Select an option</option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <p id={errorId} className="text-xs text-destructive mt-1" role="alert">{error}</p>}
        </div>
    );
};

interface RadioCardProps {
    name: string;
    value: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (name: string, value: string) => void;
}

export const RadioCard: React.FC<RadioCardProps> = ({
    name,
    value,
    label,
    description,
    checked,
    onChange
}) => {
    const id = `${name}-${value}`;

    return (
        <label
            htmlFor={id}
            className={`block p-4 border rounded-md cursor-pointer transition-all ${checked ? 'bg-primary/10 border-primary ring-2 ring-primary' : 'hover:bg-accent'}`}
        >
            <input
                id={id}
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={e => onChange(name, e.target.value)}
                className="sr-only"
            />
            <p className="font-semibold">{label}</p>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </label>
    );
};
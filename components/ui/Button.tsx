import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    isLoading?: boolean;
}

const Spinner: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
    const spinnerSizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
    };

    return (
        <svg
            className={`animate-spin ${spinnerSizeClasses[size]}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-label="Loading"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
};

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    disabled = false,
    ...props
}) => {
    const baseClasses = `
    inline-flex items-center justify-center rounded-md font-semibold 
    focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 
    disabled:opacity-60 disabled:cursor-not-allowed 
    transition-all duration-200 transform 
    hover:scale-[1.02] active:scale-[0.98]
    select-none
  `.trim().replace(/\s+/g, ' ');

    const variantClasses = {
        primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white shadow-sm',
        secondary: 'bg-slate-100 hover:bg-slate-200 focus:ring-slate-500 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-600',
        outline: 'bg-transparent hover:bg-slate-100 focus:ring-slate-500 text-slate-900 border border-slate-300 dark:hover:bg-slate-800 dark:text-slate-100 dark:border-slate-600',
        success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white shadow-sm',
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-sm',
        ghost: 'bg-transparent hover:bg-slate-100 focus:ring-slate-500 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs h-8 min-w-[2rem]',
        md: 'px-4 py-2 text-sm h-10 min-w-[2.5rem]',
        lg: 'px-6 py-3 text-base h-12 min-w-[3rem]',
    };

    const isDisabled = disabled || isLoading;

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={isDisabled}
            {...props}
        >
            {isLoading && <Spinner size={size} />}
            {isLoading && <span className="ml-2">{children}</span>}
            {!isLoading && children}
        </button>
    );
};
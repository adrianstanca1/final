import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div
            className={`
        bg-white dark:bg-slate-800 
        text-slate-900 dark:text-slate-100 
        rounded-lg border border-slate-200 dark:border-slate-700 
        p-6 shadow-sm transition-all duration-300 
        hover:shadow-md
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            {...props}
        >
            {children}
        </div>
    );
};
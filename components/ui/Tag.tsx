import React from 'react';

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
    label: string;
    color?: 'green' | 'blue' | 'red' | 'gray' | 'yellow' | 'orange';
    statusIndicator?: 'green' | 'blue' | 'red' | 'gray' | 'yellow' | 'orange';
}

export const Tag: React.FC<TagProps> = ({ label, color = 'gray', className, statusIndicator, ...props }) => {
    const colorClasses = {
        green: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        gray: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };

    const indicatorClasses = {
        green: 'bg-green-400',
        blue: 'bg-blue-400',
        red: 'bg-red-400',
        yellow: 'bg-yellow-400',
        orange: 'bg-orange-400',
        gray: 'bg-gray-400',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                colorClasses[color]
            } ${className || ''}`}
            {...props}
        >
            {statusIndicator && (
                <span
                    className={`w-2 h-2 rounded-full mr-1.5 ${indicatorClasses[statusIndicator]}`}
                />
            )}
            {label}
        </span>
    );
};

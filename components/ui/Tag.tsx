import React from 'react';

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
    label: string;
    color?: 'green' | 'blue' | 'red' | 'gray' | 'yellow' | 'orange' | 'purple';
    statusIndicator?: 'green' | 'blue' | 'red' | 'gray' | 'yellow' | 'orange' | 'purple';
    className?: string;
}

export const Tag: React.FC<TagProps> = ({
    label,
    color = 'gray',
    className = '',
    statusIndicator,
    ...props
}) => {
    const colorClasses = {
        green: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800',
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
        orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        gray: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    };

    const indicatorColorClasses = {
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        red: 'bg-red-500',
        yellow: 'bg-yellow-500',
        orange: 'bg-orange-500',
        purple: 'bg-purple-500',
        gray: 'bg-slate-400',
    };

    const finalClassName = [
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
        colorClasses[color],
        className,
    ].filter(Boolean).join(' ');

    return (
        <span className={finalClassName} {...props}>
            {statusIndicator && (
                <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${indicatorColorClasses[statusIndicator]}`}
                    aria-hidden="true"
                />
            )}
            <span className="truncate">{label}</span>
        </span>
    );
};
import React, { useEffect, useState } from 'react';
import { Button } from '../Button';

export interface ToastProps {
    id: string;
    type?: 'success' | const ariaLive = type === 'error' ? 'assertive' : 'polite';

return (
    <div
        role=\"alert\"
aria - live={ ariaLive }
className = {`
        max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border transition-all duration-300 ease-in-out
        ${getBackgroundColor()}
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isExiting ? 'scale-95' : 'scale-100'}
      `}
    > 'warning' | 'info';
title ?: string;
message: string;
action ?: {
    label: string;
    onClick: () => void;
};
onDismiss: () => void;
}

export function Toast({
    id,
    type = 'info',
    title,
    message,
    action,
    onDismiss,
}: Readonly<ToastProps>) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 200); // Wait for exit animation
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                );
            case 'error':
                return (
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                );
            case 'warning':
                return (
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                );
            case 'info':
            default:
                return (
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                );
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            case 'error':
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            case 'warning':
                return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
            case 'info':
            default:
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return 'text-green-600 dark:text-green-400';
            case 'error':
                return 'text-red-600 dark:text-red-400';
            case 'warning':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'info':
            default:
                return 'text-blue-600 dark:text-blue-400';
        }
    };

    const getTextColor = () => {
        switch (type) {
            case 'success':
                return 'text-green-800 dark:text-green-200';
            case 'error':
                return 'text-red-800 dark:text-red-200';
            case 'warning':
                return 'text-yellow-800 dark:text-yellow-200';
            case 'info':
            default:
                return 'text-blue-800 dark:text-blue-200';
        }
    };

    return (
        <div
            role="alert"
            aria-live={type === 'error' ? 'assertive' : 'polite'}
            className={`
        max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border transition-all duration-300 ease-in-out
        ${getBackgroundColor()}
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isExiting ? 'scale-95' : 'scale-100'}
      `}
        >
            <div className="p-4">
                <div className="flex items-start">
                    <div className={`flex-shrink-0 ${getIconColor()}`}>
                        {getIcon()}
                    </div>
                    <div className="ml-3 w-0 flex-1">
                        {title && (
                            <p className={`text-sm font-medium ${getTextColor()}`}>
                                {title}
                            </p>
                        )}
                        <p className={`text-sm ${title ? 'mt-1' : ''} ${getTextColor()}`}>
                            {message}
                        </p>
                        {action && (
                            <div className="mt-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={action.onClick}
                                    className="text-sm"
                                >
                                    {action.label}
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            type="button"
                            className={`
                rounded-md inline-flex focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${getTextColor()} hover:opacity-75
              `}
                            onClick={handleDismiss}
                            aria-label="Dismiss notification"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
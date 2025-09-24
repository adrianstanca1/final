import React, { useState, useEffect } from 'react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss: () => void;
}

export function Toast({ id, type = 'info', title, message, action, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(showTimer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(), 300); // Match the animation duration
  };

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div
      className={`
        max-w-sm w-full pointer-events-auto transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${typeStyles[type]}
        border rounded-lg shadow-lg p-4 mb-4
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg">{iconMap[type]}</span>
        </div>
        
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{title}</p>
          {message && (
            <p className="mt-1 text-sm opacity-90">{message}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 ml-4 space-x-2">
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm underline hover:no-underline focus:outline-none"
            >
              {action.label}
            </button>
          )}
          
          <button
            onClick={handleDismiss}
            className="text-lg leading-none hover:opacity-75 focus:outline-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

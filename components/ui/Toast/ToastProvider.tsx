import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';import React, { createContext, useContext, useCallback, useState, useRef } from 'react';

import { Toast, ToastProps } from './Toast';



interface ToastOptions {export interface ToastOptions {

  type?: 'success' | 'error' | 'warning' | 'info';  id?: string;

  title?: string;  type?: 'success' | 'error' | 'warning' | 'info';

  message: string;  title?: string;

  duration?: number;  message: string;

  action?: {  duration?: number;

    label: string;  persistent?: boolean;

    onClick: () => void;  action?: {

  };    label: string;

  onDismiss?: () => void;    onClick: () => void;

}  };

  onDismiss?: () => void;

interface ToastContextType {interface ToastContextType {

  addToast: (options: ToastOptions) => string;  addToast: (options: ToastOptions) => string;

  removeToast: (id: string) => void;  removeToast: (id: string) => void;

  clearAllToasts: () => void;  clearAllToasts: () => void;

  updateToast: (id: string, updates: Partial<ToastOptions>) => void;  updateToast: (id: string, updates: Partial<ToastOptions>) => void;

}const ToastContext = createContext<ToastContextType | undefined>(undefined);



const ToastContext = createContext<ToastContextType | undefined>(undefined);}



export function useToast() {export function useToast() {

  const context = useContext(ToastContext);  const context = useContext(ToastContext);

  if (!context) {  if (!context) {

    throw new Error('useToast must be used within a ToastProvider');    throw new Error('useToast must be used within a ToastProvider');

  }  }

  return context;  return context;

}interface ToastState extends ToastOptions {

  id: string;

interface ToastProviderProps {  createdAt: number;

  children: ReactNode;export function ToastProvider({ children }: { children: React.ReactNode }) {

}  const [toasts, setToasts] = useState<ToastState[]>([]);

  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

export function ToastProvider({ children }: ToastProviderProps) {

  const [toasts, setToasts] = useState<Array<ToastProps & { duration?: number }>>([]);  const removeToast = useCallback((id: string) => {

    setToasts(prev => prev.filter(toast => toast.id !== id));

  const addToast = useCallback((options: ToastOptions) => {    

    const id = `toast-${Date.now()}-${Math.random()}`;    // Clear timeout if it exists

    const toast = {    const timeoutId = timeoutRefs.current.get(id);

      id,    if (timeoutId) {

      ...options,      clearTimeout(timeoutId);

      onDismiss: () => {      timeoutRefs.current.delete(id);

        removeToast(id);    }

        options.onDismiss?.();  }, []);

      },

    };  const addToast = useCallback((options: ToastOptions): string => {

    const id = options.id || `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setToasts(prev => [...prev, toast]);    const duration = options.duration ?? (options.type === 'error' ? 8000 : 5000);

    

    // Auto-dismiss after duration    const toast: ToastState = {

    if (options.duration !== 0) {      ...options,

      const duration = options.duration || 5000;      id,

      setTimeout(() => removeToast(id), duration);      createdAt: Date.now(),

    }    };



    return id;    setToasts(prev => {

  }, []);      // Remove existing toast with same ID if it exists

      const filtered = prev.filter(t => t.id !== id);

  const removeToast = useCallback((id: string) => {      

    setToasts(prev => prev.filter(toast => toast.id !== id));      // Add new toast at the beginning

  }, []);      return [toast, ...filtered];

    });

  const clearAllToasts = useCallback(() => {

    setToasts([]);    // Set auto-dismiss timeout unless persistent

  }, []);    if (!options.persistent && duration > 0) {

      const timeoutId = setTimeout(() => {

  const updateToast = useCallback((id: string, updates: Partial<ToastOptions>) => {        removeToast(id);

    setToasts(prev =>      }, duration);

      prev.map(toast =>      

        toast.id === id      timeoutRefs.current.set(id, timeoutId);

          ? { ...toast, ...updates }    }

          : toast

      )    return id;

    );  }, [removeToast]);

  }, []);

  const clearAllToasts = useCallback(() => {

  const value = {    // Clear all timeouts

    addToast,    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));

    removeToast,    timeoutRefs.current.clear();

    clearAllToasts,    

    updateToast,    setToasts([]);

  };  }, []);



  return (  const updateToast = useCallback((id: string, updates: Partial<ToastOptions>) => {

    <ToastContext.Provider value={value}>    setToasts(prev => prev.map(toast => 

      {children}      toast.id === id ? { ...toast, ...updates } : toast

      <ToastContainer toasts={toasts} onDismiss={removeToast} />    ));

    </ToastContext.Provider>  }, []);

  );

}  // Convenience methods for common toast types

  const contextValue: ToastContextType = {

interface ToastContainerProps {    addToast,

  toasts: Array<ToastProps & { duration?: number }>;    removeToast,

  onDismiss: (id: string) => void;    clearAllToasts,

}    updateToast,

  };

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {

  if (toasts.length === 0) {  return (

    return null;    <ToastContext.Provider value={contextValue}>

  }      {children}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />

  return (    </ToastContext.Provider>

    <div  );

      className="fixed top-0 right-0 z-50 p-4 space-y-4 pointer-events-none"interface ToastContainerProps {

      aria-live="polite"  toasts: ToastState[];

      aria-label="Notifications"  onDismiss: (id: string) => void;

    >}

      {toasts.map(toast => (

        <div key={toast.id} className="pointer-events-auto">function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {

          <Toast  if (toasts.length === 0) return null;

            id={toast.id}

            type={toast.type}  return (

            title={toast.title}    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">

            message={toast.message}      {toasts.map(toast => (

            action={toast.action}        <Toast

            onDismiss={() => onDismiss(toast.id)}          key={toast.id}

          />          id={toast.id}

        </div>          type={toast.type}

      ))}          title={toast.title}

    </div>          message={toast.message}

  );          action={toast.action}

}          onDismiss={() => {
            toast.onDismiss?.();
            onDismiss(toast.id);
          }}
        />
      ))}
    </div>
  );
// Convenience hook for common toast patterns
export function useToastHelpers() {
  const { addToast } = useToast();

  return {
    success: useCallback((message: string, title?: string) => 
      addToast({ type: 'success', message, title }), [addToast]),
    
    error: useCallback((message: string, title?: string, options?: { persistent?: boolean; action?: ToastOptions['action'] }) => 
      addToast({ 
        type: 'error', 
        message, 
        title: title || 'Error',
        persistent: options?.persistent,
        action: options?.action,
      }), [addToast]),
    
    warning: useCallback((message: string, title?: string) => 
      addToast({ type: 'warning', message, title }), [addToast]),
    
    info: useCallback((message: string, title?: string) => 
      addToast({ type: 'info', message, title }), [addToast]),

    // Error-specific helpers
    networkError: useCallback(() => 
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Please check your internet connection and try again.',
        persistent: true,
        action: {
          label: 'Retry',
          onClick: () => window.location.reload(),
        },
      }), [addToast]),

    sessionExpired: useCallback(() => 
      addToast({
        type: 'warning',
        title: 'Session Expired',
        message: 'Your session has expired. Please log in again.',
        persistent: true,
        action: {
          label: 'Log In',
          onClick: () => {
            // Clear local storage and redirect to login
            localStorage.clear();
            window.location.href = '/login';
          },
        },
      }), [addToast]),

    permissionDenied: useCallback(() => 
      addToast({
        type: 'error',
        title: 'Permission Denied',
        message: 'You don\'t have permission to perform this action.',
        duration: 6000,
      }), [addToast]),

    operationSuccess: useCallback((operation: string) => 
      addToast({
        type: 'success',
        message: `${operation} completed successfully.`,
        duration: 3000,
      }), [addToast]),

    operationFailed: useCallback((operation: string, canRetry = true) => 
      addToast({
        type: 'error',
        title: 'Operation Failed',
        message: `Failed to ${operation.toLowerCase()}. ${canRetry ? 'Please try again.' : ''}`,
        duration: canRetry ? 6000 : 8000,
      }), [addToast]),
  };
}

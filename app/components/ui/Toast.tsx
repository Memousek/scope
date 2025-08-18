/**
 * Toast Notification Component
 * 
 * Features:
 * - Multiple variants (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss with close button
 * - Keyboard navigation support
 * - Mobile-friendly touch interactions
 * - Accessibility compliant (ARIA labels, focus management)
 * - Smooth animations with Framer Motion
 * - Responsive design
 * - Toast queue management
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  FiCheck, 
  FiX, 
  FiAlertCircle, 
  FiAlertTriangle, 
  FiInfo
} from 'react-icons/fi';
import { useTranslation } from '@/lib/translation';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface ToastProps {
  id: string;
  title: string;
  message?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  onDismiss?: (id: string) => void;
  persistent?: boolean;
  closable?: boolean;
}

interface ToastState {
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// Toast context for global state management
const ToastContext = React.createContext<ToastState | null>(null);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback((toast: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastProps = {
      id,
      variant: 'default',
      duration: 5000,
      closable: true,
      ...toast,
    };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Individual Toast Component
const Toast: React.FC<ToastProps> = ({ 
  id, 
  title, 
  message, 
  variant = 'default', 
  duration = 5000, 
  action,
  onDismiss,
  persistent = false,
  closable = true 
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.(id);
    }, 300); // Wait for exit animation
  }, [id, onDismiss]);

  // Auto-dismiss functionality
  useEffect(() => {
    if (persistent || duration === 0) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, persistent, handleDismiss]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss();
    }
  }, [handleDismiss]);

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-green-500 dark:bg-green-600',
          border: 'border-green-200 dark:border-green-700',
          icon: <FiCheck className="w-5 h-5" />,
          iconBg: 'bg-green-100 dark:bg-green-900'
        };
      case 'error':
        return {
          bg: 'bg-red-500 dark:bg-red-600',
          border: 'border-red-200 dark:border-red-700',
          icon: <FiAlertCircle className="w-5 h-5" />,
          iconBg: 'bg-red-100 dark:bg-red-900'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500 dark:bg-yellow-600',
          border: 'border-yellow-200 dark:border-yellow-700',
          icon: <FiAlertTriangle className="w-5 h-5" />,
          iconBg: 'bg-yellow-100 dark:bg-yellow-900'
        };
      case 'info':
        return {
          bg: 'bg-blue-500 dark:bg-blue-600',
          border: 'border-blue-200 dark:border-blue-700',
          icon: <FiInfo className="w-5 h-5" />,
          iconBg: 'bg-blue-100 dark:bg-blue-900'
        };
      default:
        return {
          bg: 'bg-gray-500 dark:bg-gray-600',
          border: 'border-gray-200 dark:border-gray-700',
          icon: <FiInfo className="w-5 h-5" />,
          iconBg: 'bg-gray-100 dark:bg-gray-900'
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.3 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        duration: 0.3 
      }}
      className={`
        relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-lg border
        ${variantStyles.border} overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        hover:shadow-xl transition-shadow duration-200
      `}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex p-4 justify-center items-center">
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${variantStyles.iconBg} ${variantStyles.bg} text-white
        `}>
          {variantStyles.icon}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white text-center justify-center items-center flex">
            {title}
          </div>
          {message && (
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center justify-center items-center flex">
              {message}
            </div>
          )}
          
          {/* Action button */}
          {action && (
            <div className="mt-3 flex justify-center items-center">
              <button
                onClick={action.onClick}
                className={`
                  inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg
                  ${variantStyles.bg} text-white hover:opacity-90
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  transition-opacity duration-200
                  text-center
                  justify-center
                  items-center
                `}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </button>
            </div>
          )}
        </div>

        {/* Close button */}
        {closable && (
          <button
            onClick={handleDismiss}
            className={`
              ml-4 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
              text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-colors duration-200
            `}
            aria-label={t('close') || 'Close'}
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

// Toast Container Component
const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed bottom-20 right-24 z-50 space-y-3 max-w-sm w-full sm:max-w-md">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};

// Hook-based toast functions
export const useToastFunctions = () => {
  const { addToast } = useToast();
  
  return {
    success: (title: string, message?: string, options?: Partial<ToastProps>) => {
      return addToast({ title, message, variant: 'success', ...options });
    },
    
    error: (title: string, message?: string, options?: Partial<ToastProps>) => {
      return addToast({ title, message, variant: 'error', ...options });
    },
    
    warning: (title: string, message?: string, options?: Partial<ToastProps>) => {
      return addToast({ title, message, variant: 'warning', ...options });
    },
    
    info: (title: string, message?: string, options?: Partial<ToastProps>) => {
      return addToast({ title, message, variant: 'info', ...options });
    },
    
    default: (title: string, message?: string, options?: Partial<ToastProps>) => {
      return addToast({ title, message, variant: 'default', ...options });
    }
  };
};

// Copy to clipboard utility
export const copyToClipboard = async (text: string, successMessage = 'Copied to clipboard!') => {
  try {
    await navigator.clipboard.writeText(text);
    // Note: This will need to be called from within a component that uses useToastFunctions
    return true;
  } catch (error) {
    return false;
  }
};

// External link utility
export const openExternalLink = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

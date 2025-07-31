/**
 * Unified Modal Component
 * Provides consistent modal behavior across the application
 * - ESC key to close
 * - Click outside to close
 * - Gradient header with icon and title
 * - Consistent styling and animations
 */

import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { useTranslation } from '@/lib/translation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  icon, 
  children, 
  maxWidth = '2xl' 
}: ModalProps) {
  const { t } = useTranslation();

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
      {/* Backdrop s animací */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal s animací */}
      <div className={`relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} mx-4 overflow-hidden transform transition-all duration-300 scale-100`}>
        {/* Header s gradientem */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 relative">
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
            onClick={onClose}
            aria-label={t('close')}
          >
            <FiX size={24} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              {icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              {description && (
                <p className="text-white/80 text-sm">{description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 
/**
 * Unified Modal Component
 * Provides consistent modal behavior across the application
 * - ESC key to close
 * - Click outside to close
 * - Gradient header with icon and title
 * - Consistent styling and animations
 * - Prevents body scroll when open
 */

import { useEffect, ReactNode, useId, useRef } from 'react';
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
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
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
  const titleId = useId();
  const descId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveElementRef = useRef<Element | null>(null);

  // Blokování scrollování stránky když je modal otevřený
  useEffect(() => {
    if (isOpen) {
      // Uložíme původní overflow
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      // Cleanup funkce pro obnovení původního overflow
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

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

  // Focus management: trap focus within the modal and restore on close
  useEffect(() => {
    if (!isOpen) return;
    lastActiveElementRef.current = document.activeElement;

    // Move focus to close button after mount
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = containerRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleTab);
      if (lastActiveElementRef.current instanceof HTMLElement) {
        try { lastActiveElementRef.current.focus(); } catch {}
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl'
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
      {/* Backdrop s animací */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal s animací */}
      <div
        ref={containerRef}
        className={`relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} mx-4 overflow-hidden transform transition-all duration-300 scale-100`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        {/* Header s gradientem */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 relative">
          <button 
            ref={closeButtonRef}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/70"
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
              <h2 id={titleId} className="text-2xl font-bold text-white" dangerouslySetInnerHTML={{ __html: title }} />
              {description && (
                <p id={descId} className="text-white/80 text-sm" dangerouslySetInnerHTML={{ __html: description }} />
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
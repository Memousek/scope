/**
 * Custom hook for RTL (Right-to-Left) functionality
 * Provides RTL state and utility functions for components
 */
import { useState, useEffect } from 'react';
import { getCurrentLanguage } from '@/lib/translation';
import { isRTL, getTextDirection, getRTLClasses } from '@/lib/utils/rtlUtils';

export function useRTL() {
  const [currentLang, setCurrentLang] = useState<string>('cs');
  const [isRTLMode, setIsRTLMode] = useState<boolean>(false);
  const [direction, setDirection] = useState<'rtl' | 'ltr'>('ltr');
  const [rtlClasses, setRtlClasses] = useState(getRTLClasses('cs'));

  useEffect(() => {
    const lang = getCurrentLanguage();
    setCurrentLang(lang);
    
    const isRTLMode = isRTL(lang);
    setIsRTLMode(isRTLMode);
    
    const direction = getTextDirection(lang);
    setDirection(direction);
    
    const classes = getRTLClasses(lang);
    setRtlClasses(classes);
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newLang = getCurrentLanguage();
      setCurrentLang(newLang);
      
      const isRTLMode = isRTL(newLang);
      setIsRTLMode(isRTLMode);
      
      const direction = getTextDirection(newLang);
      setDirection(direction);
      
      const classes = getRTLClasses(newLang);
      setRtlClasses(classes);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    currentLang,
    isRTL: isRTLMode,
    direction,
    rtlClasses,
    // Helper functions
    getRTLClass: (className: string) => isRTLMode ? className : '',
    getDirectionClass: () => isRTLMode ? 'rtl' : 'ltr',
    getTextAlign: () => isRTLMode ? 'text-right' : 'text-left',
    getFlexDirection: () => isRTLMode ? 'flex-row-reverse' : 'flex-row',
  };
} 
'use client';

/**
 * RTL Provider component
 * Dynamically sets document direction and applies RTL classes based on current language
 */
import { useEffect, useState } from 'react';
import { getCurrentLanguage } from '@/lib/translation';
import { getTextDirection, getRTLClasses } from '@/lib/utils/rtlUtils';

interface RTLProviderProps {
  children: React.ReactNode;
}

export function RTLProvider({ children }: RTLProviderProps) {
  const [currentLang, setCurrentLang] = useState<string>('cs');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const lang = getCurrentLanguage();
    setCurrentLang(lang);
    
    // Set document direction
    const direction = getTextDirection(lang);
    document.documentElement.dir = direction;
    document.documentElement.lang = lang;
    
    // Add RTL class to body if needed
    const rtlClasses = getRTLClasses(lang);
    if (rtlClasses.rtlClass) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newLang = getCurrentLanguage();
      setCurrentLang(newLang);
      
      const direction = getTextDirection(newLang);
      document.documentElement.dir = direction;
      document.documentElement.lang = newLang;
      
      const rtlClasses = getRTLClasses(newLang);
      if (rtlClasses.rtlClass) {
        document.body.classList.add('rtl');
      } else {
        document.body.classList.remove('rtl');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!isClient) {
    return <>{children}</>;
  }

  const rtlClasses = getRTLClasses(currentLang);
  
  return (
    <div 
      className={`${rtlClasses.rtlClass}`}
      dir={rtlClasses.direction}
    >
      {children}
    </div>
  );
} 
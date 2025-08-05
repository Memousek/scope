'use client';

/**
 * RTL Provider component
 * Dynamically sets document direction and applies RTL classes based on current language
 * Optimized to prevent page flickering during hydration
 */
import { useEffect, useState } from 'react';
import { getCurrentLanguage, useTranslation } from '../../lib/translation';
import { getTextDirection, getRTLClasses } from '../../lib/utils/rtlUtils';

interface RTLProviderProps {
  children: React.ReactNode;
}

export function RTLProvider({ children }: RTLProviderProps) {
  const [currentLang, setCurrentLang] = useState<string>('cs');
  const [isHydrated, setIsHydrated] = useState(false);
  const { isLoading } = useTranslation();

  useEffect(() => {
    // Set initial language and direction immediately
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

    // Mark as hydrated after initial setup
    setIsHydrated(true);
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

  // Get RTL classes for current language
  const rtlClasses = getRTLClasses(currentLang);

  // Always render children with RTL classes, even during hydration
  // This prevents flickering by maintaining consistent styling
  return (
    <div
      className={`rtl-provider ${rtlClasses.rtlClass}`}
      dir={rtlClasses.direction}
    >
      {children}
      
      {/* Show loading indicator only in development mode and when translations are loading */}
      {isLoading && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 left-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 border">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Loading: {currentLang}
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 
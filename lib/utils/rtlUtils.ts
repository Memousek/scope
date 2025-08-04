/**
 * RTL (Right-to-Left) language utilities
 * Provides functions to detect RTL languages and manage RTL layout
 */

// List of RTL language codes
const RTL_LANGUAGES = ['ar'];

/**
 * Check if a language code is RTL (Right-to-Left)
 * @param langCode - The language code to check
 * @returns true if the language is RTL, false otherwise
 */
export function isRTL(langCode: string): boolean {
  return RTL_LANGUAGES.includes(langCode);
}

/**
 * Get the text direction for a language
 * @param langCode - The language code
 * @returns 'rtl' for RTL languages, 'ltr' for LTR languages
 */
export function getTextDirection(langCode: string): 'rtl' | 'ltr' {
  return isRTL(langCode) ? 'rtl' : 'ltr';
}

/**
 * Get CSS classes for RTL support
 * @param langCode - The language code
 * @returns Object with direction and RTL-specific classes
 */
export function getRTLClasses(langCode: string) {
  const isRTL = getTextDirection(langCode) === 'rtl';
  
  return {
    direction: getTextDirection(langCode),
    rtlClass: isRTL ? 'rtl' : '',
    textAlign: isRTL ? 'text-right' : 'text-left',
    flexDirection: isRTL ? 'flex-row-reverse' : 'flex-row',
    marginStart: isRTL ? 'mr-auto' : 'ml-auto',
    marginEnd: isRTL ? 'ml-auto' : 'mr-auto',
    paddingStart: isRTL ? 'pr-4' : 'pl-4',
    paddingEnd: isRTL ? 'pl-4' : 'pr-4',
  };
}

/**
 * Get the current language's text direction
 * @returns 'rtl' or 'ltr' based on current language
 */
export function getCurrentTextDirection(): 'rtl' | 'ltr' {
  if (typeof window !== 'undefined') {
    const currentLang = localStorage.getItem('lang') || 'cs';
    return getTextDirection(currentLang);
  }
  return 'ltr';
} 
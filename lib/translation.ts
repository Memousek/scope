'use client';

/**
 * Translation helper and React hook for multilanguage support.
 * Loads translation JSONs and provides t(key) for UI components.
 * Optimized to prevent unnecessary loading states during hydration.
 */
import { useState, useEffect, useMemo } from 'react';

const translations: Record<string, Record<string, string>> = {};

// Load translations at runtime (for SSR/SSG, use dynamic import or next-i18n)
async function loadTranslations(lang: string) {
  if (translations[lang]) return translations[lang];
  // Lazy load only the active language JSON
  const data = await import(/* webpackChunkName: "i18n-[request]" */ `../locales/${lang}.json`);
  translations[lang] = data.default;
  return translations[lang];
}

export function getCurrentLanguage(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('lang') || 'cs';
  }
  return 'cs';
}

export function setCurrentLanguage(lang: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lang', lang);
    // Soft reload: přepni přeložené řetězce bez full refresh
    // Komponenty, které volají useTranslation, se znovu vyrenderují díky změně stavu
    // Pro jistotu emitni vlastní event – posluchač přepne stav v hooku
    window.dispatchEvent(new CustomEvent('lang-changed', { detail: { lang } }));
  }
}

export function getLanguages() {
  return [
    { code: 'cs', label: 'Čeština', flag: 'cz' },
    { code: 'en', label: 'English', flag: 'gb' },

    // Střední Evropa
    { code: 'sk', label: 'Slovenčina', flag: 'sk' },
    { code: 'pl', label: 'Polski', flag: 'pl'},
    { code: 'hu', label: 'Magyar', flag: 'hu'},
    
    // Východní Evropa
    { code: 'ua', label: 'Українська', flag: 'ua' },
    { code: 'ru', label: 'Русский', flag: 'ru' },
    
    // Západní Evropa
    { code: 'de', label: 'Deutsch', flag: 'de' },
    { code: 'fr', label: 'Français', flag: 'fr' },
    { code: 'es', label: 'Español', flag: 'es' },
    { code: 'pt', label: 'Português', flag: 'pt' },
    { code: 'it', label: 'Italiano', flag: 'it' },
    
    // Blízký východ
    { code: 'tr', label: 'Türkçe', flag: 'tr' },
    { code: 'ar', label: 'العربية', flag: 'ae' },
    
    // Asie
    { code: 'jp', label: '日本語', flag: 'jp'},
    { code: 'kr', label: '한국어', flag: 'kr'},
    { code: 'ch', label: '中文', flag: 'cn'}
    
  ]
}

export function useTranslation() {
  const [lang, setLangState] = useState(getCurrentLanguage());
  const [dict, setDict] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false); // Start as false to prevent initial loading state

  useEffect(() => {
    // Only set loading to true if we don't have translations yet
    if (!translations[lang]) {
      setIsLoading(true);
    }
    
    loadTranslations(lang).then((translations) => {
      setDict(translations);
      setIsLoading(false);
    }).catch(() => {
      // Fallback to empty dict if loading fails
      setDict({});
      setIsLoading(false);
    });
  }, [lang]);

  // Posluchač pro změnu jazyka bez full reloadu
  useEffect(() => {
    const onLangChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as { lang?: string };
      if (detail?.lang) setLangState(detail.lang);
      else setLangState(getCurrentLanguage());
    };
    window.addEventListener('lang-changed', onLangChanged as EventListener);
    return () => window.removeEventListener('lang-changed', onLangChanged as EventListener);
  }, []);

  // Memoize the translation function to prevent unnecessary re-renders
  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      let text = dict[key] || key;
      
      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          text = text.replace(new RegExp(`{${param}}`, 'g'), String(value));
        });
      }
      
      return text;
    };
  }, [dict]);

  return { t, lang, setLang: setCurrentLanguage, isLoading };
} 
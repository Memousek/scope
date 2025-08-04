'use client';

/**
 * Translation helper and React hook for multilanguage support.
 * Loads translation JSONs and provides t(key) for UI components.
 */
import { useState, useEffect } from 'react';

const translations: Record<string, Record<string, string>> = {};

// Load translations at runtime (for SSR/SSG, use dynamic import or next-i18n)
async function loadTranslations(lang: string) {
  if (translations[lang]) return translations[lang];
  const data = await import(`../locales/${lang}.json`);
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
    window.location.reload();
  }
}

export function getLanguages() {
  return [
    { code: 'cs', label: 'Čeština', flag: 'cz' },
    { code: 'en', label: 'English', flag: 'gb' },
    { code: 'ru', label: 'Русский', flag: 'ru' },
  ]
}

export function useTranslation() {
  const [lang] = useState(getCurrentLanguage());
  const [dict, setDict] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTranslations(lang).then(setDict);
  }, [lang]);

  function t(key: string, params?: Record<string, string | number>): string {
    let text = dict[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`{${param}}`, 'g'), String(value));
      });
    }
    
    return text;
  }

  return { t, lang, setLang: setCurrentLanguage };
} 
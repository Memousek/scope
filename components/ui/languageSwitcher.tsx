"use client";
/**
 * LanguageSwitcher component for switching between available languages.
 * Uses useTranslation hook to set language and reload UI.
 */
import React, { useEffect, useState } from 'react';
import { getCurrentLanguage, setCurrentLanguage } from '../../lib/translation';

const languages = [
  { code: 'cs', label: 'Čeština' },
  { code: 'en', label: 'English' },
];

export const LanguageSwitcher: React.FC = () => {
  // Hydration-safe: start with undefined, set after mount
  const [lang, setLangState] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLangState(getCurrentLanguage());
  }, []);

  const setLang = (code: string) => {
    setCurrentLanguage(code);
  };

  if (!lang) return null; // or fallback

  return (
    <div style={{ display: 'flex', gap: 8 }} aria-label="Language switcher">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          style={{
            fontWeight: lang === l.code ? 'bold' : 'normal',
            textDecoration: lang === l.code ? 'underline' : 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            outline: lang === l.code ? '2px solid #2563eb' : 'none',
          }}
          aria-current={lang === l.code ? 'true' : undefined}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher; 
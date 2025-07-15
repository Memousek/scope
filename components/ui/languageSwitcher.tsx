"use client";
/**
 * LanguageSwitcher component for switching between available languages.
 * Uses useTranslation hook to set language and reload UI.
 */
import React, { useEffect, useState } from 'react';
import { getCurrentLanguage, setCurrentLanguage } from '../../lib/translation';
import Image from 'next/image';

const languages = [
  { code: 'cs', label: 'Čeština', flag: 'cz' },
  { code: 'en', label: 'English', flag: 'gb' },
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
    <div className="flex gap-2" aria-label="Language switcher">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors font-semibold ${lang === l.code ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50"}`}
          aria-current={lang === l.code ? 'true' : undefined}
          aria-label={l.label}
          aria-pressed={lang === l.code}
        >
          <Image src={`https://flagcdn.com/w20/${l.flag}.png`} alt={l.label} width={20} height={10} aria-hidden={true} /> {l.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher; 
"use client";
/**
 * LanguageSwitcher component for switching between available languages.
 * Uses dropdown format similar to ThemeSwitcher.
 */
import React, { useEffect, useState } from 'react';
import { getCurrentLanguage, setCurrentLanguage, getLanguages } from '@/lib/translation';
import { isRTL } from '@/lib/utils/rtlUtils';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Languages } from "lucide-react";

const languages = getLanguages();

export const LanguageSwitcher: React.FC = () => {
  // Hydration-safe: start with undefined, set after mount
  const [lang, setLangState] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLangState(getCurrentLanguage());
    const onLangChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as { lang?: string };
      setLangState(detail?.lang || getCurrentLanguage());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('lang-changed', onLangChanged as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('lang-changed', onLangChanged as EventListener);
      }
    };
  }, []);

  const setLang = (code: string) => {
    setCurrentLanguage(code);
  };

  if (!lang) {
    return (
      <Button variant="ghost" size={"sm"}>
        <Globe
          size={16}
          className={""}
        />
      </Button>
    );
  }

  const ICON_SIZE = 16;

  const currentLanguage = languages.find(l => l.code === lang);
  const isCurrentRTL = currentLanguage ? isRTL(currentLanguage.code) : false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={"sm"} className="relative">
          <Globe
            size={ICON_SIZE}
            className={""}
          />
          {currentLanguage && (
            <Image
              src={`https://flagcdn.com/w20/${currentLanguage.flag}.png`}
              alt={currentLanguage.label}
              width={20}
              height={10}
              className="rounded-full absolute top-0 right-0"
            />
          )}
          {isCurrentRTL && (
            <Languages
              size={12}
              className="absolute -top-1 -right-1 text-blue-500"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        <DropdownMenuRadioGroup
          value={lang}
          onValueChange={(e) => setLang(e)}
          className="overflow-y-auto max-h-[250px]"
        >
          {languages.map((l) => {
            const isLanguageRTL = isRTL(l.code);
            return (
              <DropdownMenuRadioItem 
                key={l.code} 
                className="flex gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200 hover:bg-gray-100 cursor-pointer" 
                value={l.code}
              >
                <div className="flex items-center gap-2">
                  <Image 
                    src={`https://flagcdn.com/w20/${l.flag}.png`} 
                    alt={l.label} 
                    width={20} 
                    height={10} 
                    className="rounded-sm"
                  />
                  <span>{l.label}</span>
                  {isLanguageRTL && (
                    <Languages
                      size={12}
                      className="text-blue-500"
                    />
                  )}
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher; 
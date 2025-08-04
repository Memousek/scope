"use client";
/**
 * LanguageSwitcher component for switching between available languages.
 * Uses dropdown format similar to ThemeSwitcher.
 */
import React, { useEffect, useState } from 'react';
import { getCurrentLanguage, setCurrentLanguage, getLanguages } from '../../lib/translation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const languages = getLanguages();

export const LanguageSwitcher: React.FC = () => {
  // Hydration-safe: start with undefined, set after mount
  const [lang, setLangState] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLangState(getCurrentLanguage());
  }, []);

  const setLang = (code: string) => {
    setCurrentLanguage(code);
  };

  if (!lang) {
    return (
      <Button variant="ghost" size={"sm"}>
        <Globe
          size={16}
          className={"text-muted-foreground"}
        />
      </Button>
    );
  }

  const ICON_SIZE = 16;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={"sm"}>
          <Globe
            size={ICON_SIZE}
            className={"text-muted-foreground"}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        <DropdownMenuRadioGroup
          value={lang}
          onValueChange={(e) => setLang(e)}
        >
          {languages.filter(lang => !lang.disabled).map((l) => (
            <DropdownMenuRadioItem key={l.code} className="flex gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200 hover:bg-gray-100 cursor-pointer" value={l.code}>
              <Image 
                src={`https://flagcdn.com/w20/${l.flag}.png`} 
                alt={l.label} 
                width={20} 
                height={10} 
                className="rounded-sm"
              />
              <span>{l.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher; 
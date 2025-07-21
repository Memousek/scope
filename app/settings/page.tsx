"use client";
/**
 * Stránka nastavení aplikace
 * Moderní design s glass-morphism efektem
 * Globální nastavení aplikace (ne uživatelské údaje)
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ContainerService } from "@/lib/container.service";
import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { User } from "@/lib/domain/models/user.model";
import { useTranslation } from "@/lib/translation";
import { Settings, Palette, Globe, Sun, Moon, Monitor } from "lucide-react";
import { getCurrentLanguage, setCurrentLanguage } from "@/lib/translation";
import Image from "next/image";

const languages = [
  { code: 'cs', label: 'Čeština', flag: 'cz' },
  { code: 'en', label: 'English', flag: 'gb' },
];

const themes = [
  { code: 'light', label: 'Světlý režim', icon: Sun },
  { code: 'dark', label: 'Tmavý režim', icon: Moon },
  { code: 'system', label: 'Systémový režim', icon: Monitor },
];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState<string>('cs');
  const [currentTheme, setCurrentTheme] = useState<string>('dark');
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    ContainerService.getInstance().get(UserRepository).getLoggedInUser().then((user) => {
      setUser(user);
      setLoading(false);
      if (user === null) {
        router.push("/auth/login");
      }
    });
    
    // Nastavit aktuální jazyk
    setCurrentLang(getCurrentLanguage());
    
    // Nastavit aktuální téma
    const savedTheme = localStorage.getItem('theme') as "light" | "dark" | "system" | null;
    if (savedTheme === "dark" || savedTheme === "light" || savedTheme === "system") {
      setCurrentTheme(savedTheme);
    } else {
      // default: system
      setCurrentTheme("system");
    }
  }, [router]);

  const handleLanguageChange = (langCode: string) => {
    setCurrentLanguage(langCode);
    setCurrentLang(langCode);
  };

  const handleThemeChange = (themeCode: "light" | "dark" | "system") => {
    setCurrentTheme(themeCode);
    localStorage.setItem('theme', themeCode);
    
    // Aplikovat téma na documentElement (html tag)
    if (themeCode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', themeCode === 'dark');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Načítání nastavení...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mb-4">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t("settings")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Globální nastavení aplikace
            </p>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Appearance Settings */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t("theme")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Přepněte mezi světlým a tmavým režimem
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {themes.map((theme) => {
                  const IconComponent = theme.icon;
                  return (
                    <button
                      key={theme.code}
                      onClick={() => handleThemeChange(theme.code as "light" | "dark" | "system")}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                        currentTheme === theme.code
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="font-medium">{theme.label}</span>
                      {currentTheme === theme.code && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Settings */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t("language")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Vyberte jazyk aplikace
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                      currentLang === lang.code
                        ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    <Image 
                      src={`https://flagcdn.com/w20/${lang.flag}.png`} 
                      alt={lang.label} 
                      width={20} 
                      height={15} 
                      className="rounded-sm"
                    />
                    <span className="font-medium">{lang.label}</span>
                    {currentLang === lang.code && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
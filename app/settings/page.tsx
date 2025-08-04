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
import { Settings, Palette, Globe, Sun, Moon, Monitor, Info, ChevronDown, Key } from "lucide-react";
import { getCurrentLanguage, setCurrentLanguage, getLanguages } from "@/lib/translation";
import Image from "next/image";
import { BuildInfoDisplay } from '../components/ui/BuildInfoDisplay';
import { Badge } from "../components/ui/Badge";

const languages = getLanguages();

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState<string>('cs');
  const [currentTheme, setCurrentTheme] = useState<string>('dark');
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { t } = useTranslation();
  const [showBuildInfo, setShowBuildInfo] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const themes = [
    { code: 'light', labelKey: 'lightMode', icon: Sun },
    { code: 'dark', labelKey: 'darkMode', icon: Moon },
    { code: 'system', labelKey: 'systemMode', icon: Monitor },
  ];

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

  const handleLanguageSearch = (search: string) => {
    setSearch(search);
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

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('loadingSettings')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>

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
              {t('globalAppSettings')}
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
                    {t('switchBetweenThemes')}
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
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${currentTheme === theme.code
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50'
                        }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="font-medium">{t(theme.labelKey)}</span>
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
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t("language")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('selectAppLanguage')}
                  </p>
                </div>
              </div>
              <div className="mb-2">
                <label htmlFor="searchLanguage-input" id="searchLanguage-label" className="text-sm text-gray-600 dark:text-gray-400 absolute -top-99999 h-0 text-transparent -z-10  opacity-0">{t('searchLanguage')}</label>
                <input type="search" id="searchLanguage-input" placeholder={t('searchLanguage')} onChange={(e) => handleLanguageSearch(e.target.value)} className="w-full mt-0 h-10 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200" />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 max-h-[120px] overflow-y-auto">
                  {languages.filter((lang) => lang.label.toLowerCase().includes(search.toLowerCase())).map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${currentLang === lang.code
                        ? 'bg-gradient-to-r from-emerald-600 to-green-700 text-white shadow-lg'
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50'
                        }`}
                    >
                      <Image
                        src={`https://flagcdn.com/w20/${lang.flag}.png`}
                        alt={lang.label}
                        width={16}
                        height={12}
                        className="rounded-sm"
                      />
                      <span className="text-sm font-medium truncate">{lang.label}</span>
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

            {/* About App */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t("aboutApp")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('aboutAppDescription')}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('aboutAppDescriptionLong')}
                </p>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <button className="w-full transition-all duration-200 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-lg p-3 flex items-center justify-between text-sm text-gray-600 dark:text-white" onClick={() => setShowBuildInfo(!showBuildInfo)}>
                    {showBuildInfo ? t('hideBuildInfo') : t('showBuildInfo')} <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showBuildInfo ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className={`mt-4 transition-all duration-200 ${showBuildInfo ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                  <BuildInfoDisplay />
                </div>
                <p className="w-full text-center text-sm text-gray-600 dark:text-gray-400">
                  &copy; {new Date().getFullYear()} {process.env.NEXT_PUBLIC_COPYRIGHT}
                </p>
              </div>
            </div>

            {/* API Key */}
            <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <Badge label={t("soon")} variant="soon" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t("apiKey")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('apiKeyDescription')}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <label htmlFor="apiKey" className="text-sm text-gray-600 dark:text-gray-400">
                  {t('openaiApiKey')}
                </label>
                <input
                  id="apiKey"
                  type="text"
                  className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                  placeholder={t('yourApiKey')}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
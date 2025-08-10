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
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState<'openai' | 'gemini'>('openai');
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
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
      // Dekódování klíče z Base64
      if (user?.additional?.open_api_key && typeof user.additional.open_api_key === 'string') {
        try {
          setApiKey(atob(user.additional.open_api_key));
        } catch {
          setApiKey('');
        }
      }
      if (user?.additional?.gemini_api_key && typeof user.additional.gemini_api_key === 'string') {
        try {
          setGeminiApiKey(atob(user.additional.gemini_api_key));
        } catch {
          setGeminiApiKey('');
        }
      }
      if (user?.additional?.ai_provider && (user.additional.ai_provider === 'openai' || user.additional.ai_provider === 'gemini')) {
        setAiProvider(user.additional.ai_provider);
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
    setApiKeySuccess(null);
    setApiKeyError(null);
  };

  const handleGeminiApiKeyChange = (value: string) => {
    setGeminiApiKey(value);
    setApiKeySuccess(null);
    setApiKeyError(null);
  };

  const handleAiProviderChange = (provider: 'openai' | 'gemini') => {
    setAiProvider(provider);
    setApiKeySuccess(null);
    setApiKeyError(null);
  };

  const handleApiKeySave = async () => {
    if (!user) return;
    setSavingApiKey(true);
    setApiKeySuccess(null);
    setApiKeyError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const encodedOpenaiKey = btoa(apiKey);
      const encodedGeminiKey = btoa(geminiApiKey);
      
      const { error } = await supabase
        .from("user_meta")
        .update({ 
          open_api_key: encodedOpenaiKey,
          gemini_api_key: encodedGeminiKey,
          ai_provider: aiProvider
        })
        .eq("user_id", user.id);
      
      if (error) {
        setApiKeyError("Nepodařilo se uložit klíče.");
      } else {
        setApiKeySuccess("Klíče byly úspěšně uloženy.");
        setUser({
          ...user,
          additional: {
            ...user.additional,
            open_api_key: encodedOpenaiKey,
            gemini_api_key: encodedGeminiKey,
            ai_provider: aiProvider
          }
        });
      }
    } catch {
      setApiKeyError("Nepodařilo se uložit klíče.");
    } finally {
      setSavingApiKey(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t("settings")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t("settingsDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    {t('languageDescription')}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={t("searchLanguage")}
                  value={search}
                  onChange={(e) => handleLanguageSearch(e.target.value)}
                  className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-all duration-200"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {languages
                    .filter(lang => 
                      lang.label.toLowerCase().includes(search.toLowerCase()) ||
                      lang.code.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                                                 <Image
                           src={`https://flagcdn.com/w20/${lang.flag}.png`}
                           alt={lang.label}
                           width={24}
                           height={16}
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

            {/* Theme Settings */}
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
                    {t('themeDescription')}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  return (
                    <button
                      key={theme.code}
                      onClick={() => handleThemeChange(theme.code as "system" | "dark" | "light")}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        currentTheme === theme.code
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{t(theme.labelKey)}</span>
                      {currentTheme === theme.code && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
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

            {/* AI Settings */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t("aiSettings")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('aiSettingsDescription')}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {/* AI Provider Selection */}
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                    {t('aiProvider')}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAiProviderChange('openai')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        aiProvider === 'openai'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      OpenAI
                    </button>
                    <button
                      onClick={() => handleAiProviderChange('gemini')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        aiProvider === 'gemini'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Gemini
                    </button>
                  </div>
                </div>

                {/* OpenAI API Key */}
                <div>
                  <label htmlFor="openaiApiKey" className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
                    {t('openaiApiKey')}
                  </label>
                  <input
                    id="openaiApiKey"
                    type="password"
                    className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                    placeholder={t('yourOpenaiApiKey')}
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                  />
                </div>

                {/* Gemini API Key */}
                <div>
                  <label htmlFor="geminiApiKey" className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
                    {t('geminiApiKey')}
                  </label>
                  <input
                    id="geminiApiKey"
                    type="password"
                    className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                    placeholder={t('yourGeminiApiKey')}
                    value={geminiApiKey}
                    onChange={(e) => handleGeminiApiKeyChange(e.target.value)}
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleApiKeySave}
                  disabled={savingApiKey}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50"
                >
                  {savingApiKey ? t('saving') : t('save')}
                </button>
                
                {apiKeySuccess && (
                  <div className="mt-2 text-green-600 text-sm">{apiKeySuccess}</div>
                )}
                {apiKeyError && (
                  <div className="mt-2 text-red-600 text-sm">{apiKeyError}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
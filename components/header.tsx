'use client';

/**
 * Header component for Scope Burndown app.
 * Zobrazuje navigaci, login/profil, theme a language switcher.
 * Zobrazuje skeleton při načítání.
 */
import Link from "next/link";
import { AuthButton } from "./auth-button";
import { useTranslation } from "../lib/translation";
import { useState } from "react";
import { Menu, X, User, Settings as SettingsIcon, Globe } from "lucide-react";
import { LogoutButton } from "./logout-button";
import Image from "next/image";
import { ThemeSwitcher } from "./theme-switcher";
import { LanguageSwitcher } from "./ui/languageSwitcher";

interface HeaderProps {
  user?: any;
  loading?: boolean;
}

export function Header({ user, loading }: HeaderProps) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="z-50 w-full flex justify-center border-b border-b-foreground/10 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <div className="mx-auto container flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-semibold">
          <Link href={"/"} className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-200">
            {t('appName')}
          </Link>
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4 min-w-[120px] justify-end">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {loading ? (
            <div className="w-30 h-8 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" style={{ width: '110px', height: '35px' }} />
          ) : user ? (
            <>
              <Link href="/profile" className="flex items-center px-2 hover:text-accent-foreground">
                <User
                  size={18}
                  className={"text-muted-foreground"}
                />
              </Link>
              <LogoutButton />
            </>
          ) : (
            <AuthButton />
          )}
        </div>
        {/* Hamburger for mobile */}
        <button
          className="md:hidden flex items-center justify-center p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          onClick={() => setMobileOpen(true)}
          aria-label={t('open_menu')}
        >
          <Menu className="w-6 h-6" />
        </button>
        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/40 flex z-50">
            <div className="dark:bg-gray-800 dark:text-gray-100 bg-white w-4/5 max-w-xs h-full shadow-xl flex flex-col p-6 animate-slide-in-left relative z-50">
              <button
                className="absolute top-4 right-4 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() => setMobileOpen(false)}
                aria-label={t('close_menu')}
              >
                <X className="w-6 h-6" />
              </button>
              <Link href={"/"} className="text-xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" onClick={() => setMobileOpen(false)}>
                {t('appName')}
              </Link>
              <div className="flex flex-col gap-4 flex-1">
                {/* Theme and Language switchers */}
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('language')}:</span>
                    <LanguageSwitcher />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('theme')}:</span>
                    <ThemeSwitcher />
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"  />
                ) : user ? (
                  <>
                    {user.user_metadata?.avatar_url ? (
                      <Image src={user.user_metadata.avatar_url} alt={t('user_avatar')} width={40} height={40} className="w-10 h-10 rounded-full mb-2" />
                    ) : (
                      <User className="w-10 h-10 mb-2" />
                    )}
                    <Link href="/profile" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition" onClick={() => setMobileOpen(false)}>
                      <User className="w-5 h-5" /> {t('profile')}
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition" onClick={() => setMobileOpen(false)}>
                      <SettingsIcon className="w-5 h-5" /> {t('settings')}
                    </Link>
                    <LogoutButton />
                  </>
                ) : (
                  <Link href="/auth/login" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition" onClick={() => setMobileOpen(false)}>
                    {t('login')}
                  </Link>
                )}
              </div>
            </div>
            {/* Click outside to close */}
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </div>
        )}
      </div>
    </nav>
  );
}

// Add this to your global CSS or tailwind.config.js for the animation:
// .animate-slide-in-left { animation: slide-in-left 0.3s cubic-bezier(0.4,0,0.2,1) both; }
// @keyframes slide-in-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }
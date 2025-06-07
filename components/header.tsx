'use client';

/**
 * Header component for Scope Burndown app.
 * Contains navigation, app name, auth button, and language switcher.
 */
import Link from "next/link";
import { AuthButton } from "./auth-button";
import { useTranslation } from "../lib/translation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Header() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-semibold">
          <Link href={"/"}>{t('appName')}</Link>
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          <AuthButton />
        </div>
        {/* Hamburger for mobile */}
        <button
          className="md:hidden flex items-center justify-center p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => setMobileOpen(true)}
          aria-label="Otevřít menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex">
            <div className="bg-white w-4/5 max-w-xs h-full shadow-xl flex flex-col p-6 animate-slide-in-left relative">
              <button
                className="absolute top-4 right-4 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setMobileOpen(false)}
                aria-label="Zavřít menu"
              >
                <X className="w-6 h-6" />
              </button>
              <Link href={"/"} className="text-xl font-bold mb-8" onClick={() => setMobileOpen(false)}>
                {t('appName')}
              </Link>
              <div className="flex flex-col gap-4 flex-1">
                {/* You can add more nav links here if needed */}
                <AuthButton />
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
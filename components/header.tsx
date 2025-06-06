'use client';

/**
 * Header component for Scope Burndown app.
 * Contains navigation, app name, auth button, and language switcher.
 */
import Link from "next/link";
import { AuthButton } from "./auth-button";
import { useTranslation } from "../lib/translation";

export function Header() {
  const { t } = useTranslation();
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-semibold">
          <Link href={"/"}>{t('appName')}</Link>
        </div>
        <div className="flex items-center gap-4">
          
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
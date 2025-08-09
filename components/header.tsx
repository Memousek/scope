"use client";

/**
 * Header component for Scope Burndown app.
 * Zobrazuje navigaci, login/profil, theme a language switcher.
 * Zobrazuje skeleton při načítání.
 */
import Link from "next/link";
import { AuthButton } from "./auth-button";
import { useTranslation } from "@/lib/translation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Menu,
  X,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { LogoutButton } from "./logout-button";
import Image from "next/image";
import { ThemeSwitcher } from "./theme-switcher";
import { LanguageSwitcher } from "./ui/languageSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/domain/models/user.model";



interface HeaderProps {
  user?: User | null;
  loading?: boolean;
}

export function Header({ user, loading }: HeaderProps) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="z-50 w-full flex justify-center border-b border-b-foreground/10 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <div className="mx-auto container flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-semibold">
          <Link
            href={"/"}
            className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-200"
          >
            Scope Burndown
          </Link>
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4 min-w-[120px] justify-end">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {loading ? (
            <div
              className="w-30 h-8 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
              style={{ width: "110px", height: "35px" }}
            />
          ) : user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={"ghost"}
                    size={"sm"}
                    aria-label={t("profile")}
                    className="rounded-full w-18 h-15"
                  >
                    {user.additional?.avatar_url ? (
                      <Image
                        src={typeof user.additional.avatar_url === "string" ? user.additional.avatar_url : ""}
                        alt={t("profile")}
                        width={18}
                        height={15}
                        className=""
                      />
                    ) : (
                      <UserIcon size={18} className="text-muted-foreground" />
                    )}
                    <span className="sr-only">{t("profile")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-content" align="start">
                  <p className="px-2 py-1 text-gray-500 dark:text-gray-400">
                    {typeof user.additional?.full_name === "string" ? user.additional.full_name : user.email}
                  </p>
                    <Link
                      href="/profile"
                      className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {t("profile")}
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {t("settings")}
                    </Link>
                  <hr className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                    <div className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                      <LogoutButton />
                    </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <AuthButton />
          )}
        </div>
        {/* Hamburger for mobile */}
        <button
          className="md:hidden flex items-center justify-center p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          onClick={() => setMobileOpen(true)}
          aria-label={t("open_menu")}
        >
          <Menu className="w-6 h-6" />
          <span className="sr-only">{t("open_menu")}</span>
        </button>
        {/* Mobile drawer */}
        {mobileOpen && mounted && createPortal(
          <div className="fixed inset-0 bg-black/50 flex z-[9999]">
            <div className="dark:bg-gray-800 dark:text-gray-100 bg-white w-4/5 max-w-xs h-full shadow-xl flex flex-col p-6 animate-slide-in-left relative z-[10000]">
              <button
                className="absolute top-4 right-4 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() => setMobileOpen(false)}
                aria-label={t("close_menu")}
              >
                <X className="w-6 h-6" />
                <span className="sr-only">{t("close_menu")}</span>
              </button>
              <Link
                href={"/"}
                className="text-xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                onClick={() => setMobileOpen(false)}
              >
                Scope Burndown 
              </Link>
              <div className="flex flex-col gap-4 flex-1">
                {loading ? (
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : user ? (
                  <>
                    {user.additional?.avatar_url ? (
                      <Image
                        src={typeof user.additional.avatar_url === "string" ? user.additional.avatar_url : ""}
                        alt={t("user_avatar")}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full mb-2"
                      />
                    ) : (
                      <UserIcon className="w-10 h-10 mb-2" />
                    )}
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition"
                      onClick={() => setMobileOpen(false)}
                    >
                      <UserIcon className="w-5 h-5" /> {t("profile")}
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition"
                      onClick={() => setMobileOpen(false)}
                    >
                      <SettingsIcon className="w-5 h-5" /> {t("settings")}
                    </Link>
                    <LogoutButton />
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("login")}
                  </Link>
                )}
              </div>
            </div>
            {/* Click outside to close */}
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </div>,
          document.body
        )}
      </div>
    </nav>
  );
}

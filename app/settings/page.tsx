"use client";
/**
 * Stránka nastavení uživatele
 * Umožňuje přepínat dark mode a další nastavení do budoucna.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { ThemeSwitcher } from "@/app/components/ui/ThemeSwitcher";
import { ContainerService } from "@/lib/container.service";
import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { User } from "@/lib/domain/models/user.model";
import { LanguageSwitcher } from "@/components/ui/languageSwitcher";
import { useTranslation } from "@/lib/translation";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
  }, [router]);

  if (loading) return <div className="p-8 text-center">Načítání…</div>;
  if (!user) return null;

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto p-8 mt-10 rounded-lg shadow bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold mb-4 text-center">{t("settings")}</h1>
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-2">{t("theme")}</h2>
          <ThemeSwitcher />
        </div>
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-2">{t("language")}</h2>
          <LanguageSwitcher />
        </div>
      </div>
    </>
  );
} 
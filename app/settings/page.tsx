"use client";
/**
 * Stránka nastavení uživatele
 * Umožňuje přepínat dark mode a další nastavení do budoucna.
 */
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {Header} from "@/components/header";
import {ThemeSwitcher} from "@/app/components/ui/ThemeSwitcher";
import {ContainerService} from "@/lib/container.service";
import {UserRepository} from "@/lib/domain/repositories/user.repository";
import {User} from "@/lib/domain/models/user.model";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      <div className="max-w-lg mx-auto p-8 mt-10 rounded-lg shadow bg-white">
        <h1 className="text-2xl font-bold mb-4 text-center">Nastavení</h1>
        <div className="mb-6">
          <ThemeSwitcher />
        </div>
      </div>
    </>
  );
} 
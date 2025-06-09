"use client";
/**
 * Stránka nastavení uživatele
 * Umožňuje přepínat dark mode a další nastavení do budoucna.
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { ThemeSwitcher } from "@/app/components/ui/ThemeSwitcher";
import type { User } from "@supabase/supabase-js";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (!data.user) router.push("/auth/login");
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
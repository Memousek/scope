'use client';

import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";
import { useEffect, useState } from "react";
import { SettingsIcon, UserIcon } from "lucide-react";
import Image from "next/image";

export function AuthButton() {
  const [user, setUser] = useState<{ email: string, avatar_url: string, name: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user && data.user.email ? { email: data.user.email, avatar_url: data.user.user_metadata.avatar_url || null, name: data.user.user_metadata.name || data.user.email } : null);
    });
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-4">
        {/* Avatar jako dekorace */}
        {user.avatar_url ? (
          <Image src={user.avatar_url} alt="User avatar" width={32} height={32} className="w-8 h-8 rounded-full" />
        ) : (
          <UserIcon className="w-8 h-8" />
        )}
        {/* Menu položky */}
        <Link href="/profile" className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 transition px-2 py-1 rounded">
          <UserIcon className="w-5 h-5" />
          <span>Profil</span>
        </Link>
        <Link href="/settings" className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 transition px-2 py-1 rounded">
          <SettingsIcon className="w-5 h-5" />
          <span>Nastavení</span>
        </Link>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Přihlásit se</Link>
      </Button>
    </div>
  );
}

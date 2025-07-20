'use client';

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";
import { useEffect, useState } from "react";
import { SettingsIcon, UserIcon, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/lib/translation";

export function AuthButton() {
  const { t } = useTranslation();
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
        {/* Menu položky */}
        <Link href="/profile" className="rounded-full w-auto h-auto flex items-center justify-center hover:scale-105 transition-transform duration-200">
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt="User avatar" width={32} height={32} className="rounded-full shadow-md" style={{ maxWidth: 'max-content', maxHeight: 'max-content' }} />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
              <UserIcon className="w-4 h-4 text-white" />
            </div>
          )}
        </Link>
        <Link href="/settings" className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <SettingsIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{t('settings')}</span>
        </Link>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Link 
        href="/auth/sign-up"
        className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 shadow-lg inline-flex items-center gap-2"
      >
        {t('create_account')}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
      </Link>
      <Link
        href="/auth/login"
        className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg inline-flex items-center gap-2"
      >
        {t('login')}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
      </Link>
    </div>
  );
}

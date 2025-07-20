"use client";
import { LoginForm } from "@/components/login-form";
import { AuthHeader } from "@/components/auth-header";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/translation";

export default function Page() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/scopes");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Brand section */}
        <AuthHeader 
          title="Scope"
          subtitle={t('project_management_system')}
        />

        {/* Login form */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-2xl p-8">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </div>
  );
}

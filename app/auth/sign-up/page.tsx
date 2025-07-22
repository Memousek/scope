"use client";
import { SignUpForm } from "@/components/sign-up-form";
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
    <div className="w-full flex items-center justify-center p-6 min-h-screen">
      {/* Subtle background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-teal-400/10 to-cyan-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Brand section */}
        <AuthHeader 
          title="Scope"
          subtitle={t('start_managing_projects')}
        />

        {/* Sign up form */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-2xl p-8">
          <SignUpForm />
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </div>
  );
}

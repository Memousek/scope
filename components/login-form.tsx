"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/lib/translation";

// Inline Google SVG icon
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_17_40)">
      <path d="M47.5 24.5C47.5 22.6 47.3 20.8 47 19H24V29.1H37.4C36.7 32.2 34.7 34.7 31.8 36.4V42.1H39.5C44 38.1 47.5 32.1 47.5 24.5Z" fill="#4285F4"/>
      <path d="M24 48C30.6 48 36.1 45.9 39.5 42.1L31.8 36.4C29.9 37.6 27.3 38.4 24 38.4C17.7 38.4 12.2 34.3 10.3 28.7H2.3V34.6C5.7 41.1 14.1 48 24 48Z" fill="#34A853"/>
      <path d="M10.3 28.7C9.8 27.5 9.5 26.2 9.5 24.8C9.5 23.4 9.8 22.1 10.3 20.9V15H2.3C0.8 18.1 0 21.4 0 24.8C0 28.2 0.8 31.5 2.3 34.6L10.3 28.7Z" fill="#FBBC05"/>
      <path d="M24 9.6C27.7 9.6 30.7 10.9 32.7 12.7L39.7 6.1C36.1 2.7 30.6 0 24 0C14.1 0 5.7 6.9 2.3 15L10.3 20.9C12.2 15.3 17.7 9.6 24 9.6Z" fill="#EA4335"/>
    </g>
    <defs>
      <clipPath id="clip0_17_40">
        <rect width="48" height="48" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/protected");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('login_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('google_login_error'));
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('welcome_back')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('sign_in_to_account')}
        </p>
      </div>

      {/* Google Login Button */}
      <Button
        type="button"
        className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 hover:scale-105 transition-all duration-200 shadow-lg"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        aria-label={t('sign_in_with_google')}
      >
        <GoogleIcon />
        <span className="ml-2">
          {isLoading ? t('signing_in') : t('sign_in_with_google')}
        </span>
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white/70 dark:bg-gray-800/70 px-2 text-gray-500 dark:text-gray-400">
            {t('or')}
          </span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('email_address')}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="jiri.babica@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('password')}
            </Label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
            >
              {t('forgot_password')}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="********"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200" 
          disabled={isLoading}
        >
          {isLoading ? t('signing_in') : t('sign_in')}
        </Button>
      </form>

      {/* Sign up link */}
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('dont_have_account')}{" "}
          <Link
            href="/auth/sign-up"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200"
          >
            {t('create_account')}
          </Link>
        </p>
      </div>
    </div>
  );
}

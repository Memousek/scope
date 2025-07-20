/**
 * AuthHeader component for login and sign-up pages.
 * Contains logo, app name, theme switcher, and language switcher.
 */
import { ThemeSwitcher } from "./theme-switcher";
import { LanguageSwitcher } from "./ui/languageSwitcher";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {

  return (
    <div className="text-center mb-8">
      {/* Theme and Language switchers */}
      <div className="flex justify-center items-center gap-4 mb-6">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
      
      {/* Logo/Brand section */}
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-4 shadow-lg">
        <span className="text-white text-2xl font-bold">S</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        {subtitle}
      </p>
    </div>
  );
} 
import { Geist } from "next/font/google";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

/**
 * Auth layout wrapper for authentication pages.
 * Provides consistent styling for login, signup, and other auth pages.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${geistSans.className} flex items-center justify-center`}>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
} 
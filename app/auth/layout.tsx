import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

/**
 * Metadata pro auth stránky
 */
export const metadata: Metadata = {
  title: "Přihlášení | Scope Burndown",
  description: "Přihlaste se do aplikace Scope Burndown a začněte spravovat své projekty a scopes.",
  authors: [{ name: "Scope Burndown Team" }],
  keywords: ["přihlášení", "registrace", "autentizace", "účet"],
  openGraph: {
    title: "Přihlášení | Scope Burndown",
    description: "Přihlaste se do aplikace Scope Burndown a začněte spravovat své projekty a scopes.",
    type: 'website',
    url: '/auth',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Přihlášení | Scope Burndown",
    description: "Přihlaste se do aplikace Scope Burndown a začněte spravovat své projekty a scopes.",
  },
};

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
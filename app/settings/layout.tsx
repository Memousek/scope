import type { Metadata } from "next";

/**
 * Metadata pro nastavení stránku
 */
export const metadata: Metadata = {
  title: "Nastavení | Scope Burndown",
  description: "Konfigurujte aplikaci Scope Burndown podle svých potřeb. Nastavte jazyk, téma a další preference.",
  authors: [{ name: "Scope Burndown Team" }],
  keywords: ["nastavení", "konfigurace", "preference", "jazyk", "téma"],
  openGraph: {
    title: "Nastavení | Scope Burndown",
    description: "Konfigurujte aplikaci Scope Burndown podle svých potřeb. Nastavte jazyk, téma a další preference.",
    type: 'website',
    url: '/settings',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Nastavení | Scope Burndown",
    description: "Konfigurujte aplikaci Scope Burndown podle svých potřeb. Nastavte jazyk, téma a další preference.",
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 
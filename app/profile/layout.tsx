import type { Metadata } from "next";

/**
 * Metadata pro profil stránku
 */
export const metadata: Metadata = {
  title: "Profil | Scope Burndown",
  description: "Spravujte svůj profil, nastavení účtu a osobní údaje v aplikaci Scope Burndown.",
  authors: [{ name: "Scope Burndown Team" }],
  keywords: ["profil", "nastavení", "účet", "osobní údaje"],
  openGraph: {
    title: "Profil | Scope Burndown",
    description: "Spravujte svůj profil, nastavení účtu a osobní údaje v aplikaci Scope Burndown.",
    type: 'website',
    url: '/profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Profil | Scope Burndown",
    description: "Spravujte svůj profil, nastavení účtu a osobní údaje v aplikaci Scope Burndown.",
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 
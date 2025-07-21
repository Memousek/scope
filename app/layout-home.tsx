import type { Metadata } from "next";

/**
 * Metadata pro hlavní stránku
 */
export const metadata: Metadata = {
  title: "Scope Burndown - Moderní nástroj pro projektový management",
  description: "Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů s vizuálními přehledy a real-time spoluprácí.",
  authors: [{ name: "Scope Burndown Team" }],
  keywords: ["projektový management", "burndown chart", "týmová spolupráce", "sledování průběhu", "agile"],
  openGraph: {
    title: "Scope Burndown - Moderní nástroj pro projektový management",
    description: "Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů s vizuálními přehledy a real-time spoluprácí.",
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Scope Burndown - Moderní nástroj pro projektový management",
    description: "Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů s vizuálními přehledy a real-time spoluprácí.",
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 
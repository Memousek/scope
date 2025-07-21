import type { Metadata } from "next";

/**
 * Metadata pro nový scope stránku
 */
export const metadata: Metadata = {
  title: "Vytvořit nový scope | Scope Burndown",
  description: "Vytvořte nový scope pro svůj projekt. Definujte tým, projekty a začněte sledovat průběh práce.",
  authors: [{ name: "Scope Burndown Team" }],
  keywords: ["nový scope", "vytvořit projekt", "tým", "projektový management"],
  openGraph: {
    title: "Vytvořit nový scope | Scope Burndown",
    description: "Vytvořte nový scope pro svůj projekt. Definujte tým, projekty a začněte sledovat průběh práce.",
    type: 'website',
    url: '/scopes/new',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Vytvořit nový scope | Scope Burndown",
    description: "Vytvořte nový scope pro svůj projekt. Definujte tým, projekty a začněte sledovat průběh práce.",
  },
};

export default function NewScopeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 
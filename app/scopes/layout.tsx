import type { Metadata } from "next";
import { SchemaOrgScript } from "../../components/schema-org-script";
import { generateBreadcrumbSchema } from "@/lib/utils/schemaOrg";

/**
 * Metadata pro scopes stránky
 */
export const metadata: Metadata = {
  title: "Vaše scopy | Scope Burndown",
  description: "Spravujte své scopy a projekty. Vytvářejte nové scopes, sdílejte je s týmem a sledujte průběh projektů.",
  authors: [{ name: "Scope Burndown Team" }],
  keywords: ["scopes", "projekty", "týmová spolupráce", "správa projektů"],
  openGraph: {
    title: "Vaše scopy | Scope Burndown",
    description: "Spravujte své scopes a projekty. Vytvářejte nové scopes, sdílejte je s týmem a sledujte průběh projektů.",
    type: 'website',
    url: '/scopes',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Vaše scopy | Scope Burndown",
    description: "Spravujte své scopes a projekty. Vytvářejte nové scopes, sdílejte je s týmem a sledujte průběh projektů.",
  },
};

export default function ScopesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Scopes", url: "/scopes" },
  ]);

  return (
    <>
      <SchemaOrgScript data={breadcrumbSchema} id="breadcrumb-schema" />
      {children}
    </>
  );
} 
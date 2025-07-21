import type { Metadata } from "next";
import { ContainerService } from "@/lib/container.service";
import { GetScopeWithAuthorService } from "@/lib/domain/services/get-scope-with-author.service";

/**
 * Generuje dynamické metadata pro scope stránku
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const getScopeWithAuthorService = ContainerService.getInstance().get(GetScopeWithAuthorService, { autobind: true });
    const scopeData = await getScopeWithAuthorService.execute(id);
    
    if (!scopeData) {
      return {
        title: "Scope nenalezen | Scope Burndown",
        description: "Požadovaný scope nebyl nalezen nebo nemáte oprávnění k jeho zobrazení.",
        authors: [{ name: "Scope Burndown Team" }],
      };
    }
    
    const title = `${scopeData.name} | Scope Burndown`;
    const description = scopeData.description 
      ? `${scopeData.description} - Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů.`
      : `Scope ${scopeData.name} - Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů s vizuálními přehledy a real-time spoluprácí.`;
    
    return {
      title,
      description,
      authors: [{ name: scopeData.authorEmail || "Scope Burndown Team" }],
      openGraph: {
        title,
        description,
        type: 'website',
        url: `/scopes/${id}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch (error) {
    console.error('Chyba při generování metadat:', error);
    return {
      title: "Scope | Scope Burndown",
      description: "Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů.",
      authors: [{ name: "Scope Burndown Team" }],
    };
  }
}

export default function ScopeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 
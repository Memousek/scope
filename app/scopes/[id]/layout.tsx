import type { Metadata } from "next";
import { ContainerService } from "@/lib/container.service";
import { GetScopeWithAuthorService } from "@/lib/domain/services/get-scope-with-author.service";
import { SchemaOrgScript } from "../../../components/schema-org-script";
import { generateProjectSchema, generateBreadcrumbSchema } from "@/lib/utils/schemaOrg";

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

export default async function ScopeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  try {
    const getScopeWithAuthorService = ContainerService.getInstance().get(GetScopeWithAuthorService, { autobind: true });
    const scopeData = await getScopeWithAuthorService.execute(id);
    
    // Generate breadcrumb schema
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Scopes", url: "/scopes" },
      { name: scopeData?.name || "Scope", url: `/scopes/${id}` },
    ]);

    // Generate project schema if scope data is available
    const projectSchema = scopeData ? generateProjectSchema({
      name: scopeData.name,
      description: scopeData.description,
      url: `/scopes/${id}`,
      startDate: scopeData.createdAt.toISOString(),
      status: 'Active' as const,
      participant: [], // Will be populated with team members
      manager: scopeData.authorEmail ? {
        name: scopeData.authorEmail,
        email: scopeData.authorEmail,
        jobTitle: "Project Manager",
      } : undefined,
    }) : null;

    return (
      <>
        <SchemaOrgScript data={breadcrumbSchema} id="breadcrumb-schema" />
        {projectSchema && <SchemaOrgScript data={projectSchema} id="project-schema" />}
        {children}
        <svg style={{display: 'none'}}>
          <filter id="displacementFilter">
              <feTurbulence type="turbulence" 
                  baseFrequency="0.01" 
                  numOctaves="2" 
                  result="turbulence" />
      
              <feDisplacementMap in="SourceGraphic"
                  in2="turbulence"    
                              scale="200" xChannelSelector="R" yChannelSelector="G" />
          </filter>
      </svg>
      </>
    );
  } catch (error) {
    console.error('Chyba při generování Schema.org dat:', error);
    return children;
  }
} 
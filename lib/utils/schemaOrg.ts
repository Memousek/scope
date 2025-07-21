/**
 * Schema.org structured data utilities
 * Generates JSON-LD structured data for better SEO and rich snippets
 */

export interface SchemaOrgOrganization {
  name: string;
  url: string;
  logo?: string;
  description?: string;
}

export interface SchemaOrgSoftwareApplication {
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  author: SchemaOrgOrganization;
  datePublished: string;
  version?: string;
}

export interface SchemaOrgProject {
  name: string;
  description?: string;
  url: string;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Completed' | 'OnHold' | 'Cancelled';
  participant: SchemaOrgPerson[];
  manager?: SchemaOrgPerson;
}

export interface SchemaOrgPerson {
  name: string;
  email?: string;
  jobTitle?: string;
  url?: string;
}

export interface SchemaOrgWebApplication {
  name: string;
  description: string;
  url: string;
  browserRequirements: string;
  applicationCategory: string;
  author: SchemaOrgOrganization;
}

/**
 * Generates Organization schema
 */
export function generateOrganizationSchema(org: SchemaOrgOrganization) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": org.name,
    "url": org.url,
    ...(org.logo && { "logo": org.logo }),
    ...(org.description && { "description": org.description }),
  };
}

/**
 * Generates SoftwareApplication schema
 */
export function generateSoftwareApplicationSchema(app: SchemaOrgSoftwareApplication) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": app.name,
    "description": app.description,
    "url": app.url,
    "applicationCategory": app.applicationCategory,
    "operatingSystem": app.operatingSystem,
    "author": generateOrganizationSchema(app.author),
    "datePublished": app.datePublished,
    ...(app.version && { "softwareVersion": app.version }),
  };
}

/**
 * Generates Project schema
 */
export function generateProjectSchema(project: SchemaOrgProject) {
  return {
    "@context": "https://schema.org",
    "@type": "Project",
    "name": project.name,
    ...(project.description && { "description": project.description }),
    "url": project.url,
    "startDate": project.startDate,
    ...(project.endDate && { "endDate": project.endDate }),
    "status": project.status,
    "participant": project.participant.map(person => ({
      "@type": "Person",
      "name": person.name,
      ...(person.email && { "email": person.email }),
      ...(person.jobTitle && { "jobTitle": person.jobTitle }),
      ...(person.url && { "url": person.url }),
    })),
    ...(project.manager && {
      "manager": {
        "@type": "Person",
        "name": project.manager.name,
        ...(project.manager.email && { "email": project.manager.email }),
        ...(project.manager.jobTitle && { "jobTitle": project.manager.jobTitle }),
        ...(project.manager.url && { "url": project.manager.url }),
      }
    }),
  };
}

/**
 * Generates WebApplication schema
 */
export function generateWebApplicationSchema(app: SchemaOrgWebApplication) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": app.name,
    "description": app.description,
    "url": app.url,
    "browserRequirements": app.browserRequirements,
    "applicationCategory": app.applicationCategory,
    "author": generateOrganizationSchema(app.author),
  };
}

/**
 * Generates BreadcrumbList schema
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url,
    })),
  };
}

/**
 * Generates FAQ schema
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
} 
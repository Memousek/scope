/**
 * Schema.org Structured Data Script Component
 * Injects JSON-LD structured data into the page head
 */

import Script from 'next/script';

interface SchemaOrgScriptProps {
  data: Record<string, unknown>;
  id?: string;
}

export function SchemaOrgScript({ data, id = 'schema-org' }: SchemaOrgScriptProps) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
} 
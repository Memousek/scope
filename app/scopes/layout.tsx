/**
 * Layout for scopes pages
 * Provides consistent styling for scope detail pages
 */
export default function ScopesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen">{children}</main>
  );
} 
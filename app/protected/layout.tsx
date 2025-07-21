import { ConditionalHeader } from "../../components/conditional-header";

/**
 * Layout for protected pages that require authentication
 * Includes header and authentication checks
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ConditionalHeader />
      {children}
    </>
  );
}

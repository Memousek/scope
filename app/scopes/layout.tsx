import { Header } from "@/components/header";

export default function ScopesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="bg-gray-50 dark:bg-gray-900 min-h-screen">{children}</main>
    </>
  );
} 
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { BugReportButton } from "@/app/components/ui/BugReportButton";
import { ConditionalHeader } from "../components/conditional-header";
import { SchemaOrgScript } from "../components/schema-org-script";
import { generateOrganizationSchema, generateWebApplicationSchema } from "@/lib/utils/schemaOrg";
import { RTLProvider } from "./components/RTLProvider";
import { ToastProvider } from "./components/ui/Toast";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Scope Burndown - Moderní nástroj pro projektový management",
  description: "Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů s vizuálními přehledy a real-time spoluprácí.",
  authors: [{ name: "Scope Burndown Team" }],
  keywords: ["projektový management", "burndown chart", "týmová spolupráce", "sledování průběhu", "agile", "scrum"],
  creator: "Scope Burndown Team",
  publisher: "Scope Burndown",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Scope Burndown - Moderní nástroj pro projektový management",
    description: "Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů s vizuálními přehledy a real-time spoluprácí.",
    url: '/',
    siteName: 'Scope Burndown',
    locale: 'cs_CZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Scope Burndown - Moderní nástroj pro projektový management",
    description: "Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů s vizuálními přehledy a real-time spoluprácí.",
    creator: '@scope_burndown',
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate Schema.org structured data
  const organizationSchema = generateOrganizationSchema({
    name: "Scope Burndown Team",
    url: defaultUrl,
    description: "Moderní nástroj pro projektový management a sledování průběhu projektů",
  });

  const webApplicationSchema = generateWebApplicationSchema({
    name: "Scope Burndown",
    description: "Moderní nástroj pro sledování průběhu projektů a efektivní správu týmových zdrojů s vizuálními přehledy a real-time spoluprácí.",
    url: defaultUrl,
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    applicationCategory: "BusinessApplication",
    author: {
      name: "Scope Burndown Team",
      url: defaultUrl,
    },
  });

  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        <SchemaOrgScript data={organizationSchema} id="organization-schema" />
        <SchemaOrgScript data={webApplicationSchema} id="webapp-schema" />
      </head>
      <body id="body" className={`${geistSans.className} antialiased`} suppressHydrationWarning>
        {/* Skip link for a11y */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-blue-600 focus:text-white"
        >
          Přeskočit na obsah
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="scope-theme"
          enableColorScheme
          key="theme-provider"
        >
          <RTLProvider>
            <ToastProvider>
              <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <ConditionalHeader />
                <main className="flex-1 flex flex-col" view-transition-name="main" id="main-content">
                  {children}
                </main>
              </div>
               <BugReportButton />
            </ToastProvider>
          </RTLProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

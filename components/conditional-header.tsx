'use client';

/**
 * Podmíněná hlavička aplikace
 * Zobrazuje Header vždy (předává user a loading), na auth stránkách se nezobrazuje
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { createClient } from "@/lib/supabase/client";

export function ConditionalHeader() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Debug: log pathname changes
  useEffect(() => {
    console.log('Current pathname:', pathname);
    console.log('Is auth page:', pathname?.startsWith('/auth/'));
  }, [pathname]);

  // Nezobrazovat header na auth stránkách
  const isAuthPage = pathname?.startsWith('/auth/');
  if (isAuthPage) return null;

  // Vždy renderovat Header, předat user a loading
  return <Header user={user} loading={loading} />;
} 
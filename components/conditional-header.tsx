'use client';

/**
 * Podmíněná hlavička aplikace
 * Zobrazuje Header vždy (předává user a loading), na auth stránkách se nezobrazuje
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export function ConditionalHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

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

  // Nezobrazovat header na auth stránkách
  const isAuthPage = pathname?.startsWith('/auth/');
  if (isAuthPage) return null;

  // Vždy renderovat Header, předat user a loading
  return <Header user={user} loading={loading} />;
} 
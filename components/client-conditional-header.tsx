'use client';

/**
 * Client-side conditional header component
 * Renders header only on non-auth pages
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { createClient } from "@/lib/supabase/client";

export function ClientConditionalHeader() {
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

  // Always render Header for now, pass user and loading
  return (
    <div>
      <div>DEBUG: ClientConditionalHeader rendered</div>
      <Header user={user} loading={loading} />
    </div>
  );
} 
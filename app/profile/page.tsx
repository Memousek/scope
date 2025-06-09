"use client";
/**
 * Stránka profilu uživatele
 * Zobrazí základní informace o přihlášeném uživateli a možnost odhlášení.
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (!data.user) router.push("/auth/login");
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) return <div className="p-8 text-center">Načítání…</div>;
  if (!user) return null;

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto p-8 mt-10 rounded-lg shadow bg-white">
        <h1 className="text-2xl font-bold mb-4 text-center">Profil uživatele</h1>
        <div className="mb-6 flex flex-col gap-2 text-gray-700">
          <div><b>Avatar:</b> {user.user_metadata?.avatar_url ? <Image src={user.user_metadata.avatar_url} alt="Avatar" width={40} height={40} className="w-10 h-10 rounded-full" /> : <UserIcon className="w-10 h-10" />}</div>
          <div><b>Email:</b> {user.email}</div>
          {user.user_metadata?.full_name && (
            <div><b>Jméno:</b> {user.user_metadata.full_name}</div>
          )}
          <div><b>Vytvořeno:</b> {user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</div>
          <div><b>Aktualizováno:</b> {user.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A'}</div>
          <div><b>ID:</b> {user.id}</div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-red-700 transition w-full"
        >
          Odhlásit se
        </button>
      </div>
    </>
  );
} 
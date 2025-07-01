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
import { useTranslation } from "@/lib/translation";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useTranslation();

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

  const handleRemoveAccount = async () => {
    if (!user?.id) return;
    const supabase = createClient();
    const { data, error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(error);
    } else {
      console.log("User deleted");
    }
  };

  if (loading) return <div className="p-8 text-center">{t("loading")}</div>;
  if (!user) return null;

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto p-8 mt-10 rounded-lg shadow bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold mb-4 text-center">{t("profile")}</h1>
        <div className="mb-6 flex flex-col gap-2 text-gray-700 dark:text-gray-300">
          <div><b>{t("avatar")}:</b> {user.user_metadata?.avatar_url ? <Image src={user.user_metadata.avatar_url} alt="Avatar" width={40} height={40} className="w-10 h-10 rounded-full" /> : <UserIcon className="w-10 h-10" />}</div>
          <div><b>{t("email")}:</b> {user.email}</div>
          {user.user_metadata?.full_name && (
            <div><b>{t("name")}:</b> {user.user_metadata.full_name}</div>
          )}
          <div><b>{t("created")}:</b> {user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</div>
          <div><b>{t("updated")}:</b> {user.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A'}</div>
          <div><b>{t("id")}:</b> {user.id}</div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-gray-600 dark:bg-gray-700 text-white px-5 py-2 rounded font-semibold shadow hover:bg-gray-700 transition w-full"
        >
          {t("logout")}
        </button>
        <button
          onClick={handleRemoveAccount}
          className="bg-red-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-red-700 transition w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={true}
        >
          {t("delete_account")}
        </button>
      </div>
    </>
  );
} 
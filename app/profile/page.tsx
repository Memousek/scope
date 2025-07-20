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
import Image from "next/image";
import {ContainerService} from "@/lib/container.service";
import {UserRepository} from "@/lib/domain/repositories/user.repository";
import {User} from "@/lib/domain/models/user.model";
import { useTranslation } from "@/lib/translation";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const userRepository = ContainerService.getInstance().get(UserRepository);

    userRepository.getLoggedInUser().then((user) => {
        setUser(user);
        setLoading(false);
        if (!user) router.push("/auth/login");
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
    const { error } = await supabase.auth.admin.deleteUser(user.id);
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
          <div><b>{t("avatar")}:</b> {user.avatarUrl ? <Image src={user.avatarUrl} alt="Avatar" width={40} height={40} className="w-10 h-10 rounded-full" /> : <UserIcon className="w-10 h-10" />}</div>
          <div><b>{t("email")}:</b> {user.email}</div>
          {user.fullName && (
            <div><b>{t("name")}:</b> {user.fullName}</div>
          )}
          <div><b>{t("created")}:</b> {new Date(user.createdAt).toISOString().slice(0, 19).replace('T', ' ')}</div>
          <div><b>{t("updated")}:</b> {user.updatedAt ? new Date(user.updatedAt).toISOString().slice(0, 19).replace('T', ' ') : 'N/A'}</div>
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
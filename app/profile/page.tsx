"use client";
/**
 * Stránka profilu uživatele
 * Moderní design s glass-morphism efektem
 * Osobní údaje a správa účtu
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { UserIcon, Mail, Calendar, Shield, LogOut, Trash2, Edit  } from "lucide-react";
import Image from "next/image";
import { ContainerService } from "@/lib/container.service";
import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { User } from "@/lib/domain/models/user.model";
import { useTranslation } from "@/lib/translation";
import { EditProfileModal } from "@/app/components/profile/EditProfileModal";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Načítání profilu...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
                {user.avatarUrl ? (
                  <Image 
                    src={user.avatarUrl} 
                    alt="Avatar" 
                    width={96} 
                    height={96} 
                    className="w-24 h-24 rounded-full object-cover" 
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-white" />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {user.fullName || 'Uživatel'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {user.email}
            </p>
            <div className="flex justify-center gap-2">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Upravit profil
              </button>
            </div>
          </div>

          {/* Profile Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Personal Information */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Osobní údaje
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Základní informace o vašem účtu
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Jméno</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.fullName || 'Není nastaveno'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Člen od</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(user.createdAt).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Security */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Bezpečnost účtu
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nastavení zabezpečení účtu
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Změna hesla</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Aktualizujte své heslo</p>
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Změnit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Account Statistics */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Statistiky účtu
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Dní v aplikaci</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-emerald-600/10 to-green-700/10 rounded-xl">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {user.updatedAt ? 'Aktivní' : 'Nový'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Status účtu</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {user.id.slice(0, 8)}...
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">ID uživatele</div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-3 w-full p-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <LogOut className="w-5 h-5" />
              {t("logout")}
            </button>
            <button
              onClick={handleRemoveAccount}
              className="flex items-center justify-center gap-3 w-full p-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={true}
            >
              <Trash2 className="w-5 h-5" />
              {t("delete_account")}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {user && (
        <EditProfileModal
          user={user}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={(updatedUser) => {
            setUser(updatedUser);
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
} 
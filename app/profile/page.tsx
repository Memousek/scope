"use client";
/**
 * Stránka profilu uživatele
 * Moderní design s glass-morphism efektem
 * Osobní údaje a správa účtu
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  UserIcon,
  Mail,
  Calendar,
  Shield,
  LogOut,
  Trash2,
  Edit,
  CreditCard,
  Star,
  Zap,
  Building2,
  FileText,
} from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/lib/translation";
import { EditProfileModal } from "@/app/components/profile/EditProfileModal";
import { ChangePlanModal } from "@/app/components/profile/ChangePlanModal";
import { Plan } from "@/lib/domain/models/plan.model";
import { useSWRConfig } from "swr";
import { PlanUsageStrip } from "@/app/components/billing/PlanUsageStrip";
import { useUser, useUserPlan } from "@/app/hooks/useData";

export default function ProfilePage() {
  const { mutate } = useSWRConfig();
  const { data: me, isLoading: userLoading } = useUser();
  const user = me;
  const { data: cachedPlan } = useUserPlan(user?.id);
  const [userPlan, setUserPlan] = useState<Plan | null>(null);
  useEffect(() => { if (cachedPlan) setUserPlan(cachedPlan); }, [cachedPlan]);
  const loading = userLoading;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPlanChangeModalOpen, setIsPlanChangeModalOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

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

  const handleChangePlan = async () => {
    setIsPlanChangeModalOpen(true);
  };

  const handlePlanChanged = async () => {
    if (!user) return;
    // Revalidate SWR cache for the user's plan so all consumers update
    await mutate(["userPlan", user.id]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[90vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
                {user.additional?.avatar_url ? (
                  <Image
                    src={typeof user.additional.avatar_url === "string" ? user.additional.avatar_url : ""}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full object-scale-down"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-white" />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {typeof user.additional?.full_name === "string" ? user.additional.full_name : t("noName")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {typeof user.additional?.email === "string" && user.additional.email
              ? user.additional.email
              : t("noEmail")}
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                {t("editProfile")}
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
                    {t("personalInformation")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("basicAccountInformation")}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("email")}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {typeof user.additional?.email === "string" ? user.additional.email : t("noEmail")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("name")}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {typeof user.additional?.full_name === "string" ? user.additional.full_name : t("notSet")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("memberSince")}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(user.createdAt).toLocaleDateString("cs-CZ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg relative">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[1px]">
                    <div className="h-full w-full bg-white/70 dark:bg-gray-800/70 rounded-lg"></div>
                  </div>
                  <div className="relative flex items-center justify-between gap-3 w-full">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("accountPlan")}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {userPlan ? userPlan.displayName : t("defaultPlan")}
                        </p>
                        {userPlan && (
                          <span className="px-2 py-1 text-xs bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-400 rounded-full flex items-center gap-1">
                            {userPlan.name === "premium" ? (
                              <>
                                <Star className="w-3 h-3" />
                                {userPlan.displayName}
                              </>
                            ) : userPlan.name === "pro" ? (
                              <>
                                <Zap className="w-3 h-3" />
                                {userPlan.displayName}
                              </>
                            ) : userPlan.name === "enterprise" ? (
                              <>
                                <Building2 className="w-3 h-3" />
                                {userPlan.displayName}
                              </>
                            ) : (
                              <>
                                <FileText className="w-3 h-3" />
                                {userPlan.displayName}
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      {userPlan && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {userPlan.description || "Základní funkce"}
                        </p>
                      )}
                      {userPlan && (
                        <div className="mt-3">
                          <PlanUsageStrip userId={user.id} />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleChangePlan}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {t("change")}
                    </button>
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
                    {t("accountSecurity")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("accountSecurityDescription")}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t("changePassword")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("changePasswordDescription")}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {t("change")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Account Statistics */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t("accountStatistics")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {Math.floor(
                    (Date.now() - new Date(user.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t("daysInApplication")}
                </div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-emerald-600/10 to-green-700/10 rounded-xl">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {user.updatedAt ? t("active") : t("new")}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t("accountStatus")}
                </div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {user.id.slice(0, 8)}...
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t("userId")}
                </div>
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
          onUpdate={() => {
            setIsEditModalOpen(false);
          }}
        />
      )}

      {/* Change Plan Modal */}
      {user && (
        <ChangePlanModal
          isOpen={isPlanChangeModalOpen}
          onClose={() => setIsPlanChangeModalOpen(false)}
          currentPlan={userPlan}
          userId={user.id}
          onPlanChanged={handlePlanChanged}
        />
      )}
    </div>
  );
}

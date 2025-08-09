"use client";
/**
 * Modal pro změnu plánu uživatele
 * Zobrazuje dostupné plány a umožňuje změnu
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSWRConfig } from "swr";
import { Modal } from "@/app/components/ui/Modal";
import { ContainerService } from "@/lib/container.service";
import { ManageUserPlansService } from "@/lib/domain/services/manage-user-plans.service";
import { Plan } from "@/lib/domain/models/plan.model";
import { useTranslation } from "@/lib/translation";
import { Star, Zap, Building2, FileText, Check, CreditCard, Users, Folder, Layers3, Download, Cpu, BarChart3 } from "lucide-react";

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: Plan | null;
  userId: string;
  onPlanChanged: () => void;
}

export function ChangePlanModal({ isOpen, onClose, currentPlan, userId, onPlanChanged }: ChangePlanModalProps) {
  const { mutate } = useSWRConfig();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const { t } = useTranslation();

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const planService = ContainerService.getInstance().get(ManageUserPlansService);
      const availablePlans = await planService.getAvailablePlans();
      setPlans(availablePlans);
    } catch (e) {
      console.error("Error loading plans:", e);
      setError(t("errorLoadingPlans") || "");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(currentPlan?.id ?? null);
      setError(null);
      setSuccess(false);
      loadPlans();
    }
  }, [isOpen, currentPlan?.id, loadPlans]);

  const handlePlanChange = async () => {
    if (!selectedPlan || selectedPlan === currentPlan?.id) return;

    try {
      setChanging(true);
      setError(null);
      const planService = ContainerService.getInstance().get(ManageUserPlansService);
      const ok = await planService.updateUserPlan(userId, selectedPlan);
      if (ok) {
        setSuccess(true);
        // Revalidate cached plan
        mutate(["userPlan", userId]);
        onPlanChanged();
        // Small delay to let the user see success state
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 600);
      } else {
        setError(t("failedToChangePlan") || "");
      }
    } catch (e) {
      console.error("Error changing plan:", e);
      setError(t("failedToChangePlan") || "");
    } finally {
      setChanging(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case "premium":
        return <Star className="w-5 h-5 text-yellow-500" />;
      case "pro":
        return <Zap className="w-5 h-5 text-blue-500" />;
      case "enterprise":
        return <Building2 className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case "premium":
        return "border-yellow-300/40 bg-yellow-50/40 dark:bg-yellow-900/10 dark:border-yellow-800/60";
      case "pro":
        return "border-blue-300/40 bg-blue-50/40 dark:bg-blue-900/10 dark:border-blue-800/60";
      case "enterprise":
        return "border-purple-300/40 bg-purple-50/40 dark:bg-purple-900/10 dark:border-purple-800/60";
      default:
        return "border-gray-300/40 bg-gray-50/40 dark:bg-gray-900/30 dark:border-gray-800/60";
    }
  };

  const limits = useMemo(() => {
    const map: Record<string, Array<{ key: string; value: number | boolean; icon: React.ReactNode; label: string }>> = {};
    plans.forEach((p) => {
      map[p.id] = [
        { key: "maxProjects", value: p.maxProjects, icon: <Folder className="w-4 h-4" />, label: t("projects") },
        { key: "maxTeamMembers", value: p.maxTeamMembers, icon: <Users className="w-4 h-4" />, label: t("teamMembers") },
        { key: "maxScopes", value: p.maxScopes, icon: <Layers3 className="w-4 h-4" />, label: t("scopes") },
      ];
    });
    return map;
  }, [plans, t]);

  const features = useMemo(() => {
    const map: Record<string, Array<{ available: boolean; icon: React.ReactNode; label: string }>> = {};
    plans.forEach((p) => {
      map[p.id] = [
        { available: p.hasExport, icon: <Download className="w-4 h-4" />, label: t("includesExport") },
        { available: p.hasApiAccess, icon: <Cpu className="w-4 h-4" />, label: t("includesApi") },
        { available: p.hasAdvancedAnalytics, icon: <BarChart3 className="w-4 h-4" />, label: t("includesAdvancedAnalytics") },
      ];
    });
    return map;
  }, [plans, t]);

  const handleCardClick = (planId: string) => setSelectedPlan(planId);
  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, planId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedPlan(planId);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t("changeAccountPlan")} 
      description={t("selectNewPlan")}
      icon={<CreditCard className="w-6 h-6 text-white" />}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isCurrent = currentPlan?.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => handleCardClick(plan.id)}
                    onKeyDown={(e) => handleCardKeyDown(e, plan.id)}
                    onDoubleClick={handlePlanChange}
                    className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                      isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""
                    } ${getPlanColor(plan.name)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getPlanIcon(plan.name)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{plan.displayName}</h3>
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                {t("currentPlan")}
                              </span>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>
                          )}

                          {/* Limits */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {limits[plan.id]?.map((l) => (
                              <div key={l.key} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/10">
                                {l.icon}
                                <span className="font-medium">{String(l.value)}</span>
                                <span className="text-gray-600 dark:text-gray-400">{l.label}</span>
                              </div>
                            ))}
                          </div>

                          {/* Features */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {features[plan.id]?.map((f, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                                  f.available
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/60"
                                    : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200/40 dark:border-gray-700/60"
                                }`}
                              >
                                {f.icon}
                                <span>{f.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && <Check className="w-5 h-5 text-blue-500" />}
                        {plan.priceMonthly != null && (
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">${plan.priceMonthly.toFixed ? plan.priceMonthly.toFixed(2) : plan.priceMonthly}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">{t("monthlyPrice")}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="px-3 py-2 rounded-md text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200/50 dark:border-red-800/60">
                {error}
              </div>
            )}
            {success && (
              <div className="px-3 py-2 rounded-md text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/60">
                {t("planChanged")}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handlePlanChange}
                disabled={!selectedPlan || selectedPlan === currentPlan?.id || changing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {changing ? t("changing") : t("changePlan")}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

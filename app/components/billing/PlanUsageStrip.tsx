"use client";
/**
 * PlanUsageStrip
 * Compact, reusable usage indicator for current user's plan limits
 */
import { useEffect, useState, type ReactNode } from "react";
import { ContainerService } from "@/lib/container.service";
import { ManageUserPlansService } from "@/lib/domain/services/manage-user-plans.service";
import { useTranslation } from "@/lib/translation";
import { Users, Folder, Layers3 } from "lucide-react";

interface PlanUsage {
  projects: number;
  teamMembers: number;
  scopes: number;
}

interface Props {
  userId: string;
}

export function PlanUsageStrip({ userId }: Props) {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [limits, setLimits] = useState<{ maxProjects: number; maxTeamMembers: number; maxScopes: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const svc = ContainerService.getInstance().get(ManageUserPlansService);
        const [plan, u] = await Promise.all([
          svc.getUserCurrentPlan(userId),
          svc.getUsage(userId),
        ]);
        if (!mounted) return;
        if (plan) setLimits({ maxProjects: plan.maxProjects, maxTeamMembers: plan.maxTeamMembers, maxScopes: plan.maxScopes });
        setUsage(u);
      } catch {
        // noop
      }
    };
    load();
    return () => { mounted = false; };
  }, [userId]);

  if (!usage || !limits) return null;

  const Item = ({ icon, label, used, max }: { icon: ReactNode; label: string; used: number; max: number }) => (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-white/30 dark:border-gray-700/50">
      {icon}
      <div className="min-w-[110px]">
        <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">{used} {t("of")} {max}</div>
        <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className={`h-full rounded-full ${used >= max ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (used / Math.max(1, max)) * 100)}%` }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-wrap gap-3">
      <Item icon={<Layers3 className="w-4 h-4 text-purple-500" />} label={t("scopesLimit")} used={usage.scopes} max={limits.maxScopes} />
      <Item icon={<Folder className="w-4 h-4 text-emerald-500" />} label={t("projectsLimit")} used={usage.projects} max={limits.maxProjects} />
      <Item icon={<Users className="w-4 h-4 text-blue-500" />} label={t("teamLimit")} used={usage.teamMembers} max={limits.maxTeamMembers} />
    </div>
  );
}

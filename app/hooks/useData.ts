"use client";
import useSWR from 'swr';
import { ContainerService } from '@/lib/container.service';
import { UserRepository } from '@/lib/domain/repositories/user.repository';
import { ManageUserPlansService } from '@/lib/domain/services/manage-user-plans.service';
import { User } from '@/lib/domain/models/user.model';
import { Plan } from '@/lib/domain/models/plan.model';

const fetcher = async <T>(fn: () => Promise<T>): Promise<T> => fn();

export function useUser() {
  const get = async () => {
    const repo = ContainerService.getInstance().get(UserRepository);
    return repo.getLoggedInUser();
  };
  return useSWR<User | null>(['user'], () => fetcher(get), {
    dedupingInterval: 10000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
}

export function useUserPlan(userId?: string) {
  const get = async () => {
    if (!userId) return null;
    const svc = ContainerService.getInstance().get(ManageUserPlansService);
    return svc.getUserCurrentPlan(userId);
  };
  return useSWR<Plan | null>(userId ? ['userPlan', userId] : null, () => fetcher(get), {
    dedupingInterval: 15000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
}

export function useScopeUsage(scopeId?: string) {
  const get = async () => {
    if (!scopeId) return null as unknown as { projects: number; teamMembers: number };
    const svc = ContainerService.getInstance().get(ManageUserPlansService);
    return svc.getScopeUsage(scopeId);
  };
  return useSWR<{ projects: number; teamMembers: number }>(scopeId ? ['scopeUsage', scopeId] : null, () => fetcher(get), {
    dedupingInterval: 15000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
}

export function useHasExportForScope(scopeId?: string) {
  const get = async () => {
    if (!scopeId) return false;
    const svc = ContainerService.getInstance().get(ManageUserPlansService);
    return svc.hasExportAccessForScope(scopeId);
  };
  return useSWR<boolean>(scopeId ? ['exportFlag', scopeId] : null, () => fetcher(get), {
    dedupingInterval: 20000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
}

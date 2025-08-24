'use client';
/**
 * Stránka pro seznam scopů
 * - Přístupná pouze přihlášeným uživatelům
 * - Používá sdílenou ScopesDashboard komponentu
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ContainerService } from "@/lib/container.service";
import { User } from "@/lib/domain/models/user.model";
import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { ScopesDashboard } from "@/app/components/scope/ScopesDashboard";

const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userRepository = ContainerService.getInstance().get(UserRepository)
    userRepository.getLoggedInUser().then((user) => {
      setUser(user);
    }).catch(() => {
      setUser(null);
    }).finally(() => {
      setLoading(false);
    })
  }, []);

  return { loading, user };
};

export default function ScopesListPage() {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="h-[90vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <ScopesDashboard user={user} searchId="scopes-search" />;
} 
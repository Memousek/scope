"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/translation';
import { ContainerService } from '@/lib/container.service';
import { UserRepository } from '@/lib/domain/repositories/user.repository';

export default function AdminPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    const check = async () => {
      try {
        const userRepo = ContainerService.getInstance().get(UserRepository);
        const user = await userRepo.getLoggedInUser();
        if (user?.additional?.role === 'god') setAllowed(true);
        else router.replace('/');
      } catch {
        router.replace('/');
      }
    };
    void check();
  }, [router]);

  if (!allowed) return null;

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin</h1>
      <p className="text-gray-600 dark:text-gray-300">{t('workInProgress')}</p>
    </main>
  );
}



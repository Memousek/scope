'use client';

/**
 * Podmíněná hlavička aplikace
 * Zobrazuje Header vždy (předává user a loading), na auth stránkách se nezobrazuje
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { User } from "@/lib/domain/models/user.model";
import { ContainerService } from "@/lib/container.service";
import { UserRepository } from "@/lib/domain/repositories/user.repository";

export function ConditionalHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
     const userRepository = ContainerService.getInstance().get(UserRepository);
  
      userRepository.getLoggedInUser().then((user) => {
        setUser(user);
        setLoading(false);
      });
  }, []);

  // Nezobrazovat header na auth stránkách
  const isAuthPage = pathname?.startsWith('/auth/');
  if (isAuthPage) return null;

  // Vždy renderovat Header, předat user a loading
  return <Header user={user} loading={loading} />;
} 
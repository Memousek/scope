/**
 * Komponenta, která globálně spouští View Transition API při každé změně stránky.
 */
'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function ViewTransitionHandler() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname && document.startViewTransition) {
      document.startViewTransition(() => {});
    }
    prevPath.current = pathname;
  }, [pathname]);

  return null;
} 
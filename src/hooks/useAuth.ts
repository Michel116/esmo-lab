
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Inspector } from '@/types';
import { getInspectorById } from '@/lib/db';

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<Inspector | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Не выполнять проверку на странице логина, чтобы избежать редиректа
    if (pathname === '/login' || pathname === '/') {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const storedUserId = sessionStorage.getItem('datafill-currentUser');
        if (storedUserId) {
          const user = await getInspectorById(storedUserId);
          if (user) {
            setCurrentUser(user);
          } else {
            sessionStorage.removeItem('datafill-currentUser');
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      } catch (e) {
        console.error("Auth check failed", e);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  return { currentUser, isLoading, setCurrentUser };
}

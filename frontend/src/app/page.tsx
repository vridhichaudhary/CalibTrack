'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Root page — the middleware should redirect away from here before
 * this even renders (for authenticated users). For unauthenticated
 * users, redirect client-side to /login. This page should be nearly
 * invisible in all normal flows.
 */
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (user?.role === 'admin') {
      router.replace('/admin/instruments');
    } else {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"
        />
        <p className="text-sm text-gray-500 font-medium">Loading CalibTrack…</p>
      </div>
    </div>
  );
}


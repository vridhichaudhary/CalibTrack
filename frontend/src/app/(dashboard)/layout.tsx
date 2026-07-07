'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    const isAdminRoute = pathname.startsWith('/admin');

    if (isAdminRoute && user?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading CalibTrack…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div className="hidden">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between bg-primary px-4 py-3 text-white">
          <div className="font-semibold text-lg">CalibTrack</div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-1 hover:bg-primary-hover rounded">
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

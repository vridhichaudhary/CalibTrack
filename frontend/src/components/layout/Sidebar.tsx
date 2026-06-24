'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wrench, Users, FileClock, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { classNames } from '@/lib/utils';

const ADMIN_LINKS = [
  { href: '/admin/instruments', label: 'Instruments', icon: Wrench },
  { href: '/admin/recipients', label: 'Alert Recipients', icon: Users },
  { href: '/admin/logs', label: 'Notification Logs', icon: FileClock },
];

const USER_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const links = user?.role === 'admin' ? ADMIN_LINKS : USER_LINKS;

  return (
    <div className="w-64 bg-primary min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-primary-hover">
        <h1 className="text-white font-semibold text-lg">CalibTrack</h1>
        <p className="text-gray-400 text-xs mt-0.5">
          {user?.role === 'admin' ? 'Admin Panel' : 'User Dashboard'}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={classNames(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-white'
                  : 'text-gray-300 hover:bg-primary-hover hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-primary-hover">
        <div className="px-3 py-2 mb-2">
          <p className="text-white text-sm font-medium">{user?.full_name || user?.username}</p>
          <p className="text-gray-300 text-xs">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 hover:bg-primary-hover hover:text-white w-full"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );
}

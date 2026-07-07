'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wrench, Users, FileClock, LayoutDashboard, LogOut, ClipboardCheck, Settings2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { classNames } from '@/lib/utils';

const ADMIN_LINKS = [
  { href: '/admin/instruments', label: 'Calibration', icon: Wrench },
  { href: '/admin/amc', label: 'AMC', icon: ClipboardCheck },
  { href: '/admin/camc', label: 'CAMC', icon: Settings2 },
  { href: '/admin/recipients', label: 'Alert Recipients', icon: Users },
  { href: '/admin/logs', label: 'Notification Logs', icon: FileClock },
];

const USER_LINKS = [
  { href: '/dashboard', label: 'Calibration', icon: Wrench },
  { href: '/dashboard/amc', label: 'AMC', icon: ClipboardCheck },
  { href: '/dashboard/camc', label: 'CAMC', icon: Settings2 },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const links = user?.role === 'admin' ? ADMIN_LINKS : USER_LINKS;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 md:hidden" 
          onClick={onClose}
        />
      )}

      <div className={classNames(
        "fixed inset-y-0 left-0 z-50 w-64 bg-primary min-h-screen flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 py-5 border-b border-primary-hover">
          <h1 className="text-white font-semibold text-lg">CalibTrack</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {user?.role === 'admin' ? 'Admin Panel' : 'User Dashboard'}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  if (onClose) onClose();
                }}
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

        <div className="px-3 py-4 border-t border-primary-hover shrink-0">
          <div className="px-3 py-2 mb-2">
            <p className="text-white text-sm font-medium">{user?.full_name || user?.username}</p>
            <p className="text-gray-300 text-xs truncate" title={user?.email}>{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              if (onClose) onClose();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 hover:bg-primary-hover hover:text-white w-full"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </>
  );
}

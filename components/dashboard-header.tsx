'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { cn } from '@/ultis/cn';

export default function DashboardHeader() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!userMenuOpen && !notifOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setUserMenuOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [userMenuOpen, notifOpen]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/login');
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (!isClient) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const initials =
    `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.trim() ||
    (user.email?.charAt(0) ?? '?');

  return (
    <header className="sticky top-0 left-0 z-40 w-full border-b border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-gray-100/90 backdrop-blur-sm">
      <div
        ref={wrapRef}
        className="mx-auto mb-2 mt-1 flex min-h-14 max-w-7xl flex-col gap-3 rounded-xl border border-hwseta-green-muted/80 bg-white/90 px-3 py-2.5 shadow-sm sm:min-h-16 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-2"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 sm:min-w-[200px]">
          <h1 className="truncate text-base font-semibold tracking-tight text-hwseta-green sm:text-lg">
            HWSETA Beneficiary Hub
          </h1>
        </div>

        <form
          onSubmit={onSearchSubmit}
          className="flex min-w-0 flex-1 items-center"
          role="search"
        >
          <label className="relative w-full max-w-xl">
            <MagnifyingGlassIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search programmes, profile, help…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm text-slate-900 shadow-inner outline-none ring-hwseta-green/25 transition placeholder:text-slate-400 focus:border-hwseta-green/50 focus:bg-white focus:ring-2"
              autoComplete="off"
            />
          </label>
        </form>

        <div className="flex items-center justify-end gap-1 sm:shrink-0 sm:gap-2">
          <div className="relative">
            <button
              type="button"
              className={cn(
                'relative rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-hwseta-green',
                notifOpen && 'bg-slate-100 text-hwseta-green',
              )}
              aria-expanded={notifOpen}
              aria-haspopup="true"
              aria-label="Notifications"
              onClick={() => {
                setNotifOpen((v) => !v);
                setUserMenuOpen(false);
              }}
            >
              <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
            </button>
            {notifOpen && (
              <div className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl bg-white/95 shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notifications
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto px-4 py-6 text-center">
                  <p className="text-sm text-slate-600">You’re all caught up.</p>
                  <p className="mt-1 text-xs text-slate-400">New alerts will appear here.</p>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-slate-100"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              aria-label="Account menu"
              onClick={() => {
                setUserMenuOpen((v) => !v);
                setNotifOpen(false);
              }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-hwseta-green text-sm font-semibold uppercase text-white shadow-sm">
                {initials}
              </div>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 z-30 mt-3 w-56 rounded-xl bg-white/95 shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                  <div className="text-sm font-semibold text-gray-800">
                    Welcome{user.firstName ? `, ${user.firstName}` : ''}!
                  </div>
                  <div className="truncate text-sm text-gray-500">{user.email || user.userName}</div>
                </div>
                <div className="border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm font-semibold text-hwseta-green hover:bg-hwseta-green-muted"
                  >
                    <LogOut className="mr-2 h-4 w-4 text-hwseta-green" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

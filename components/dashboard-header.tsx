'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { cn } from '@/ultis/cn';
import {
  useBeneficiaryNotificationUnreadCount,
  useBeneficiaryNotifications,
  useMarkAllBeneficiaryNotificationsRead,
  useMarkBeneficiaryNotificationRead,
} from '@/hooks/useBeneficiaryNotifications';
import {
  useAdminNotificationUnreadCount,
  useAdminNotifications,
  useMarkAdminNotificationRead,
  useMarkAllAdminNotificationsRead,
} from '@/hooks/useAdminNotifications';
import type { BeneficiaryNotificationRow } from '@/types/beneficiaryNotifications';
import type { AdminNotificationRow } from '@/types/adminNotifications';

type HeaderNotificationRow = Pick<
  BeneficiaryNotificationRow | AdminNotificationRow,
  'notificationId' | 'notificationType' | 'title' | 'message' | 'linkUrl' | 'isRead' | 'dateCreated'
>;

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardHeader() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();
  const isBeneficiary = user?.role?.toLowerCase() === 'beneficiary';
  const isAdmin = isClient && isAuthenticated && !!user && !isBeneficiary;
  const beneficiaryNotificationsEnabled = isClient && isAuthenticated && isBeneficiary;
  const adminNotificationsEnabled = isAdmin;
  const beneficiaryNotificationsQuery = useBeneficiaryNotifications(
    { page: 1, pageSize: 6 },
    beneficiaryNotificationsEnabled,
  );
  const beneficiaryUnreadCountQuery = useBeneficiaryNotificationUnreadCount(beneficiaryNotificationsEnabled);
  const adminNotificationsQuery = useAdminNotifications({ page: 1, pageSize: 6 }, adminNotificationsEnabled);
  const adminUnreadCountQuery = useAdminNotificationUnreadCount(adminNotificationsEnabled);
  const markBeneficiaryReadMutation = useMarkBeneficiaryNotificationRead();
  const markAllBeneficiaryReadMutation = useMarkAllBeneficiaryNotificationsRead();
  const markAdminReadMutation = useMarkAdminNotificationRead();
  const markAllAdminReadMutation = useMarkAllAdminNotificationsRead();
  const notificationsQuery = isAdmin ? adminNotificationsQuery : beneficiaryNotificationsQuery;
  const unreadCountQuery = isAdmin ? adminUnreadCountQuery : beneficiaryUnreadCountQuery;
  const notifications: HeaderNotificationRow[] = notificationsQuery.data?.items ?? [];
  const unreadCount = unreadCountQuery.data?.unreadCount ?? notificationsQuery.data?.unreadCount ?? 0;
  const markAllReadPending = isAdmin ? markAllAdminReadMutation.isPending : markAllBeneficiaryReadMutation.isPending;

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

  const handleNotificationClick = async (notification: HeaderNotificationRow) => {
    try {
      if (!notification.isRead) {
        if (isAdmin) {
          await markAdminReadMutation.mutateAsync(notification.notificationId);
        } else {
          await markBeneficiaryReadMutation.mutateAsync(notification.notificationId);
        }
      }
    } finally {
      setNotifOpen(false);
      if (notification.linkUrl) {
        router.push(notification.linkUrl);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (isAdmin) {
      await markAllAdminReadMutation.mutateAsync();
    } else {
      await markAllBeneficiaryReadMutation.mutateAsync();
    }
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
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,24rem)] rounded-xl bg-white/95 shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={markAllReadPending}
                      className="text-xs font-semibold text-hwseta-green hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificationsQuery.isLoading ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-slate-600">Loading notifications...</p>
                    </div>
                  ) : notificationsQuery.isError ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-slate-600">Could not load notifications.</p>
                      <p className="mt-1 text-xs text-slate-400">Please try again later.</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-slate-600">You are all caught up.</p>
                      <p className="mt-1 text-xs text-slate-400">New alerts will appear here.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map((notification) => (
                        <button
                          key={notification.notificationId}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/40"
                        >
                          <span
                            className={cn(
                              'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                              notification.isRead ? 'bg-slate-200' : 'bg-hwseta-green',
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-semibold uppercase tracking-wide text-hwseta-green">
                                {notification.notificationType || 'alert'}
                              </span>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatNotificationDate(notification.dateCreated)}
                              </span>
                            </span>
                            <span className="mt-1 block text-sm font-semibold text-slate-900">
                              {notification.title}
                            </span>
                            <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-500">
                              {notification.message}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
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

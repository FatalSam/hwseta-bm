'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional second button (e.g. Cancel) shown before `action`. */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

type NotificationInput = Omit<Notification, 'id'>;

type NotificationContextValue = {
  notifications: Notification[];
  addNotification: (notification: NotificationInput) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function getNotificationTheme(type: Notification['type']) {
  switch (type) {
    case 'success':
      return {
        border: 'border-[#017f3f]/20 bg-white/95',
        iconWrap: 'bg-[#017f3f]/10 text-[#017f3f]',
        icon: <CheckCircle className="h-5 w-5" />,
        bar: 'bg-[linear-gradient(90deg,#017f3f_0%,#0f9d58_55%,#feca07_100%)]',
        dot: 'bg-[#017f3f]',
      };
    case 'error':
      return {
        border: 'border-[#d81920]/20 bg-white/95',
        iconWrap: 'bg-[#d81920]/10 text-[#d81920]',
        icon: <AlertCircle className="h-5 w-5" />,
        bar: 'bg-[linear-gradient(90deg,#d81920_0%,#ef4444_55%,#feca07_100%)]',
        dot: 'bg-[#d81920]',
      };
    case 'warning':
      return {
        border: 'border-[#feca07]/30 bg-white/95',
        iconWrap: 'bg-[#feca07]/20 text-[#9a6700]',
        icon: <AlertCircle className="h-5 w-5" />,
        bar: 'bg-[linear-gradient(90deg,#feca07_0%,#f59e0b_55%,#d81920_100%)]',
        dot: 'bg-[#f59e0b]',
      };
    case 'info':
      return {
        border: 'border-slate-200 bg-white/95',
        iconWrap: 'bg-slate-100 text-slate-700',
        icon: <Info className="h-5 w-5" />,
        bar: 'bg-[linear-gradient(90deg,#017f3f_0%,#feca07_100%)]',
        dot: 'bg-slate-500',
      };
    default:
      return {
        border: 'border-slate-200 bg-white/95',
        iconWrap: 'bg-slate-100 text-slate-700',
        icon: <Bell className="h-5 w-5" />,
        bar: 'bg-slate-300',
        dot: 'bg-slate-500',
      };
  }
}

function NotificationItem({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const theme = getNotificationTheme(notification.type);

  useEffect(() => {
    setIsVisible(true);

    if (notification.duration !== 0) {
      const timer = window.setTimeout(() => {
        setIsVisible(false);
        window.setTimeout(() => onClose(notification.id), 220);
      }, notification.duration ?? 4500);

      return () => window.clearTimeout(timer);
    }
  }, [notification.duration, notification.id, onClose]);

  const dismiss = () => {
    setIsVisible(false);
    window.setTimeout(() => onClose(notification.id), 220);
  };

  return (
    <div
      className={`pointer-events-auto w-full max-w-xl overflow-hidden rounded-[1.35rem] border shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-sm transition-all duration-200 ${
        theme.border
      } ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      role="status"
      aria-live="polite"
    >
      <div className={`h-1.5 w-full ${theme.bar}`} />
      <div className="flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${theme.iconWrap}`}>
          {theme.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">{notification.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
              {notification.secondaryAction || notification.action ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {notification.secondaryAction ? (
                    <button
                      type="button"
                      onClick={notification.secondaryAction.onClick}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      {notification.secondaryAction.label}
                    </button>
                  ) : null}
                  {notification.action ? (
                    <button
                      type="button"
                      onClick={notification.action.onClick}
                      className={
                        notification.secondaryAction
                          ? "inline-flex items-center rounded-full bg-[#d81920] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#b01218]"
                          : "inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      }
                    >
                      {notification.action.label}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            <span className={`inline-block h-2 w-2 rounded-full ${theme.dot}`} />
            HWSETA Beneficiary Profile
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationContainer({
  notifications,
  onClose,
}: {
  notifications: Notification[];
  onClose: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-[2px]">
      <div className="flex w-full max-w-xl flex-col items-center gap-3">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: NotificationInput) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11);
    const newNotification = { ...notification, id };
    setNotifications((prev) => [...prev, newNotification]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      addNotification,
      removeNotification,
      clearAll,
    }),
    [addNotification, clearAll, notifications, removeNotification],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider.');
  }
  return context;
}
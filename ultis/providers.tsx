'use client';

import '@/lib/syncfusion-license';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { initializeGridScrollSync } from '@/lib/grid-scroll-sync';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationProvider } from '@/components/ui/notification';
import { ThemeProvider } from '@/components/theme-provider';
import { isPublicPortalPath } from '@/lib/publicPortalPaths';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
const WARNING_COUNTDOWN_SECONDS = 60;
const WARNING_TIMEOUT_MS = WARNING_COUNTDOWN_SECONDS * 1000;

function setupSyncfusionErrorHandler() {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (error && typeof error === 'object') {
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('pagerObj') ||
          errorMessage.includes('Cannot read properties of undefined')) {
        event.preventDefault();
        if (process.env.NODE_ENV === 'development') {
          console.warn('Syncfusion Grid error suppressed:', errorMessage);
        }
      }
    }
  });

  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage = String(message);
    if (errorMessage.includes('pagerObj') ||
        errorMessage.includes('Cannot read properties of undefined')) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Syncfusion Grid error suppressed:', errorMessage);
      }
      return true;
    }
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    return false;
  };
}

function SessionManager({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_COUNTDOWN_SECONDS);

  const clearSessionTimers = useCallback(() => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }

    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleLogoutForInactivity = useCallback(() => {
    clearSessionTimers();
    setShowWarning(false);
    logout();
    router.replace('/login?reason=inactive');
  }, [clearSessionTimers, logout, router]);

  const startCountdownWarning = useCallback(() => {
    setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
    setShowWarning(true);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    clearSessionTimers();
    setShowWarning(false);
    setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);

    const warningDelay = Math.max(INACTIVITY_TIMEOUT_MS - WARNING_TIMEOUT_MS, 0);
    warningTimeoutRef.current = setTimeout(() => {
      startCountdownWarning();
    }, warningDelay);

    logoutTimeoutRef.current = setTimeout(() => {
      handleLogoutForInactivity();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearSessionTimers, handleLogoutForInactivity, startCountdownWarning]);

  const handleStaySignedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearSessionTimers();
      setShowWarning(false);
      setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
      return;
    }

    if (isPublicPortalPath(pathname ?? '')) {
      clearSessionTimers();
      setShowWarning(false);
      setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
      return;
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      resetTimer();
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    resetTimer();

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      clearSessionTimers();
    };
  }, [clearSessionTimers, isAuthenticated, pathname, resetTimer]);

  const countdownProgress = (secondsRemaining / WARNING_COUNTDOWN_SECONDS) * 100;

  return (
    <>
      {children}
      {isAuthenticated && showWarning && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-3xl border border-amber-100 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            <div className="h-1.5 bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-1000"
                style={{ width: `${Math.max(0, Math.min(100, countdownProgress))}%` }}
              />
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">Session expiring soon</p>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {secondsRemaining}s left
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    For your security, you will be logged out after 5 minutes of inactivity. Stay signed in to continue working.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleStaySignedIn}
                      className="inline-flex items-center gap-2 rounded-2xl bg-hwseta-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-hwseta-green-dark"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Stay signed in
                    </button>
                    <button
                      type="button"
                      onClick={handleLogoutForInactivity}
                      className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Log out now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    setupSyncfusionErrorHandler();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      initializeGridScrollSync();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NotificationProvider>
          <SessionManager>
            {children}
          </SessionManager>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

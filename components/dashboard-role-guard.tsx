'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  isBeneficiaryRole,
  isAdminRole,
  isTokenExpired,
  getUserRoleFromToken,
} from '@/lib/jwt-utils';

const BENEFICIARY_PREFIX = '/dashboard/beneficiary';
const ADMIN_PREFIX = '/dashboard/admin';
const REPORTS_PREFIX = '/dashboard/reports';

function isBeneficiaryPath(pathname: string): boolean {
  return pathname === BENEFICIARY_PREFIX || pathname.startsWith(`${BENEFICIARY_PREFIX}/`);
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname === ADMIN_PREFIX ||
    pathname.startsWith(`${ADMIN_PREFIX}/`) ||
    pathname === REPORTS_PREFIX ||
    pathname.startsWith(`${REPORTS_PREFIX}/`)
  );
}

/**
 * Allows `/dashboard/beneficiary/*` only for Beneficiary JWT role, and `/dashboard/admin/*` and
 * `/dashboard/reports/*` only for Admin. Wrong role is redirected without logging out when the other
 * role is valid.
 */
export default function DashboardRoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, initialize, logout, isAuthenticated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initialize();
    setReady(true);
  }, [initialize]);

  useEffect(() => {
    if (!ready || !isAuthenticated || !token || isTokenExpired(token)) return;

    const role = getUserRoleFromToken(token);
    const isBen = isBeneficiaryRole(role);
    const isAdm = isAdminRole(role);

    if (isBeneficiaryPath(pathname) && !isBen) {
      if (isAdm) {
        router.replace('/dashboard/admin');
      } else {
        logout();
        router.replace('/login?reason=portal-access');
      }
      return;
    }

    if (isAdminPath(pathname) && !isAdm) {
      if (isBen) {
        router.replace('/dashboard/beneficiary');
      } else {
        logout();
        router.replace('/login?reason=portal-access');
      }
    }
  }, [ready, isAuthenticated, token, pathname, logout, router]);

  if (!ready || !isAuthenticated || !token || isTokenExpired(token)) {
    return null;
  }

  const role = getUserRoleFromToken(token);
  if (isBeneficiaryPath(pathname) && !isBeneficiaryRole(role)) {
    return null;
  }
  if (isAdminPath(pathname) && !isAdminRole(role)) {
    return null;
  }

  return <>{children}</>;
}

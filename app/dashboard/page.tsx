'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getUserRoleFromToken, isAdminRole, isBeneficiaryRole } from '@/lib/jwt-utils';

export default function DashboardIndexPage() {
  const router = useRouter();
  const { token, initialize, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.replace('/login');
      return;
    }
    const role = getUserRoleFromToken(token);
    if (isAdminRole(role)) {
      router.replace('/dashboard/admin');
      return;
    }
    if (isBeneficiaryRole(role)) {
      router.replace('/dashboard/beneficiary');
      return;
    }
    router.replace('/login?reason=portal-access');
  }, [isAuthenticated, token, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Redirecting…</div>
  );
}

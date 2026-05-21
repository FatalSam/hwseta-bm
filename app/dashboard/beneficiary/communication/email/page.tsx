'use client';

import BeneficiaryInboxPanel from '@/components/beneficiary/BeneficiaryInboxPanel';
import { useAuthStore } from '@/store/authStore';

export default function BeneficiaryCommunicationEmailPage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user?.userID) {
    return (
      <div className="max-w-4xl rounded-2xl border border-slate-100 bg-white/90 p-6 text-sm text-slate-600 shadow-sm sm:p-8">
        Sign in to view your email.
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl">
      <div className="mb-6 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hwseta-green">Email</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Messages from HWSETA</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Official messages recorded in HWSETA for your profile (read-only inbox).
        </p>
      </div>
      <BeneficiaryInboxPanel />
    </div>
  );
}

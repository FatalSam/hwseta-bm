'use client';

import AuthGuard from '@/components/auth-guard';
import DashboardRoleGuard from '@/components/dashboard-role-guard';

/**
 * No dashboard shell (sidebar / top bar) — used for the programme add/edit view inside an iframe
 * on /dashboard/beneficiary/programmes so the user sees a single form, not a full nested hub.
 */
export default function BeneficiaryProgrammeEditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardRoleGuard>
        <div className="min-h-0 w-full bg-slate-50/50">{children}</div>
      </DashboardRoleGuard>
    </AuthGuard>
  );
}

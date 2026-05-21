'use client';

export default function ReportsBeneficiaryProfilesPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reports</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Beneficiary Profiles</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Export or review consolidated beneficiary profile data for compliance and monitoring. Connect this report to
          your reporting API when endpoints are available.
        </p>
      </div>
    </div>
  );
}

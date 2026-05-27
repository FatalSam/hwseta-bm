'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useMyFeedbackFormDetail } from '@/hooks/useBeneficiaryFeedbackForms';

export default function BeneficiaryFeedbackFormDetail({ responseId }: { responseId: string }) {
  const { data, isLoading, error } = useMyFeedbackFormDetail(responseId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-8 text-sm text-slate-500">Loading your answers…</div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-8">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Response not found.'}
        </p>
        <Link
          href="/dashboard/beneficiary/feedback-forms"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-hwseta-green hover:underline"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden />
          Back to feedback forms
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/beneficiary/feedback-forms"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-hwseta-green"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden />
        Feedback forms
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{data.formTitle}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Submitted {data.submittedAt.slice(0, 19).replace('T', ' ')}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Your answers</h2>
        </div>
        <dl className="divide-y divide-slate-100">
          {data.answers.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No answers recorded.</div>
          ) : (
            data.answers.map((a) => (
              <div key={a.fieldId} className="px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{a.label}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{a.value.trim() || '—'}</dd>
              </div>
            ))
          )}
        </dl>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useFormFeedbackDetail } from '@/hooks/useFormFeedback';
import type { FormFeedbackRecipientType } from '@/types/formFeedback';

function recipientLabel(type: FormFeedbackRecipientType): string {
  if (type === 'beneficiary') return 'Beneficiary';
  if (type === 'external') return 'External';
  return 'Unknown';
}

export default function FormFeedbackDetailAdmin({ responseId }: { responseId: string }) {
  const { data, isLoading, error } = useFormFeedbackDetail(responseId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-8 text-sm text-slate-500">Loading response…</div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-8">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Response not found.'}
        </p>
        <Link
          href="/dashboard/admin/form-feedback"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-hwseta-green hover:underline"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden />
          Back to feedback
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <Link
          href="/dashboard/admin/form-feedback"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-hwseta-green"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden />
          Feedback
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">{data.formTitle}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Submitted {data.submittedAt.slice(0, 19).replace('T', ' ')}
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recipient</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Type</dt>
              <dd className="font-medium text-slate-900">{recipientLabel(data.recipientType)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{data.fullName?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{data.email?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Cellphone</dt>
              <dd className="font-medium text-slate-900">{data.cellphone?.trim() || '—'}</dd>
            </div>
            {data.beneficiaryId ? (
              <div>
                <dt className="text-slate-500">Beneficiary ID</dt>
                <dd className="font-mono text-xs text-slate-800">{data.beneficiaryId}</dd>
              </div>
            ) : null}
            {data.distributionId ? (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Distribution</dt>
                <dd>
                  <Link
                    href={`/dashboard/admin/form-submissions/${encodeURIComponent(data.distributionId)}`}
                    className="font-semibold text-hwseta-green hover:underline"
                  >
                    View send batch
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Answers</h2>
          </div>
          <dl className="divide-y divide-slate-100">
            {data.answers.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No answers recorded.</div>
            ) : (
              data.answers.map((a) => (
                <div key={a.fieldId} className="px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {a.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                    {a.value.trim() || '—'}
                  </dd>
                </div>
              ))
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

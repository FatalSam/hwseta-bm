'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import {
  useAdminBeneficiaryFeedbackForms,
  useMyFeedbackForms,
} from '@/hooks/useBeneficiaryFeedbackForms';
import type { BeneficiaryFeedbackFormRow } from '@/types/beneficiaryFeedbackForms';
import type { FeedbackCompletionStatus } from '@/types/formFeedback';
import { buildFeedbackFormActionHref } from '@/lib/publicPortalPaths';

type Props = {
  beneficiaryId?: string | null;
  layout?: 'page' | 'embed';
};

const COMPLETION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function completionClass(status: FeedbackCompletionStatus): string {
  return status === 'completed'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-amber-50 text-amber-700 ring-amber-200';
}

function completionLabel(status: FeedbackCompletionStatus): string {
  return status === 'completed' ? 'Completed' : 'Pending';
}

function channelLabel(row: BeneficiaryFeedbackFormRow): string {
  return row.channels.length > 0
    ? row.channels.map((c) => c.toUpperCase()).join(', ')
    : 'N/A';
}

function actionHref(row: BeneficiaryFeedbackFormRow): string {
  return buildFeedbackFormActionHref(row);
}

function apiErr(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to load feedback forms.';
}

export default function BeneficiaryFeedbackFormsPanel({ beneficiaryId, layout = 'page' }: Props) {
  const [page, setPage] = useState(1);
  const [completionStatus, setCompletionStatus] = useState('');
  const [search, setSearch] = useState('');
  const pageSize = layout === 'embed' ? 10 : 20;
  const params = useMemo(
    () => ({
      page,
      pageSize,
      completionStatus: (completionStatus || null) as FeedbackCompletionStatus | null,
      search: search || null,
    }),
    [page, pageSize, search, completionStatus],
  );

  const mineQuery = useMyFeedbackForms(params);
  const adminQuery = useAdminBeneficiaryFeedbackForms(beneficiaryId, params);
  const query = beneficiaryId ? adminQuery : mineQuery;

  const rows = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const total = query.data?.totalCount ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const isEmbed = layout === 'embed';

  const summary = useMemo(() => {
    const pending = rows.filter((r) => r.completionStatus === 'pending').length;
    const completed = rows.filter((r) => r.completionStatus === 'completed').length;
    return { pending, completed };
  }, [rows]);

  const detailHref = (responseId: string) =>
    beneficiaryId
      ? `/dashboard/admin/form-feedback/${encodeURIComponent(responseId)}`
      : `/dashboard/beneficiary/feedback-forms/${encodeURIComponent(responseId)}`;

  return (
    <section className={isEmbed ? 'min-w-0' : 'mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8'}>
      <div className={isEmbed ? '' : 'mb-6'}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hwseta-green">Feedback</p>
            <h1 className={isEmbed ? 'mt-1 text-xl font-semibold text-slate-900' : 'mt-1 text-2xl font-bold text-slate-900 sm:text-3xl'}>
              Feedback Forms
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {beneficiaryId
                ? 'Forms sent to this beneficiary for completion.'
                : 'Forms sent to you — complete pending forms or review your submissions.'}
            </p>
            {!query.isLoading && rows.length > 0 ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                {summary.pending} pending · {summary.completed} completed
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search forms"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-hwseta-green focus:ring-2 focus:ring-hwseta-green/15"
            />
            <select
              value={completionStatus}
              onChange={(e) => {
                setCompletionStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-hwseta-green focus:ring-2 focus:ring-hwseta-green/15"
            >
              {COMPLETION_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {query.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {apiErr(query.error)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
              <tr>
                <th className="px-3 py-3">Form</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Sent</th>
                <th className="px-3 py-3">Submitted</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {query.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Loading feedback forms...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-hwseta-green">
                        <ClipboardDocumentListIcon className="h-6 w-6" aria-hidden />
                      </span>
                      <p className="mt-3 font-semibold text-slate-900">No feedback forms found</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Sent forms will appear here once notifications are created.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.distributionId}-${row.formId}-${row.notificationId ?? 'x'}`} className="hover:bg-emerald-50/30">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">{row.formTitle}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {row.programmeName || row.qualificationName || channelLabel(row)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${completionClass(row.completionStatus)}`}
                      >
                        {completionLabel(row.completionStatus)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(row.sentAt ?? row.createdAt)}</td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(row.submittedAt)}</td>
                    <td className="px-3 py-3 text-right">
                      {row.completionStatus === 'completed' && row.responseId ? (
                        <Link
                          href={detailHref(row.responseId)}
                          className="font-semibold text-hwseta-green hover:underline"
                        >
                          View answers
                        </Link>
                      ) : (
                        <a
                          href={actionHref(row)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-hwseta-green hover:underline"
                        >
                          Complete form
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!query.isError && total > pageSize ? (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || query.isFetching}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || query.isFetching}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

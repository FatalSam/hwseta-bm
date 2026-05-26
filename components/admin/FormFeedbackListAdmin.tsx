'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { useFormFeedbackList } from '@/hooks/useFormFeedback';
import { listManageForms } from '@/api/formBuilder';
import { exportRowsToExcel } from '@/ultis/exportExcel';
import type { FormFeedbackListParams, FormFeedbackRecipientType } from '@/types/formFeedback';

function apiErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const o = d as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
    }
    return e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

function recipientLabel(type: FormFeedbackRecipientType): string {
  if (type === 'beneficiary') return 'Beneficiary';
  if (type === 'external') return 'External';
  return 'Unknown';
}

function formatSubmittedAt(value: string): string {
  if (!value) return '—';
  return value.slice(0, 16).replace('T', ' ');
}

export default function FormFeedbackListAdmin() {
  const searchParams = useSearchParams();
  const initialDistributionId = searchParams.get('distributionId')?.trim() ?? '';

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [formId, setFormId] = useState('');
  const [recipientType, setRecipientType] = useState('');
  const [distributionId, setDistributionId] = useState(initialDistributionId);
  const [search, setSearch] = useState('');
  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');

  useEffect(() => {
    if (initialDistributionId) {
      setDistributionId(initialDistributionId);
      setPage(1);
    }
  }, [initialDistributionId]);

  const listParams = useMemo<FormFeedbackListParams>(
    () => ({
      page,
      pageSize,
      formId: formId || null,
      distributionId: distributionId.trim() || null,
      recipientType: (recipientType || null) as FormFeedbackRecipientType | null,
      search: search.trim() || null,
      submittedFrom: submittedFrom || null,
      submittedTo: submittedTo || null,
    }),
    [page, pageSize, formId, distributionId, recipientType, search, submittedFrom, submittedTo],
  );

  const { data, isLoading, isFetching, error, refetch } = useFormFeedbackList(listParams);

  const formsQuery = useQuery({
    queryKey: ['form-builder', 'manage-list'],
    queryFn: () => listManageForms(),
    retry: false,
  });

  const rows = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleExport = () => {
    exportRowsToExcel(
      `form-feedback-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows.map((r) => ({
        Submitted: formatSubmittedAt(r.submittedAt),
        Form: r.formTitle,
        'Recipient type': recipientLabel(r.recipientType),
        Name: r.fullName ?? '',
        Email: r.email ?? '',
        Cellphone: r.cellphone ?? '',
        'Answers summary': r.answersSummary ?? '',
        'Distribution ID': r.distributionId ?? '',
      })),
      'Feedback',
    );
  };

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Feedback</h1>
            <p className="mt-1 text-sm text-slate-600">
              Completed form responses from beneficiaries and external recipients.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className={adminFormTheme.btnSecondary}
            >
              <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={rows.length === 0}
              className={adminFormTheme.btnSecondary}
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
              Export Excel
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={adminFormTheme.label}>Form</label>
            <select
              value={formId}
              onChange={(e) => {
                setFormId(e.target.value);
                setPage(1);
              }}
              className={adminFormTheme.select}
            >
              <option value="">All forms</option>
              {(formsQuery.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={adminFormTheme.label}>Recipient type</label>
            <select
              value={recipientType}
              onChange={(e) => {
                setRecipientType(e.target.value);
                setPage(1);
              }}
              className={adminFormTheme.select}
            >
              <option value="">All</option>
              <option value="beneficiary">Beneficiary</option>
              <option value="external">External</option>
            </select>
          </div>
          <div>
            <label className={adminFormTheme.label}>Distribution ID</label>
            <input
              type="text"
              value={distributionId}
              onChange={(e) => {
                setDistributionId(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by send batch…"
              className={adminFormTheme.input}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Search</label>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, email, form…"
              className={adminFormTheme.input}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Submitted from</label>
            <input
              type="date"
              value={submittedFrom}
              onChange={(e) => {
                setSubmittedFrom(e.target.value);
                setPage(1);
              }}
              className={adminFormTheme.input}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Submitted to</label>
            <input
              type="date"
              value={submittedTo}
              onChange={(e) => {
                setSubmittedTo(e.target.value);
                setPage(1);
              }}
              className={adminFormTheme.input}
            />
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {apiErr(error)}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
                <tr>
                  <th className="px-3 py-2.5">Submitted</th>
                  <th className="px-3 py-2.5">Form</th>
                  <th className="px-3 py-2.5">Recipient</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Cellphone</th>
                  <th className="px-3 py-2.5">Distribution</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      No completed responses yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.responseId} className="hover:bg-emerald-50/30">
                      <td className="px-3 py-2.5 text-slate-600">{formatSubmittedAt(r.submittedAt)}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{r.formTitle}</td>
                      <td className="px-3 py-2.5 text-slate-600">{recipientLabel(r.recipientType)}</td>
                      <td className="px-3 py-2.5 text-slate-600">{r.fullName?.trim() || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{r.email?.trim() || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{r.cellphone?.trim() || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {r.distributionId ? (
                          <Link
                            href={`/dashboard/admin/form-submissions/${encodeURIComponent(r.distributionId)}`}
                            className="font-semibold text-hwseta-green hover:underline"
                          >
                            View send
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/dashboard/admin/form-feedback/${encodeURIComponent(r.responseId)}`}
                          className="text-sm font-semibold text-hwseta-green hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p>
                Showing{' '}
                <span className="font-semibold text-slate-800">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}
                </span>{' '}
                of <span className="font-semibold text-slate-800">{totalCount}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  Rows
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className={adminFormTheme.selectInline}
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={adminFormTheme.btnSecondary}
                >
                  Previous
                </button>
                <span className="text-xs">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className={adminFormTheme.btnSecondary}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

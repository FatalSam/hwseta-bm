'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FaFileExcel, FaPaperPlane, FaRedo } from 'react-icons/fa';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import {
  preventInvalidDateInputBeforeInput,
  preventInvalidDateInputKeyDown,
  preventInvalidDateInputPaste,
} from '@/components/ui/SyncfusionIsoDatePicker';
import { useFormDistributionsList } from '@/hooks/useFormSubmissions';
import { listManageForms } from '@/api/formBuilder';
import { exportRowsToExcel } from '@/ultis/exportExcel';
import { formatProgrammeAudienceSummary } from '@/lib/programme-enrolments-drilldown';
import type { AudienceType, DistributionStatus, FormDistributionListParams } from '@/types/formSubmissions';
import { useQuery } from '@tanstack/react-query';

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

function audienceLabel(
  a: AudienceType,
  programmeName?: string | null,
  qualificationName?: string | null,
): string {
  if (a === 'all_beneficiaries') return 'All beneficiaries';
  if (a === 'by_programme') {
    if (!programmeName) return 'By programme';
    return formatProgrammeAudienceSummary(programmeName, qualificationName);
  }
  return 'Non-beneficiaries';
}

const STATUS_OPTIONS: DistributionStatus[] = [
  'Queued',
  'Processing',
  'Completed',
  'CompletedWithFailures',
  'Failed',
];

export default function FormSubmissionsListAdmin() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [formId, setFormId] = useState('');
  const [audienceType, setAudienceType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  const listParams = useMemo<FormDistributionListParams>(
    () => ({
      page,
      pageSize,
      formId: formId || null,
      audienceType: (audienceType || null) as AudienceType | null,
      status: status || null,
      search: search.trim() || null,
      createdFrom: createdFrom || null,
      createdTo: createdTo || null,
    }),
    [page, pageSize, formId, audienceType, status, search, createdFrom, createdTo],
  );

  const { data, isLoading, isFetching, error, refetch } = useFormDistributionsList(listParams);

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
      `form-distributions-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows.map((r) => ({
        Form: r.formTitle,
        Audience: audienceLabel(r.audienceType, r.programmeName, r.qualificationName),
        Channels: r.channels.join(', '),
        Status: r.status,
        Created: r.createdAt.slice(0, 19),
        Recipients: r.totalRecipients,
        Sent: r.sentCount,
        Failed: r.failedCount,
        Pending: r.pendingCount,
      })),
      'Distributions',
    );
  };

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Form submissions</h1>
            <p className="mt-1 text-sm text-slate-600">Send forms and track email/SMS delivery.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className={adminFormTheme.btnSecondary}
            >
              <FaRedo className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={rows.length === 0}
              className={adminFormTheme.btnSecondary}
            >
              <FaFileExcel />
              Export Excel
            </button>
            <Link href="/dashboard/admin/form-submissions/new" className={adminFormTheme.btnPrimary}>
              <FaPaperPlane />
              Send form
            </Link>
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
            <label className={adminFormTheme.label}>Audience</label>
            <select
              value={audienceType}
              onChange={(e) => {
                setAudienceType(e.target.value);
                setPage(1);
              }}
              className={adminFormTheme.select}
            >
              <option value="">All</option>
              <option value="all_beneficiaries">All beneficiaries</option>
              <option value="by_programme">By programme</option>
              <option value="external">Non-beneficiaries</option>
            </select>
          </div>
          <div>
            <label className={adminFormTheme.label}>Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={adminFormTheme.select}
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
              placeholder="Form title, creator…"
              className={adminFormTheme.input}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Created from</label>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => {
                setCreatedFrom(e.target.value);
                setPage(1);
              }}
              onBeforeInput={preventInvalidDateInputBeforeInput}
              onKeyDown={preventInvalidDateInputKeyDown}
              onPaste={preventInvalidDateInputPaste}
              className={adminFormTheme.input}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Created to</label>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => {
                setCreatedTo(e.target.value);
                setPage(1);
              }}
              onBeforeInput={preventInvalidDateInputBeforeInput}
              onKeyDown={preventInvalidDateInputKeyDown}
              onPaste={preventInvalidDateInputPaste}
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
                  <th className="px-3 py-2.5">Form</th>
                  <th className="px-3 py-2.5">Audience</th>
                  <th className="px-3 py-2.5">Channels</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Created</th>
                  <th className="px-3 py-2.5 text-right">Sent</th>
                  <th className="px-3 py-2.5 text-right">Failed</th>
                  <th className="px-3 py-2.5 text-right">Pending</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      No distributions yet. Use Send form to notify beneficiaries.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.distributionId} className="hover:bg-emerald-50/30">
                      <td className="px-3 py-2.5 font-medium text-slate-900">{r.formTitle}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {audienceLabel(r.audienceType, r.programmeName, r.qualificationName)}
                      </td>
                      <td className="px-3 py-2.5 capitalize text-slate-600">
                        {r.channels.join(', ') || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{r.status}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {r.createdAt.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{r.sentCount}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{r.failedCount}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{r.pendingCount}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/dashboard/admin/form-submissions/${encodeURIComponent(r.distributionId)}`}
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
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
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

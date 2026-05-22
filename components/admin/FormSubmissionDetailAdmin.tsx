'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FaArrowLeft, FaPaperPlane, FaRedo } from 'react-icons/fa';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { buildPublicFormPath, getAppBaseUrl } from '@/lib/appBaseUrl';
import { formatProgrammeAudienceSummary } from '@/lib/programme-enrolments-drilldown';
import {
  useFormDistributionDetail,
  useFormDistributionNotifications,
  useFormDistributionMutations,
} from '@/hooks/useFormSubmissions';
import type {
  FormDistributionNotificationListParams,
  NotificationChannel,
  NotificationStatus,
} from '@/types/formSubmissions';

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
  audienceType: string,
  programmeName?: string | null,
  qualificationName?: string | null,
): string {
  if (audienceType === 'all_beneficiaries') return 'All beneficiaries';
  if (audienceType === 'by_programme') {
    if (!programmeName) return 'By programme';
    return formatProgrammeAudienceSummary(programmeName, qualificationName);
  }
  return 'Non-beneficiaries';
}

const STATUS_OPTIONS: NotificationStatus[] = ['pending', 'sent', 'failed', 'delivered'];

export default function FormSubmissionDetailAdmin({ distributionId }: { distributionId: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sentFrom, setSentFrom] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const notifParams = useMemo<FormDistributionNotificationListParams>(
    () => ({
      page,
      pageSize,
      channel: (channel || null) as NotificationChannel | null,
      status: (status || null) as NotificationStatus | null,
      search: search.trim() || null,
      sentFrom: sentFrom || null,
      sentTo: sentTo || null,
    }),
    [page, pageSize, channel, status, search, sentFrom, sentTo],
  );

  const distQuery = useFormDistributionDetail(distributionId);
  const notifQuery = useFormDistributionNotifications(distributionId, notifParams);
  const { retryOneMutation, retryAllMutation, sendMutation } = useFormDistributionMutations();

  const dist = distQuery.data;
  const rows = notifQuery.data?.items ?? [];
  const totalCount = notifQuery.data?.totalCount ?? 0;
  const totalPages = notifQuery.data?.totalPages ?? 1;
  const isFetching = notifQuery.isFetching || distQuery.isFetching;

  const refetchAll = () => {
    void distQuery.refetch();
    void notifQuery.refetch();
  };

  const handleRetry = async (notificationId: string) => {
    setActionError(null);
    try {
      await retryOneMutation.mutateAsync({ distributionId, notificationId });
      refetchAll();
    } catch (e) {
      setActionError(apiErr(e));
    }
  };

  const handleRetryAll = async () => {
    setActionError(null);
    try {
      await retryAllMutation.mutateAsync(distributionId);
      refetchAll();
    } catch (e) {
      setActionError(apiErr(e));
    }
  };

  const handleSendPending = async () => {
    setActionError(null);
    try {
      await sendMutation.mutateAsync(distributionId);
      refetchAll();
    } catch (e) {
      setActionError(apiErr(e));
    }
  };

  if (distQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-hwseta-green border-t-transparent" />
      </div>
    );
  }

  if (distQuery.error || !dist) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-8">
        <p className="text-red-700">{distQuery.error ? apiErr(distQuery.error) : 'Not found.'}</p>
        <Link href="/dashboard/admin/form-submissions" className="mt-4 text-sm font-semibold text-hwseta-green">
          Back to submissions
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <Link
          href="/dashboard/admin/form-submissions"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-hwseta-green"
        >
          <FaArrowLeft className="h-3.5 w-3.5" />
          Submissions
        </Link>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{dist.formTitle}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {audienceLabel(dist.audienceType, dist.programmeName, dist.qualificationName)} ·{' '}
              {dist.channels.join(', ')} ·{' '}
              {dist.status}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Created {dist.createdAt.slice(0, 19).replace('T', ' ')}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Sent {dist.sentCount} · Failed {dist.failedCount} · Pending {dist.pendingCount} ·
              Recipients {dist.totalRecipients}
            </p>
            <a
              href={`${getAppBaseUrl()}${buildPublicFormPath(dist.formId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-hwseta-green hover:underline"
            >
              Open live form
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSendPending()}
              disabled={sendMutation.isPending || dist.pendingCount === 0}
              className={adminFormTheme.btnPrimary}
            >
              <FaPaperPlane className={sendMutation.isPending ? 'animate-pulse' : ''} />
              {sendMutation.isPending ? 'Sending…' : 'Send pending'}
            </button>
            <button
              type="button"
              onClick={refetchAll}
              disabled={isFetching}
              className={adminFormTheme.btnSecondary}
            >
              <FaRedo className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleRetryAll()}
              disabled={retryAllMutation.isPending || dist.failedCount === 0}
              className={adminFormTheme.btnPrimary}
            >
              Retry all failed
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={adminFormTheme.label}>Channel</label>
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(1);
              }}
              className={adminFormTheme.select}
            >
              <option value="">All</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
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
              placeholder="Name, email, phone…"
              className={adminFormTheme.input}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Sent from</label>
            <input
              type="date"
              value={sentFrom}
              onChange={(e) => {
                setSentFrom(e.target.value);
                setPage(1);
              }}
              className={adminFormTheme.input}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Sent to</label>
            <input
              type="date"
              value={sentTo}
              onChange={(e) => {
                setSentTo(e.target.value);
                setPage(1);
              }}
              className={adminFormTheme.input}
            />
          </div>
        </div>

        {actionError ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {actionError}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
                <tr>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Cellphone</th>
                  <th className="px-3 py-2.5">Channel</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Sent</th>
                  <th className="px-3 py-2.5">Error</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {notifQuery.isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      No notifications match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((n) => (
                    <tr key={n.notificationId} className="hover:bg-emerald-50/30">
                      <td className="px-3 py-2.5 capitalize text-slate-600">{n.recipientType}</td>
                      <td className="px-3 py-2.5 text-slate-900">{n.fullName}</td>
                      <td className="px-3 py-2.5 text-slate-600">{n.email ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{n.cellphone ?? '—'}</td>
                      <td className="px-3 py-2.5 capitalize text-slate-600">{n.channel}</td>
                      <td className="px-3 py-2.5 capitalize text-slate-600">{n.status}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {n.sentAt ? n.sentAt.slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-red-700" title={n.errorMessage ?? ''}>
                        {n.errorMessage ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {n.status === 'failed' ? (
                          <button
                            type="button"
                            onClick={() => void handleRetry(n.notificationId)}
                            disabled={retryOneMutation.isPending}
                            className="text-sm font-semibold text-hwseta-green hover:underline disabled:opacity-50"
                          >
                            Retry
                          </button>
                        ) : (
                          '—'
                        )}
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

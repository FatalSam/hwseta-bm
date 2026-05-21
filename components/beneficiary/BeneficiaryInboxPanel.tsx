'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PaperClipIcon } from '@heroicons/react/24/outline';
import {
  downloadBeneficiaryEmailAttachment,
  getBeneficiaryEmailMessage,
  listBeneficiaryEmailInbox,
} from '@/api/beneficiaryEmailMessages';
import { environment } from '@/config/environment';
import { useNotifications } from '@/components/ui/notification';
import type { AdminEmailMessageRow } from '@/types/admin-email-messages';
import apiClient from '@/ultis/apiClient';
import { cn } from '@/ultis/cn';
import axios from 'axios';

/** Newest first — same ordering intent as admin panel. */
function messageSortMs(iso: string | undefined): number {
  if (!iso?.trim()) return 0;
  const t = Date.parse(iso);
  if (Number.isFinite(t)) return t;
  const t2 = new Date(iso).getTime();
  return Number.isFinite(t2) ? t2 : 0;
}

function sortNewestFirst(a: AdminEmailMessageRow, b: AdminEmailMessageRow): number {
  return messageSortMs(b.sentAt) - messageSortMs(a.sentAt);
}

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

function is503(e: unknown): boolean {
  return axios.isAxiosError(e) && e.response?.status === 503;
}

function senderLabel(row: AdminEmailMessageRow): string {
  const n = row.fromName?.trim();
  if (n) return n;
  const e = row.fromEmail?.trim();
  if (e) return e;
  return 'HWSETA';
}

function metaFromLine(row: AdminEmailMessageRow): string {
  const name = row.fromName?.trim();
  const email = row.fromEmail?.trim();
  if (name && email) return `${name} <${email}>`;
  if (email) return email;
  if (name) return name;
  return '';
}

function snippet(text: string, max = 120): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

function formatSentDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' });
}

function getMessageRowKey(row: AdminEmailMessageRow, index: number): string {
  const id = row.emailMessageId?.trim();
  if (id) return id;
  return `__row:${index}:${row.sentAt}:${row.subject}`;
}

function rowIsUnread(row: AdminEmailMessageRow): boolean {
  if (row.isRead === true) return false;
  if (row.isRead === false) return true;
  if (row.readAt?.trim()) return false;
  return false;
}

function mergeListAndDetail(
  listRow: AdminEmailMessageRow | undefined,
  detailRow: AdminEmailMessageRow | undefined,
): AdminEmailMessageRow | null {
  if (!listRow && !detailRow) return null;
  if (!detailRow) return listRow ?? null;
  if (!listRow) return detailRow;
  const messageBody =
    (detailRow.messageBody?.trim().length ?? 0) > 0 ? detailRow.messageBody : listRow.messageBody;
  const subject = (detailRow.subject?.trim().length ?? 0) > 0 ? detailRow.subject : listRow.subject;
  const attachments =
    detailRow.attachments && detailRow.attachments.length > 0 ? detailRow.attachments : listRow.attachments;
  const hasAttachments =
    (attachments?.length ?? 0) > 0 ||
    detailRow.hasAttachments === true ||
    listRow.hasAttachments === true;
  return {
    ...listRow,
    ...detailRow,
    messageBody: messageBody ?? listRow.messageBody,
    subject: subject ?? listRow.subject,
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
    ...(hasAttachments ? { hasAttachments: true } : {}),
  };
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BeneficiaryInboxPanel() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['beneficiary-email-inbox', 'list'],
    queryFn: listBeneficiaryEmailInbox,
  });

  const items = useMemo(
    () => [...(listQuery.data?.items ?? [])].sort(sortNewestFirst),
    [listQuery.data?.items],
  );

  useEffect(() => {
    if (items.length === 0) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey((prev) => {
      if (prev && items.some((r, i) => getMessageRowKey(r, i) === prev)) return prev;
      return getMessageRowKey(items[0], 0);
    });
  }, [items]);

  const selectedRow = useMemo(() => {
    if (!selectedKey) return undefined;
    const idx = items.findIndex((r, i) => getMessageRowKey(r, i) === selectedKey);
    if (idx >= 0) return items[idx];
    return items.find((r) => r.emailMessageId === selectedKey);
  }, [items, selectedKey]);

  const detailMessageId = selectedRow?.emailMessageId?.trim();

  const detailQuery = useQuery({
    queryKey: ['beneficiary-email-inbox', 'detail', detailMessageId],
    queryFn: () => getBeneficiaryEmailMessage(detailMessageId!),
    enabled: !!detailMessageId && detailMessageId.length > 0,
    retry: 1,
  });

  /** Opening a message runs GET detail, which marks read server-side — refresh list unread counts. */
  useEffect(() => {
    if (!detailMessageId || !detailQuery.data) return;
    void queryClient.invalidateQueries({ queryKey: ['beneficiary-email-inbox', 'list'] });
  }, [detailMessageId, detailQuery.dataUpdatedAt, detailQuery.data, queryClient]);

  const mergedRow = useMemo(
    () => mergeListAndDetail(selectedRow, detailQuery.data ?? undefined),
    [selectedRow, detailQuery.data],
  );

  const unreadCount = useMemo(() => items.filter((r) => rowIsUnread(r)).length, [items]);

  const resolveDownloadPath = (downloadUrl: string): string | null => {
    const base = environment.apiUrl.replace(/\/$/, '');
    const raw = downloadUrl.trim();
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      try {
        const u = new URL(raw);
        const origin = new URL(base).origin;
        if (u.origin !== origin) return null;
        return `${u.pathname}${u.search}`;
      } catch {
        return null;
      }
    }
    return raw.startsWith('/') ? raw : `/${raw}`;
  };

  const handleDownload = async (att: NonNullable<AdminEmailMessageRow['attachments']>[0]) => {
    const msgId = detailMessageId;
    if (!msgId) return;
    const key = `${att.attachmentId}:${att.fileName}`;
    setDownloadingKey(key);
    try {
      if (att.downloadUrl) {
        const path = resolveDownloadPath(att.downloadUrl);
        if (!path) {
          addNotification({
            type: 'error',
            title: 'Download',
            message: 'This file link is not available for download from this app.',
          });
          return;
        }
        const { data } = await apiClient.get(path, { responseType: 'blob' });
        triggerBlobDownload(data as Blob, att.fileName);
      } else if (att.attachmentId && !att.attachmentId.startsWith('anon-')) {
        const blob = await downloadBeneficiaryEmailAttachment(msgId, att.attachmentId);
        triggerBlobDownload(blob, att.fileName);
      } else {
        addNotification({
          type: 'warning',
          title: 'Download',
          message: 'No downloadable file reference was returned for this attachment.',
        });
      }
    } catch (e: unknown) {
      addNotification({ type: 'error', title: 'Download failed', message: apiErr(e) });
    } finally {
      setDownloadingKey(null);
    }
  };

  const count = items.length;

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h2 className="text-lg font-semibold text-slate-900">Inbox</h2>
        <p className="mt-0.5 text-sm text-slate-600">
          {listQuery.isLoading && count === 0
            ? 'Loading…'
            : `${count} ${count === 1 ? 'message' : 'messages'} from HWSETA`}
          {count > 0 ? (
            <span className="text-slate-500">
              {' '}
              · {unreadCount} unread
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Messages sent to your profile are shown here. This is read-only — replies are handled through your own email
          account.
        </p>
      </div>

      {listQuery.isError ? (
        <div className="p-4 sm:p-5">
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-sm',
              is503(listQuery.error)
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : 'border-red-200 bg-red-50 text-red-800',
            )}
          >
            {is503(listQuery.error) ? (
              <>
                <p className="font-medium">Email inbox is temporarily unavailable</p>
                <p className="mt-1 text-amber-900/90">
                  The messaging tables may not be deployed yet on the server, or the service is starting up. Please
                  try again later.
                </p>
              </>
            ) : (
              apiErr(listQuery.error)
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[min(72vh,560px)] max-h-[min(88vh,720px)] min-w-0 flex-col overflow-hidden bg-slate-100/60 lg:h-[min(72vh,640px)] lg:max-h-[min(85vh,720px)] lg:flex-row">
          <div className="flex max-h-[min(52vh,440px)] min-h-0 w-full min-w-0 flex-col overflow-hidden border-slate-200 bg-white lg:h-full lg:max-h-none lg:w-[min(100%,420px)] lg:shrink-0 lg:border-r">
            {listQuery.isLoading && items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-16">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#017f3f]/20 border-t-[#017f3f]" />
                <p className="mt-4 text-sm text-slate-600">Loading messages…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-1 flex-col justify-center px-4 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No messages yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  When HWSETA sends you an email, it will appear here.
                </p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                  <ul className="divide-y divide-slate-100" aria-label="Inbox">
                    {items.map((row, index) => {
                      const rowKey = getMessageRowKey(row, index);
                      const isSel = selectedKey === rowKey;
                      const unread = rowIsUnread(row);
                      return (
                        <li key={rowKey}>
                          <button
                            type="button"
                            onClick={() => setSelectedKey(rowKey)}
                            className={cn(
                              'flex w-full gap-2 px-4 py-3.5 text-left transition sm:px-5',
                              isSel
                                ? 'border-l-4 border-l-hwseta-green bg-emerald-50/30'
                                : 'border-l-4 border-l-transparent hover:bg-slate-50/80',
                            )}
                          >
                            <span className="mt-1.5 flex w-4 shrink-0 justify-center self-start" aria-hidden>
                              {unread ? <span className="mt-0.5 block h-2 w-2 rounded-full bg-slate-900" /> : null}
                            </span>
                            {row.hasAttachments || (row.attachments?.length ?? 0) > 0 ? (
                              <span className="mt-0.5 shrink-0 text-slate-400" aria-label="Has attachment">
                                <PaperClipIcon className="h-4 w-4" />
                              </span>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  'truncate',
                                  unread ? 'font-semibold text-slate-900' : 'font-normal text-slate-500',
                                )}
                              >
                                {senderLabel(row)}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">{formatSentDate(row.sentAt)}</p>
                              <p
                                className={cn(
                                  'mt-1.5 truncate text-sm',
                                  unread ? 'font-semibold text-slate-900' : 'font-normal text-slate-500',
                                )}
                              >
                                {row.subject?.trim() || '(No subject)'}
                              </p>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{snippet(row.messageBody)}</p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-[280px] min-w-0 flex-1 flex-col overflow-hidden bg-white lg:min-h-0 lg:h-full">
            {!selectedKey ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
                Select a message to read
              </div>
            ) : !mergedRow ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#017f3f]/20 border-t-[#017f3f]" />
                <p className="text-sm text-slate-600">Loading…</p>
              </div>
            ) : (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {detailQuery.isError ? (
                  <div className="shrink-0 border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                    {is503(detailQuery.error)
                      ? 'Could not load the full message because the inbox service is unavailable (503).'
                      : `Could not load full message (${apiErr(detailQuery.error)}). Showing the list preview only.`}
                  </div>
                ) : null}
                <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
                  <h4 className="text-xl font-bold tracking-tight text-slate-900">
                    {mergedRow.subject?.trim() || '(No subject)'}
                  </h4>
                  <p className="mt-2 text-sm text-slate-600">
                    {metaFromLine(mergedRow) ? (
                      <span className="font-medium text-slate-800">{metaFromLine(mergedRow)}</span>
                    ) : null}
                    {metaFromLine(mergedRow) ? <span className="text-slate-400"> · </span> : null}
                    <span className="text-slate-500">{formatSentDate(mergedRow.sentAt || '')}</span>
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                    {mergedRow.messageBody?.trim() ? mergedRow.messageBody : '—'}
                  </p>
                  {mergedRow.attachments && mergedRow.attachments.length > 0 ? (
                    <div className="mt-8 border-t border-slate-200/90 pt-6">
                      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <PaperClipIcon className="h-4 w-4 text-slate-400" />
                        Attachments ({mergedRow.attachments.length})
                      </p>
                      <ul className="space-y-2">
                        {mergedRow.attachments.map((att) => {
                          const dk = `${att.attachmentId}:${att.fileName}`;
                          const busy = downloadingKey === dk;
                          const canTry =
                            !!att.downloadUrl || (!!att.attachmentId && !att.attachmentId.startsWith('anon-'));
                          return (
                            <li
                              key={dk}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm"
                            >
                              <span className="min-w-0 truncate font-medium text-slate-800">{att.fileName}</span>
                              <div className="flex shrink-0 items-center gap-2">
                                {att.contentType ? (
                                  <span className="text-xs text-slate-500">{att.contentType}</span>
                                ) : null}
                                {att.sizeBytes != null ? (
                                  <span className="text-xs text-slate-500">{formatBytes(att.sizeBytes)}</span>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={!canTry || busy}
                                  onClick={() => void handleDownload(att)}
                                  className={cn(
                                    'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50',
                                    (!canTry || busy) && 'cursor-not-allowed opacity-60',
                                  )}
                                >
                                  {busy ? 'Downloading…' : 'Download'}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

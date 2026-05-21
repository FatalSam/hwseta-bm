'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  ShareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  composeAdminEmailMessage,
  downloadAdminEmailAttachment,
  forwardAdminEmailMessage,
  getAdminEmailMessage,
  listAdminEmailMessages,
  markAdminEmailMessageRead,
  syncInboundEmailMessages,
} from '@/api/adminEmailMessages';
import { getEmailSettings, type EmailSettingsPayload } from '@/api/communicationSettings';
import { environment } from '@/config/environment';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { useNotifications } from '@/components/ui/notification';
import type {
  AdminEmailAttachmentPayload,
  AdminEmailFolder,
  AdminEmailMessageAttachmentView,
  AdminEmailMessageListResponse,
  AdminEmailMessageRow,
} from '@/types/admin-email-messages';
import { prepareFileForEmailAttachment } from '@/ultis/emailComposeAttachments';
import apiClient from '@/ultis/apiClient';
import { cn } from '@/ultis/cn';

const MAX_ATTACHMENTS = 10;
/** Total size of all attachments after compression (API-friendly cap). */
const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;

type PendingAttachment = { id: string; file: File };

type EmailSendVariables =
  | {
      kind: 'forward';
      messageId: string;
      forwardToEmail: string;
      forwardToName?: string;
      subject: string;
      messageBody: string;
      additionalAttachments: PendingAttachment[];
    }
  | {
      kind: 'compose';
      beneficiaryId: string;
      subject: string;
      messageBody: string;
      parentMessageId: string | null;
      attachments: PendingAttachment[];
    };

function fileToRawBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function apiErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const o = d as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
      if (typeof o.title === 'string') return o.title;
    }
    return e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

function formatSentDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' });
}

function snippet(text: string, max = 100): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

function isPlausibleEmail(value: string): boolean {
  const t = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

/** Parse API date string / ISO for stable numeric sort (invalid → 0). */
function messageSortMs(iso: string | undefined): number {
  if (!iso?.trim()) return 0;
  const t = Date.parse(iso);
  if (Number.isFinite(t)) return t;
  const t2 = new Date(iso).getTime();
  return Number.isFinite(t2) ? t2 : 0;
}

/** Newest first (latest on top). */
function sortNewestFirst(a: AdminEmailMessageRow, b: AdminEmailMessageRow): number {
  return messageSortMs(b.sentAt) - messageSortMs(a.sentAt);
}

/**
 * Inbox: inbound toward the org for this beneficiary. IMAP sync often drops admin replies into the
 * same folder — exclude rows whose From is the configured org mailbox so those only appear under Sent.
 */
function filterInboxRowsForBeneficiary(
  items: AdminEmailMessageRow[],
  beneficiaryId: string,
  settings: EmailSettingsPayload | undefined,
): AdminEmailMessageRow[] {
  return items.filter((row) => {
    if (settings && fromMatchesOrganizationalMailbox(row.fromEmail, settings)) return false;
    const bid = row.beneficiaryId?.trim();
    if (!bid) return true;
    return bid === beneficiaryId;
  });
}

function normalizeAddr(e: string | undefined | null): string {
  return (e ?? '').trim().toLowerCase();
}

/** Exact mailbox addresses from Communication settings that may send mail. */
function buildExactSenderAllowlist(settings: EmailSettingsPayload | undefined): Set<string> {
  const s = new Set<string>();
  if (!settings) return s;
  for (const c of [settings.fromEmail, settings.userName, settings.imapUserName, settings.copyEmail]) {
    const t = normalizeAddr(c);
    if (t.includes('@')) s.add(t);
  }
  return s;
}

/** Domain of the organisational From (any configured mailbox field). */
function senderDomainFromSettings(settings: EmailSettingsPayload | undefined): string | null {
  if (!settings) return null;
  for (const c of [settings.fromEmail, settings.userName, settings.imapUserName, settings.copyEmail]) {
    const from = normalizeAddr(c);
    if (from.includes('@')) return from.slice(from.lastIndexOf('@') + 1);
  }
  return null;
}

/** True when From is the shared org mailbox (Communication settings) — admin / system outbound. */
function fromMatchesOrganizationalMailbox(
  fromEmail: string | undefined,
  settings: EmailSettingsPayload | undefined,
): boolean {
  if (!settings) return false;
  const exact = buildExactSenderAllowlist(settings);
  const domain = senderDomainFromSettings(settings);
  const from = normalizeAddr(fromEmail);
  if (!from) return false;
  if (exact.size > 0 && exact.has(from)) return true;
  if (domain && from.endsWith(`@${domain}`)) return true;
  return false;
}

/**
 * Sent tab: outbound from the org mailbox for this beneficiary — direct mail to the profile
 * address, rows with no To that match beneficiaryId, and forwards/escalations (org → external
 * recipient while still linked to this beneficiary).
 */
function isSentFromConfiguredMailboxToBeneficiary(
  row: AdminEmailMessageRow,
  beneficiaryId: string,
  beneficiaryEmail: string | undefined,
  settings: EmailSettingsPayload | undefined,
): boolean {
  const to = normalizeAddr(row.toEmail);
  const ben = normalizeAddr(beneficiaryEmail);
  const bidOk = row.beneficiaryId?.trim() === beneficiaryId;

  if (!fromMatchesOrganizationalMailbox(row.fromEmail, settings)) return false;

  if (ben) {
    if (to && to === ben) return true;
    if (!to && bidOk) return true;
    if (bidOk && to && to !== ben) return true;
    return false;
  }
  return bidOk;
}

function filterSentForBeneficiaryMailbox(
  items: AdminEmailMessageRow[],
  beneficiaryId: string,
  beneficiaryEmail: string | undefined,
  settings: EmailSettingsPayload | undefined,
): AdminEmailMessageRow[] {
  return items.filter((row) =>
    isSentFromConfiguredMailboxToBeneficiary(row, beneficiaryId, beneficiaryEmail, settings),
  );
}

/** Portal / no-settings: show Sent rows linked to this beneficiary (API already scopes by beneficiaryId). */
function filterSentRowsLooseByBeneficiaryId(
  items: AdminEmailMessageRow[],
  beneficiaryId: string,
): AdminEmailMessageRow[] {
  return items.filter((row) => {
    const bid = row.beneficiaryId?.trim();
    if (!bid) return true;
    return bid === beneficiaryId;
  });
}

function senderLabel(row: AdminEmailMessageRow): string {
  const n = row.fromName?.trim();
  if (n) return n;
  const e = row.fromEmail?.trim();
  if (e) return e;
  return '(Unknown sender)';
}

function metaFromLine(row: AdminEmailMessageRow): string {
  const name = row.fromName?.trim();
  const email = row.fromEmail?.trim();
  if (name && email) return `${name} <${email}>`;
  if (email) return email;
  if (name) return name;
  return '';
}

function messageRowHasAttachments(row: AdminEmailMessageRow): boolean {
  return row.hasAttachments === true || (row.attachments?.length ?? 0) > 0;
}

/** Unread when API says so; missing flags default to read (no inflated unread count). */
function rowIsUnread(row: AdminEmailMessageRow): boolean {
  if (row.isRead === true) return false;
  if (row.isRead === false) return true;
  if (row.readAt?.trim()) return false;
  return false;
}

/** List selection + highlight key; API sometimes omits emailMessageId so we fall back per row. */
function getMessageRowKey(row: AdminEmailMessageRow, index: number): string {
  const id = row.emailMessageId?.trim();
  if (id) return id;
  return `__row:${index}:${row.sentAt}:${row.subject}`;
}

/** Prefer non-empty fields from list when detail returns empty or partial JSON. */
function mergeListAndDetail(
  listRow: AdminEmailMessageRow | undefined,
  detailRow: AdminEmailMessageRow | undefined,
): AdminEmailMessageRow | null {
  if (!listRow && !detailRow) return null;
  if (!detailRow) return listRow ?? null;
  if (!listRow) return detailRow;
  const sameId =
    !listRow.emailMessageId ||
    !detailRow.emailMessageId ||
    listRow.emailMessageId === detailRow.emailMessageId;
  if (!sameId) return detailRow;
  const messageBody =
    (detailRow.messageBody?.trim().length ?? 0) > 0 ? detailRow.messageBody : listRow.messageBody;
  const subject = (detailRow.subject?.trim().length ?? 0) > 0 ? detailRow.subject : listRow.subject;
  const attachments =
    detailRow.attachments && detailRow.attachments.length > 0
      ? detailRow.attachments
      : listRow.attachments;
  const hasAttachments =
    (attachments?.length ?? 0) > 0 ||
    detailRow.hasAttachments === true ||
    listRow.hasAttachments === true;
  const readAt =
    (detailRow.readAt?.trim().length ?? 0) > 0 ? detailRow.readAt : listRow.readAt;
  /** List may be ahead of detail (mark-read on open); don't let stale GET detail show unread. */
  const staleDetailUnread =
    detailRow.isRead === false && !(detailRow.readAt?.trim() ?? '');
  const listSaysRead = listRow.isRead === true || !!listRow.readAt?.trim();
  const isRead =
    staleDetailUnread && listSaysRead
      ? true
      : detailRow.isRead !== undefined
        ? detailRow.isRead
        : readAt?.trim()
          ? true
          : listRow.isRead;
  return {
    ...listRow,
    ...detailRow,
    messageBody,
    subject,
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
    ...(hasAttachments ? { hasAttachments: true } : {}),
    ...(readAt?.trim() ? { readAt } : {}),
    ...(isRead !== undefined ? { isRead } : {}),
    fromName: detailRow.fromName ?? listRow.fromName,
    fromEmail: detailRow.fromEmail ?? listRow.fromEmail,
    toEmail: detailRow.toEmail ?? listRow.toEmail,
    sentAt: detailRow.sentAt?.trim() ? detailRow.sentAt : listRow.sentAt,
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

type Props = {
  beneficiaryId: string;
  beneficiaryLabel: string;
  /** Primary email for this beneficiary — required to filter Sent (From = settings, To = beneficiary). */
  beneficiaryEmail?: string | null;
  /**
   * Beneficiary portal: separate React Query keys, no mail-settings fetch, looser Sent filter, and admin-only
   * actions (sync / new mail) hidden.
   */
  variant?: 'admin' | 'beneficiary';
};

export default function AdminBeneficiaryEmailsPanel({
  beneficiaryId,
  beneficiaryLabel,
  beneficiaryEmail: beneficiaryEmailProp,
  variant = 'admin',
}: Props) {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [folder, setFolder] = useState<AdminEmailFolder>('inbox');
  const [selectedMessageKey, setSelectedMessageKey] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeParentId, setComposeParentId] = useState<string | null>(null);
  const [composeIsForward, setComposeIsForward] = useState(false);
  const [composeForwardTo, setComposeForwardTo] = useState('');
  const [composeForwardToName, setComposeForwardToName] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<PendingAttachment[]>([]);
  const [composeAttachmentBusy, setComposeAttachmentBusy] = useState(false);
  const [composeDropActive, setComposeDropActive] = useState(false);
  const [downloadingAttachmentKey, setDownloadingAttachmentKey] = useState<string | null>(null);
  /** Only the manual "Sync inbox" button shows a spinner — not background sync on load. */
  const [manualSyncUi, setManualSyncUi] = useState(false);
  const composeDragDepth = useRef(0);
  const suppressSyncToastRef = useRef(false);
  /** One automatic sync per `beneficiaryId` (avoids double sync under React StrictMode). */
  const inboxAutoSyncForBeneficiaryRef = useRef<string | null>(null);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const composeAttachmentsRef = useRef(composeAttachments);
  composeAttachmentsRef.current = composeAttachments;
  const forwardSourceMessageIdRef = useRef<string | null>(null);
  const composeFileInputId = useId();

  const beneficiaryEmail = beneficiaryEmailProp?.trim() || undefined;
  const isBeneficiaryPortal = variant === 'beneficiary';
  const listPrefix = isBeneficiaryPortal ? 'beneficiary-email-messages' : 'admin-email-messages';
  const inboxListKey = useMemo(
    () => [listPrefix, 'inbox', beneficiaryId] as const,
    [listPrefix, beneficiaryId],
  );

  const emailSettingsQuery = useQuery({
    queryKey: ['admin', 'communication-settings', 'email'],
    queryFn: getEmailSettings,
    staleTime: 60_000,
    enabled: !isBeneficiaryPortal,
  });

  const inboxQuery = useQuery({
    queryKey: inboxListKey,
    queryFn: () => listAdminEmailMessages('inbox', { beneficiaryId }),
    enabled: !!beneficiaryId,
  });
  const sentQuery = useQuery({
    queryKey: [listPrefix, 'sent', beneficiaryId] as const,
    queryFn: () => listAdminEmailMessages('sent', { beneficiaryId }),
    enabled: !!beneficiaryId,
  });

  const filteredInbox = useMemo(() => {
    const items = inboxQuery.data?.items ?? [];
    return filterInboxRowsForBeneficiary(items, beneficiaryId, emailSettingsQuery.data).sort(sortNewestFirst);
  }, [inboxQuery.data?.items, beneficiaryId, emailSettingsQuery.data]);

  const filteredSent = useMemo(() => {
    const items = sentQuery.data?.items ?? [];
    const list = isBeneficiaryPortal
      ? filterSentRowsLooseByBeneficiaryId(items, beneficiaryId)
      : filterSentForBeneficiaryMailbox(items, beneficiaryId, beneficiaryEmail, emailSettingsQuery.data);
    return list.sort(sortNewestFirst);
  }, [
    isBeneficiaryPortal,
    sentQuery.data?.items,
    beneficiaryId,
    beneficiaryEmail,
    emailSettingsQuery.data,
  ]);

  const filteredItems = folder === 'inbox' ? filteredInbox : filteredSent;
  const activeQuery = folder === 'inbox' ? inboxQuery : sentQuery;

  const applyOptimisticInboxRead = useCallback(
    (emailMessageId: string) => {
      const readAt = new Date().toISOString();
      queryClient.setQueryData<AdminEmailMessageListResponse | undefined>(inboxListKey, (old) => {
        if (!old?.items) return old;
        const items = old.items.map((r) =>
          r.emailMessageId === emailMessageId ? { ...r, isRead: true as const, readAt } : r,
        );
        const unreadCount = items.filter((r) => rowIsUnread(r)).length;
        return { ...old, items, unreadCount };
      });
      queryClient.setQueryData<AdminEmailMessageRow | undefined>(
        ['admin-email-message', emailMessageId],
        (old) => (old ? { ...old, isRead: true, readAt } : old),
      );
    },
    [inboxListKey, queryClient],
  );

  const selectMessageRow = useCallback(
    (row: AdminEmailMessageRow, rowKey: string) => {
      setSelectedMessageKey(rowKey);
      if (folder !== 'inbox') return;
      if (!rowIsUnread(row)) return;
      const id = row.emailMessageId?.trim();
      if (!id) return;
      applyOptimisticInboxRead(id);
      void markAdminEmailMessageRead(id).catch(() => {
        void queryClient.invalidateQueries({ queryKey: inboxListKey });
        void queryClient.invalidateQueries({ queryKey: ['admin-email-message', id] });
      });
    },
    [applyOptimisticInboxRead, folder, inboxListKey, queryClient],
  );

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedMessageKey(null);
      return;
    }
    setSelectedMessageKey((prev) => {
      if (prev && filteredItems.some((r, i) => getMessageRowKey(r, i) === prev)) return prev;
      return getMessageRowKey(filteredItems[0], 0);
    });
  }, [folder, filteredItems]);

  const selectedRow = useMemo(() => {
    if (!selectedMessageKey) return undefined;
    const byKey = filteredItems.findIndex((r, i) => getMessageRowKey(r, i) === selectedMessageKey);
    if (byKey >= 0) return filteredItems[byKey];
    return filteredItems.find((r) => r.emailMessageId === selectedMessageKey);
  }, [filteredItems, selectedMessageKey]);

  const detailMessageId = selectedRow?.emailMessageId?.trim();
  const detailQuery = useQuery({
    queryKey: ['admin-email-message', detailMessageId],
    queryFn: () => getAdminEmailMessage(detailMessageId!),
    enabled: !!detailMessageId && detailMessageId.length > 0,
    retry: 1,
  });

  const mergedRow = useMemo(
    () => mergeListAndDetail(selectedRow, detailQuery.data),
    [selectedRow, detailQuery.data],
  );

  /** Merge list rows with GET detail for selected message (attachments, read state). */
  const messageListRows = useMemo(() => {
    const detail = detailQuery.data;
    if (!detail || !selectedMessageKey) return filteredItems;
    return filteredItems.map((r, i) => {
      if (getMessageRowKey(r, i) !== selectedMessageKey) return r;
      const detailHas =
        (detail.attachments?.length ?? 0) > 0 || detail.hasAttachments === true;
      const attachPatch =
        detailHas && !messageRowHasAttachments(r) ? ({ hasAttachments: true as const } as const) : null;
      const readPatch =
        detail.isRead !== undefined || !!detail.readAt?.trim()
          ? {
              ...(detail.isRead !== undefined ? { isRead: detail.isRead } : {}),
              ...(detail.readAt?.trim() ? { readAt: detail.readAt } : {}),
            }
          : null;
      if (!attachPatch && !readPatch) return r;
      if (
        readPatch &&
        r.isRead === true &&
        readPatch.isRead === false &&
        !readPatch.readAt?.trim()
      ) {
        return { ...r, ...attachPatch };
      }
      return { ...r, ...attachPatch, ...readPatch };
    });
  }, [filteredItems, selectedMessageKey, detailQuery.data]);

  const closeCompose = () => {
    setComposeOpen(false);
    setComposeIsForward(false);
    setComposeForwardTo('');
    setComposeForwardToName('');
    forwardSourceMessageIdRef.current = null;
  };

  const openReplyCompose = () => {
    const parentId = selectedRow?.emailMessageId?.trim();
    if (!parentId) {
      addNotification({
        type: 'warning',
        title: 'Reply unavailable',
        message: isBeneficiaryPortal
          ? 'This message is missing an ID on the server.'
          : 'This message is missing an ID on the server. Try syncing the inbox again.',
      });
      return;
    }
    setComposeIsForward(false);
    setComposeForwardTo('');
    setComposeForwardToName('');
    forwardSourceMessageIdRef.current = null;
    setComposeParentId(parentId);
    const subj = mergedRow?.subject?.trim() || detailQuery.data?.subject?.trim() || '';
    setComposeSubject(subj ? `Re: ${subj.replace(/^Re:\s*/i, '').trim()}` : 'Re:');
    setComposeBody('');
    setComposeAttachments([]);
    setComposeOpen(true);
  };

  const openForwardCompose = () => {
    const srcId = selectedRow?.emailMessageId?.trim();
    if (!srcId || !mergedRow) {
      addNotification({
        type: 'warning',
        title: 'Forward unavailable',
        message: isBeneficiaryPortal
          ? 'This message is missing content or an ID.'
          : 'This message is missing content or an ID. Try syncing the inbox again.',
      });
      return;
    }
    setComposeIsForward(true);
    setComposeForwardTo('');
    setComposeForwardToName('');
    forwardSourceMessageIdRef.current = srcId;
    setComposeParentId(null);
    const subj = mergedRow.subject?.trim() || '(No subject)';
    const trimmedSubj = subj.trim();
    const baseSubj =
      trimmedSubj.replace(/^(fwd:\s*)+/i, '').replace(/^(re:\s*)+/i, '').trim() || trimmedSubj;
    setComposeSubject(/^fwd:/i.test(trimmedSubj) ? trimmedSubj : `Fwd: ${baseSubj}`);
    const fromLine =
      metaFromLine(mergedRow).trim() ||
      mergedRow.fromEmail?.trim() ||
      mergedRow.fromName?.trim() ||
      '—';
    const dateLine = formatSentDate(mergedRow.sentAt || '');
    const origBody = mergedRow.messageBody?.trim() || '—';
    setComposeBody(
      `\n\n--- Forwarded message ---\nFrom: ${fromLine}\nDate: ${dateLine}\nSubject: ${subj}\n\n${origBody}`,
    );
    setComposeAttachments([]);
    setComposeOpen(true);
  };

  const syncMutation = useMutation({
    mutationFn: syncInboundEmailMessages,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-email-messages'] });
      void queryClient.invalidateQueries({ queryKey: ['beneficiary-email-messages'] });
      const silent = suppressSyncToastRef.current;
      suppressSyncToastRef.current = false;
      if (!silent) {
        addNotification({
          type: 'success',
          title: 'Inbox sync',
          message: 'Inbound messages were refreshed.',
        });
      }
    },
    onError: (e: unknown) => {
      suppressSyncToastRef.current = false;
      addNotification({ type: 'error', title: 'Sync failed', message: apiErr(e) });
    },
    onSettled: () => {
      setManualSyncUi(false);
    },
  });

  useEffect(() => {
    if (isBeneficiaryPortal) return;
    if (!beneficiaryId?.trim()) return;
    if (inboxAutoSyncForBeneficiaryRef.current === beneficiaryId) return;
    inboxAutoSyncForBeneficiaryRef.current = beneficiaryId;
    suppressSyncToastRef.current = true;
    syncMutation.mutate();
  }, [beneficiaryId, isBeneficiaryPortal]);

  const composeMutation = useMutation({
    mutationFn: async (vars: EmailSendVariables): Promise<unknown> => {
      if (vars.kind === 'forward') {
        let extra: AdminEmailAttachmentPayload[] | undefined;
        if (vars.additionalAttachments.length > 0) {
          extra = await Promise.all(
            vars.additionalAttachments.map(async (pa) => ({
              originalFileName: pa.file.name,
              contentType: pa.file.type || 'application/octet-stream',
              base64: await fileToRawBase64(pa.file),
            })),
          );
        }
        return forwardAdminEmailMessage({
          messageId: vars.messageId,
          forwardToEmail: vars.forwardToEmail,
          forwardToName: vars.forwardToName,
          subject: vars.subject,
          messageBody: vars.messageBody,
          includeAttachments: true,
          ...(extra && extra.length > 0 ? { attachments: extra } : {}),
        });
      }
      let attachments: AdminEmailAttachmentPayload[] | undefined;
      if (vars.attachments.length > 0) {
        attachments = await Promise.all(
          vars.attachments.map(async (pa) => ({
            originalFileName: pa.file.name,
            contentType: pa.file.type || 'application/octet-stream',
            base64: await fileToRawBase64(pa.file),
          })),
        );
      }
      return composeAdminEmailMessage({
        beneficiaryId: vars.beneficiaryId,
        subject: vars.subject,
        messageBody: vars.messageBody,
        parentMessageId: vars.parentMessageId,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      });
    },
    onSuccess: (data: unknown, variables: EmailSendVariables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-email-messages'] });
      void queryClient.invalidateQueries({ queryKey: ['beneficiary-email-messages'] });
      setComposeOpen(false);
      setComposeIsForward(false);
      setComposeForwardTo('');
      setComposeForwardToName('');
      forwardSourceMessageIdRef.current = null;
      setComposeSubject('');
      setComposeBody('');
      setComposeParentId(null);
      setComposeAttachments([]);
      const msg =
        data &&
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as { message: unknown }).message === 'string'
          ? (data as { message: string }).message
          : variables.kind === 'forward'
            ? 'The message was forwarded successfully.'
            : 'Email was sent successfully.';
      addNotification({
        type: 'success',
        title: variables.kind === 'forward' ? 'Forward sent' : 'Email sent',
        message: msg,
      });
    },
    onError: (e: unknown, variables: EmailSendVariables) =>
      addNotification({
        type: 'error',
        title: variables.kind === 'forward' ? 'Forward failed' : 'Could not send email',
        message: apiErr(e),
      }),
  });

  const openNewCompose = () => {
    setComposeIsForward(false);
    setComposeForwardTo('');
    setComposeForwardToName('');
    forwardSourceMessageIdRef.current = null;
    setComposeParentId(null);
    setComposeSubject('');
    setComposeBody('');
    setComposeAttachments([]);
    setComposeOpen(true);
  };

  const totalPendingBytes = useMemo(
    () => composeAttachments.reduce((sum, a) => sum + a.file.size, 0),
    [composeAttachments],
  );

  const processComposeFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList);
    setComposeAttachmentBusy(true);
    try {
      const preparedBatch: PendingAttachment[] = [];
      for (const raw of incoming) {
        let prepared: File;
        try {
          prepared = await prepareFileForEmailAttachment(raw);
        } catch {
          addNotification({
            type: 'warning',
            title: 'Could not process file',
            message: `“${raw.name}” could not be compressed. Skipped.`,
          });
          continue;
        }
        preparedBatch.push({
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${prepared.name}`,
          file: prepared,
        });
      }

      const next: PendingAttachment[] = [...composeAttachmentsRef.current];
      let total = next.reduce((s, a) => s + a.file.size, 0);
      for (const item of preparedBatch) {
        if (next.length >= MAX_ATTACHMENTS) {
          addNotification({
            type: 'warning',
            title: 'Too many attachments',
            message: `You can add at most ${MAX_ATTACHMENTS} files.`,
          });
          break;
        }
        if (item.file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
          addNotification({
            type: 'warning',
            title: 'File too large',
            message: `“${item.file.name}” is still over ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} after compression.`,
          });
          continue;
        }
        if (total + item.file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
          addNotification({
            type: 'warning',
            title: 'Total size limit',
            message: `Attachments cannot exceed ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} in total.`,
          });
          break;
        }
        total += item.file.size;
        next.push(item);
      }
      setComposeAttachments(next);
    } finally {
      setComposeAttachmentBusy(false);
      if (composeFileInputRef.current) composeFileInputRef.current.value = '';
    }
  };

  const onComposeDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    composeDragDepth.current += 1;
    setComposeDropActive(true);
  };

  const onComposeDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    composeDragDepth.current -= 1;
    if (composeDragDepth.current <= 0) {
      composeDragDepth.current = 0;
      setComposeDropActive(false);
    }
  };

  const onComposeDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onComposeDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    composeDragDepth.current = 0;
    setComposeDropActive(false);
    void processComposeFiles(e.dataTransfer.files);
  };

  const removeComposeAttachment = (id: string) => {
    setComposeAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canSend =
    composeSubject.trim().length > 0 &&
    composeBody.trim().length > 0 &&
    (!composeIsForward ||
      (isPlausibleEmail(composeForwardTo.trim()) &&
        !!forwardSourceMessageIdRef.current?.trim())) &&
    !composeMutation.isPending &&
    !composeAttachmentBusy;

  const sendComposeOrForward = () => {
    if (composeIsForward) {
      const messageId = forwardSourceMessageIdRef.current?.trim();
      const forwardToEmail = composeForwardTo.trim();
      if (!messageId || !isPlausibleEmail(forwardToEmail)) return;
      const forwardToName = composeForwardToName.trim();
      composeMutation.mutate({
        kind: 'forward',
        messageId,
        forwardToEmail,
        ...(forwardToName ? { forwardToName } : {}),
        subject: composeSubject.trim(),
        messageBody: composeBody.trim(),
        additionalAttachments: composeAttachments,
      });
      return;
    }
    composeMutation.mutate({
      kind: 'compose',
      beneficiaryId,
      subject: composeSubject.trim(),
      messageBody: composeBody.trim(),
      parentMessageId: composeParentId,
      attachments: composeAttachments,
    });
  };

  const count = filteredItems.length;
  const inboxCount = filteredInbox.length;
  /** Client-side: org-mailbox filter can drop rows the API still returns, so derive from filtered list. */
  const inboxUnreadCount = useMemo(
    () => filteredInbox.filter((r) => rowIsUnread(r)).length,
    [filteredInbox],
  );
  const sentCount = filteredSent.length;
  const readingPaneMeta = mergedRow ? metaFromLine(mergedRow) : '';

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

  const handleDownloadAttachment = async (att: AdminEmailMessageAttachmentView) => {
    const msgId = detailMessageId ?? selectedRow?.emailMessageId?.trim();
    if (!msgId) return;
    const key = `${att.attachmentId}:${att.fileName}`;
    setDownloadingAttachmentKey(key);
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
        const blob = await downloadAdminEmailAttachment(msgId, att.attachmentId);
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
      setDownloadingAttachmentKey(null);
    }
  };

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Email messages</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {activeQuery.isLoading && count === 0
              ? 'Loading…'
              : folder === 'inbox'
                ? isBeneficiaryPortal
                  ? `${count} in Inbox · ${inboxUnreadCount} unread`
                  : `${count} in Inbox · ${inboxUnreadCount} unread for this beneficiary`
                : isBeneficiaryPortal
                  ? `${count} in Sent`
                  : `${count} in Sent for this beneficiary`}
          </p>
        </div>
        {!isBeneficiaryPortal ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setManualSyncUi(true);
                syncMutation.mutate();
              }}
              disabled={syncMutation.isPending && manualSyncUi}
              className={adminFormTheme.btnSecondary}
            >
              <ArrowPathIcon
                className={cn('h-4 w-4', syncMutation.isPending && manualSyncUi && 'animate-spin')}
              />
              Sync inbox
            </button>
            <button type="button" onClick={openNewCompose} className={adminFormTheme.btnPrimary}>
              <EnvelopeIcon className="h-4 w-4" />
              New email
            </button>
          </div>
        ) : null}
      </div>

      {activeQuery.isError ? (
        <div className="p-4 sm:p-5">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {apiErr(activeQuery.error)}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[min(72vh,560px)] max-h-[min(88vh,720px)] min-w-0 flex-col overflow-hidden bg-slate-100/60 lg:h-[min(72vh,640px)] lg:max-h-[min(85vh,720px)] lg:flex-row lg:items-stretch">
          {/* Folder rail */}
          <aside className="flex shrink-0 flex-row border-slate-200 bg-slate-100/90 lg:h-full lg:w-52 lg:flex-col lg:overflow-y-auto lg:border-r">
            <nav className="flex w-full flex-1 gap-0 p-2 lg:flex-col lg:p-3" aria-label="Mail folders">
              <button
                type="button"
                onClick={() => setFolder('inbox')}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition lg:px-3',
                  folder === 'inbox'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                    : 'text-slate-700 hover:bg-white/80',
                )}
              >
                <span>Inbox</span>
                <span
                  className={cn(
                    'flex flex-col items-end gap-0 text-xs font-semibold leading-tight',
                    folder === 'inbox' ? 'text-hwseta-green' : 'text-sky-600',
                  )}
                >
                  <span className="tabular-nums">
                    {inboxQuery.isLoading && inboxCount === 0 ? '—' : inboxCount}
                  </span>
                  {!inboxQuery.isLoading ? (
                    <span
                      className={cn(
                        'max-w-[7rem] truncate text-[10px] font-semibold normal-case',
                        inboxUnreadCount > 0 ? 'text-rose-600' : 'text-slate-500',
                      )}
                    >
                      {inboxUnreadCount} unread
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFolder('sent')}
                className={cn(
                  'mt-0 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition lg:mt-1',
                  folder === 'sent'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                    : 'text-slate-700 hover:bg-white/80',
                )}
              >
                <span>Sent</span>
                <span
                  className={cn(
                    'tabular-nums text-xs font-semibold',
                    folder === 'sent' ? 'text-hwseta-green' : 'text-sky-600',
                  )}
                >
                  {sentQuery.isLoading && sentCount === 0 ? '—' : sentCount}
                </span>
              </button>
            </nav>
          </aside>

          {/* Message list — scrolls independently (Outlook-style); header stays fixed */}
          <div className="flex max-h-[min(52vh,440px)] min-h-0 w-full min-w-0 flex-col overflow-hidden border-slate-200 bg-white lg:h-full lg:max-h-none lg:w-[min(100%,420px)] lg:shrink-0 lg:basis-[min(100%,420px)] lg:border-r">
            {activeQuery.isLoading && filteredItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-16">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#017f3f]/20 border-t-[#017f3f]" />
                <p className="mt-4 text-sm text-slate-600">Loading messages…</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-1 flex-col justify-center px-4 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {folder === 'sent'
                    ? isBeneficiaryPortal
                      ? 'No sent messages linked to your profile yet'
                      : 'No messages sent from your configured mailbox to this beneficiary'
                    : isBeneficiaryPortal
                      ? 'No messages in your inbox yet'
                      : 'No inbox messages for this beneficiary'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {folder === 'sent'
                    ? isBeneficiaryPortal
                      ? beneficiaryEmail
                        ? 'Sent shows mail linked to you, including replies and escalations.'
                        : 'Add your email on your profile so we can match outgoing mail to you.'
                      : beneficiaryEmail
                        ? 'Sent lists mail from your settings (From) to this profile email (To), and forwards/escalations linked to this beneficiary.'
                        : 'Add this beneficiary’s email on the profile so Sent can match recipients.'
                    : isBeneficiaryPortal
                      ? 'Try the Sent folder, or check back later for new mail.'
                      : 'Try another folder or sync the inbox.'}
                </p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-5">
                  <h3 className="text-base font-bold text-slate-900">
                    {folder === 'inbox' ? 'Inbox' : 'Sent Items'}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {count} {count === 1 ? 'message' : 'messages'}
                  </p>
                </div>
                <ul
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
                  aria-label="Message list"
                >
                  {messageListRows.map((row, index) => {
                    const rowKey = getMessageRowKey(row, index);
                    const isSel = selectedMessageKey === rowKey;
                    const inboxUnread = folder === 'inbox' && rowIsUnread(row);
                    return (
                      <li key={rowKey}>
                        <button
                          type="button"
                          onClick={() => selectMessageRow(row, rowKey)}
                          className={cn(
                            'flex w-full gap-2 border-b border-slate-100 px-4 py-3.5 text-left transition sm:px-5',
                            isSel
                              ? 'border-l-4 border-l-hwseta-green bg-emerald-50/30'
                              : 'border-l-4 border-l-transparent hover:bg-slate-50/80',
                          )}
                        >
                          {folder === 'inbox' ? (
                            <span
                              className="mt-1.5 flex w-4 shrink-0 justify-center self-start"
                              aria-hidden
                            >
                              {inboxUnread ? (
                                <span className="mt-0.5 block h-2 w-2 rounded-full bg-slate-900" />
                              ) : null}
                            </span>
                          ) : null}
                          {messageRowHasAttachments(row) ? (
                            <span
                              className={cn(
                                'mt-0.5 shrink-0',
                                folder === 'inbox' && !inboxUnread ? 'text-slate-400' : 'text-slate-500',
                              )}
                              aria-label="Has attachment"
                            >
                              <PaperClipIcon className="h-4 w-4" aria-hidden />
                            </span>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'truncate',
                                folder === 'inbox'
                                  ? inboxUnread
                                    ? 'font-semibold text-slate-900'
                                    : 'font-normal text-slate-500'
                                  : 'font-semibold text-slate-900',
                              )}
                            >
                              {senderLabel(row)}
                            </p>
                            <p
                              className={cn(
                                'mt-0.5 text-xs',
                                folder === 'inbox'
                                  ? inboxUnread
                                    ? 'text-slate-500'
                                    : 'text-slate-400'
                                  : 'text-slate-500',
                              )}
                            >
                              {formatSentDate(row.sentAt)}
                            </p>
                            <p
                              className={cn(
                                'mt-1.5 truncate text-sm',
                                folder === 'inbox'
                                  ? inboxUnread
                                    ? 'font-semibold text-slate-900'
                                    : 'font-normal text-slate-500'
                                  : 'font-semibold text-slate-800',
                              )}
                            >
                              {row.subject.trim() || '(No subject)'}
                            </p>
                            <p
                              className={cn(
                                'mt-1 line-clamp-2 text-sm',
                                folder === 'inbox'
                                  ? inboxUnread
                                    ? 'text-slate-600'
                                    : 'text-slate-500'
                                  : 'text-slate-600',
                              )}
                            >
                              {snippet(row.messageBody)}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Reading pane */}
          <div className="flex min-h-[280px] min-w-0 flex-1 flex-col overflow-hidden bg-white lg:min-h-0 lg:h-full">
            {!selectedMessageKey ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
                Select a message to view details
              </div>
            ) : !mergedRow ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#017f3f]/20 border-t-[#017f3f]" />
                <p className="text-sm text-slate-600">Loading message…</p>
              </div>
            ) : (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {detailQuery.isFetching ? (
                  <div
                    className="shrink-0 border-b border-slate-200/80 bg-slate-100/90 px-4 py-1.5 text-xs text-slate-600"
                    role="status"
                  >
                    Updating message…
                  </div>
                ) : null}
                {detailQuery.isError ? (
                  <div className="shrink-0 border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                    Could not load full message ({apiErr(detailQuery.error)}). Showing the preview from the list.
                  </div>
                ) : null}
                {/* Toolbar row separate from subject so long subjects wrap cleanly */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
                  <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={openForwardCompose}
                          disabled={!selectedRow?.emailMessageId?.trim() || !mergedRow}
                          className={cn(
                            adminFormTheme.btnSecondary,
                            'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold shadow-sm',
                          )}
                          title="Forward or escalate to another email address"
                        >
                          <ShareIcon className="h-4 w-4 opacity-90" aria-hidden />
                          Forward
                        </button>
                        <button
                          type="button"
                          onClick={openReplyCompose}
                          disabled={!selectedRow?.emailMessageId?.trim()}
                          className={cn(
                            adminFormTheme.btnSecondary,
                            'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold shadow-sm',
                          )}
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4 opacity-90" aria-hidden />
                          Reply
                        </button>
                      </div>
                      <div className="min-w-0">
                        <h4 className="break-words text-xl font-bold tracking-tight text-slate-900">
                          {mergedRow.subject?.trim() || '(No subject)'}
                        </h4>
                        <p className="mt-2 text-sm text-slate-600">
                          {readingPaneMeta ? (
                            <span className="font-medium text-slate-800">{readingPaneMeta}</span>
                          ) : null}
                          {readingPaneMeta ? <span className="text-slate-400"> · </span> : null}
                          <span className="text-slate-500">{formatSentDate(mergedRow.sentAt || '')}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6">
                    <div className="min-h-0">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                        {mergedRow.messageBody?.trim() ? mergedRow.messageBody : '—'}
                      </p>
                    </div>
                    {mergedRow.attachments && mergedRow.attachments.length > 0 ? (
                      <div className="mt-8 border-t border-slate-200/90 pt-6">
                        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <PaperClipIcon className="h-4 w-4 text-slate-400" aria-hidden />
                          Attachments ({mergedRow.attachments.length})
                        </p>
                        <ul className="space-y-2">
                          {mergedRow.attachments.map((att) => {
                            const dk = `${att.attachmentId}:${att.fileName}`;
                            const busy = downloadingAttachmentKey === dk;
                            const canTry =
                              !!att.downloadUrl || (!!att.attachmentId && !att.attachmentId.startsWith('anon-'));
                            return (
                              <li
                                key={dk}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
                              >
                                <span className="min-w-0 truncate font-medium text-slate-800" title={att.fileName}>
                                  {att.fileName}
                                </span>
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
                                    onClick={() => void handleDownloadAttachment(att)}
                                    className={cn(
                                      adminFormTheme.btnSecondary,
                                      'px-3 py-1.5 text-xs',
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
              </div>
            )}
          </div>
        </div>
      )}

      <Transition.Root show={composeOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[70]" onClose={closeCompose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
          </Transition.Child>
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.28)]">
                <div className="relative bg-hwseta-green px-5 pb-5 pt-5 text-white sm:px-6">
                  <button
                    type="button"
                    onClick={closeCompose}
                    className="absolute right-4 top-4 rounded-lg p-1.5 text-white/90 transition hover:bg-white/10"
                    aria-label="Close"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <div className="flex items-start gap-3 pr-10">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                      <EnvelopeIcon className="h-6 w-6" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/90">Email</p>
                      <p className="mt-0.5 truncate text-sm font-medium text-white/95">{beneficiaryLabel}</p>
                      <Dialog.Title className="mt-2 text-2xl font-bold tracking-tight">
                        {composeIsForward ? 'Forward / escalate' : composeParentId ? 'Reply' : 'Compose'}
                      </Dialog.Title>
                    </div>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 sm:px-6">
                  {composeIsForward ? (
                    <>
                      <label className="block">
                        <span className={adminFormTheme.label}>To email (required)</span>
                        <input
                          type="email"
                          autoComplete="email"
                          className={adminFormTheme.input}
                          value={composeForwardTo}
                          onChange={(e) => setComposeForwardTo(e.target.value)}
                          placeholder="colleague@organisation.org.za"
                        />
                      </label>
                      <label className="block">
                        <span className={adminFormTheme.label}>Recipient name (optional)</span>
                        <input
                          type="text"
                          autoComplete="name"
                          className={adminFormTheme.input}
                          value={composeForwardToName}
                          onChange={(e) => setComposeForwardToName(e.target.value)}
                          placeholder="e.g. Case owner"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Shown on the To line. Mail is sent from your organisation SMTP;
                          {isBeneficiaryPortal ? (
                            <> this message stays linked to your profile.</>
                          ) : (
                            <>
                              {' '}
                              beneficiary context: <span className="font-medium text-slate-700">{beneficiaryLabel}</span>.
                            </>
                          )}
                        </p>
                      </label>
                    </>
                  ) : null}
                  <label className="block">
                    <span className={adminFormTheme.label}>Subject</span>
                    <input
                      type="text"
                      className={adminFormTheme.input}
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Subject line"
                    />
                  </label>
                  <label className="block">
                    <span className={adminFormTheme.label}>
                      {composeIsForward ? 'Message (edit the quoted text if needed)' : 'Message'}
                    </span>
                    <textarea
                      className={cn(adminFormTheme.textarea, 'min-h-[160px]')}
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Type your message…"
                    />
                  </label>

                  {composeIsForward ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                      Files already stored on the original message are included on the forward when available.
                      Add any extra files below (same limits as new mail).
                    </p>
                  ) : null}
                  <div>
                    <span className={adminFormTheme.label}>Attachments (optional)</span>
                    <p className="mb-2 text-xs text-slate-500">
                      {composeIsForward
                        ? 'Added files are sent in addition to forwarded message attachments. '
                        : ''}
                      Drag and drop files here or browse. Images are compressed to JPEG (max edge 2048px). Up
                      to {MAX_ATTACHMENTS} files, {formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} total after
                      compression. Other file types are unchanged.
                    </p>
                    <input
                      id={composeFileInputId}
                      ref={composeFileInputRef}
                      type="file"
                      className="sr-only"
                      multiple
                      disabled={composeAttachmentBusy || composeAttachments.length >= MAX_ATTACHMENTS}
                      onChange={(e) => void processComposeFiles(e.target.files)}
                    />
                    <label
                      htmlFor={composeFileInputId}
                      onDragEnter={onComposeDragEnter}
                      onDragLeave={onComposeDragLeave}
                      onDragOver={onComposeDragOver}
                      onDrop={onComposeDrop}
                      className={cn(
                        'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition',
                        composeDropActive
                          ? 'border-hwseta-green bg-emerald-50/60'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300',
                        (composeAttachmentBusy || composeAttachments.length >= MAX_ATTACHMENTS) &&
                          'pointer-events-none cursor-not-allowed opacity-60',
                      )}
                    >
                      {composeAttachmentBusy ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#017f3f]/20 border-t-[#017f3f]" />
                          <span className="text-sm font-medium text-slate-700">Compressing…</span>
                        </div>
                      ) : (
                        <>
                          <PaperClipIcon className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            Drop files here or click to browse
                          </p>
                          <span className="mt-1 text-xs text-slate-500">
                            {composeAttachments.length >= MAX_ATTACHMENTS
                              ? 'Maximum number of files reached.'
                              : 'Click anywhere in this area to choose files.'}
                          </span>
                        </>
                      )}
                    </label>
                    {composeAttachments.length > 0 ? (
                      <ul className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                        {composeAttachments.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between gap-2 text-sm text-slate-800"
                          >
                            <span className="min-w-0 truncate" title={a.file.name}>
                              {a.file.name}
                            </span>
                            <span className="shrink-0 text-xs text-slate-500">
                              {formatBytes(a.file.size)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeComposeAttachment(a.id)}
                              disabled={composeAttachmentBusy}
                              className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-50"
                              aria-label={`Remove ${a.file.name}`}
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {composeAttachments.length > 0 ? (
                      <p className="mt-1.5 text-xs text-slate-500">
                        Total: {formatBytes(totalPendingBytes)} / {formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    disabled={!canSend}
                    onClick={sendComposeOrForward}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700/90 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" aria-hidden />
                    {composeMutation.isPending
                      ? 'Sending…'
                      : composeIsForward
                        ? 'Send forward'
                        : 'Send email'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}

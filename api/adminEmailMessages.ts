import apiClient from '@/ultis/apiClient';
import type {
  AdminEmailFolder,
  AdminEmailMessageAttachmentView,
  AdminEmailMessageListResponse,
  AdminEmailMessageRow,
  AdminEmailComposePayload,
  AdminEmailForwardPayload,
} from '@/types/admin-email-messages';

const BASE = '/api/Admin/email-messages';
/** Some deployments expose attachment binaries on a sibling controller. */
const ATTACHMENTS_BASE = '/api/Admin/email-message-attachments';

function asObject(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = (o as Record<string, unknown>)[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

/** Explicit boolean from API (undefined if no key matched). */
function pickBool(o: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = o[k];
    if (v === true) return true;
    if (v === false) return false;
    if (typeof v === 'number' && Number.isFinite(v)) {
      if (v === 1) return true;
      if (v === 0) return false;
    }
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true' || s === '1') return true;
      if (s === 'false' || s === '0') return false;
    }
  }
  return undefined;
}

function stripHtmlLoose(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickMessageBody(o: Record<string, unknown>): string {
  const plain = pickStr(o, 'messageBody', 'MessageBody', 'body', 'Body', 'message', 'Message', 'text', 'Text', 'plainText');
  if (plain) return plain;
  const html = String(o.htmlBody ?? o.HtmlBody ?? o.messageHtml ?? o.MessageHtml ?? '').trim();
  if (html) return stripHtmlLoose(html);
  return '';
}

/**
 * Single field for list sorting (newest first). Prefer server/sync time over RFC Date header —
 * replies in a thread often repeat an older Sent date while received/created reflects the latest message.
 */
function pickDateTime(o: Record<string, unknown>): string {
  const internal = o.internalDate ?? o.InternalDate;
  if (typeof internal === 'number' && Number.isFinite(internal)) {
    const ms = internal < 1e12 ? internal * 1000 : internal;
    return new Date(ms).toISOString();
  }
  const str = pickStr(
    o,
    'internalDate',
    'InternalDate',
    'receivedAt',
    'ReceivedAt',
    'receivedDate',
    'ReceivedDate',
    'createdAt',
    'CreatedAt',
    'modifiedAt',
    'ModifiedAt',
    'dateUtc',
    'DateUtc',
    'utc',
    'Utc',
    'sentAt',
    'SentAt',
    'dateSent',
    'DateSent',
  );
  if (str) return str;
  const ts = o.timestamp ?? o.Timestamp;
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    const ms = ts < 1e12 ? ts * 1000 : ts;
    return new Date(ms).toISOString();
  }
  return '';
}

function normalizeAttachment(raw: unknown): AdminEmailMessageAttachmentView | null {
  const o = asObject(raw) ?? {};
  /** Matches GET detail `attachments[]` from HW_EmailMessageAttachments / IMAP decode (PascalCase + camelCase). */
  const id =
    o.emailMessageAttachmentId ??
    o.EmailMessageAttachmentId ??
    o.attachmentId ??
    o.AttachmentId ??
    o.emailAttachmentId ??
    o.EmailAttachmentId ??
    o.partId ??
    o.PartId ??
    o.inlinePartId ??
    o.InlinePartId ??
    o.storageId ??
    o.StorageId ??
    o.id ??
    o.Id;
  const fileName = pickStr(
    o,
    'fileName',
    'FileName',
    'originalFileName',
    'OriginalFileName',
    'name',
    'Name',
    'contentName',
    'ContentName',
  );
  const attId = id != null ? String(id).trim() : '';
  if (!attId && !fileName) return null;
  const downloadUrl = pickStr(
    o,
    'downloadUrl',
    'DownloadUrl',
    'fileUrl',
    'FileUrl',
    'url',
    'Url',
    'href',
    'path',
    'downloadLink',
    'DownloadLink',
    'link',
    'Link',
  );
  const size = toNumber(
    o.sizeBytes ??
      o.SizeBytes ??
      o.fileSize ??
      o.FileSize ??
      o.fileSizeBytes ??
      o.FileSizeBytes ??
      o.length ??
      o.Length,
    NaN,
  );
  return {
    attachmentId: attId || `anon-${fileName}`,
    fileName: fileName || 'attachment',
    contentType: pickStr(o, 'contentType', 'ContentType') || undefined,
    sizeBytes: Number.isFinite(size) && size > 0 ? size : undefined,
    downloadUrl: downloadUrl || undefined,
  };
}

function normalizeAttachments(raw: unknown): AdminEmailMessageAttachmentView[] {
  const rawList = asArray(raw);
  const out: AdminEmailMessageAttachmentView[] = [];
  for (const item of rawList) {
    const a = normalizeAttachment(item);
    if (a) out.push(a);
  }
  return out;
}

/**
 * Message list + GET detail: primary shape is `attachments[]` (IMAP-imported rows in HW_EmailMessageAttachments).
 * Also merges legacy/alternate array property names.
 */
function collectAttachmentArrays(o: Record<string, unknown>): unknown[] {
  const keys = [
    'attachments',
    'Attachments',
    'emailAttachments',
    'EmailAttachments',
    'files',
    'Files',
    'inlineAttachments',
    'InlineAttachments',
    'attachmentList',
    'AttachmentList',
    'inboundAttachments',
    'InboundAttachments',
    'mimeParts',
    'MimeParts',
  ];
  const merged: unknown[] = [];
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) merged.push(...v);
  }
  return merged;
}

function normalizeEmailMessageRow(raw: unknown): AdminEmailMessageRow {
  const o = asObject(raw) ?? {};
  const id =
    o.emailMessageId ??
    o.EmailMessageId ??
    o.messageId ??
    o.MessageId ??
    o.mailMessageId ??
    o.MailMessageId ??
    o.emailId ??
    o.EmailId ??
    o.internetMessageId ??
    o.InternetMessageId ??
    o.id ??
    o.Id;
  const bid =
    o.beneficiaryId ??
    o.BeneficiaryId ??
    o.toBeneficiaryId ??
    o.ToBeneficiaryId ??
    o.recipientBeneficiaryId ??
    o.RecipientBeneficiaryId ??
    o.forBeneficiaryId ??
    o.ForBeneficiaryId;
  const fromName = pickStr(
    o,
    'fromName',
    'FromName',
    'senderDisplayName',
    'SenderDisplayName',
    'senderName',
    'SenderName',
    'sentByName',
    'SentByName',
    'displayName',
    'DisplayName',
  );
  const fromEmail = pickStr(o, 'fromEmail', 'FromEmail', 'fromAddress', 'FromAddress', 'senderEmail', 'SenderEmail');
  const toEmail = pickStr(
    o,
    'toEmail',
    'ToEmail',
    'recipientEmail',
    'RecipientEmail',
    'toAddress',
    'ToAddress',
    'to',
    'To',
  );
  const mergedAtt = collectAttachmentArrays(o);
  const attachments = mergedAtt.length > 0 ? normalizeAttachments(mergedAtt) : [];
  const attachmentCount = toNumber(
    o.attachmentCount ?? o.AttachmentCount ?? o.attachmentsCount ?? o.AttachmentsCount,
  );
  const hasFlag = pickBool(
    o,
    'hasAttachments',
    'HasAttachments',
    'hasAttachment',
    'HasAttachment',
  );
  const hasAttachments =
    attachments.length > 0 || attachmentCount > 0 || hasFlag === true;
  const readAt = pickStr(
    o,
    'readAt',
    'ReadAt',
    'readUtc',
    'ReadUtc',
    'dateRead',
    'DateRead',
    'seenAt',
    'SeenAt',
  );
  const isReadDirect = pickBool(o, 'isRead', 'IsRead');
  const isUnreadDirect = pickBool(o, 'isUnread', 'IsUnread', 'unread', 'Unread');
  let isRead: boolean | undefined;
  if (isReadDirect === true) isRead = true;
  else if (isReadDirect === false) isRead = false;
  else if (isUnreadDirect === true) isRead = false;
  else if (isUnreadDirect === false) isRead = true;
  else if (readAt) isRead = true;
  const body = pickMessageBody(o);
  const sentAt = pickDateTime(o);
  return {
    emailMessageId: id != null ? String(id) : '',
    beneficiaryId: bid != null ? String(bid) : '',
    subject: String(o.subject ?? o.Subject ?? ''),
    messageBody: body,
    sentAt,
    ...(fromName ? { fromName } : {}),
    ...(fromEmail ? { fromEmail } : {}),
    ...(toEmail ? { toEmail } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(hasAttachments ? { hasAttachments: true } : {}),
    ...(readAt ? { readAt } : {}),
    ...(isRead !== undefined ? { isRead } : {}),
  };
}

function parseListResponse(data: unknown): AdminEmailMessageListResponse {
  if (Array.isArray(data)) {
    const items = data.map(normalizeEmailMessageRow);
    const unreadCount = items.filter((r) => rowIsUnreadForList(r)).length;
    return { count: items.length, unreadCount, items };
  }
  const o = asObject(data) ?? {};
  const rawItems = asArray(o.items ?? o.Items ?? o.data ?? o.Data ?? o.results);
  const items = rawItems.map(normalizeEmailMessageRow);
  const count = toNumber(o.count ?? o.Count ?? items.length);
  const rawUnread = o.unreadCount ?? o.UnreadCount;
  const unreadCount =
    rawUnread !== undefined && rawUnread !== null
      ? (() => {
          const n = Number(rawUnread);
          return Number.isFinite(n) ? n : items.filter((r) => rowIsUnreadForList(r)).length;
        })()
      : items.filter((r) => rowIsUnreadForList(r)).length;
  return { count, unreadCount, items };
}

/** Mirrors admin panel: unread unless explicitly read (list rows rarely have readAt). */
function rowIsUnreadForList(r: AdminEmailMessageRow): boolean {
  if (r.isRead === true) return false;
  if (r.isRead === false) return true;
  if (r.readAt?.trim()) return false;
  return false;
}

export async function listAdminEmailMessages(
  folder: AdminEmailFolder,
  options?: { beneficiaryId?: string },
): Promise<AdminEmailMessageListResponse> {
  const params: Record<string, string> = { folder };
  /** When API supports it, narrows Sent to mail for this beneficiary only. */
  if (options?.beneficiaryId?.trim()) {
    params.beneficiaryId = options.beneficiaryId.trim();
  }
  const { data } = await apiClient.get<unknown>(BASE, { params });
  return parseListResponse(data);
}

export async function getAdminEmailMessage(emailMessageId: string): Promise<AdminEmailMessageRow> {
  const { data } = await apiClient.get<unknown>(`${BASE}/${encodeURIComponent(emailMessageId)}`);
  return normalizeEmailMessageRow(data);
}

/**
 * Persist read state (Outlook-style: open = read). Tries typical HWSETA / ASP.NET shapes until one succeeds.
 */
export async function markAdminEmailMessageRead(emailMessageId: string): Promise<unknown> {
  const eid = encodeURIComponent(emailMessageId);
  const attempts: Array<() => Promise<{ data: unknown }>> = [
    () => apiClient.patch(`${BASE}/${eid}`, { isRead: true }),
    () => apiClient.patch(`${BASE}/${eid}`, { IsRead: true }),
    () => apiClient.put(`${BASE}/${eid}/read`, { isRead: true }),
    () => apiClient.post(`${BASE}/${eid}/mark-read`, {}),
    () => apiClient.post(`${BASE}/${eid}/mark-as-read`, {}),
    () => apiClient.post(`${BASE}/${eid}/mark-read`, { isRead: true }),
  ];
  let lastError: unknown;
  for (const run of attempts) {
    try {
      const res = await run();
      return res.data;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('Mark read failed');
}

/** Download a stored attachment (Bearer auth). Tries routes used by HW_EmailMessageAttachments-style APIs. */
export async function downloadAdminEmailAttachment(
  emailMessageId: string,
  attachmentId: string,
): Promise<Blob> {
  const eid = encodeURIComponent(emailMessageId);
  const aid = encodeURIComponent(attachmentId);
  const paths = [
    `${BASE}/${eid}/attachments/${aid}/download`,
    `${BASE}/${eid}/attachments/${aid}/file`,
    `${BASE}/${eid}/attachments/${aid}/content`,
    `${BASE}/${eid}/attachment/${aid}/download`,
    `${BASE}/${eid}/attachment/${aid}/file`,
    `${BASE}/attachments/${aid}/download`,
    `${ATTACHMENTS_BASE}/${aid}/download`,
    `${ATTACHMENTS_BASE}/${aid}/file`,
    `${ATTACHMENTS_BASE}/${aid}/content`,
  ];
  let lastError: unknown;
  for (const path of paths) {
    try {
      const { data } = await apiClient.get(path, { responseType: 'blob' });
      return data as Blob;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('Download failed');
}

export async function composeAdminEmailMessage(payload: AdminEmailComposePayload): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/compose`, payload);
  return data;
}

/** POST `/api/Admin/email-messages/forward` — same contract as HWSETA admin (camelCase body). */
export async function forwardAdminEmailMessage(payload: AdminEmailForwardPayload): Promise<unknown> {
  const body: Record<string, unknown> = {
    messageId: payload.messageId,
    forwardToEmail: payload.forwardToEmail,
    subject: payload.subject,
    messageBody: payload.messageBody,
    includeAttachments: payload.includeAttachments !== false,
  };
  const display = payload.forwardToName?.trim();
  if (display) body.forwardToName = display;
  if (payload.attachments && payload.attachments.length > 0) {
    body.attachments = payload.attachments;
  }
  const { data } = await apiClient.post(`${BASE}/forward`, body);
  return data;
}

const BENEFICIARY_BASE = '/api/beneficiary/email-messages';

/** Inbox only: uses JWT (resolves beneficiary id server-side). Does not require beneficiary mailbox configuration. */
export async function listBeneficiaryEmailInbox(): Promise<AdminEmailMessageListResponse> {
  const { data } = await apiClient.get<unknown>(BENEFICIARY_BASE);
  return parseListResponse(data);
}

export async function getBeneficiaryEmailMessage(emailMessageId: string): Promise<AdminEmailMessageRow> {
  const { data } = await apiClient.get<unknown>(
    `${BENEFICIARY_BASE}/${encodeURIComponent(emailMessageId)}`,
  );
  return normalizeEmailMessageRow(data);
}

export async function downloadBeneficiaryEmailAttachment(
  emailMessageId: string,
  attachmentId: string,
): Promise<Blob> {
  const eid = encodeURIComponent(emailMessageId);
  const aid = encodeURIComponent(attachmentId);
  const paths = [
    `${BENEFICIARY_BASE}/${eid}/attachments/${aid}/download`,
    `${BENEFICIARY_BASE}/${eid}/attachment/${aid}/download`,
  ];
  let lastError: unknown;
  for (const path of paths) {
    try {
      const { data } = await apiClient.get(path, { responseType: 'blob' });
      return data as Blob;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('Download failed');
}

/** One in-flight sync at a time (avoids duplicate POSTs from tab remount / StrictMode / effects). */
let inboundSyncInFlight: Promise<unknown> | null = null;

export async function syncInboundEmailMessages(): Promise<unknown> {
  if (!inboundSyncInFlight) {
    inboundSyncInFlight = apiClient
      .post(`${BASE}/sync-inbound`)
      .then((r) => r.data)
      .finally(() => {
        inboundSyncInFlight = null;
      });
  }
  return inboundSyncInFlight;
}

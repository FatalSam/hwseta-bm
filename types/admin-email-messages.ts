/** Admin email bridge — list/detail rows from GET /api/Admin/email-messages */
export type AdminEmailFolder = 'sent' | 'inbox';

/** Inbound / outbound attachment metadata from GET list or detail (shape varies by API). */
export interface AdminEmailMessageAttachmentView {
  /** Opaque id for download endpoint */
  attachmentId: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  /** Relative or absolute path if the API exposes a direct URL */
  downloadUrl?: string;
}

export interface AdminEmailMessageRow {
  emailMessageId: string;
  beneficiaryId: string;
  subject: string;
  messageBody: string;
  sentAt: string;
  /** Optional sender display fields (API-dependent). */
  fromName?: string;
  fromEmail?: string;
  /** Recipient (used to filter Sent: admin → this beneficiary). */
  toEmail?: string;
  /** From GET detail `attachments[]` (IMAP-decoded HW_EmailMessageAttachments + compose). */
  attachments?: AdminEmailMessageAttachmentView[];
  /** List rows may omit `attachments[]` but still flag that files exist (Outlook-style list indicator). */
  hasAttachments?: boolean;
  /** When false, message counts as unread in Inbox (API may send `IsRead` / `readAt` instead). */
  isRead?: boolean;
  /** Server timestamp when marked read — if present without `isRead`, treated as read. */
  readAt?: string;
}

export interface AdminEmailMessageListResponse {
  count: number;
  /** Rows with isRead false (when API sends it; same scope as items). */
  unreadCount?: number;
  items: AdminEmailMessageRow[];
}

/** Optional attachment for POST compose (raw base64, no data: prefix). */
export interface AdminEmailAttachmentPayload {
  originalFileName: string;
  contentType: string;
  base64: string;
}

export interface AdminEmailComposePayload {
  beneficiaryId: string;
  subject: string;
  messageBody: string;
  parentMessageId: string | null;
  /** Omit or [] for plain text only. Max 10 files, 15 MB each, 40 MB total (enforced in UI). */
  attachments?: AdminEmailAttachmentPayload[];
}

/** POST `/api/Admin/email-messages/forward` — escalate to an external mailbox. */
export interface AdminEmailForwardPayload {
  messageId: string;
  forwardToEmail: string;
  forwardToName?: string;
  subject: string;
  messageBody: string;
  /** Default true: include files stored on the source message. */
  includeAttachments?: boolean;
  /** Optional extra files (same shape as compose); sent in addition to source attachments when included. */
  attachments?: AdminEmailAttachmentPayload[];
}

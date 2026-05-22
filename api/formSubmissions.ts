import axios from 'axios';
import apiClient from '@/ultis/apiClient';
import {
  mockCreateFormDistribution,
  mockGetFormDistribution,
  mockListFormDistributionNotifications,
  mockListFormDistributions,
  mockResolveShortLink,
  mockRetryAllFailed,
  mockRetryNotification,
} from '@/data/mockFormSubmissions';
import type {
  FormDistributionCreatePayload,
  FormDistributionCreateResult,
  FormDistributionListParams,
  FormDistributionNotificationListParams,
  FormDistributionNotificationRow,
  FormDistributionRow,
  FormDistributionSendResult,
  PagedResult,
  ShortLinkResult,
} from '@/types/formSubmissions';

const MANAGE_DIST = '/api/manage/form-builder/distributions';
const PUBLIC_SHORT = '/api/form-builder/short-links';

function asObject(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function toStr(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  if (error != null && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) return error.code;
  if (error != null && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function shouldUseMock(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status != null) return status === 404 || status === 501 || status === 405;

  const code = getErrorCode(error);
  return code === 'ERR_NETWORK' || code === 'ECONNABORTED';
}

function unwrapPaged<T>(data: unknown, normalizer: (raw: unknown) => T | null): PagedResult<T> {
  const root = asObject(data) ?? {};
  const itemsRaw = asArray(root.items ?? root.data ?? root.results ?? root.value ?? data);
  const items = itemsRaw.map(normalizer).filter((x): x is T => x != null);
  const page = toNum(root.page ?? root.Page, 1);
  const pageSize = toNum(root.pageSize ?? root.PageSize, 25);
  const totalCount = toNum(root.totalCount ?? root.TotalCount, items.length);
  const totalPages = toNum(
    root.totalPages ?? root.TotalPages,
    Math.max(1, Math.ceil(totalCount / pageSize)),
  );
  return { items, page, pageSize, totalCount, totalPages };
}

function normalizeDistribution(raw: unknown): FormDistributionRow | null {
  const o = asObject(raw);
  if (!o) return null;
  const distributionId = toStr(
    o.distributionId ?? o.DistributionId ?? o.distributionID ?? o.id ?? o.ID,
  );
  const formId = toStr(o.formId ?? o.FormId ?? o.formID);
  if (!distributionId || !formId) return null;
  const channelsRaw = o.channels ?? o.Channels;
  const channels = Array.isArray(channelsRaw)
    ? (channelsRaw as string[]).map((c) => toStr(c).toLowerCase()).filter((c) => c === 'email' || c === 'sms')
    : toStr(channelsRaw)
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter((c) => c === 'email' || c === 'sms');

  return {
    distributionId,
    formId,
    formTitle: toStr(o.formTitle ?? o.FormTitle) || 'Untitled form',
    audienceType: (toStr(o.audienceType ?? o.AudienceType) ||
      'all_beneficiaries') as FormDistributionRow['audienceType'],
    programmeId: toStr(o.programmeId ?? o.ProgrammeId) || null,
    programmeName: toStr(o.programmeName ?? o.ProgrammeName) || null,
    qualificationId: toStr(o.qualificationId ?? o.QualificationId) || null,
    qualificationName: toStr(o.qualificationName ?? o.QualificationName) || null,
    channels: channels as FormDistributionRow['channels'],
    status: (toStr(o.status ?? o.Status) || 'Queued') as FormDistributionRow['status'],
    createdAt: toStr(o.createdAt ?? o.CreatedAt ?? o.dateCreated) || new Date().toISOString(),
    createdByUserId: toStr(o.createdByUserId ?? o.CreatedByUserId) || null,
    createdByName: toStr(o.createdByName ?? o.CreatedByName) || null,
    totalRecipients: toNum(o.totalRecipients ?? o.TotalRecipients),
    sentCount: toNum(o.sentCount ?? o.SentCount),
    failedCount: toNum(o.failedCount ?? o.FailedCount),
    pendingCount: toNum(o.pendingCount ?? o.PendingCount),
    emailSubject: toStr(o.emailSubject ?? o.EmailSubject) || null,
    emailBody: toStr(o.emailBody ?? o.EmailBody) || null,
    smsBody: toStr(o.smsBody ?? o.SmsBody) || null,
  };
}

function normalizeNotification(raw: unknown): FormDistributionNotificationRow | null {
  const o = asObject(raw);
  if (!o) return null;
  const notificationId = toStr(o.notificationId ?? o.NotificationId ?? o.id ?? o.ID);
  const distributionId = toStr(o.distributionId ?? o.DistributionId);
  if (!notificationId || !distributionId) return null;
  const channel = toStr(o.channel ?? o.Channel).toLowerCase();
  return {
    notificationId,
    distributionId,
    recipientType: (toStr(o.recipientType ?? o.RecipientType) === 'external'
      ? 'external'
      : 'beneficiary') as FormDistributionNotificationRow['recipientType'],
    beneficiaryId: toStr(o.beneficiaryId ?? o.BeneficiaryId) || null,
    fullName: toStr(o.fullName ?? o.FullName) || 'Recipient',
    email: toStr(o.email ?? o.Email) || null,
    cellphone: toStr(o.cellphone ?? o.Cellphone ?? o.cellNo) || null,
    channel: (channel === 'sms' ? 'sms' : 'email') as FormDistributionNotificationRow['channel'],
    status: (toStr(o.status ?? o.Status) || 'pending') as FormDistributionNotificationRow['status'],
    sentAt: toStr(o.sentAt ?? o.SentAt) || null,
    errorMessage: toStr(o.errorMessage ?? o.ErrorMessage) || null,
    shortLink: toStr(o.shortLink ?? o.ShortLink) || null,
    formLink: toStr(o.formLink ?? o.FormLink) || '',
    providerMessageId: toStr(o.providerMessageId ?? o.ProviderMessageId) || null,
    retryCount: toNum(o.retryCount ?? o.RetryCount, 0),
  };
}

export async function listFormDistributions(
  params: FormDistributionListParams,
): Promise<PagedResult<FormDistributionRow>> {
  try {
    const { data } = await apiClient.get(MANAGE_DIST, { params });
    return unwrapPaged(data, normalizeDistribution);
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    return mockListFormDistributions(params);
  }
}

export async function createFormDistribution(
  payload: FormDistributionCreatePayload,
): Promise<FormDistributionCreateResult> {
  try {
    const { data } = await apiClient.post(MANAGE_DIST, payload);
    const o = asObject(data) ?? {};
    return {
      distributionId: toStr(o.distributionId ?? o.DistributionId),
      status: (toStr(o.status ?? o.Status) || 'Queued') as FormDistributionCreateResult['status'],
      totalRecipients: toNum(o.totalRecipients ?? o.TotalRecipients),
      sentCount: toNum(o.sentCount ?? o.SentCount),
      failedCount: toNum(o.failedCount ?? o.FailedCount),
      pendingCount: toNum(o.pendingCount ?? o.PendingCount),
    };
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    return mockCreateFormDistribution(payload);
  }
}

export async function getFormDistribution(distributionId: string): Promise<FormDistributionRow> {
  try {
    const { data } = await apiClient.get(
      `${MANAGE_DIST}/${encodeURIComponent(distributionId)}`,
    );
    const row = normalizeDistribution(data);
    if (!row) throw new Error('Distribution not found.');
    return row;
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    const row = mockGetFormDistribution(distributionId);
    if (!row) throw new Error('Distribution not found.');
    return row;
  }
}

function normalizeSendResult(data: unknown, distributionId: string): FormDistributionSendResult {
  const o = asObject(data) ?? {};
  return {
    distributionId: toStr(o.distributionId ?? o.DistributionId) || distributionId,
    processedCount: toNum(o.processedCount ?? o.ProcessedCount),
    sentCount: toNum(o.sentCount ?? o.SentCount),
    failedCount: toNum(o.failedCount ?? o.FailedCount),
    pendingCount: toNum(o.pendingCount ?? o.PendingCount),
  };
}

export async function sendFormDistribution(distributionId: string): Promise<FormDistributionSendResult> {
  try {
    const { data } = await apiClient.post(
      `${MANAGE_DIST}/${encodeURIComponent(distributionId)}/send`,
    );
    return normalizeSendResult(data, distributionId);
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    return {
      distributionId,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      pendingCount: 0,
    };
  }
}

export async function listFormDistributionNotifications(
  distributionId: string,
  params: FormDistributionNotificationListParams,
): Promise<PagedResult<FormDistributionNotificationRow>> {
  try {
    const { data } = await apiClient.get(
      `${MANAGE_DIST}/${encodeURIComponent(distributionId)}/notifications`,
      { params },
    );
    return unwrapPaged(data, normalizeNotification);
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    return mockListFormDistributionNotifications(distributionId, params);
  }
}

export async function retryFormDistributionNotification(
  distributionId: string,
  notificationId: string,
): Promise<FormDistributionNotificationRow> {
  try {
    const { data } = await apiClient.post(
      `${MANAGE_DIST}/${encodeURIComponent(distributionId)}/notifications/${encodeURIComponent(notificationId)}/retry`,
    );
    const row = normalizeNotification(data);
    if (!row) throw new Error('Retry succeeded but response was invalid.');
    return row;
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    const row = mockRetryNotification(distributionId, notificationId);
    if (!row) throw new Error('Notification not found.');
    return row;
  }
}

export async function retryAllFailedFormDistributionNotifications(
  distributionId: string,
): Promise<FormDistributionSendResult> {
  try {
    const { data } = await apiClient.post(
      `${MANAGE_DIST}/${encodeURIComponent(distributionId)}/notifications/retry-failed`,
    );
    return normalizeSendResult(data, distributionId);
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    return {
      distributionId,
      processedCount: mockRetryAllFailed(distributionId),
      sentCount: 0,
      failedCount: 0,
      pendingCount: 0,
    };
  }
}

export async function resolveShortLink(code: string): Promise<ShortLinkResult> {
  try {
    const { data } = await apiClient.get(`${PUBLIC_SHORT}/${encodeURIComponent(code)}`);
    const o = asObject(data) ?? {};
    const resolved: ShortLinkResult = {
      code: toStr(o.code ?? o.Code) || code,
      shortUrl: toStr(o.shortUrl ?? o.ShortUrl),
      targetUrl: toStr(o.targetUrl ?? o.TargetUrl),
      formId: toStr(o.formId ?? o.FormId) || undefined,
      expiresAt: toStr(o.expiresAt ?? o.ExpiresAt) || null,
    };
    if (!resolved.targetUrl) throw new Error('Short link not found.');
    return resolved;
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    const row = mockResolveShortLink(code);
    if (!row) throw new Error('Short link not found or expired.');
    return row;
  }
}

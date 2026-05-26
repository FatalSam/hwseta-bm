import { buildFormLink } from '@/lib/form-submission-templates';
import { buildShortLinkUrl } from '@/lib/appBaseUrl';
import type {
  DistributionStatus,
  FormDistributionCreatePayload,
  FormDistributionCreateResult,
  FormDistributionListParams,
  FormDistributionNotificationListParams,
  FormDistributionNotificationRow,
  FormDistributionRow,
  NotificationStatus,
  PagedResult,
  ResolvedRecipient,
  ShortLinkResult,
} from '@/types/formSubmissions';

const MOCK_STORAGE_KEY = 'hwseta-mock-form-distributions-v1';
const MOCK_SHORT_LINKS_KEY = 'hwseta-mock-form-short-links-v1';

const SEED_BENEFICIARIES: ResolvedRecipient[] = [
  {
    recipientType: 'beneficiary',
    beneficiaryId: 'b-001',
    fullName: 'Thabo Mokoena',
    email: 'thabo.mokoena@example.com',
    cellphone: '0821234567',
  },
  {
    recipientType: 'beneficiary',
    beneficiaryId: 'b-002',
    fullName: 'Nomsa Dlamini',
    email: 'nomsa.dlamini@example.com',
    cellphone: '0837654321',
  },
  {
    recipientType: 'beneficiary',
    beneficiaryId: 'b-003',
    fullName: 'Peter van Wyk',
    email: 'peter.vw@example.com',
    cellphone: null,
  },
  {
    recipientType: 'beneficiary',
    beneficiaryId: 'b-004',
    fullName: 'Lerato Khumalo',
    email: null,
    cellphone: '0721112233',
  },
];

let distributions: FormDistributionRow[] = [];
let notificationsByDist: Record<string, FormDistributionNotificationRow[]> = {};
let shortLinks: Record<string, ShortLinkResult> = {};

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function shortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      MOCK_STORAGE_KEY,
      JSON.stringify({ distributions, notificationsByDist }),
    );
    sessionStorage.setItem(MOCK_SHORT_LINKS_KEY, JSON.stringify(shortLinks));
  } catch {
    /* ignore */
  }
}

function loadPersisted() {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        distributions?: FormDistributionRow[];
        notificationsByDist?: Record<string, FormDistributionNotificationRow[]>;
      };
      if (Array.isArray(parsed.distributions)) distributions = parsed.distributions;
      if (parsed.notificationsByDist) notificationsByDist = parsed.notificationsByDist;
    }
    const linksRaw = sessionStorage.getItem(MOCK_SHORT_LINKS_KEY);
    if (linksRaw) {
      shortLinks = JSON.parse(linksRaw) as Record<string, ShortLinkResult>;
    }
  } catch {
    /* ignore */
  }
}

loadPersisted();

function seedIfEmpty() {
  if (distributions.length > 0) return;
  const formId = 'demo-form-1';
  const distId = newId();
  const createdAt = new Date(Date.now() - 86400000).toISOString();
  const row: FormDistributionRow = {
    distributionId: distId,
    formId,
    formTitle: 'Learner satisfaction survey (demo)',
    audienceType: 'by_programme',
    programmeId: '1',
    programmeName: 'Retail Learnership 2025',
    qualificationId: null,
    qualificationName: null,
    channels: ['email', 'sms'],
    status: 'CompletedWithFailures',
    createdAt,
    createdByUserId: 'admin-demo',
    createdByName: 'Demo Admin',
    totalRecipients: SEED_BENEFICIARIES.length,
    sentCount: 6,
    failedCount: 1,
    pendingCount: 1,
  };
  distributions.push(row);
  notificationsByDist[distId] = buildNotificationsForRecipients(
    distId,
    formId,
    SEED_BENEFICIARIES,
    ['email', 'sms'],
    true,
  );
  persist();
}

seedIfEmpty();

function buildNotificationsForRecipients(
  distributionId: string,
  formId: string,
  recipients: ResolvedRecipient[],
  channels: ('email' | 'sms')[],
  simulateTerminal: boolean,
): FormDistributionNotificationRow[] {
  const formLink = buildFormLink(formId, distributionId);
  const rows: FormDistributionNotificationRow[] = [];
  let failEvery = 7;

  for (const r of recipients) {
    for (const channel of channels) {
      if (channel === 'email' && !r.email?.trim()) continue;
      if (channel === 'sms' && !r.cellphone?.trim()) continue;

      const code = shortCode();
      const shortUrl = buildShortLinkUrl(code);
      const targetUrl = `${formLink}${formLink.includes('?') ? '&' : '?'}n=${encodeURIComponent(newId())}`;
      shortLinks[code] = { code, shortUrl, targetUrl, formId };

      let status: NotificationStatus = 'pending';
      let errorMessage: string | null = null;
      let sentAt: string | null = null;
      if (simulateTerminal) {
        failEvery -= 1;
        if (failEvery === 0) {
          status = 'failed';
          errorMessage = channel === 'sms' ? 'WinSMS: Invalid number' : 'SMTP: Mailbox unavailable';
          failEvery = 7;
        } else {
          status = 'sent';
          sentAt = new Date().toISOString();
        }
      }

      rows.push({
        notificationId: newId(),
        distributionId,
        recipientType: r.recipientType,
        beneficiaryId: r.beneficiaryId ?? null,
        fullName: r.fullName,
        email: r.email ?? null,
        cellphone: r.cellphone ?? null,
        channel,
        status,
        sentAt,
        errorMessage,
        shortLink: channel === 'sms' ? shortUrl : null,
        formLink: targetUrl,
        providerMessageId: status === 'sent' ? `mock-${channel}-${Date.now()}` : null,
        retryCount: 0,
      });
    }
  }
  persist();
  return rows;
}

function aggregateNotifications(list: FormDistributionNotificationRow[]) {
  let sentCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  for (const n of list) {
    if (n.status === 'sent' || n.status === 'delivered') sentCount += 1;
    else if (n.status === 'failed') failedCount += 1;
    else pendingCount += 1;
  }
  return { sentCount, failedCount, pendingCount };
}

function resolveRecipients(payload: FormDistributionCreatePayload): ResolvedRecipient[] {
  if (payload.audienceType === 'external') {
    return (payload.externalRecipients ?? []).map((r) => ({
      recipientType: 'external' as const,
      fullName: r.fullName?.trim() || r.email?.trim() || r.cellphone?.trim() || 'Recipient',
      email: r.email?.trim() || null,
      cellphone: r.cellphone?.trim() || null,
    }));
  }
  if (payload.audienceType === 'by_programme') {
    return SEED_BENEFICIARIES.slice(0, 3);
  }
  return [...SEED_BENEFICIARIES];
}

function paginate<T>(items: T[], page: number, pageSize: number): PagedResult<T> {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: p,
    pageSize,
    totalCount,
    totalPages,
  };
}

export function mockListFormDistributions(
  params: FormDistributionListParams,
): PagedResult<FormDistributionRow> {
  seedIfEmpty();
  let rows = [...distributions];
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;

  if (params.formId) rows = rows.filter((r) => r.formId === params.formId);
  if (params.audienceType) rows = rows.filter((r) => r.audienceType === params.audienceType);
  if (params.status) rows = rows.filter((r) => r.status === params.status);
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.formTitle.toLowerCase().includes(q) ||
        (r.createdByName ?? '').toLowerCase().includes(q) ||
        (r.programmeName ?? '').toLowerCase().includes(q),
    );
  }
  if (params.createdFrom) {
    const from = new Date(params.createdFrom).getTime();
    rows = rows.filter((r) => new Date(r.createdAt).getTime() >= from);
  }
  if (params.createdTo) {
    const to = new Date(params.createdTo).getTime();
    rows = rows.filter((r) => new Date(r.createdAt).getTime() <= to);
  }

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return paginate(rows, page, pageSize);
}

export function mockGetFormDistribution(distributionId: string): FormDistributionRow | null {
  seedIfEmpty();
  return distributions.find((d) => d.distributionId === distributionId) ?? null;
}

export function mockCreateFormDistribution(
  payload: FormDistributionCreatePayload,
): FormDistributionCreateResult {
  const distributionId = newId();
  const recipients = resolveRecipients(payload);
  const uniqueRecipients = recipients.length;
  const notifications = buildNotificationsForRecipients(
    distributionId,
    payload.formId,
    recipients,
    payload.channels,
    true,
  );
  notificationsByDist[distributionId] = notifications;
  const { sentCount, failedCount, pendingCount } = aggregateNotifications(notifications);

  let status: DistributionStatus = 'Completed';
  if (failedCount > 0 && pendingCount > 0) status = 'Processing';
  else if (failedCount > 0) status = 'CompletedWithFailures';
  else if (pendingCount > 0) status = 'Processing';

  const row: FormDistributionRow = {
    distributionId,
    formId: payload.formId,
    formTitle: payload.formTitle ?? 'Untitled form',
    audienceType: payload.audienceType,
    programmeId: payload.programmeId ?? null,
    programmeName: payload.programmeName ?? null,
    qualificationId: payload.qualificationId ?? null,
    qualificationName: payload.qualificationName ?? null,
    channels: payload.channels,
    status,
    createdAt: new Date().toISOString(),
    createdByUserId: payload.createdByUserId,
    totalRecipients: uniqueRecipients,
    sentCount,
    failedCount,
    pendingCount,
    emailSubject: payload.emailSubject ?? null,
    emailBody: payload.emailBody ?? null,
    smsBody: payload.smsBody ?? null,
  };
  distributions.unshift(row);
  persist();

  return {
    distributionId,
    status,
    totalRecipients: uniqueRecipients,
    sentCount,
    failedCount,
    pendingCount,
  };
}

export function mockListFormDistributionNotifications(
  distributionId: string,
  params: FormDistributionNotificationListParams,
): PagedResult<FormDistributionNotificationRow> {
  seedIfEmpty();
  let rows = [...(notificationsByDist[distributionId] ?? [])];
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;

  if (params.channel) rows = rows.filter((r) => r.channel === params.channel);
  if (params.status) rows = rows.filter((r) => r.status === params.status);
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.cellphone ?? '').includes(q),
    );
  }

  return paginate(rows, page, pageSize);
}

export function mockRetryNotification(
  distributionId: string,
  notificationId: string,
): FormDistributionNotificationRow | null {
  const list = notificationsByDist[distributionId];
  if (!list) return null;
  const idx = list.findIndex((n) => n.notificationId === notificationId);
  if (idx < 0) return null;
  const n = list[idx];
  if (n.status !== 'failed') return n;
  list[idx] = {
    ...n,
    status: 'sent',
    sentAt: new Date().toISOString(),
    errorMessage: null,
    retryCount: (n.retryCount ?? 0) + 1,
    providerMessageId: `mock-retry-${Date.now()}`,
  };
  refreshDistributionAggregates(distributionId);
  persist();
  return list[idx];
}

export function mockRetryAllFailed(distributionId: string): number {
  const list = notificationsByDist[distributionId];
  if (!list) return 0;
  let count = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i].status === 'failed') {
      list[i] = {
        ...list[i],
        status: 'sent',
        sentAt: new Date().toISOString(),
        errorMessage: null,
        retryCount: (list[i].retryCount ?? 0) + 1,
        providerMessageId: `mock-retry-${Date.now()}`,
      };
      count += 1;
    }
  }
  refreshDistributionAggregates(distributionId);
  persist();
  return count;
}

function refreshDistributionAggregates(distributionId: string) {
  const dist = distributions.find((d) => d.distributionId === distributionId);
  const list = notificationsByDist[distributionId];
  if (!dist || !list) return;
  const { sentCount, failedCount, pendingCount } = aggregateNotifications(list);
  dist.sentCount = sentCount;
  dist.failedCount = failedCount;
  dist.pendingCount = pendingCount;
  dist.status =
    failedCount > 0
      ? pendingCount > 0
        ? 'Processing'
        : 'CompletedWithFailures'
      : pendingCount > 0
        ? 'Processing'
        : 'Completed';
}

export function mockFindNotification(notificationId: string): {
  notification: FormDistributionNotificationRow;
  distribution: FormDistributionRow;
} | null {
  seedIfEmpty();
  const id = notificationId.trim();
  if (!id) return null;
  for (const dist of distributions) {
    const list = notificationsByDist[dist.distributionId] ?? [];
    const notification = list.find((n) => n.notificationId === id);
    if (notification) {
      return { notification, distribution: dist };
    }
  }
  return null;
}

export function mockResolveShortLink(code: string): ShortLinkResult | null {
  loadPersisted();
  return shortLinks[code] ?? null;
}

export function mockCreateShortLink(formId: string, distributionId?: string): ShortLinkResult {
  const code = shortCode();
  const targetUrl = buildFormLink(formId, distributionId);
  const result: ShortLinkResult = {
    code,
    shortUrl: buildShortLinkUrl(code),
    targetUrl,
    formId,
  };
  shortLinks[code] = result;
  persist();
  return result;
}

import apiClient from '@/ultis/apiClient';
import type {
  BeneficiaryNotificationListParams,
  BeneficiaryNotificationListResult,
  BeneficiaryNotificationRow,
  BeneficiaryNotificationUnreadCountResult,
} from '@/types/beneficiaryNotifications';

const BENEFICIARY_NOTIFICATIONS_BASE = '/api/beneficiary/notifications';

type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as ApiRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringValue(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  return String(value);
}

function toNullableString(value: unknown): string | null {
  const text = value == null ? '' : String(value).trim();
  return text || null;
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return false;
}

function pick(row: ApiRecord, camel: string, pascal: string): unknown {
  return row[camel] ?? row[pascal];
}

function normalizeNotification(value: unknown): BeneficiaryNotificationRow {
  const row = asRecord(value);
  return {
    notificationId: toStringValue(pick(row, 'notificationId', 'NotificationId')),
    beneficiaryId: toNullableString(pick(row, 'beneficiaryId', 'BeneficiaryId')),
    userId: toNullableString(pick(row, 'userId', 'UserId')),
    notificationType: toStringValue(pick(row, 'notificationType', 'NotificationType')),
    title: toStringValue(pick(row, 'title', 'Title'), 'Notification'),
    message: toStringValue(pick(row, 'message', 'Message')),
    linkUrl: toNullableString(pick(row, 'linkUrl', 'LinkUrl')),
    sourceTable: toNullableString(pick(row, 'sourceTable', 'SourceTable')),
    sourceId: toNullableString(pick(row, 'sourceId', 'SourceId')),
    createdByUserId: toNullableString(pick(row, 'createdByUserId', 'CreatedByUserId')),
    isRead: toBool(pick(row, 'isRead', 'IsRead')),
    dateCreated: toStringValue(pick(row, 'dateCreated', 'DateCreated')),
  };
}

function normalizeList(value: unknown): BeneficiaryNotificationListResult {
  const data = asRecord(value);
  const items = asArray(data.items ?? data.Items).map(normalizeNotification);
  return {
    page: toNumber(data.page ?? data.Page, 1),
    pageSize: toNumber(data.pageSize ?? data.PageSize, items.length || 10),
    totalCount: toNumber(data.totalCount ?? data.TotalCount, items.length),
    totalPages: toNumber(data.totalPages ?? data.TotalPages, 1),
    unreadCount: toNumber(data.unreadCount ?? data.UnreadCount, 0),
    items,
  };
}

export async function listBeneficiaryNotifications(
  params: BeneficiaryNotificationListParams = {},
): Promise<BeneficiaryNotificationListResult> {
  const { data } = await apiClient.get(BENEFICIARY_NOTIFICATIONS_BASE, {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10,
      unreadOnly: params.unreadOnly ?? false,
    },
  });
  return normalizeList(data);
}

export async function getBeneficiaryNotificationUnreadCount(): Promise<BeneficiaryNotificationUnreadCountResult> {
  const { data } = await apiClient.get(`${BENEFICIARY_NOTIFICATIONS_BASE}/unread-count`);
  const record = asRecord(data);
  return {
    unreadCount: toNumber(record.unreadCount ?? record.UnreadCount, 0),
  };
}

export async function markBeneficiaryNotificationRead(notificationId: string): Promise<void> {
  await apiClient.patch(`${BENEFICIARY_NOTIFICATIONS_BASE}/${encodeURIComponent(notificationId)}/read`);
}

export async function markAllBeneficiaryNotificationsRead(): Promise<{ updatedCount: number }> {
  const { data } = await apiClient.patch(`${BENEFICIARY_NOTIFICATIONS_BASE}/read-all`);
  const record = asRecord(data);
  return {
    updatedCount: toNumber(record.updatedCount ?? record.UpdatedCount, 0),
  };
}

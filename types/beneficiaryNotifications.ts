export interface BeneficiaryNotificationRow {
  notificationId: string;
  beneficiaryId: string | null;
  userId: string | null;
  notificationType: string;
  title: string;
  message: string;
  linkUrl: string | null;
  sourceTable: string | null;
  sourceId: string | null;
  createdByUserId: string | null;
  isRead: boolean;
  dateCreated: string;
}

export interface BeneficiaryNotificationListParams {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export interface BeneficiaryNotificationListResult {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  unreadCount: number;
  items: BeneficiaryNotificationRow[];
}

export interface BeneficiaryNotificationUnreadCountResult {
  unreadCount: number;
}

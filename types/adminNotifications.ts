export interface AdminNotificationRow {
  notificationId: string;
  adminUserId: string;
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

export interface AdminNotificationListParams {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export interface AdminNotificationListResult {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  unreadCount: number;
  items: AdminNotificationRow[];
}

export interface AdminNotificationUnreadCountResult {
  unreadCount: number;
}

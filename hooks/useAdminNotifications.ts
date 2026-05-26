import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminNotificationUnreadCount,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '@/api/adminNotifications';
import type { AdminNotificationListParams } from '@/types/adminNotifications';

export const adminNotificationKeys = {
  all: ['admin-notifications'] as const,
  list: (params: AdminNotificationListParams) => [...adminNotificationKeys.all, 'list', params] as const,
  unreadCount: () => [...adminNotificationKeys.all, 'unread-count'] as const,
};

export function useAdminNotifications(params: AdminNotificationListParams = {}, enabled = true) {
  return useQuery({
    queryKey: adminNotificationKeys.list(params),
    queryFn: () => listAdminNotifications(params),
    enabled,
    retry: false,
  });
}

export function useAdminNotificationUnreadCount(enabled = true) {
  return useQuery({
    queryKey: adminNotificationKeys.unreadCount(),
    queryFn: getAdminNotificationUnreadCount,
    enabled,
    retry: false,
  });
}

export function useMarkAdminNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAdminNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all });
    },
  });
}

export function useMarkAllAdminNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllAdminNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all });
    },
  });
}

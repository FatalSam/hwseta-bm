import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBeneficiaryNotificationUnreadCount,
  listBeneficiaryNotifications,
  markAllBeneficiaryNotificationsRead,
  markBeneficiaryNotificationRead,
} from '@/api/beneficiaryNotifications';
import type { BeneficiaryNotificationListParams } from '@/types/beneficiaryNotifications';

export const beneficiaryNotificationKeys = {
  all: ['beneficiary-notifications'] as const,
  list: (params: BeneficiaryNotificationListParams) =>
    [...beneficiaryNotificationKeys.all, 'list', params] as const,
  unreadCount: () => [...beneficiaryNotificationKeys.all, 'unread-count'] as const,
};

export function useBeneficiaryNotifications(params: BeneficiaryNotificationListParams = {}, enabled = true) {
  return useQuery({
    queryKey: beneficiaryNotificationKeys.list(params),
    queryFn: () => listBeneficiaryNotifications(params),
    enabled,
    retry: false,
  });
}

export function useBeneficiaryNotificationUnreadCount(enabled = true) {
  return useQuery({
    queryKey: beneficiaryNotificationKeys.unreadCount(),
    queryFn: getBeneficiaryNotificationUnreadCount,
    enabled,
    retry: false,
  });
}

export function useMarkBeneficiaryNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markBeneficiaryNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: beneficiaryNotificationKeys.all });
    },
  });
}

export function useMarkAllBeneficiaryNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllBeneficiaryNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: beneficiaryNotificationKeys.all });
    },
  });
}

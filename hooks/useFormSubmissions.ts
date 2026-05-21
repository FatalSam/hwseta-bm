import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFormDistribution,
  getFormDistribution,
  listFormDistributionNotifications,
  listFormDistributions,
  retryAllFailedFormDistributionNotifications,
  retryFormDistributionNotification,
} from '@/api/formSubmissions';
import type {
  FormDistributionCreatePayload,
  FormDistributionListParams,
  FormDistributionNotificationListParams,
} from '@/types/formSubmissions';

export const formSubmissionKeys = {
  all: ['form-submissions'] as const,
  distributions: (params: FormDistributionListParams) =>
    [...formSubmissionKeys.all, 'distributions', params] as const,
  distribution: (id: string) => [...formSubmissionKeys.all, 'distribution', id] as const,
  notifications: (distributionId: string, params: FormDistributionNotificationListParams) =>
    [...formSubmissionKeys.all, 'notifications', distributionId, params] as const,
};

export function useFormDistributionsList(params: FormDistributionListParams) {
  return useQuery({
    queryKey: formSubmissionKeys.distributions(params),
    queryFn: () => listFormDistributions(params),
    retry: false,
  });
}

export function useFormDistributionDetail(distributionId: string | null) {
  return useQuery({
    queryKey: formSubmissionKeys.distribution(distributionId ?? ''),
    queryFn: () => getFormDistribution(distributionId!),
    enabled: !!distributionId?.trim(),
    retry: false,
  });
}

export function useFormDistributionNotifications(
  distributionId: string | null,
  params: FormDistributionNotificationListParams,
) {
  return useQuery({
    queryKey: formSubmissionKeys.notifications(distributionId ?? '', params),
    queryFn: () => listFormDistributionNotifications(distributionId!, params),
    enabled: !!distributionId?.trim(),
    retry: false,
  });
}

export function useFormDistributionMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: FormDistributionCreatePayload) => createFormDistribution(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formSubmissionKeys.all });
    },
  });

  const retryOneMutation = useMutation({
    mutationFn: ({
      distributionId,
      notificationId,
    }: {
      distributionId: string;
      notificationId: string;
    }) => retryFormDistributionNotification(distributionId, notificationId),
    onSuccess: (_data, { distributionId }) => {
      queryClient.invalidateQueries({ queryKey: formSubmissionKeys.all });
      queryClient.invalidateQueries({
        queryKey: formSubmissionKeys.distribution(distributionId),
      });
    },
  });

  const retryAllMutation = useMutation({
    mutationFn: (distributionId: string) =>
      retryAllFailedFormDistributionNotifications(distributionId),
    onSuccess: (_data, distributionId) => {
      queryClient.invalidateQueries({ queryKey: formSubmissionKeys.all });
      queryClient.invalidateQueries({
        queryKey: formSubmissionKeys.distribution(distributionId),
      });
    },
  });

  return { createMutation, retryOneMutation, retryAllMutation };
}

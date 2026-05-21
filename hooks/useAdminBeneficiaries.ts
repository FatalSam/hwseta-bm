import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminBeneficiary,
  getAdminBeneficiary,
  listAdminBeneficiaries,
  updateAdminBeneficiary,
} from '@/api/adminBeneficiaries';
import type {
  AdminBeneficiaryListParams,
  AdminBeneficiarySavePayload,
  AdminEntityId,
} from '@/types/admin-beneficiaries';

export const adminBeneficiaryKeys = {
  all: ['admin-beneficiaries'] as const,
  list: (params: AdminBeneficiaryListParams) => [...adminBeneficiaryKeys.all, 'list', params] as const,
  detail: (id: AdminEntityId) => [...adminBeneficiaryKeys.all, 'detail', String(id)] as const,
};

export function useAdminBeneficiariesList(params: AdminBeneficiaryListParams) {
  return useQuery({
    queryKey: adminBeneficiaryKeys.list(params),
    queryFn: () => listAdminBeneficiaries(params),
    retry: false,
  });
}

export function useAdminBeneficiaryDetail(id: AdminEntityId | null) {
  return useQuery({
    queryKey: adminBeneficiaryKeys.detail(id ?? ''),
    queryFn: () => getAdminBeneficiary(id!),
    enabled: id != null && String(id).trim() !== '',
    retry: false,
  });
}

export function useAdminBeneficiaryMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: AdminBeneficiarySavePayload) => createAdminBeneficiary(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBeneficiaryKeys.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: AdminEntityId; payload: AdminBeneficiarySavePayload }) =>
      updateAdminBeneficiary(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminBeneficiaryKeys.all });
      queryClient.invalidateQueries({ queryKey: adminBeneficiaryKeys.detail(id) });
    },
  });

  return { createMutation, updateMutation };
}

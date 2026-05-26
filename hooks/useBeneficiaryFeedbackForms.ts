import { useQuery } from '@tanstack/react-query';
import {
  listAdminBeneficiaryFeedbackForms,
  listMyFeedbackForms,
} from '@/api/beneficiaryFeedbackForms';
import type { BeneficiaryFeedbackFormsParams } from '@/types/beneficiaryFeedbackForms';

export const beneficiaryFeedbackFormsKeys = {
  all: ['beneficiary-feedback-forms'] as const,
  mine: (params: BeneficiaryFeedbackFormsParams) =>
    [...beneficiaryFeedbackFormsKeys.all, 'mine', params] as const,
  adminBeneficiary: (beneficiaryId: string, params: BeneficiaryFeedbackFormsParams) =>
    [...beneficiaryFeedbackFormsKeys.all, 'admin-beneficiary', beneficiaryId, params] as const,
};

export function useMyFeedbackForms(params: BeneficiaryFeedbackFormsParams) {
  return useQuery({
    queryKey: beneficiaryFeedbackFormsKeys.mine(params),
    queryFn: () => listMyFeedbackForms(params),
    retry: false,
  });
}

export function useAdminBeneficiaryFeedbackForms(
  beneficiaryId: string | null | undefined,
  params: BeneficiaryFeedbackFormsParams,
) {
  return useQuery({
    queryKey: beneficiaryFeedbackFormsKeys.adminBeneficiary(beneficiaryId ?? '', params),
    queryFn: () => listAdminBeneficiaryFeedbackForms(beneficiaryId!, params),
    enabled: !!beneficiaryId?.trim(),
    retry: false,
  });
}

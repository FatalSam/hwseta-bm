import { assignmentToBeneficiaryRow } from '@/lib/buildFeedbackAssignments';
import { mockGetFormFeedback, mockListFormFeedbackAssignments } from '@/data/mockFormFeedback';
import type {
  BeneficiaryFeedbackFormRow,
  BeneficiaryFeedbackFormsParams,
  BeneficiaryFeedbackFormsResult,
} from '@/types/beneficiaryFeedbackForms';

/** Default mock beneficiary when API is offline (matches seed data). */
export const MOCK_DEFAULT_BENEFICIARY_ID = 'b-001';

function mapParams(params: BeneficiaryFeedbackFormsParams = {}) {
  const completionStatus =
    params.completionStatus ??
    (params.status === 'completed' || params.status === 'pending' ? params.status : null);
  return {
    page: params.page,
    pageSize: params.pageSize,
    completionStatus,
    search: params.search,
  };
}

export function mockListMyFeedbackForms(
  params?: BeneficiaryFeedbackFormsParams,
): BeneficiaryFeedbackFormsResult {
  const paged = mockListFormFeedbackAssignments(mapParams(params), {
    beneficiaryId: MOCK_DEFAULT_BENEFICIARY_ID,
  });
  return {
    ...paged,
    items: paged.items.map(assignmentToBeneficiaryRow),
  };
}

export function mockListAdminBeneficiaryFeedbackForms(
  beneficiaryId: string,
  params?: BeneficiaryFeedbackFormsParams,
): BeneficiaryFeedbackFormsResult {
  const paged = mockListFormFeedbackAssignments(mapParams(params), { beneficiaryId });
  return {
    ...paged,
    items: paged.items.map(assignmentToBeneficiaryRow),
  };
}

export function mockGetMyFeedbackFormResponse(
  responseId: string,
  beneficiaryId = MOCK_DEFAULT_BENEFICIARY_ID,
): BeneficiaryFeedbackFormRow | null {
  const detail = mockGetFormFeedback(responseId);
  if (!detail) return null;
  if (detail.beneficiaryId && detail.beneficiaryId !== beneficiaryId) return null;
  const assignment = mockListFormFeedbackAssignments(
    { page: 1, pageSize: 500 },
    { beneficiaryId },
  ).items.find((a) => a.responseId === responseId);
  if (assignment) return assignmentToBeneficiaryRow(assignment);
  return {
    distributionId: detail.distributionId ?? '',
    formId: detail.formId,
    formTitle: detail.formTitle,
    audienceType: '',
    channels: [],
    status: 'sent',
    completionStatus: 'completed',
    createdAt: detail.submittedAt,
    sentAt: null,
    submittedAt: detail.submittedAt,
    notificationId: detail.notificationId,
    responseId: detail.responseId,
    beneficiaryId: detail.beneficiaryId,
    formLink: '',
    notificationCount: 0,
  };
}

export function mockGetBeneficiaryFeedbackSummary(beneficiaryId: string): {
  pending: number;
  completed: number;
} {
  const rows = mockListFormFeedbackAssignments({ page: 1, pageSize: 500 }, { beneficiaryId }).items;
  return {
    pending: rows.filter((r) => r.completionStatus === 'pending').length,
    completed: rows.filter((r) => r.completionStatus === 'completed').length,
  };
}

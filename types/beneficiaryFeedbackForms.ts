import type { FeedbackCompletionStatus } from '@/types/formFeedback';

export interface BeneficiaryFeedbackFormRow {
  distributionId: string;
  formId: string;
  formTitle: string;
  audienceType: string;
  programmeId?: number | null;
  programmeName?: string | null;
  qualificationId?: number | null;
  qualificationName?: string | null;
  channels: string[];
  /** @deprecated use deliveryStatus */
  status: string;
  deliveryStatus?: string | null;
  completionStatus: FeedbackCompletionStatus;
  createdAt: string;
  sentAt?: string | null;
  submittedAt?: string | null;
  notificationId?: string | null;
  responseId?: string | null;
  beneficiaryId?: string | null;
  fullName?: string | null;
  email?: string | null;
  cellphone?: string | null;
  shortLink?: string | null;
  formLink: string;
  notificationCount: number;
}

export interface BeneficiaryFeedbackFormsParams {
  page?: number;
  pageSize?: number;
  /** Filter by completion: pending | completed */
  completionStatus?: FeedbackCompletionStatus | null;
  /** @deprecated use completionStatus — kept for API compat */
  status?: string | null;
  search?: string | null;
}

export interface BeneficiaryFeedbackFormsResult {
  items: BeneficiaryFeedbackFormRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

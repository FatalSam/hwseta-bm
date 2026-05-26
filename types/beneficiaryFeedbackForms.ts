import type { NotificationStatus } from '@/types/formSubmissions';

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
  status: NotificationStatus | string;
  createdAt: string;
  sentAt?: string | null;
  notificationId?: string | null;
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

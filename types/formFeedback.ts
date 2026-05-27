import type { FormSettings } from '@/types/dynamicForm';

export type FeedbackCompletionStatus = 'pending' | 'completed';

export type FormFeedbackRecipientType = 'beneficiary' | 'external' | 'unknown';

export interface FormFeedbackAnswerRow {
  fieldId: string;
  label: string;
  value: string;
}

export interface FormFeedbackAssignmentRow {
  assignmentId: string;
  formId: string;
  formTitle: string;
  distributionId: string;
  notificationId?: string | null;
  recipientType: FormFeedbackRecipientType;
  beneficiaryId?: string | null;
  fullName?: string | null;
  email?: string | null;
  cellphone?: string | null;
  completionStatus: FeedbackCompletionStatus;
  responseId?: string | null;
  submittedAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  deliveryStatus?: string | null;
  formLink: string;
  channels: string[];
  programmeName?: string | null;
  qualificationName?: string | null;
  audienceType?: string | null;
  answersSummary?: string | null;
}

export interface FormFeedbackListRow {
  responseId: string;
  formId: string;
  formTitle: string;
  distributionId?: string | null;
  notificationId?: string | null;
  recipientType: FormFeedbackRecipientType;
  beneficiaryId?: string | null;
  fullName?: string | null;
  email?: string | null;
  cellphone?: string | null;
  submittedAt: string;
  answersSummary?: string | null;
  completionStatus?: FeedbackCompletionStatus;
}

export interface FormFeedbackDetail extends FormFeedbackListRow {
  payload: Record<string, string | string[]>;
  settings: FormSettings;
  answers: FormFeedbackAnswerRow[];
  createdByUserId?: string | null;
  completionStatus: FeedbackCompletionStatus;
}

export interface FormFeedbackListParams {
  page?: number;
  pageSize?: number;
  formId?: string | null;
  distributionId?: string | null;
  recipientType?: FormFeedbackRecipientType | 'beneficiary' | 'external' | null;
  completionStatus?: FeedbackCompletionStatus | null;
  submittedFrom?: string | null;
  submittedTo?: string | null;
  search?: string | null;
}

export interface FormFeedbackSubmitContext {
  formId: string;
  formTitle?: string;
  payload: Record<string, unknown>;
  distributionId?: string | null;
  notificationId?: string | null;
  createdByUserId?: string | null;
  settings?: FormSettings;
}

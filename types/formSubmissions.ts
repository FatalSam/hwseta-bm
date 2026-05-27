export type AudienceType = 'all_beneficiaries' | 'by_programme' | 'external';

export type DistributionChannel = 'email' | 'sms';

export type NotificationChannel = 'email' | 'sms';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

export type DistributionStatus =
  | 'Queued'
  | 'Processing'
  | 'Completed'
  | 'CompletedWithFailures'
  | 'Failed';

export interface ExternalRecipientInput {
  fullName?: string;
  email?: string;
  cellphone?: string;
}

export interface FormDistributionCreatePayload {
  formId: string;
  formTitle?: string;
  audienceType: AudienceType;
  programmeId?: string | null;
  programmeName?: string | null;
  qualificationId?: string | null;
  qualificationName?: string | null;
  channels: DistributionChannel[];
  emailSubject?: string;
  emailBody?: string;
  smsBody?: string;
  externalRecipients?: ExternalRecipientInput[];
  createdByUserId: string;
}

export interface FormDistributionRow {
  distributionId: string;
  formId: string;
  formTitle: string;
  audienceType: AudienceType;
  programmeId?: string | null;
  programmeName?: string | null;
  qualificationId?: string | null;
  qualificationName?: string | null;
  channels: DistributionChannel[];
  status: DistributionStatus;
  createdAt: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  emailSubject?: string | null;
  emailBody?: string | null;
  smsBody?: string | null;
}

export interface FormDistributionNotificationRow {
  notificationId: string;
  distributionId: string;
  recipientType: 'beneficiary' | 'external';
  beneficiaryId?: string | null;
  fullName: string;
  email?: string | null;
  cellphone?: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: string | null;
  errorMessage?: string | null;
  shortLink?: string | null;
  formLink: string;
  providerMessageId?: string | null;
  retryCount?: number;
  completionStatus?: 'pending' | 'completed' | null;
  responseId?: string | null;
  feedbackSubmittedAt?: string | null;
}

export interface FormDistributionListParams {
  page?: number;
  pageSize?: number;
  formId?: string | null;
  audienceType?: AudienceType | null;
  status?: DistributionStatus | string | null;
  search?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
}

export interface FormDistributionNotificationListParams {
  page?: number;
  pageSize?: number;
  channel?: NotificationChannel | null;
  status?: NotificationStatus | string | null;
  search?: string | null;
  sentFrom?: string | null;
  sentTo?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface FormDistributionCreateResult {
  distributionId: string;
  status: DistributionStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
}

export interface FormDistributionSendResult {
  distributionId: string;
  processedCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
}

export interface ShortLinkResult {
  code: string;
  shortUrl: string;
  targetUrl: string;
  formId?: string;
  expiresAt?: string | null;
}

export interface ResolvedRecipient {
  recipientType: 'beneficiary' | 'external';
  beneficiaryId?: string | null;
  fullName: string;
  email?: string | null;
  cellphone?: string | null;
}

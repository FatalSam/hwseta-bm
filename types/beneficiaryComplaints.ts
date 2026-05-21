/** Beneficiary complaints API — aligns with Postman `HWSETA API - Beneficiary complaints`. */

export type ComplaintAgainstTypeId = 1 | 2 | 3;

/** NVARCHAR(128) training provider / employer ids from programme links. */
export type ComplaintPartyId = string;

export interface BeneficiaryComplaintsLookups {
  complaintsStatuses: ComplaintStatusOption[];
  complaintAgainstTypes: ComplaintAgainstTypeOption[];
}

export interface ComplaintStatusOption {
  complaintsStatusId: number;
  code: string;
  description: string;
  sortOrder: number;
}

export interface ComplaintAgainstTypeOption {
  complaintAgainstTypeId: number;
  code: string;
  description: string;
  sortOrder: number;
}

/** `GET /api/beneficiary/complaints/complaint-types` — FK for create payload. */
export interface ComplaintTypeOption {
  complaintTypeId: number;
  complaintTypeName: string;
  category?: string | null;
  sortOrder: number;
}

export interface CreateBeneficiaryComplaintPayload {
  complaintAgainstTypeId: ComplaintAgainstTypeId;
  trainingProviderId: ComplaintPartyId | null;
  employerId: ComplaintPartyId | null;
  fullName: string;
  idNumber?: string | null;
  contactNumber: string;
  emailAddress?: string | null;
  preferredContactMethod: string[];
  incidentLocation?: string | null;
  complaintTypeId: number;
  staffMemberName: string;
  incidentDate?: string | null;
  description: string;
  consent: boolean;
  trainingProviderAddress?: string | null;
  employerAddress?: string | null;
  /** Default true on API; send explicitly for clarity. */
  validateAgainstProgrammeLinks?: boolean;
}

export interface BeneficiaryComplaintCreated {
  beneficiaryComplaintId: string;
  complaintReference?: string | null;
  complaintsStatusId?: number;
  complaintsStatus?: string | null;
  complaintAgainstTypeId?: number;
  complaintAgainstType?: string | null;
  dateCreated?: string | null;
}

export interface BeneficiaryComplaintListItem {
  beneficiaryComplaintId: string;
  complaintReference?: string | null;
  complaintsStatusId?: number;
  complaintsStatus?: string | null;
  /** Human-readable status label from API (grid). */
  complaintsStatusDescription?: string | null;
  complaintAgainstTypeId?: number;
  complaintAgainstType?: string | null;
  complaintTypeId?: number | null;
  /** Resolved type label from API (list grid). */
  complaintType?: string | null;
  complaintTypeName?: string | null;
  incidentDate?: string | null;
  trainingProviderId?: string | null;
  employerId?: string | null;
  trainingProviderName?: string | null;
  employerName?: string | null;
  portalUserDisplayName?: string | null;
  visibleActivityCount?: number | null;
  lastVisibleActivityType?: string | null;
  lastVisibleActivityDate?: string | null;
  lastVisibleActivityMessagePreview?: string | null;
  dateCreated?: string | null;
}

export interface BeneficiaryComplaintsListResult {
  items: BeneficiaryComplaintListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** `GET /api/beneficiary/complaints/{id}/activities` — beneficiary-visible timeline rows. */
export interface BeneficiaryComplaintActivity {
  activityId?: string;
  beneficiaryComplaintId?: string;
  activityType?: string | null;
  message?: string | null;
  dateCreated?: string | null;
  createdAt?: string | null;
  isVisibleToBeneficiary?: boolean | null;
  /** Allow extra API fields without breaking clients. */
  [key: string]: unknown;
}

export interface PostBeneficiaryComplaintMessagePayload {
  message: string;
}

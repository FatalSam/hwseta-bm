export type BeneficiaryEntityId = number | string;

export type BeneficiaryProfileSavePayload = Record<string, unknown>;

export type BeneficiaryProfileRecord = Record<string, unknown>;

/** `GET /api/Dropdowns/stipend-frequencies` — same shape as salary-groups (`id`, `name`). */
export interface StipendFrequencyOption {
  id: BeneficiaryEntityId;
  name: string;
}

/**
 * Employment fields on `GET/PUT /api/beneficiary/profile`.
 * `stipendPayFrequency` stores the dropdown `name` string (max 50 chars), like `salaryGroup`.
 */
export interface BeneficiaryProfileEmploymentFields {
  stipend?: boolean | null;
  stipendPayFrequency?: string | null;
  salaryGroup?: string | null;
  employmentTypeStatus?: string | null;
  employmentNoteComment?: string | null;
}

export interface ProgrammeLinkOption {
  id: BeneficiaryEntityId;
  name: string;
  qualificationId?: BeneficiaryEntityId | null;
  qualificationName?: string | null;
}

export interface BeneficiaryProfileOptions {
  programmes: ProgrammeLinkOption[];
  trainingProviders: ProgrammeLinkOption[];
  employers: ProgrammeLinkOption[];
}

export interface BeneficiaryProgrammeLink {
  beneficiaryProgrammeLinkId?: BeneficiaryEntityId;
  programmeId?: BeneficiaryEntityId | null;
  programmeName?: string | null;
  qualificationId?: BeneficiaryEntityId | null;
  qualificationName?: string | null;
  customQualificationName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  trainingProviderId?: BeneficiaryEntityId | null;
  trainingProviderName?: string | null;
  employerId?: BeneficiaryEntityId | null;
  employerName?: string | null;
  programmeCompletionStatusId?: BeneficiaryEntityId | null;
  programmeCompletionStatus?: string | null;
  completionReasonId?: BeneficiaryEntityId | null;
  completionReasonDescription?: string | null;
  otherReasonText?: string | null;
  documents?: BeneficiaryProgrammeLinkDocument[] | null;
  notes?: string | null;
  [key: string]: unknown;
}

export interface BeneficiaryProgrammeLinkPayload {
  programmeId: BeneficiaryEntityId | null;
  programmeName: string | null;
  qualificationId?: BeneficiaryEntityId | null;
  customQualificationName?: string | null;
  startDate: string | null;
  endDate: string | null;
  trainingProviderId: BeneficiaryEntityId | null;
  trainingProviderName: string | null;
  employerId: BeneficiaryEntityId | null;
  employerName: string | null;
  programmeCompletionStatusId: BeneficiaryEntityId | null;
  completionReasonId: BeneficiaryEntityId | null;
  otherReasonText: string | null;
  notes: string | null;
}

export interface ProgrammeCompletionStatusOption {
  programmeCompletionStatusId: BeneficiaryEntityId;
  programmeCompletionStatus: string;
  isActive?: boolean;
}

export interface ProgrammeCompletionStatusReasonOption {
  completionReasonId: BeneficiaryEntityId;
  programmeCompletionStatusId: BeneficiaryEntityId;
  completionReasonDescription: string;
  isActive?: boolean;
}

export interface BeneficiaryProgrammeLinkDocument {
  beneficiaryProgrammeLinkDocumentId?: BeneficiaryEntityId;
  originalFileName?: string | null;
  storedFileName?: string | null;
  contentType?: string | null;
  fileExtension?: string | null;
  fileSizeBytes?: number | null;
  storagePath?: string | null;
  fileUrl?: string | null;
  /** User-facing label captured at upload time (API: documentTitle). */
  documentTitle?: string | null;
  /** Combined first + last name from HW_Users (API: uploadedBy). */
  uploadedBy?: string | null;
  isActive?: boolean;
  dateCreated?: string | null;
}

export interface BeneficiaryProgrammeQualificationLookup {
  qualificationId: BeneficiaryEntityId | null;
  qualificationName: string | null;
}

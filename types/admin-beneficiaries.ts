export type AdminEntityId = number | string;

export interface AdminBeneficiary {
  beneficiaryId?: AdminEntityId;
  userId?: AdminEntityId | null;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  raceGroup?: string | null;
  idNumber_Passport?: string | null;
  dob?: string | null;
  cellNo?: string | null;
  emailAddress?: string | null;
  physicalAddressProvince?: string | null;
  status?: string | null;
  registrationDate?: string | null;
  notes?: string | null;
  createdByUserId?: number | null;
  lastModifiedByUserId?: number | null;
  programmeLinksCount?: number;
  programmeDocumentsCount?: number;
  [key: string]: unknown;
}

export interface AdminBeneficiaryPagedResult {
  items: AdminBeneficiary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AdminBeneficiaryListParams {
  page?: number;
  pageSize?: number;
  registrationFrom?: string | null;
  registrationTo?: string | null;
  status?: string | null;
  createdByUserId?: number | null;
  search?: string | null;
  employerId?: AdminEntityId | null;
  trainingProviderId?: AdminEntityId | null;
  provinceId?: AdminEntityId | null;
  province?: string | null;
  municipality?: string | null;
  area?: string | null;
}

export interface AdminBeneficiarySavePayload {
  userId?: AdminEntityId | null;
  firstName: string;
  lastName: string;
  gender?: string | null;
  raceGroup?: string | null;
  idNumber_Passport?: string | null;
  dob?: string | null;
  cellNo?: string | null;
  emailAddress?: string | null;
  physicalAddressProvince?: string | null;
  status?: string | null;
  registrationDate?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

/** Admin beneficiary SMS thread (GET /api/Admin/beneficiaries/{id}/sms). */
export interface AdminBeneficiarySmsRecord {
  smsId: string;
  beneficiaryId: string;
  sentDate: string;
  cellphoneNr: string;
  message: string;
  createdBy: string;
  sentByName: string;
}

export interface AdminBeneficiarySmsListResponse {
  count: number;
  items: AdminBeneficiarySmsRecord[];
}

export interface AdminBeneficiarySendSmsPayload {
  cellphoneNr: string;
  message: string;
}

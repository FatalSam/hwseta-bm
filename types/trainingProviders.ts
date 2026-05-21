/** HW_TrainingProviders — matches `api/TrainingProviders` JSON (camelCase). */

export type TrainingProviderId = number | string;

export interface TrainingProvider {
  trainingProviderId?: TrainingProviderId;
  trainingProviderName?: string;
  subSector?: string;
  physicalAddress1?: string;
  physicalAddress2?: string;
  physicalAddress3?: string;
  physicalAddressCode?: string;
  /** Text fields for API (preferred over ids for HW_TrainingProviders save) */
  province?: string | null;
  municipality?: string | null;
  district?: string | null;
  /** Area / suburb (e.g. LONEHILL) — aligns with physicalAddress2 in many payloads */
  area?: string;
  /** Postal / area code — aligns with physicalAddressCode */
  code?: string;
  provinceId?: number;
  municipalityId?: number;
  districtId?: number;
  telephoneNo?: string;
  emailAddress?: string;
  status?: string;
  accreditationNumber?: string;
  sdlNumber?: string;
  registrationDate?: string | null;
  companyRegNo?: string;
  contactPersonFirstName?: string;
  contactPersonLastName?: string;
  contactPersonTelNo?: string;
  contactPersonEmail?: string;
  contactMobileNo?: string;
  designation?: string;
  webAddress?: string;
  comments?: string;
  /** HW_AccreditationBodies — when ETQA is true (multi-select) */
  accreditationBodyIds?: number[];
  etqa?: boolean;
  softSkills?: boolean;
  technicalSkills?: boolean;
  createdBy?: number;
}

/** Body for POST create (no id). */
export type TrainingProviderCreatePayload = Omit<TrainingProvider, 'trainingProviderId' | 'registrationDate'> & {
  trainingProviderName: string;
  createdBy: number;
  registrationDate?: string | null;
};

/** Body for PUT (full replace per Postman). */
export type TrainingProviderUpdatePayload = TrainingProviderCreatePayload;

/** `GET /api/TrainingProviders/{id}/accreditation-bodies` — junction rows */
export interface TrainingProviderAccreditationBodyLink {
  accreditationBodyId?: number;
  name?: string;
  abbreviation?: string;
}

/** `PUT /api/TrainingProviders/{id}/accreditation-bodies` — replaces full selection */
export type TrainingProviderAccreditationBodiesPutPayload = {
  accreditationBodyIds: number[];
};

export interface TrainingProviderAction {
  actionTrackId?: TrainingProviderId;
  actionTaken?: string;
  notes?: string;
  capturedBy?: string;
}

export interface TrainingProviderActionCreatePayload {
  actionTaken: string;
  notes?: string;
  capturedBy?: string;
}

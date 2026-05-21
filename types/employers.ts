/** HW_Employers — matches `api/Employers` JSON (camelCase). */

export type EmployerId = number | string;

export interface Employer {
  employerId?: EmployerId;
  employerName?: string;
  subSector?: string;
  physicalAddress1?: string;
  physicalAddress2?: string;
  physicalAddress3?: string;
  physicalAddressCode?: string;
  /** Text fields for API (preferred over ids for HW_Employers save) */
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
  etqa?: boolean;
  softSkills?: boolean;
  technicalSkills?: boolean;
  createdBy?: number;
}

export type EmployerCreatePayload = Omit<Employer, 'employerId' | 'registrationDate'> & {
  employerName: string;
  createdBy: number;
  registrationDate?: string | null;
};

export type EmployerUpdatePayload = EmployerCreatePayload;

/** `GET /api/Employers/{id}/accreditation-bodies` — junction rows */
export interface EmployerAccreditationBodyLink {
  accreditationBodyId?: number;
  name?: string;
  abbreviation?: string;
}

/** `PUT /api/Employers/{id}/accreditation-bodies` — replaces full selection */
export type EmployerAccreditationBodiesPutPayload = {
  accreditationBodyIds: number[];
};

/** Form state: employer PUT body + ETQA-linked bodies (separate API). */
export type EmployerFormDraft = EmployerUpdatePayload & {
  accreditationBodyIds: number[];
};

export interface EmployerAction {
  actionTrackId?: EmployerId;
  actionTaken?: string;
  notes?: string;
  capturedBy?: string;
}

/** `actionTaken` is limited to 200 characters in the database. */
export interface EmployerActionCreatePayload {
  actionTaken: string;
  notes?: string;
  capturedBy?: string;
}

export const EMPLOYER_ACTION_TAKEN_MAX_LENGTH = 200;

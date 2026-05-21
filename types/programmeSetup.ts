/** HWSETA programme setup + programmes API (camelCase JSON). */

export type EntityId = number | string;
export type UserAuditId = string;

export interface Programme {
  programmeId?: EntityId;
  programmeName?: string;
  programmeTypeId?: number | null;
  programmeSubTypeId?: number | null;
  qualificationId?: number | null;
  setaId?: number;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: string;
  active?: boolean;
  createdByUserId?: UserAuditId;
  lastModifiedByUserId?: UserAuditId;
  description?: string;
  documentTypeIds?: number[];
  organisationId?: number;
}

export type ProgrammeCreatePayload = {
  programmeName: string;
  programmeTypeId: number;
  programmeSubTypeId?: number | null;
  qualificationId?: number | null;
  setaId: number;
  startDate: string;
  endDate: string;
  budget: number;
  status: string;
  active: boolean;
  createdByUserId: UserAuditId;
  description?: string;
  documentTypeIds: number[];
  organisationId: number;
};

export type ProgrammeUpdatePayload = Omit<ProgrammeCreatePayload, 'createdByUserId'> & {
  lastModifiedByUserId: UserAuditId;
  createdByUserId: UserAuditId;
};

/** HW_ProgrammeStatus — list from GET /api/programmes-setup/programme-status */
export interface ProgrammeStatusRow {
  id: number;
  status: string;
}

export interface ProgrammeTypeRow {
  programmeTypeId?: EntityId;
  programmeTypeName?: string;
  description?: string;
  active?: boolean;
  createdByUserId?: UserAuditId;
  lastModifiedByUserId?: UserAuditId;
  organisationId?: number;
}

export interface ProgrammeSubTypeRow {
  programmeSubTypeId?: EntityId;
  programmeTypeId?: number;
  subTypeName?: string;
  description?: string;
  active?: boolean;
  createdByUserId?: UserAuditId;
  lastModifiedByUserId?: UserAuditId;
  organisationId?: number;
}

export interface SetaRow {
  setaId?: EntityId;
  setaName?: string;
  setaCode?: string;
  contactEmail?: string;
  active?: boolean;
  createdByUserId?: UserAuditId;
  lastModifiedByUserId?: UserAuditId;
}

/** HW_AccreditationBodies — `GET /api/programmes-setup/accreditation-bodies` */
export interface AccreditationBodyRow {
  accreditationBodyId?: EntityId;
  name?: string;
  abbreviation?: string;
  active?: boolean;
  createdByUserId?: UserAuditId;
  lastModifiedByUserId?: UserAuditId;
}

export interface NqfLevelRow {
  nqfLevelId?: EntityId;
  levelNumber?: number;
  levelName?: string;
  description?: string;
  active?: boolean;
  createdByUserId?: UserAuditId;
  lastModifiedByUserId?: UserAuditId;
}

/** HW_SubSector — `/api/programmes-setup/subsectors` */
export interface SubSectorRow {
  subSectorId?: EntityId;
  subSectorName?: string;
}

export interface QualificationRow {
  qualificationId?: EntityId;
  qualificationName?: string;
  qualificationCode?: string;
  nqfLevelId?: number;
  subSectorId?: number;
  totalCredits?: number;
  notionalHours?: number;
  description?: string;
  active?: boolean;
  createdByUserId?: UserAuditId;
  lastModifiedByUserId?: UserAuditId;
  organisationId?: number;
}

export interface UnitStandardRow {
  unitStandardId?: EntityId;
  qualificationId?: number;
  unitStandardCode?: string;
  unitStandardName?: string;
  credits?: number;
  notionalHours?: number;
  active?: boolean;
  createdByUserId?: UserAuditId;
  lastModifiedByUserId?: UserAuditId;
  organisationId?: number;
}

export interface ProgrammeDocumentMappingRow {
  documentTypeMappingId?: EntityId;
  programmeTypeId?: number;
  programmeId?: number;
  documentTypeId?: number;
  organisationId?: number;
}

export interface SetupDocumentTypeRow {
  documentTypeId?: EntityId;
  documentType?: string;
  documentCategory?: string;
}

import apiClient from '@/ultis/apiClient';
import type {
  AccreditationBodyRow,
  NqfLevelRow,
  Programme,
  ProgrammeCreatePayload,
  ProgrammeDocumentMappingRow,
  ProgrammeStatusRow,
  ProgrammeSubTypeRow,
  ProgrammeTypeRow,
  ProgrammeUpdatePayload,
  QualificationRow,
  SetaRow,
  SubSectorRow,
  SetupDocumentTypeRow,
  UserAuditId,
  UnitStandardRow,
} from '@/types/programmeSetup';

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.results)) return o.results as T[];
    if (Array.isArray(o.value)) return o.value as T[];
  }
  return [];
}

/** Map HWSETA / .NET payload shapes into `SetupDocumentTypeRow`. */
function normalizeSetupDocumentTypeFromApi(raw: unknown): SetupDocumentTypeRow | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const idRaw =
    o.documentTypeId ?? o.documentTypeID ?? o.DocumentTypeID ?? o.id ?? o.ID;
  const idNum = typeof idRaw === 'number' ? idRaw : Number(String(idRaw ?? '').trim());
  if (!Number.isFinite(idNum) || idNum <= 0) return null;
  const nameRaw =
    o.documentType ??
    o.DocumentType ??
    o.name ??
    o.Name ??
    o.documentTypeName ??
    o.DocumentTypeName;
  const documentType = nameRaw == null ? '' : String(nameRaw);
  const catRaw = o.documentCategory ?? o.DocumentCategory;
  const documentCategory = catRaw == null ? undefined : String(catRaw);
  return { documentTypeId: idNum, documentType, documentCategory };
}

/** Programmes (HW_Programmes) */
export async function listProgrammes(organisationId: number): Promise<Programme[]> {
  const { data } = await apiClient.get<unknown>('/api/Programmes', {
    params: { organisationId },
  });
  return normalizeList<Programme>(data);
}

export async function getProgramme(programmeId: number | string): Promise<Programme> {
  const { data } = await apiClient.get<Programme>(`/api/Programmes/${programmeId}`);
  return data;
}

export async function createProgramme(body: ProgrammeCreatePayload): Promise<Programme> {
  const { data } = await apiClient.post<Programme>('/api/Programmes', body);
  return data;
}

export async function updateProgramme(
  programmeId: number | string,
  body: ProgrammeUpdatePayload
): Promise<Programme> {
  const { data } = await apiClient.put<Programme>(`/api/Programmes/${programmeId}`, body);
  return data;
}

export async function deleteProgramme(
  programmeId: number | string,
  organisationId: number,
  modifiedByUserId: UserAuditId
): Promise<void> {
  await apiClient.delete(`/api/Programmes/${programmeId}`, {
    params: { organisationId, modifiedByUserId },
  });
}

function normalizeProgrammeStatusFromApi(raw: unknown): ProgrammeStatusRow | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const idRaw = o.id ?? o.ID;
  const idNum = typeof idRaw === 'number' ? idRaw : Number(idRaw);
  if (!Number.isFinite(idNum)) return null;
  const statusRaw = o.status ?? o.Status;
  const status = statusRaw == null ? '' : String(statusRaw).trim();
  if (!status) return null;
  return { id: idNum, status };
}

/** HW_ProgrammeStatus reference data */
export async function listProgrammeStatuses(): Promise<ProgrammeStatusRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/programme-status');
  const rawList = normalizeList<unknown>(data);
  const rows = rawList
    .map((item) => normalizeProgrammeStatusFromApi(item))
    .filter((row): row is ProgrammeStatusRow => row != null);
  rows.sort((a, b) => a.id - b.id);
  return rows;
}

/** Programme types */
export async function listProgrammeTypes(
  organisationId: number,
  includeInactive = true
): Promise<ProgrammeTypeRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/types', {
    params: { organisationId, includeInactive },
  });
  return normalizeList<ProgrammeTypeRow>(data);
}

export async function createProgrammeType(body: {
  programmeTypeName: string;
  description?: string;
  active: boolean;
  createdByUserId: UserAuditId;
  organisationId: number;
}): Promise<ProgrammeTypeRow> {
  const { data } = await apiClient.post<ProgrammeTypeRow>('/api/programmes-setup/types', body);
  return data;
}

export async function updateProgrammeType(
  id: number | string,
  body: {
    programmeTypeName: string;
    description?: string;
    active: boolean;
    lastModifiedByUserId: UserAuditId;
    organisationId: number;
  }
): Promise<ProgrammeTypeRow> {
  const { data } = await apiClient.put<ProgrammeTypeRow>(
    `/api/programmes-setup/types/${id}`,
    body
  );
  return data;
}

export async function deleteProgrammeType(
  id: number | string,
  organisationId: number,
  modifiedByUserId: UserAuditId
): Promise<void> {
  await apiClient.delete(`/api/programmes-setup/types/${id}`, {
    params: { organisationId, modifiedByUserId },
  });
}

/** Programme sub-types */
export async function listProgrammeSubTypes(
  organisationId: number,
  programmeTypeId: number,
  includeInactive = true
): Promise<ProgrammeSubTypeRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/sub-types', {
    params: { organisationId, programmeTypeId, includeInactive },
  });
  return normalizeList<ProgrammeSubTypeRow>(data);
}

export async function createProgrammeSubType(body: {
  programmeTypeId: number;
  subTypeName: string;
  description?: string;
  active: boolean;
  createdByUserId: UserAuditId;
  organisationId: number;
}): Promise<ProgrammeSubTypeRow> {
  const { data } = await apiClient.post<ProgrammeSubTypeRow>(
    '/api/programmes-setup/sub-types',
    body
  );
  return data;
}

export async function updateProgrammeSubType(
  id: number | string,
  body: {
    programmeTypeId: number;
    subTypeName: string;
    active: boolean;
    lastModifiedByUserId: UserAuditId;
    organisationId: number;
  }
): Promise<ProgrammeSubTypeRow> {
  const { data } = await apiClient.put<ProgrammeSubTypeRow>(
    `/api/programmes-setup/sub-types/${id}`,
    body
  );
  return data;
}

export async function deleteProgrammeSubType(
  id: number | string,
  organisationId: number,
  modifiedByUserId: UserAuditId
): Promise<void> {
  await apiClient.delete(`/api/programmes-setup/sub-types/${id}`, {
    params: { organisationId, modifiedByUserId },
  });
}

/** SETAs */
export async function listSetas(includeInactive = true): Promise<SetaRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/setas', {
    params: { includeInactive },
  });
  return normalizeList<SetaRow>(data);
}

export async function createSeta(body: {
  setaName: string;
  setaCode: string;
  contactEmail?: string;
  active: boolean;
  createdByUserId: UserAuditId;
}): Promise<SetaRow> {
  const { data } = await apiClient.post<SetaRow>('/api/programmes-setup/setas', body);
  return data;
}

export async function updateSeta(
  id: number | string,
  body: {
    setaName: string;
    setaCode: string;
    active: boolean;
    lastModifiedByUserId: UserAuditId;
  }
): Promise<SetaRow> {
  const { data } = await apiClient.put<SetaRow>(`/api/programmes-setup/setas/${id}`, body);
  return data;
}

export async function deleteSeta(id: number | string, modifiedByUserId: UserAuditId): Promise<void> {
  await apiClient.delete(`/api/programmes-setup/setas/${id}`, {
    params: { modifiedByUserId },
  });
}

function normalizeAccreditationBodyFromApi(raw: unknown): AccreditationBodyRow | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const idRaw =
    o.accreditationBodyId ?? o.AccreditationBodyID ?? o.AccreditationBodyId ?? o.id ?? o.ID;
  const idNum = typeof idRaw === 'number' ? idRaw : Number(String(idRaw ?? '').trim());
  if (!Number.isFinite(idNum) || idNum <= 0) return null;
  const nameRaw = o.name ?? o.Name;
  const abbrRaw = o.abbreviation ?? o.Abbreviation;
  const activeRaw = o.active ?? o.Active;
  return {
    accreditationBodyId: idNum,
    name: nameRaw == null ? undefined : String(nameRaw),
    abbreviation: abbrRaw == null ? undefined : String(abbrRaw),
    active: typeof activeRaw === 'boolean' ? activeRaw : undefined,
  };
}

/** Accreditation bodies (HW_AccreditationBodies) — GET `/api/programmes-setup/accreditation-bodies` */
export async function listAccreditationBodies(includeInactive = true): Promise<AccreditationBodyRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/accreditation-bodies', {
    params: { includeInactive },
  });
  const rawList = normalizeList<unknown>(data);
  const rows = rawList
    .map((item) => normalizeAccreditationBodyFromApi(item))
    .filter((row): row is AccreditationBodyRow => row != null);
  rows.sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
  );
  return rows;
}

/** NQF levels */
export async function listNqfLevels(includeInactive = true): Promise<NqfLevelRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/nqf-levels', {
    params: { includeInactive },
  });
  return normalizeList<NqfLevelRow>(data);
}

export async function createNqfLevel(body: {
  levelNumber: number;
  levelName: string;
  description?: string;
  active: boolean;
  createdByUserId: UserAuditId;
}): Promise<NqfLevelRow> {
  const { data } = await apiClient.post<NqfLevelRow>('/api/programmes-setup/nqf-levels', body);
  return data;
}

export async function updateNqfLevel(
  id: number | string,
  body: {
    levelNumber: number;
    levelName: string;
    active: boolean;
    lastModifiedByUserId: UserAuditId;
  }
): Promise<NqfLevelRow> {
  const { data } = await apiClient.put<NqfLevelRow>(
    `/api/programmes-setup/nqf-levels/${id}`,
    body
  );
  return data;
}

export async function deleteNqfLevel(id: number | string, modifiedByUserId: UserAuditId): Promise<void> {
  await apiClient.delete(`/api/programmes-setup/nqf-levels/${id}`, {
    params: { modifiedByUserId },
  });
}

/** Sub-sectors (HW_SubSector) */
export async function listSubSectors(): Promise<SubSectorRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/subsectors');
  return normalizeList<SubSectorRow>(data);
}

export async function getSubSector(id: number | string): Promise<SubSectorRow> {
  const { data } = await apiClient.get<SubSectorRow>(`/api/programmes-setup/subsectors/${id}`);
  return data;
}

export async function createSubSector(body: { subSectorName: string }): Promise<SubSectorRow> {
  const { data } = await apiClient.post<SubSectorRow>('/api/programmes-setup/subsectors', body);
  return data;
}

export async function updateSubSector(
  id: number | string,
  body: { subSectorName: string }
): Promise<SubSectorRow> {
  const { data } = await apiClient.put<SubSectorRow>(`/api/programmes-setup/subsectors/${id}`, body);
  return data;
}

export async function deleteSubSector(id: number | string): Promise<void> {
  await apiClient.delete(`/api/programmes-setup/subsectors/${id}`);
}

/** Qualifications — API expects a concrete `nqfLevelId`; omitting it returns no rows. */
async function listQualificationsForNqfLevel(
  organisationId: number,
  nqfLevelId: number,
  includeInactive: boolean
): Promise<QualificationRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/qualifications', {
    params: { organisationId, nqfLevelId, includeInactive },
  });
  return normalizeList<QualificationRow>(data);
}

/**
 * List qualifications for one NQF level, or merge across all levels when `nqfLevelId` is omitted
 * (same pattern as manage-mybeneficiary `programmes` workspace “qualifications” with no filter).
 */
export async function listQualifications(
  organisationId: number,
  nqfLevelId?: number,
  includeInactive = true
): Promise<QualificationRow[]> {
  if (nqfLevelId != null && nqfLevelId > 0) {
    return listQualificationsForNqfLevel(organisationId, nqfLevelId, includeInactive);
  }

  const levels = await listNqfLevels(includeInactive);
  const groups = await Promise.all(
    levels.map((level) => {
      const id = Number(level.nqfLevelId);
      if (!Number.isFinite(id) || id <= 0) return Promise.resolve([] as QualificationRow[]);
      return listQualificationsForNqfLevel(organisationId, id, includeInactive).catch(() => []);
    })
  );
  const merged = groups.flat();
  const byKey = new Map<string, QualificationRow>();
  for (const row of merged) {
    const qid = row.qualificationId;
    const key =
      qid != null && String(qid).length > 0
        ? String(qid)
        : `${row.qualificationCode ?? ''}|${row.qualificationName ?? ''}`;
    if (!byKey.has(key)) byKey.set(key, row);
  }
  return Array.from(byKey.values());
}

export async function createQualification(body: {
  qualificationName: string;
  qualificationCode: string;
  nqfLevelId: number;
  subSectorId?: number;
  totalCredits: number;
  notionalHours: number;
  description?: string;
  active: boolean;
  createdByUserId: UserAuditId;
  organisationId: number;
}): Promise<QualificationRow> {
  const { data } = await apiClient.post<QualificationRow>(
    '/api/programmes-setup/qualifications',
    body
  );
  return data;
}

export async function updateQualification(
  id: number | string,
  body: {
    qualificationName: string;
    nqfLevelId: number;
    subSectorId?: number;
    totalCredits: number;
    notionalHours: number;
    active: boolean;
    lastModifiedByUserId: UserAuditId;
    organisationId: number;
  }
): Promise<QualificationRow> {
  const { data } = await apiClient.put<QualificationRow>(
    `/api/programmes-setup/qualifications/${id}`,
    body
  );
  return data;
}

export async function deleteQualification(
  id: number | string,
  organisationId: number,
  modifiedByUserId: UserAuditId
): Promise<void> {
  await apiClient.delete(`/api/programmes-setup/qualifications/${id}`, {
    params: { organisationId, modifiedByUserId },
  });
}

/** Unit standards */
export async function listUnitStandards(
  organisationId: number,
  qualificationId: number,
  includeInactive = true
): Promise<UnitStandardRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/unit-standards', {
    params: { organisationId, qualificationId, includeInactive },
  });
  return normalizeList<UnitStandardRow>(data);
}

export async function createUnitStandard(body: {
  qualificationId: number;
  unitStandardCode: string;
  unitStandardName: string;
  credits: number;
  notionalHours: number;
  active: boolean;
  createdByUserId: UserAuditId;
  organisationId: number;
}): Promise<UnitStandardRow> {
  const { data } = await apiClient.post<UnitStandardRow>(
    '/api/programmes-setup/unit-standards',
    body
  );
  return data;
}

export async function updateUnitStandard(
  id: number | string,
  body: {
    qualificationId: number;
    unitStandardName: string;
    credits: number;
    notionalHours: number;
    active: boolean;
    lastModifiedByUserId: UserAuditId;
    organisationId: number;
  }
): Promise<UnitStandardRow> {
  const { data } = await apiClient.put<UnitStandardRow>(
    `/api/programmes-setup/unit-standards/${id}`,
    body
  );
  return data;
}

export async function deleteUnitStandard(
  id: number | string,
  organisationId: number,
  modifiedByUserId: UserAuditId
): Promise<void> {
  await apiClient.delete(`/api/programmes-setup/unit-standards/${id}`, {
    params: { organisationId, modifiedByUserId },
  });
}

/** Programme document type mappings */
export async function listProgrammeDocumentMappings(
  organisationId: number,
  programmeTypeId?: number,
  programmeId?: number
): Promise<ProgrammeDocumentMappingRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/document-types', {
    params: { organisationId, programmeTypeId, programmeId },
  });
  return normalizeList<ProgrammeDocumentMappingRow>(data);
}

export async function createProgrammeDocumentMapping(body: {
  programmeTypeId: number;
  programmeId: number;
  documentTypeId: number;
  organisationId: number;
}): Promise<ProgrammeDocumentMappingRow> {
  const { data } = await apiClient.post<ProgrammeDocumentMappingRow>(
    '/api/programmes-setup/document-types',
    body
  );
  return data;
}

export async function updateProgrammeDocumentMapping(
  id: number | string,
  body: {
    programmeTypeId: number;
    programmeId: number;
    documentTypeId: number;
    organisationId: number;
  }
): Promise<ProgrammeDocumentMappingRow> {
  const { data } = await apiClient.put<ProgrammeDocumentMappingRow>(
    `/api/programmes-setup/document-types/${id}`,
    body
  );
  return data;
}

export async function deleteProgrammeDocumentMapping(
  id: number | string,
  organisationId: number
): Promise<void> {
  await apiClient.delete(`/api/programmes-setup/document-types/${id}`, {
    params: { organisationId },
  });
}

/** Setup document types (HW_DocumentTypes) */
export async function listSetupDocumentTypes(): Promise<SetupDocumentTypeRow[]> {
  const { data } = await apiClient.get<unknown>('/api/programmes-setup/setup-document-types');
  const rawList = normalizeList<unknown>(data);
  return rawList
    .map((item) => normalizeSetupDocumentTypeFromApi(item))
    .filter((row): row is SetupDocumentTypeRow => row != null);
}

export async function createSetupDocumentType(body: {
  documentType: string;
  documentCategory: string;
}): Promise<SetupDocumentTypeRow> {
  const { data } = await apiClient.post<SetupDocumentTypeRow>(
    '/api/programmes-setup/setup-document-types',
    body
  );
  return data;
}

export async function updateSetupDocumentType(
  id: number | string,
  body: { documentType: string; documentCategory: string }
): Promise<SetupDocumentTypeRow> {
  const { data } = await apiClient.put<SetupDocumentTypeRow>(
    `/api/programmes-setup/setup-document-types/${id}`,
    body
  );
  return data;
}

export async function deleteSetupDocumentType(id: number | string): Promise<void> {
  await apiClient.delete(`/api/programmes-setup/setup-document-types/${id}`);
}

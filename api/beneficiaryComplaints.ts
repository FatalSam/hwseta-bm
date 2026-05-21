import apiClient from '@/ultis/apiClient';
import type {
  BeneficiaryComplaintActivity,
  BeneficiaryComplaintCreated,
  BeneficiaryComplaintListItem,
  BeneficiaryComplaintsListResult,
  BeneficiaryComplaintsLookups,
  ComplaintAgainstTypeOption,
  ComplaintStatusOption,
  ComplaintTypeOption,
  CreateBeneficiaryComplaintPayload,
  PostBeneficiaryComplaintMessagePayload,
} from '@/types/beneficiaryComplaints';

const BASE = '/api/beneficiary/complaints';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function unwrapRecordPayload(data: unknown): Record<string, unknown> {
  const root = asRecord(data) ?? {};
  const nested = asRecord(
    root.data ?? root.Data ?? root.item ?? root.Item ?? root.complaint ?? root.Complaint,
  );
  return nested ? { ...root, ...nested } : root;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = record[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
}

function normalizeStatusOption(raw: unknown): ComplaintStatusOption | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = pickNumber(r, ['complaintsStatusId', 'ComplaintsStatusID']);
  const code = pickString(r, ['code', 'Code']);
  const description = pickString(r, ['description', 'Description']);
  if (id == null || !code || !description) return null;
  return {
    complaintsStatusId: id,
    code,
    description,
    sortOrder: pickNumber(r, ['sortOrder', 'SortOrder']) ?? 0,
  };
}

function normalizeAgainstTypeOption(raw: unknown): ComplaintAgainstTypeOption | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = pickNumber(r, ['complaintAgainstTypeId', 'ComplaintAgainstTypeID']);
  const code = pickString(r, ['code', 'Code']);
  const description = pickString(r, ['description', 'Description']);
  if (id == null || !code || !description) return null;
  return {
    complaintAgainstTypeId: id,
    code,
    description,
    sortOrder: pickNumber(r, ['sortOrder', 'SortOrder']) ?? 0,
  };
}

function normalizeComplaintTypeOption(raw: unknown): ComplaintTypeOption | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = pickNumber(r, ['complaintTypeId', 'ComplaintTypeID']);
  const complaintTypeName = pickString(r, [
    'complaintTypeName',
    'ComplaintTypeName',
    'description',
    'Description',
    'name',
    'Name',
    'displayName',
    'DisplayName',
    'complaintType',
    'ComplaintType',
    'code',
    'Code',
  ]);
  if (id == null || !complaintTypeName) return null;
  const category = pickString(r, ['category', 'Category']) ?? null;
  return {
    complaintTypeId: id,
    complaintTypeName,
    category,
    sortOrder: pickNumber(r, ['sortOrder', 'SortOrder']) ?? 0,
  };
}

/** `GET /api/beneficiary/complaints/complaint-types` */
export async function listBeneficiaryComplaintTypes(): Promise<ComplaintTypeOption[]> {
  const { data } = await apiClient.get<unknown>(`${BASE}/complaint-types`);
  let raw: unknown[] = [];
  if (Array.isArray(data)) raw = data;
  else {
    const obj = asRecord(data);
    if (obj) {
      if (Array.isArray(obj.items)) raw = obj.items;
      else if (Array.isArray(obj.Items)) raw = obj.Items;
      else if (Array.isArray(obj.data)) raw = obj.data;
      else if (Array.isArray(obj.Data)) raw = obj.Data;
      else if (Array.isArray(obj.complaintTypes)) raw = obj.complaintTypes;
      else if (Array.isArray(obj.ComplaintTypes)) raw = obj.ComplaintTypes;
    }
  }
  const options = raw.map(normalizeComplaintTypeOption).filter(Boolean) as ComplaintTypeOption[];
  const isOther = (name: string) => name.trim().toLowerCase() === 'other';
  return options.sort((a, b) => {
    const aOther = isOther(a.complaintTypeName);
    const bOther = isOther(b.complaintTypeName);
    if (aOther !== bOther) return aOther ? 1 : -1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.complaintTypeName.localeCompare(b.complaintTypeName, undefined, { sensitivity: 'base' });
  });
}

export async function getBeneficiaryComplaintsLookups(): Promise<BeneficiaryComplaintsLookups> {
  const { data } = await apiClient.get<unknown>(`${BASE}/lookups`);
  const obj = asRecord(data) ?? {};

  const statusArrays = [
    obj.complaintsStatuses,
    obj.ComplaintsStatuses,
    obj.complaintsStatus,
    obj.statuses,
  ];
  let statusesRaw: unknown[] = [];
  for (const a of statusArrays) {
    if (Array.isArray(a)) {
      statusesRaw = a;
      break;
    }
  }

  const againstArrays = [
    obj.complaintAgainstTypes,
    obj.ComplaintAgainstTypes,
    obj.complaintAgainstType,
    obj.againstTypes,
  ];
  let againstRaw: unknown[] = [];
  for (const a of againstArrays) {
    if (Array.isArray(a)) {
      againstRaw = a;
      break;
    }
  }

  return {
    complaintsStatuses: statusesRaw.map(normalizeStatusOption).filter(Boolean) as BeneficiaryComplaintsLookups['complaintsStatuses'],
    complaintAgainstTypes: againstRaw
      .map(normalizeAgainstTypeOption)
      .filter(Boolean) as BeneficiaryComplaintsLookups['complaintAgainstTypes'],
  };
}

function normalizeListItem(raw: unknown): BeneficiaryComplaintListItem | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = pickString(r, ['beneficiaryComplaintId', 'BeneficiaryComplaintID']);
  if (!id) return null;
  const typeName =
    pickString(r, ['complaintTypeName', 'ComplaintTypeName']) ??
    pickString(r, ['complaintType', 'ComplaintType']);
  return {
    beneficiaryComplaintId: id,
    complaintReference: pickString(r, ['complaintReference', 'ComplaintReference']) ?? null,
    complaintsStatusId: pickNumber(r, ['complaintsStatusId', 'ComplaintsStatusID']),
    complaintsStatus: pickString(r, ['complaintsStatus', 'ComplaintsStatus']),
    complaintsStatusDescription:
      pickString(r, ['complaintsStatusDescription', 'ComplaintsStatusDescription']) ?? null,
    complaintAgainstTypeId: pickNumber(r, ['complaintAgainstTypeId', 'ComplaintAgainstTypeID']),
    complaintAgainstType: pickString(r, ['complaintAgainstType', 'ComplaintAgainstType']),
    complaintTypeId: pickNumber(r, ['complaintTypeId', 'ComplaintTypeID']),
    complaintType: typeName ?? null,
    complaintTypeName: pickString(r, ['complaintTypeName', 'ComplaintTypeName']) ?? null,
    incidentDate: pickString(r, ['incidentDate', 'IncidentDate']),
    trainingProviderId: pickString(r, ['trainingProviderId', 'TrainingProviderID']) ?? null,
    employerId: pickString(r, ['employerId', 'EmployerID']) ?? null,
    trainingProviderName: pickString(r, ['trainingProviderName', 'TrainingProviderName']) ?? null,
    employerName: pickString(r, ['employerName', 'EmployerName']) ?? null,
    portalUserDisplayName:
      pickString(r, ['portalUserDisplayName', 'PortalUserDisplayName', 'displayName', 'DisplayName']) ?? null,
    visibleActivityCount: pickNumber(r, ['visibleActivityCount', 'VisibleActivityCount']) ?? null,
    lastVisibleActivityType:
      pickString(r, ['lastVisibleActivityType', 'LastVisibleActivityType']) ?? null,
    lastVisibleActivityDate:
      pickString(r, ['lastVisibleActivityDate', 'LastVisibleActivityDate', 'lastActivityDate', 'LastActivityDate', 'latestActivityDate', 'LatestActivityDate', 'lastUpdateDate', 'LastUpdateDate']) ?? null,
    lastVisibleActivityMessagePreview:
      pickString(r, [
        'lastVisibleActivityMessagePreview',
        'LastVisibleActivityMessagePreview',
        'lastActivityMessagePreview',
        'messagePreview',
      ]) ?? null,
    dateCreated: pickString(r, ['dateCreated', 'DateCreated']),
  };
}

/** Shared parser for beneficiary complaint list payloads (self-service or admin-by-beneficiary). */
export function parseBeneficiaryComplaintsListPayload(
  data: unknown,
  pageFallback = 1,
  pageSizeFallback = 20,
): BeneficiaryComplaintsListResult {
  const obj = asRecord(data);
  let itemsRaw: unknown[] = [];
  if (Array.isArray(data)) itemsRaw = data;
  else if (obj) {
    if (Array.isArray(obj.items)) itemsRaw = obj.items;
    else if (Array.isArray(obj.Items)) itemsRaw = obj.Items;
  }
  const items = itemsRaw.map(normalizeListItem).filter(Boolean) as BeneficiaryComplaintListItem[];
  const totalCount =
    (obj && pickNumber(obj, ['totalCount', 'TotalCount'])) ??
    (obj && pickNumber(obj, ['total', 'Total'])) ??
    items.length;
  const pageNum = (obj && pickNumber(obj, ['page', 'Page'])) ?? pageFallback;
  const size = (obj && pickNumber(obj, ['pageSize', 'PageSize'])) ?? pageSizeFallback;
  return {
    items,
    totalCount: totalCount ?? items.length,
    page: pageNum,
    pageSize: size,
  };
}

export async function listBeneficiaryComplaints(
  page = 1,
  pageSize = 20,
): Promise<BeneficiaryComplaintsListResult> {
  const { data } = await apiClient.get<unknown>(BASE, { params: { page, pageSize } });
  return parseBeneficiaryComplaintsListPayload(data, page, pageSize);
}

/** Admin workspace: same list shape as self-service, scoped by beneficiary id. */
export async function listBeneficiaryComplaintsForAdmin(
  beneficiaryId: string,
  page = 1,
  pageSize = 50,
): Promise<BeneficiaryComplaintsListResult> {
  const { data } = await apiClient.get<unknown>(
    `/api/Admin/beneficiaries/${encodeURIComponent(beneficiaryId)}/complaints`,
    { params: { page, pageSize } },
  );
  return parseBeneficiaryComplaintsListPayload(data, page, pageSize);
}

export async function getBeneficiaryComplaintById(complaintId: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<unknown>(`${BASE}/${encodeURIComponent(complaintId)}`);
  return unwrapRecordPayload(data);
}

export async function createBeneficiaryComplaint(
  payload: CreateBeneficiaryComplaintPayload,
): Promise<BeneficiaryComplaintCreated> {
  const body = {
    ...payload,
    validateAgainstProgrammeLinks: payload.validateAgainstProgrammeLinks !== false,
  };
  const { data } = await apiClient.post<unknown>(BASE, body);
  const r = asRecord(data) ?? {};
  const beneficiaryComplaintId = pickString(r, ['beneficiaryComplaintId', 'BeneficiaryComplaintID']);
  if (!beneficiaryComplaintId) {
    throw new Error('Invalid response from server: missing complaint id.');
  }
  return {
    beneficiaryComplaintId,
    complaintReference: pickString(r, ['complaintReference', 'ComplaintReference']) ?? null,
    complaintsStatusId: pickNumber(r, ['complaintsStatusId', 'ComplaintsStatusID']),
    complaintsStatus: pickString(r, ['complaintsStatus', 'ComplaintsStatus']),
    complaintAgainstTypeId: pickNumber(r, ['complaintAgainstTypeId', 'ComplaintAgainstTypeID']),
    complaintAgainstType: pickString(r, ['complaintAgainstType', 'ComplaintAgainstType']),
    dateCreated: pickString(r, ['dateCreated', 'DateCreated']),
  };
}

export async function withdrawBeneficiaryComplaint(complaintId: string): Promise<void> {
  await apiClient.patch(`${BASE}/${encodeURIComponent(complaintId)}/withdraw`);
}

function normalizeActivityRow(raw: unknown): BeneficiaryComplaintActivity | null {
  const r = asRecord(raw);
  if (!r) return null;
  const activityId = pickString(r, [
    'activityId',
    'ActivityID',
    'beneficiaryComplaintActivityId',
    'BeneficiaryComplaintActivityID',
    'id',
    'Id',
  ]);
  const merged: BeneficiaryComplaintActivity = {
    ...r,
    activityId,
    beneficiaryComplaintId:
      pickString(r, ['beneficiaryComplaintId', 'BeneficiaryComplaintID']) ?? undefined,
    activityType: pickString(r, ['activityType', 'ActivityType', 'type', 'Type']) ?? null,
    message: pickString(r, ['message', 'Message', 'description', 'Description']) ?? null,
    dateCreated:
      pickString(r, ['dateCreated', 'DateCreated', 'createdAt', 'CreatedAt', 'timestamp', 'Timestamp']) ?? null,
    createdAt: pickString(r, ['createdAt', 'CreatedAt']) ?? null,
    isVisibleToBeneficiary:
      typeof r.isVisibleToBeneficiary === 'boolean'
        ? r.isVisibleToBeneficiary
        : typeof r.IsVisibleToBeneficiary === 'boolean'
          ? r.IsVisibleToBeneficiary
          : null,
  };
  return merged;
}

function normalizeActivitiesPayload(data: unknown): BeneficiaryComplaintActivity[] {
  let raw: unknown[] = [];
  if (Array.isArray(data)) raw = data;
  else {
    const obj = asRecord(data);
    if (obj) {
      if (Array.isArray(obj.items)) raw = obj.items;
      else if (Array.isArray(obj.Items)) raw = obj.Items;
      else if (Array.isArray(obj.data)) raw = obj.data;
      else if (Array.isArray(obj.Data)) raw = obj.Data;
      else if (Array.isArray(obj.activities)) raw = obj.activities;
      else if (Array.isArray(obj.Activities)) raw = obj.Activities;
    }
  }
  return raw.map(normalizeActivityRow).filter(Boolean) as BeneficiaryComplaintActivity[];
}

/** `GET /api/beneficiary/complaints/{complaintId}/activities` — beneficiary-visible timeline. */
export async function getBeneficiaryComplaintActivities(
  complaintId: string,
): Promise<BeneficiaryComplaintActivity[]> {
  const { data } = await apiClient.get<unknown>(
    `${BASE}/${encodeURIComponent(complaintId)}/activities`,
  );
  return normalizeActivitiesPayload(data);
}

/** `POST /api/beneficiary/complaints/{complaintId}/activities/message` — beneficiary reply. */
export async function postBeneficiaryComplaintMessage(
  complaintId: string,
  payload: PostBeneficiaryComplaintMessagePayload,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<unknown>(
    `${BASE}/${encodeURIComponent(complaintId)}/activities/message`,
    payload,
  );
  return asRecord(data) ?? {};
}

// --- Admin (staff) complaints API — see Postman: HWSETA API - Admin complaints ---

const ADMIN_COMPLAINT_BY_ID = '/api/Admin/beneficiary-complaints';

/**
 * `GET /api/Admin/beneficiary-complaints/{complaintId}/activities` — full timeline (incl. internal notes).
 * Same data as the by-beneficiary path; prefer this when you already have the complaint id.
 */
export async function getAdminBeneficiaryComplaintActivities(
  complaintId: string,
): Promise<BeneficiaryComplaintActivity[]> {
  const { data } = await apiClient.get<unknown>(
    `${ADMIN_COMPLAINT_BY_ID}/${encodeURIComponent(complaintId)}/activities`,
  );
  return normalizeActivitiesPayload(data);
}

/**
 * `GET /api/Admin/beneficiaries/{beneficiaryId}/complaints/{complaintId}/activities` — same timeline, ownership scoped.
 */
export async function getAdminBeneficiaryComplaintActivitiesForBeneficiary(
  beneficiaryId: string,
  complaintId: string,
): Promise<BeneficiaryComplaintActivity[]> {
  const { data } = await apiClient.get<unknown>(
    `/api/Admin/beneficiaries/${encodeURIComponent(beneficiaryId)}/complaints/${encodeURIComponent(complaintId)}/activities`,
  );
  return normalizeActivitiesPayload(data);
}

export type PostAdminComplaintMessageBody = {
  message: string;
  toUserId?: string | null;
};

/** `POST /api/Admin/beneficiary-complaints/{id}/messages` */
export async function postAdminBeneficiaryComplaintToBeneficiary(
  complaintId: string,
  body: PostAdminComplaintMessageBody,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<unknown>(
    `${ADMIN_COMPLAINT_BY_ID}/${encodeURIComponent(complaintId)}/messages`,
    body,
  );
  return asRecord(data) ?? {};
}

export type PostAdminComplaintNoteBody = {
  message: string;
  isVisibleToBeneficiary: boolean;
};

/** `POST /api/Admin/beneficiary-complaints/{id}/notes` — internal or visible file note. */
export async function postAdminBeneficiaryComplaintNote(
  complaintId: string,
  body: PostAdminComplaintNoteBody,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<unknown>(
    `${ADMIN_COMPLAINT_BY_ID}/${encodeURIComponent(complaintId)}/notes`,
    body,
  );
  return asRecord(data) ?? {};
}

const ADMIN_COMPLAINTS = '/api/Admin/complaints';

/** `GET /api/Admin/complaints/dashboard` — admin metrics (totals, recency, breakdowns in payload). */
export type AdminComplaintDashboardBreakdown = {
  label: string;
  count: number;
};

export type AdminComplaintsDashboard = {
  total: number;
  active: number;
  inactive: number;
  createdLast7Days: number;
  createdLast30Days: number;
  /** `byStatus[]` from API — all lookup rows, counts may be zero. */
  byStatus: AdminComplaintDashboardBreakdown[];
  /** `byAgainstType[]` (TP / employer / both). */
  byAgainstType: AdminComplaintDashboardBreakdown[];
};

function pickDashboardNumber(r: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const n = Number(r[k]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function asArrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function dashboardToText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function normalizeDashboardBreakdownList(value: unknown): AdminComplaintDashboardBreakdown[] {
  return asArrayValue(value)
    .map((item): AdminComplaintDashboardBreakdown | null => {
      const o = asRecord(item) ?? {};
      const r = o as Record<string, unknown>;
      const count = pickDashboardNumber(r, [
        'count',
        'Count',
        'complaintCount',
        'ComplaintCount',
        'value',
        'Value',
        'total',
        'Total',
      ]);
      const fromText = dashboardToText(
        r.description ??
          r.Description ??
          r.complaintsStatusDescription ??
          r.ComplaintsStatusDescription ??
          r.complaintAgainstTypeDescription ??
          r.ComplaintAgainstTypeDescription ??
          r.statusName ??
          r.StatusName ??
          r.statusLabel ??
          r.StatusLabel ??
          r.typeName ??
          r.TypeName ??
          r.name ??
          r.Name ??
          r.title ??
          r.Title ??
          r.label ??
          r.Label ??
          r.text ??
          r.Text ??
          r.code ??
          r.Code,
      );
      const statusId = r.complaintsStatusId ?? r.ComplaintsStatusID ?? r.statusId ?? r.StatusID;
      const typeId = r.complaintAgainstTypeId ?? r.ComplaintAgainstTypeID ?? r.againstTypeId;
      let label = fromText;
      if (!label) {
        if (typeId != null && String(typeId) !== '') label = `Against type #${typeId}`;
        else if (statusId != null && String(statusId) !== '') label = `Status #${statusId}`;
        else if (count > 0) label = 'Unnamed';
      }
      if (!label && count === 0) return null;
      return { label: label || 'Unnamed', count };
    })
    .filter((row): row is AdminComplaintDashboardBreakdown => row != null);
}

function normalizeAdminComplaintsDashboard(data: unknown): AdminComplaintsDashboard {
  const root = asRecord(data) ?? {};
  const nested = asRecord(root.data ?? root.Data);
  const r = nested ? { ...root, ...nested } : root;
  return {
    total: pickDashboardNumber(r, [
      'total',
      'Total',
      'totalComplaints',
      'TotalComplaints',
      'count',
    ]),
    active: pickDashboardNumber(r, [
      'active',
      'Active',
      'activeComplaints',
      'ActiveComplaints',
      'activeCount',
    ]),
    inactive: pickDashboardNumber(r, [
      'inactive',
      'Inactive',
      'inactiveComplaints',
      'InactiveComplaints',
      'inactiveCount',
    ]),
    createdLast7Days: pickDashboardNumber(r, ['createdLast7Days', 'CreatedLast7Days', 'newLast7Days', 'NewLast7Days']),
    createdLast30Days: pickDashboardNumber(r, [
      'createdLast30Days',
      'CreatedLast30Days',
      'newLast30Days',
      'NewLast30Days',
    ]),
    byStatus: normalizeDashboardBreakdownList(
      r.byStatus ?? r.ByStatus ?? r.statusBreakdown ?? r.StatusBreakdown,
    ),
    byAgainstType: normalizeDashboardBreakdownList(
      r.byAgainstType ?? r.ByAgainstType ?? r.againstTypeBreakdown ?? r.AgainstTypeBreakdown,
    ),
  };
}

export async function getAdminComplaintsDashboard(): Promise<AdminComplaintsDashboard> {
  const { data } = await apiClient.get<unknown>(`${ADMIN_COMPLAINTS}/dashboard`);
  return normalizeAdminComplaintsDashboard(data);
}

export type AdminComplaintLookupResponse = {
  statuses: ComplaintStatusOption[];
  againstTypes: ComplaintAgainstTypeOption[];
};

function adminNormalizeStatusOption(raw: unknown): ComplaintStatusOption | null {
  const r = asRecord(raw);
  if (!r) return null;
  const complaintsStatusId = pickNumber(r, ['complaintsStatusId', 'ComplaintsStatusID', 'statusId', 'StatusID']);
  if (complaintsStatusId == null) return null;
  return {
    complaintsStatusId,
    code: pickString(r, ['code', 'Code']) ?? String(complaintsStatusId),
    description:
      pickString(r, ['description', 'Description', 'complaintsStatusDescription', 'ComplaintsStatusDescription']) ??
      `Status ${complaintsStatusId}`,
    sortOrder: pickNumber(r, ['sortOrder', 'SortOrder']) ?? 0,
  };
}

function adminNormalizeAgainstTypeOption(raw: unknown): ComplaintAgainstTypeOption | null {
  const r = asRecord(raw);
  if (!r) return null;
  const complaintAgainstTypeId = pickNumber(r, [
    'complaintAgainstTypeId',
    'ComplaintAgainstTypeID',
    'againstTypeId',
    'AgainstTypeID',
  ]);
  if (complaintAgainstTypeId == null) return null;
  return {
    complaintAgainstTypeId,
    code: pickString(r, ['code', 'Code']) ?? String(complaintAgainstTypeId),
    description:
      pickString(r, ['description', 'Description', 'complaintAgainstTypeDescription', 'ComplaintAgainstTypeDescription']) ??
      `Type ${complaintAgainstTypeId}`,
    sortOrder: pickNumber(r, ['sortOrder', 'SortOrder']) ?? 0,
  };
}

export async function getAdminComplaintLookups(): Promise<AdminComplaintLookupResponse> {
  const { data } = await apiClient.get<unknown>(`${ADMIN_COMPLAINTS}/lookups`);
  const r = asRecord(data) ?? {};
  const statusesRaw = asArrayValue(
    r.statuses ?? r.Statuses ?? r.complaintsStatuses ?? r.ComplaintsStatuses ?? [],
  );
  const againstRaw = asArrayValue(
    r.againstTypes ?? r.AgainstTypes ?? r.complaintAgainstTypes ?? r.ComplaintAgainstTypes ?? [],
  );
  const statuses = statusesRaw.map(adminNormalizeStatusOption).filter(Boolean) as ComplaintStatusOption[];
  const againstTypes = againstRaw
    .map(adminNormalizeAgainstTypeOption)
    .filter(Boolean) as ComplaintAgainstTypeOption[];
  return { statuses, againstTypes };
}

function adminNormalizeComplaintTypeOption(raw: unknown): ComplaintTypeOption | null {
  const r = asRecord(raw);
  if (!r) return null;
  const complaintTypeId = pickNumber(r, ['complaintTypeId', 'ComplaintTypeID', 'id', 'Id']);
  if (complaintTypeId == null) return null;
  return {
    complaintTypeId,
    complaintTypeName:
      pickString(r, ['complaintTypeName', 'ComplaintTypeName', 'name', 'Name']) ?? `Type ${complaintTypeId}`,
    category: pickString(r, ['category', 'Category']) ?? null,
    sortOrder: pickNumber(r, ['sortOrder', 'SortOrder']) ?? 0,
  };
}

export async function getAdminComplaintTypes(): Promise<ComplaintTypeOption[]> {
  const { data } = await apiClient.get<unknown>(`${ADMIN_COMPLAINTS}/complaint-types`);
  const arr = asArrayValue(data);
  if (arr.length > 0) return arr.map(adminNormalizeComplaintTypeOption).filter(Boolean) as ComplaintTypeOption[];
  const r = asRecord(data);
  const nested = asArrayValue(r?.items ?? r?.Items ?? r?.data ?? r?.Data ?? []);
  return nested.map(adminNormalizeComplaintTypeOption).filter(Boolean) as ComplaintTypeOption[];
}

/** `GET /api/Admin/beneficiaries/{beneficiaryId}/complaints/{complaintId}` */
export async function getAdminBeneficiaryComplaintById(
  beneficiaryId: string,
  complaintId: string,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<unknown>(
    `/api/Admin/beneficiaries/${encodeURIComponent(beneficiaryId)}/complaints/${encodeURIComponent(complaintId)}`,
  );
  return unwrapRecordPayload(data);
}

export type PatchAdminComplaintStatusBody = {
  newStatusId: number;
  message?: string | null;
};

/** `PATCH /api/Admin/beneficiary-complaints/{id}/status` */
export async function patchAdminBeneficiaryComplaintStatus(
  complaintId: string,
  body: PatchAdminComplaintStatusBody,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.patch<unknown>(
    `${ADMIN_COMPLAINT_BY_ID}/${encodeURIComponent(complaintId)}/status`,
    body,
  );
  return asRecord(data) ?? {};
}

export type PostAdminComplaintForwardBody = {
  message: string;
  toUserId?: string | null;
  metadataJson?: string | null;
};

/** `POST /api/Admin/beneficiary-complaints/{id}/forward` */
export async function postAdminBeneficiaryComplaintForward(
  complaintId: string,
  body: PostAdminComplaintForwardBody,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<unknown>(
    `${ADMIN_COMPLAINT_BY_ID}/${encodeURIComponent(complaintId)}/forward`,
    body,
  );
  return asRecord(data) ?? {};
}

export type PostAdminComplaintActionBody = {
  message: string;
  isVisibleToBeneficiary: boolean;
};

/** `POST /api/Admin/beneficiary-complaints/{id}/admin-actions` */
export async function postAdminBeneficiaryComplaintAction(
  complaintId: string,
  body: PostAdminComplaintActionBody,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<unknown>(
    `${ADMIN_COMPLAINT_BY_ID}/${encodeURIComponent(complaintId)}/admin-actions`,
    body,
  );
  return asRecord(data) ?? {};
}


import apiClient from '@/ultis/apiClient';
import type {
  AdminBeneficiary,
  AdminBeneficiaryListParams,
  AdminBeneficiaryPagedResult,
  AdminBeneficiarySavePayload,
  AdminBeneficiarySmsListResponse,
  AdminBeneficiarySmsRecord,
  AdminBeneficiarySendSmsPayload,
  AdminEntityId,
} from '@/types/admin-beneficiaries';
import type { BeneficiaryProgrammeLink } from '@/types/beneficiaryProfile';

const BASE = '/api/Admin/beneficiaries';

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function idSegment(id: AdminEntityId): string {
  return encodeURIComponent(String(id));
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeBeneficiary(raw: unknown): AdminBeneficiary {
  const o = asObject(raw) ?? {};
  return {
    ...o,
    beneficiaryId: (o.beneficiaryId ?? o.BeneficiaryID ?? o.id ?? o.ID) as AdminEntityId | undefined,
    idNumber_Passport: (o.idNumber_Passport ?? o.idNumberPassport ?? o.IdNumberPassport ?? null) as string | null,
    beneficiaryName: (o.beneficiaryName ?? o.BeneficiaryName ?? null) as string | null,
    physicalAddressProvince: (o.physicalAddressProvince ?? o.province ?? o.Province ?? null) as string | null,
    programmeLinksCount: toNumber(o.programmeLinksCount ?? o.ProgrammeLinksCount ?? 0),
    programmeLinkCount: toNumber(o.programmeLinkCount ?? o.ProgrammeLinkCount ?? 0),
    programmeDocumentsCount: toNumber(o.programmeDocumentsCount ?? o.ProgrammeDocumentsCount ?? 0),
    age: toNumber(o.age ?? o.Age ?? 0),
  };
}

function buildListQueryParams(params: AdminBeneficiaryListParams): Record<string, string | number> {
  const out: Record<string, string | number> = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
  };

  const search = params.search?.trim();
  if (search) out.search = search;

  const registrationFrom = params.registrationFrom?.trim();
  if (registrationFrom) out.registrationFrom = registrationFrom;

  const registrationTo = params.registrationTo?.trim();
  if (registrationTo) out.registrationTo = registrationTo;

  const employerId = params.employerId != null ? String(params.employerId).trim() : '';
  if (employerId) out.employerId = employerId;

  const trainingProviderId = params.trainingProviderId != null ? String(params.trainingProviderId).trim() : '';
  if (trainingProviderId) out.trainingProviderId = trainingProviderId;

  const provinceId = params.provinceId != null ? String(params.provinceId).trim() : '';
  if (provinceId) out.provinceId = provinceId;

  const province = params.province?.trim();
  if (province) out.province = province;

  return out;
}

export async function listAdminBeneficiaries(
  params: AdminBeneficiaryListParams,
): Promise<AdminBeneficiaryPagedResult> {
  const { data } = await apiClient.get(BASE, { params: buildListQueryParams(params) });
  const o = asObject(data);

  const page = toNumber(params.page, 1);
  const pageSize = toNumber(params.pageSize, 25);

  if (!o) {
    const items = asArray(data).map(normalizeBeneficiary);
    const totalCount = items.length;
    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    };
  }

  const items = asArray(o.items ?? o.data ?? o.results ?? o.beneficiaries).map(normalizeBeneficiary);
  const totalCount = toNumber(o.totalCount ?? o.TotalCount ?? items.length);
  const normalizedPage = toNumber(o.page ?? o.PageNumber ?? page, page);
  const normalizedPageSize = toNumber(o.pageSize ?? o.PageSize ?? pageSize, pageSize);

  return {
    items,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / normalizedPageSize)),
  };
}

export async function getAdminBeneficiary(beneficiaryId: AdminEntityId): Promise<AdminBeneficiary> {
  const { data } = await apiClient.get(`${BASE}/${idSegment(beneficiaryId)}`);
  const o = asObject(data);
  const base = normalizeBeneficiary(o?.profile ?? data);
  if (!o?.profile) return base;

  return {
    ...base,
    programmeLinks:
      o.programmeLinks ??
      o.beneficiaryProgrammeLinks ??
      (asObject(o.profile)?.programmeLinks ?? asObject(o.profile)?.beneficiaryProgrammeLinks ?? []),
    programmeLinkDocuments:
      o.programmeLinkDocuments ??
      o.beneficiaryProgrammeLinksDocuments ??
      (asObject(o.profile)?.programmeLinkDocuments ??
        asObject(o.profile)?.beneficiaryProgrammeLinksDocuments ??
        []),
  };
}

export async function createAdminBeneficiary(payload: AdminBeneficiarySavePayload): Promise<AdminBeneficiary> {
  const { data } = await apiClient.post(BASE, payload);
  const o = asObject(data);
  return normalizeBeneficiary(o?.profile ?? data);
}

export async function updateAdminBeneficiary(
  beneficiaryId: AdminEntityId,
  payload: AdminBeneficiarySavePayload,
): Promise<AdminBeneficiary> {
  const { data } = await apiClient.put(`${BASE}/${idSegment(beneficiaryId)}`, payload);
  const o = asObject(data);
  return normalizeBeneficiary(o?.profile ?? data);
}

function normalizeProgrammeLinksPayload(data: unknown): BeneficiaryProgrammeLink[] {
  const o = asObject(data);
  const rows = asArray(
    o?.items ??
      o?.data ??
      o?.results ??
      o?.programmeLinks ??
      o?.beneficiaryProgrammeLinks ??
      data,
  );
  return rows as BeneficiaryProgrammeLink[];
}

/**
 * Admin programme links keyed by beneficiary id (same payload as GET /api/beneficiary/profile/programme-links).
 * Preferred: profile/programme-links; alias: programme-links.
 */
export async function listAdminBeneficiaryProgrammeLinks(
  beneficiaryId: AdminEntityId,
): Promise<BeneficiaryProgrammeLink[]> {
  const id = idSegment(beneficiaryId);
  const attempts: Array<() => Promise<BeneficiaryProgrammeLink[]>> = [
    async () => {
      const { data } = await apiClient.get(`${BASE}/${id}/profile/programme-links`);
      return normalizeProgrammeLinksPayload(data);
    },
    async () => {
      const { data } = await apiClient.get(`${BASE}/${id}/programme-links`);
      return normalizeProgrammeLinksPayload(data);
    },
  ];

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch {
      // Try next shape/route.
    }
  }
  return [];
}

function normalizeSmsRecord(raw: unknown): AdminBeneficiarySmsRecord {
  const o = asObject(raw) ?? {};
  return {
    smsId: String(o.smsId ?? o.SmsId ?? ''),
    beneficiaryId: String(o.beneficiaryId ?? o.BeneficiaryId ?? ''),
    sentDate: String(o.sentDate ?? o.SentDate ?? ''),
    cellphoneNr: String(o.cellphoneNr ?? o.CellphoneNr ?? ''),
    message: String(o.message ?? o.Message ?? ''),
    createdBy: String(o.createdBy ?? o.CreatedBy ?? ''),
    sentByName: String(o.sentByName ?? o.SentByName ?? ''),
  };
}

/** Shared shape for admin and self-service GET SMS list responses. */
export function parseSmsListResponse(data: unknown): AdminBeneficiarySmsListResponse {
  const o = asObject(data);
  const items = asArray(o?.items ?? o?.Items).map(normalizeSmsRecord);
  const count = toNumber(o?.count ?? o?.Count ?? items.length);
  return { count, items };
}

export async function listAdminBeneficiarySms(
  beneficiaryId: AdminEntityId,
): Promise<AdminBeneficiarySmsListResponse> {
  const { data } = await apiClient.get(`${BASE}/${idSegment(beneficiaryId)}/sms`);
  return parseSmsListResponse(data);
}

export async function sendAdminBeneficiarySms(
  beneficiaryId: AdminEntityId,
  payload: AdminBeneficiarySendSmsPayload,
): Promise<void> {
  await apiClient.post(`${BASE}/${idSegment(beneficiaryId)}/sms`, payload);
}

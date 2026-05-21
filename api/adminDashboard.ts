import apiClient from '@/ultis/apiClient';
import type {
  AdminDashboardDemographicRow,
  AdminDashboardMonthlyRow,
  AdminDashboardProvinceRow,
  AdminDashboardEmploymentStatus,
  AdminDashboardEmploymentTypeStatus,
  AdminDashboardSnapshot,
  AdminDashboardSummary,
  AdminDashboardTrends,
} from '@/types/admin-dashboard-api';

const BASE = '/api/Admin/dashboard';

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSummary(raw: unknown): AdminDashboardSummary {
  const o = asObject(raw) ?? {};
  const totalBeneficiaries = toNumber(o.totalBeneficiaries ?? o.TotalBeneficiaries ?? 0);
  const activeBeneficiaries = toNumber(o.activeBeneficiaries ?? o.ActiveBeneficiaries ?? 0);
  const inactiveBeneficiaries = toNumber(
    o.inactiveBeneficiaries ?? o.InactiveBeneficiaries ?? Math.max(0, totalBeneficiaries - activeBeneficiaries),
  );
  return {
    totalBeneficiaries,
    activeBeneficiaries,
    inactiveBeneficiaries,
    totalProgrammeLinks: toNumber(o.totalProgrammeLinks ?? o.TotalProgrammeLinks ?? 0),
    totalProgrammeDocuments: toNumber(o.totalProgrammeDocuments ?? o.TotalProgrammeDocuments ?? 0),
  };
}

function normalizeDemographic(raw: unknown): AdminDashboardDemographicRow {
  const o = asObject(raw) ?? {};
  return {
    label: String(o.label ?? o.gender ?? o.ageBand ?? o.name ?? 'Unknown'),
    count: toNumber(o.count ?? o.total ?? 0),
    percentage:
      o.percentage == null || Number.isNaN(Number(o.percentage))
        ? undefined
        : Number(o.percentage),
  };
}

function normalizeProvince(raw: unknown): AdminDashboardProvinceRow {
  const o = asObject(raw) ?? {};
  return {
    province: String(o.province ?? o.name ?? 'Unknown'),
    count: toNumber(o.count ?? o.total ?? 0),
  };
}

function normalizeMonthly(raw: unknown): AdminDashboardMonthlyRow {
  const o = asObject(raw) ?? {};
  return {
    month: String(o.month ?? o.period ?? o.label ?? ''),
    count: toNumber(o.count ?? o.total ?? 0),
  };
}

function normalizeTrends(raw: unknown): AdminDashboardTrends {
  const o = asObject(raw) ?? {};
  return {
    beneficiariesYoYPercent: o.beneficiariesYoYPercent == null ? undefined : Number(o.beneficiariesYoYPercent),
    beneficiariesMoMPercent: o.beneficiariesMoMPercent == null ? undefined : Number(o.beneficiariesMoMPercent),
    programmeLinksYoYPercent: o.programmeLinksYoYPercent == null ? undefined : Number(o.programmeLinksYoYPercent),
    programmeLinksMoMPercent: o.programmeLinksMoMPercent == null ? undefined : Number(o.programmeLinksMoMPercent),
  };
}

function normalizeEmploymentStatus(raw: unknown): AdminDashboardEmploymentStatus {
  const o = asObject(raw) ?? {};
  return {
    currentlyEmployed: toNumber(o.currentlyEmployed ?? o.CurrentlyEmployed ?? 0),
    notEmployed: toNumber(o.notEmployed ?? o.NotEmployed ?? 0),
    volunteering: toNumber(o.volunteering ?? o.Volunteering ?? 0),
  };
}

function normalizeEmploymentTypeStatus(raw: unknown): AdminDashboardEmploymentTypeStatus {
  const o = asObject(raw) ?? {};
  return {
    totalBeneficiaries: toNumber(o.totalBeneficiaries ?? o.TotalBeneficiaries ?? 0),
    employed: toNumber(o.employed ?? o.Employed ?? 0),
    unemployed: toNumber(o.unemployed ?? o.Unemployed ?? 0),
    volunteering: toNumber(o.volunteering ?? o.Volunteering ?? 0),
    volunteeringWithStipend: toNumber(o.volunteeringWithStipend ?? o.VolunteeringWithStipend ?? 0),
    otherOrUnspecified: toNumber(o.otherOrUnspecified ?? o.OtherOrUnspecified ?? 0),
  };
}

export async function getAdminDashboardSnapshot(params?: {
  monthlyMonths?: number;
  topProvinces?: number;
}): Promise<AdminDashboardSnapshot> {
  const { data } = await apiClient.get(BASE, {
    params: {
      monthlyMonths: params?.monthlyMonths ?? 12,
      topProvinces: params?.topProvinces ?? 10,
    },
  });
  const o = asObject(data) ?? {};

  return {
    summary: normalizeSummary(o.summary ?? o),
    demographics: {
      gender: asArray(o.demographics && asObject(o.demographics)?.gender)
        .map(normalizeDemographic),
      ageBands: asArray(o.demographics && asObject(o.demographics)?.ageBands)
        .map(normalizeDemographic),
      raceGroups: asArray(
        (o.demographics && asObject(o.demographics)?.raceGroups) ??
          (o.demographics && asObject(o.demographics)?.race) ??
          o.raceGroups
      ).map(normalizeDemographic),
    },
    topProvinces: asArray(o.topProvinces).map(normalizeProvince),
    monthlyActivity: asArray(o.monthlyActivity).map(normalizeMonthly),
    trends: normalizeTrends(o.trends),
    employmentStatus:
      o.employmentStatus != null || o.EmploymentStatus != null
        ? normalizeEmploymentStatus(o.employmentStatus ?? o.EmploymentStatus)
        : undefined,
  };
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data } = await apiClient.get(`${BASE}/summary`);
  return normalizeSummary(data);
}

/** Employed / Unemployed / Volunteering from EmploymentTypeStatus text (see API docs). */
export async function getAdminDashboardEmploymentTypeStatus(): Promise<AdminDashboardEmploymentTypeStatus> {
  const { data } = await apiClient.get(`${BASE}/employment-type-status`);
  return normalizeEmploymentTypeStatus(data);
}

/** Legacy: Employed bit + Volunteering string (differs from employment-type-status). */
export async function getAdminDashboardEmploymentStatus(): Promise<AdminDashboardEmploymentStatus> {
  const { data } = await apiClient.get(`${BASE}/employment-status`);
  return normalizeEmploymentStatus(data);
}

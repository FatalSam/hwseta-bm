import apiClient from '@/ultis/apiClient';

export const PROGRAMME_ENROLMENTS_DRILLDOWN_PATH = '/api/Admin/programme-enrollments/drilldown';

export const programmeEnrolmentsDrilldownQueryKey = ['admin-programme-enrolments-drilldown'] as const;

export type ProgrammeEnrolmentStatusCount = { status: string; count: number };

export type ProgrammeEnrolmentQualificationRow = {
  qualificationId: number | null;
  qualification: string;
  beneficiaryCount: number;
  statusCounts: ProgrammeEnrolmentStatusCount[];
};

export type ProgrammeEnrolmentDrilldownRow = {
  programmeId: number | null;
  programme: string;
  beneficiaryCount: number;
  statusCounts: ProgrammeEnrolmentStatusCount[];
  qualifications: ProgrammeEnrolmentQualificationRow[];
};

export type ProgrammeEnrolmentSelectOption = {
  programmeId: string;
  programmeName: string;
};

/** `qualificationId` empty = all qualifications under the programme. */
export type QualificationEnrolmentSelectOption = {
  qualificationId: string;
  qualificationName: string;
};

export const ALL_QUALIFICATIONS_VALUE = '';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toStringSafe(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function parseId(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeStatusCounts(statusRaw: unknown[]): ProgrammeEnrolmentStatusCount[] {
  return statusRaw.map((s) => {
    const sObj = asRecord(s) ?? {};
    return {
      status:
        toStringSafe(sObj.status) ||
        toStringSafe(sObj.statusName) ||
        toStringSafe(sObj.programmeCompletionStatus) ||
        toStringSafe(sObj.name) ||
        'Unknown',
      count: toNumber(sObj.enrolmentCount ?? sObj.count ?? sObj.total ?? sObj.value),
    };
  });
}

/** Normalize `GET /api/Admin/programme-enrollments/drilldown` (PascalCase / camelCase / nested keys). */
export function normalizeProgrammeEnrolmentsDrilldown(data: unknown): ProgrammeEnrolmentDrilldownRow[] {
  const root = asRecord(data);
  const programmesRaw = asArray(
    root?.items ?? root?.data ?? root?.programmes ?? root?.programmeDrilldown ?? data,
  );

  return programmesRaw.map((p) => {
    const pObj = asRecord(p) ?? {};
    const qualificationsRaw = asArray(
      pObj.qualifications ?? pObj.children ?? pObj.rows ?? pObj.programmeQualifications,
    );

    const qualifications: ProgrammeEnrolmentQualificationRow[] = qualificationsRaw.map((q) => {
      const qObj = asRecord(q) ?? {};
      const statusRaw = asArray(
        qObj.statusBreakdown ??
          qObj.statusCounts ??
          qObj.completionStatuses ??
          qObj.counts ??
          qObj.statuses,
      );
      return {
        qualificationId: parseId(qObj.qualificationId ?? qObj.qualificationID ?? qObj.id ?? qObj.ID),
        qualification:
          toStringSafe(qObj.qualification) ||
          toStringSafe(qObj.qualificationName) ||
          toStringSafe(qObj.name) ||
          'Unspecified qualification',
        beneficiaryCount: toNumber(
          qObj.distinctBeneficiaryCount ?? qObj.beneficiaryCount ?? qObj.distinctCount ?? 0,
        ),
        statusCounts: normalizeStatusCounts(statusRaw),
      };
    });

    const programmeStatusRaw = asArray(
      pObj.statusTotals ?? pObj.statusCounts ?? pObj.completionStatuses ?? pObj.counts ?? pObj.statuses,
    );

    return {
      programmeId: parseId(pObj.programmeId ?? pObj.programmeID ?? pObj.id ?? pObj.ID),
      programme:
        toStringSafe(pObj.programme) ||
        toStringSafe(pObj.programmeName) ||
        toStringSafe(pObj.name) ||
        'Unspecified programme',
      beneficiaryCount: toNumber(
        pObj.distinctBeneficiaryCount ?? pObj.beneficiaryCount ?? pObj.distinctCount ?? 0,
      ),
      statusCounts: normalizeStatusCounts(programmeStatusRaw),
      qualifications,
    };
  });
}

export async function fetchProgrammeEnrolmentsDrilldown(): Promise<ProgrammeEnrolmentDrilldownRow[]> {
  const { data } = await apiClient.get<unknown>(PROGRAMME_ENROLMENTS_DRILLDOWN_PATH);
  return normalizeProgrammeEnrolmentsDrilldown(data);
}

/** Flat programme list for `<select>` controls (skips rows without an id). */
export function toProgrammeEnrolmentSelectOptions(
  rows: ProgrammeEnrolmentDrilldownRow[],
): ProgrammeEnrolmentSelectOption[] {
  return rows
    .filter((r) => r.programmeId != null)
    .map((r) => ({
      programmeId: String(r.programmeId),
      programmeName: r.programme,
    }));
}

export function findProgrammeEnrolmentRow(
  rows: ProgrammeEnrolmentDrilldownRow[],
  programmeId: string,
): ProgrammeEnrolmentDrilldownRow | undefined {
  return rows.find((r) => r.programmeId != null && String(r.programmeId) === programmeId);
}

/** Qualifications for a programme; first option = all qualifications in that programme. */
export function toQualificationEnrolmentSelectOptions(
  rows: ProgrammeEnrolmentDrilldownRow[],
  programmeId: string,
): QualificationEnrolmentSelectOption[] {
  const programme = findProgrammeEnrolmentRow(rows, programmeId);
  if (!programme) return [];

  const options: QualificationEnrolmentSelectOption[] = [
    {
      qualificationId: ALL_QUALIFICATIONS_VALUE,
      qualificationName: 'All qualifications in programme',
    },
  ];

  for (const q of programme.qualifications) {
    if (q.qualificationId == null) continue;
    options.push({
      qualificationId: String(q.qualificationId),
      qualificationName: q.qualification,
    });
  }

  return options;
}

/** Distinct beneficiary count from drilldown (programme- or qualification-scoped). */
export function getProgrammeAudienceRecipientCount(
  rows: ProgrammeEnrolmentDrilldownRow[],
  programmeId: string,
  qualificationId?: string | null,
): number {
  const programme = findProgrammeEnrolmentRow(rows, programmeId);
  if (!programme) return 0;
  if (!qualificationId?.trim()) return programme.beneficiaryCount;
  const q = programme.qualifications.find(
    (x) => x.qualificationId != null && String(x.qualificationId) === qualificationId,
  );
  return q?.beneficiaryCount ?? 0;
}

export function formatProgrammeAudienceSummary(
  programmeName: string,
  qualificationName?: string | null,
): string {
  if (qualificationName?.trim()) {
    return `Programme: ${programmeName} · ${qualificationName.trim()}`;
  }
  return `Programme: ${programmeName} · All qualifications`;
}

export function statusCountByName(
  statusCounts: ProgrammeEnrolmentStatusCount[],
  target: string,
): number {
  const targetNorm = target.toLowerCase();
  return statusCounts
    .filter((s) => s.status.toLowerCase() === targetNorm)
    .reduce((sum, s) => sum + s.count, 0);
}

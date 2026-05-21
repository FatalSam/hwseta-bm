import type { AccreditationBodyRow } from '@/types/programmeSetup';

export function coerceAccreditationBodyId(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

export function accreditationBodyOptionLabel(row: AccreditationBodyRow): string {
  const n = row.name?.trim() || '—';
  const ab = row.abbreviation?.trim();
  return ab ? `${n} (${ab})` : n;
}

/** Supports `accreditationBodyIds` array or legacy single `accreditationBodyId` from API. */
export function normalizeAccreditationBodyIdsFromApi(
  ids: unknown,
  legacySingle?: unknown,
): number[] {
  if (Array.isArray(ids)) {
    return ids
      .map((x) => coerceAccreditationBodyId(x))
      .filter((n): n is number => n != null);
  }
  const one = coerceAccreditationBodyId(legacySingle ?? ids);
  return one != null ? [one] : [];
}

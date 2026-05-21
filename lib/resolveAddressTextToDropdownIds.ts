import apiClient from '@/ultis/apiClient';
import type { DropdownOption } from '@/lib/googlePlaceToAdminAddress';

function numId(id: unknown): number | undefined {
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  const n = Number(id);
  return Number.isFinite(n) ? n : undefined;
}

/** Match dropdown row by display name (same idea as Google address resolution). */
function matchByName(options: DropdownOption[], target: string | null | undefined): DropdownOption | undefined {
  const t = target?.trim();
  if (!t) return undefined;
  const tl = t.toLowerCase();
  const exact = options.find((o) => (o.name ?? '').trim().toLowerCase() === tl);
  if (exact) return exact;
  return options.find((o) => {
    const n = (o.name ?? '').trim().toLowerCase();
    if (!n) return false;
    return n.includes(tl) || tl.includes(n);
  });
}

/**
 * When the API stores province/municipality/district as text but IDs are missing,
 * resolve IDs from HWSETA dropdowns so location selects show the saved values on edit.
 */
export async function resolveAddressTextToDropdownIds(input: {
  province?: string | null;
  municipality?: string | null;
  district?: string | null;
  /** Suburb line — used to infer district when district text is missing */
  physicalAddress2?: string;
  provinceId?: number;
  municipalityId?: number;
  districtId?: number;
}): Promise<{
  provinceId?: number;
  municipalityId?: number;
  districtId?: number;
}> {
  const result: {
    provinceId?: number;
    municipalityId?: number;
    districtId?: number;
  } = {};

  let provinceId = input.provinceId != null && input.provinceId > 0 ? input.provinceId : undefined;
  if (provinceId == null) {
    try {
      const res = await apiClient.get('/api/Dropdowns/provinces');
      const provinces: DropdownOption[] = Array.isArray(res.data) ? res.data : [];
      const m = matchByName(provinces, input.province);
      const id = m?.id != null ? numId(m.id) : undefined;
      if (id != null && id > 0) provinceId = id;
    } catch {
      /* ignore */
    }
  }
  if (provinceId != null) result.provinceId = provinceId;

  let municipalityId = input.municipalityId != null && input.municipalityId > 0 ? input.municipalityId : undefined;
  if (municipalityId == null && provinceId != null) {
    try {
      const res = await apiClient.get(`/api/Dropdowns/municipalities?provinceId=${provinceId}`);
      const list: DropdownOption[] = Array.isArray(res.data) ? res.data : [];
      const m = matchByName(list, input.municipality);
      const id = m?.id != null ? numId(m.id) : undefined;
      if (id != null && id > 0) municipalityId = id;
    } catch {
      /* ignore */
    }
  }

  let districtFromMuniScan: number | undefined;
  if (municipalityId == null && provinceId != null && input.physicalAddress2?.trim()) {
    const found = await findMunicipalityAndDistrictBySuburbInProvince(provinceId, input.physicalAddress2);
    if (found) {
      municipalityId = found.municipalityId;
      districtFromMuniScan = found.districtId;
    }
  }

  if (municipalityId != null) result.municipalityId = municipalityId;

  if (input.districtId === -1) {
    result.districtId = -1;
    return result;
  }

  let districtId = input.districtId != null && input.districtId > 0 ? input.districtId : undefined;
  if (districtId == null && municipalityId != null) {
    try {
      const res = await apiClient.get(`/api/Dropdowns/districts?municipalityId=${municipalityId}`);
      const list: DropdownOption[] = Array.isArray(res.data) ? res.data : [];
      const m = matchByName(list, input.district);
      const id = m?.id != null ? numId(m.id) : undefined;
      if (id != null && id > 0) districtId = id;
    } catch {
      /* ignore */
    }
  }
  if (districtId == null && districtFromMuniScan != null) {
    districtId = districtFromMuniScan;
  }
  if (districtId != null) result.districtId = districtId;

  /** Suburb saved but district text empty / unmatched — find district that lists this suburb. */
  if (
    (districtId == null || districtId <= 0) &&
    input.districtId !== -1 &&
    municipalityId != null &&
    municipalityId > 0
  ) {
    const suburb = input.physicalAddress2?.trim();
    if (suburb) {
      const bySuburb = await findDistrictIdBySuburbName(municipalityId, suburb);
      if (bySuburb != null && bySuburb > 0) {
        result.districtId = bySuburb;
      }
    }
  }

  return result;
}

async function findMunicipalityAndDistrictBySuburbInProvince(
  provinceId: number,
  suburbName: string,
): Promise<{ municipalityId: number; districtId: number } | undefined> {
  try {
    const mRes = await apiClient.get(`/api/Dropdowns/municipalities?provinceId=${provinceId}`);
    const municipalities: DropdownOption[] = Array.isArray(mRes.data) ? mRes.data : [];
    for (const mu of municipalities) {
      const mid = mu.id != null ? numId(mu.id) : undefined;
      if (mid == null || mid <= 0) continue;
      const did = await findDistrictIdBySuburbName(mid, suburbName);
      if (did != null && did > 0) return { municipalityId: mid, districtId: did };
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function findDistrictIdBySuburbName(
  municipalityId: number,
  suburbName: string,
): Promise<number | undefined> {
  const sn = suburbName.trim().toLowerCase();
  if (!sn) return undefined;
  try {
    const dRes = await apiClient.get(`/api/Dropdowns/districts?municipalityId=${municipalityId}`);
    const districts: DropdownOption[] = Array.isArray(dRes.data) ? dRes.data : [];
    for (const d of districts) {
      const did = d.id != null ? numId(d.id) : undefined;
      if (did == null || did <= 0) continue;
      const sRes = await apiClient.get(`/api/Dropdowns/suburbs?districtId=${did}`);
      const suburbs: DropdownOption[] = Array.isArray(sRes.data) ? sRes.data : [];
      const hit = suburbs.some((s) => {
        const n = (s.name ?? '').trim().toLowerCase();
        if (!n) return false;
        return n === sn || n.includes(sn) || sn.includes(n);
      });
      if (hit) return did;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

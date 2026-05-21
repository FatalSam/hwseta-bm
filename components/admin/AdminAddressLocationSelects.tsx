'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/ultis/apiClient';
import type { DropdownOption } from '@/lib/googlePlaceToAdminAddress';
import { adminFormTheme } from '@/components/admin/adminFormTheme';

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-hwseta-green focus:outline-none focus:ring-1 focus:ring-hwseta-green';

const selectClass = `mt-1 block w-full ${adminFormTheme.select}`;

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

export type AdminAddressLocationPatch = Partial<{
  provinceId: number;
  municipalityId: number;
  districtId: number;
  physicalAddress2: string;
  physicalAddressCode: string;
  /** HW_Employers text address */
  province: string | null;
  municipality: string | null;
  district: string | null;
  area: string;
  code: string;
}>;

type Props = {
  open: boolean;
  provinceId?: number;
  municipalityId?: number;
  districtId?: number;
  physicalAddress2?: string;
  /** Postal / area code; shown next to Suburb when provided. */
  physicalAddressCode?: string;
  onPatch: (patch: AdminAddressLocationPatch) => void;
  /** When false, hides the intro line about choosing province/municipality (e.g. employers admin modal). */
  showIntro?: boolean;
};

function parseSelectInt(v: string): number | undefined {
  if (v === '' || v === '__none__') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default function AdminAddressLocationSelects({
  open,
  provinceId,
  municipalityId,
  districtId,
  physicalAddress2,
  physicalAddressCode,
  onPatch,
  showIntro = true,
}: Props) {
  const [provinces, setProvinces] = useState<DropdownOption[]>([]);
  const [municipalities, setMunicipalities] = useState<DropdownOption[]>([]);
  const [districts, setDistricts] = useState<DropdownOption[]>([]);
  const [suburbs, setSuburbs] = useState<DropdownOption[]>([]);

  const loadProvinces = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/Dropdowns/provinces');
      setProvinces(Array.isArray(res.data) ? res.data : []);
    } catch {
      setProvinces([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadProvinces();
  }, [open, loadProvinces]);

  useEffect(() => {
    if (!open || provinceId == null || provinceId <= 0) {
      setMunicipalities([]);
      return;
    }
    let cancelled = false;
    apiClient
      .get(`/api/Dropdowns/municipalities?provinceId=${provinceId}`)
      .then((res) => {
        if (!cancelled) setMunicipalities(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setMunicipalities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, provinceId]);

  useEffect(() => {
    if (!open || municipalityId == null || municipalityId <= 0) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    apiClient
      .get(`/api/Dropdowns/districts?municipalityId=${municipalityId}`)
      .then((res) => {
        if (!cancelled) setDistricts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, municipalityId]);

  useEffect(() => {
    if (!open || districtId == null || districtId <= 0) {
      setSuburbs([]);
      return;
    }
    let cancelled = false;
    apiClient
      .get(`/api/Dropdowns/suburbs?districtId=${districtId}`)
      .then((res) => {
        if (!cancelled) setSuburbs(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setSuburbs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, districtId]);

  const provinceSelectValue = provinceId != null && provinceId > 0 ? String(provinceId) : '__none__';
  const municipalitySelectValue =
    municipalityId != null && municipalityId > 0 ? String(municipalityId) : '__none__';
  const districtSelectValue =
    districtId === -1 ? '-1' : districtId != null && districtId > 0 ? String(districtId) : '__none__';

  const suburbLine = physicalAddress2?.trim() ?? '';
  const suburbOptionValues = new Set(suburbs.map((s) => (s.name ?? '').trim()).filter(Boolean));
  const suburbOrphan = Boolean(suburbLine && !suburbOptionValues.has(suburbLine));

  const tryApplyPostalForSuburb = (suburbId: string | number | undefined) => {
    if (suburbId == null) return;
    apiClient
      .get(`/api/Dropdowns/postal-codes/by-suburb?suburbId=${suburbId}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const first = list[0] as { code?: string; postalCode?: string } | undefined;
        const code = first?.code ?? first?.postalCode;
        if (code) {
          const c = String(code);
          onPatch({ physicalAddressCode: c, code: c });
        }
      })
      .catch(() => {});
  };

  /** Beneficiary profile: location dropdowns are read-only (filled via Search Address / Google). */
  const locationSelectsDisabled = true;

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-slate-100 bg-white/80 p-4">
      {showIntro ? (
        <p className="text-xs text-slate-500">
          Choose province, municipality, and area by name. IDs sent to the API are set automatically. Use{" "}
          <strong>Other / unlisted</strong> for district when Google or the list has no match (same as beneficiary
          profile).
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Province</label>
          <select
            className={selectClass}
            value={provinceSelectValue}
            onChange={(e) => {
              const id = parseSelectInt(e.target.value);
              const opt = provinces.find((p) => String(p.id ?? '') === e.target.value);
              onPatch({
                provinceId: id,
                municipalityId: undefined,
                districtId: undefined,
                province: id != null ? (opt?.name ?? null) : null,
                municipality: null,
                district: null,
              });
            }}
          >
            <option value="__none__">Select province</option>
            {provinces.map((p) => (
              <option key={String(p.id)} value={String(p.id ?? '')}>
                {p.name ?? p.code ?? `ID ${p.id}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Municipality</label>
          <select
            className={selectClass}
            value={municipalitySelectValue}
            disabled={locationSelectsDisabled}
            onChange={(e) => {
              const id = parseSelectInt(e.target.value);
              const opt = municipalities.find((m) => String(m.id ?? '') === e.target.value);
              onPatch({
                municipalityId: id,
                districtId: undefined,
                municipality: id != null ? (opt?.name ?? null) : null,
                district: null,
              });
            }}
          >
            <option value="__none__">Select municipality</option>
            {municipalities.map((m) => (
              <option key={String(m.id)} value={String(m.id ?? '')}>
                {m.name ?? m.code ?? `ID ${m.id}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Area (District)</label>
          <select
            className={selectClass}
            value={districtSelectValue}
            disabled={locationSelectsDisabled}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '-1') {
                onPatch({ districtId: -1, district: null });
                return;
              }
              const id = parseSelectInt(v);
              const opt = districts.find((d) => String(d.id ?? '') === v);
              onPatch({
                districtId: id,
                district: id != null ? (opt?.name ?? null) : null,
              });
            }}
          >
            <option value="__none__">Select area</option>
            <option value="-1">Other / unlisted (−1)</option>
            {districts.map((d) => (
              <option key={String(d.id)} value={String(d.id ?? '')}>
                {d.name ?? d.code ?? `ID ${d.id}`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
          <div className="min-w-0 flex-1 sm:flex-[3]">
            <label className={labelClass}>Suburb</label>
            <select
              className={selectClass}
              value={suburbLine}
              disabled={locationSelectsDisabled}
              onChange={(e) => {
                const name = e.target.value;
                if (!name) {
                  onPatch({ physicalAddress2: '', area: '' });
                  return;
                }
                onPatch({ physicalAddress2: name, area: name });
                const match = suburbs.find((s) => (s.name ?? '') === name);
                if (match?.id != null) tryApplyPostalForSuburb(match.id);
              }}
            >
              <option value="">Select suburb</option>
              {suburbs.map((s) => (
                <option key={String(s.id)} value={s.name ?? ''}>
                  {s.name ?? s.code ?? `ID ${s.id}`}
                </option>
              ))}
              {suburbOrphan ? <option value={suburbLine}>{suburbLine}</option> : null}
            </select>
          </div>
          {physicalAddressCode !== undefined ? (
            <div className="w-full shrink-0 sm:w-[26%] sm:min-w-[5.5rem]">
              <label className={labelClass}>Code</label>
              <input
                type="text"
                className={inputClass}
                inputMode="numeric"
                autoComplete="postal-code"
                value={physicalAddressCode}
                onChange={(e) => {
                  const v = e.target.value;
                  onPatch({ physicalAddressCode: v, code: v });
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
      {physicalAddressCode !== undefined ? (
        <p className="text-[0.65rem] text-slate-400">
          Selecting a listed suburb may fill Code from HWSETA when available.
        </p>
      ) : (
        <p className="text-[0.65rem] text-slate-400">
          Postal code uses the field in the address lines above; picking a listed suburb may fill it from HWSETA when
          available.
        </p>
      )}
    </div>
  );
}

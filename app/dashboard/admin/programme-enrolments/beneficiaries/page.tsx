'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MapPinIcon,
  PhoneIcon,
  SparklesIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/solid';
import { useQuery } from '@tanstack/react-query';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import apiClient from '@/ultis/apiClient';

type Option = { id: number | null; name: string };
type EnrolmentRow = {
  startDate: string | null;
  endDate: string | null;
  trainingProvider: string;
  employer: string;
  status: string;
  reason: string;
  note: string;
  documentCount: number;
};
type QualificationGroup = {
  qualificationId: string | null;
  qualificationName: string;
  enrolments: EnrolmentRow[];
};
type ProgrammeGroup = {
  programmeId: string | null;
  programmeName: string;
  qualifications: QualificationGroup[];
};
type BeneficiaryDetails = {
  beneficiaryId: string | null;
  fullName: string;
  idPassport: string;
  gender: string;
  cellNo: string;
  emailAddress: string;
  province: string;
  status: string;
  programmes: ProgrammeGroup[];
};
type PagedResult = {
  items: BeneficiaryDetails[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
type DetailModalState = {
  title: string;
  content: string;
} | null;

function asObject(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clampPage(v: unknown): number {
  const n = toNumber(v, 1);
  return Math.max(1, Math.floor(n));
}
function clampPageSize(v: unknown): number {
  const n = toNumber(v, 25);
  return Math.min(500, Math.max(1, Math.floor(n)));
}
function toText(v: unknown, fallback = ''): string {
  const s = v == null ? '' : String(v).trim();
  return s || fallback;
}
function toId(v: unknown): string | null {
  const s = toText(v);
  return s || null;
}
function toIsoDate(v: unknown): string | null {
  const s = toText(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
function formatDate(v: string | null): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB');
}
function cleanStatus(value: unknown): string {
  const raw = toText(value, '-');
  if (raw === '-') return raw;
  const normalized = raw.replace(/\blocked\b/gi, '').replace(/\s{2,}/g, ' ').trim();
  return normalized || '-';
}
function hasViewContent(value: string): boolean {
  const normalized = value.trim();
  return normalized.length > 0 && normalized !== '-';
}
function apiErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (typeof d === 'string') return d;
    const o = asObject(d);
    if (typeof o?.message === 'string') return o.message;
    if (typeof o?.title === 'string') return o.title;
    return e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

function normalizeBeneficiaries(data: unknown): PagedResult {
  const root = asObject(data);
  const rawItems = asArray(root?.items ?? root?.data ?? root?.results ?? root?.beneficiaries ?? data);
  const items: BeneficiaryDetails[] = rawItems.map((row) => {
    const b = asObject(row) ?? {};
    const profile = asObject(b.profile) ?? {};
    const rawProgrammes = asArray(b.programmes ?? b.programmeRows ?? b.programmeLinks ?? b.links);
    const programmes: ProgrammeGroup[] = rawProgrammes.map((program) => {
      const p = asObject(program) ?? {};
      const rawQualifications = asArray(p.qualifications ?? p.qualificationRows ?? p.children);
      const rawProgrammeEnrolments = asArray(p.enrolments ?? p.programmeEnrolments ?? p.links);

      let qualifications: QualificationGroup[] = [];
      if (rawQualifications.length > 0) {
        qualifications = rawQualifications.map((qual) => {
          const q = asObject(qual) ?? {};
          const rawEnrolments = asArray(q.enrolments ?? q.rows ?? q.programmeLinks ?? q.links);
          const enrolments: EnrolmentRow[] = rawEnrolments.map((enrol) => {
            const e = asObject(enrol) ?? {};
            const reason =
              toText(e.reason ?? e.reasonForNonCompletion ?? e.programmeCompletionReason, '') ||
              toText(e.completionReasonDescription ?? e.otherReasonText, '-');
            return {
              startDate: toIsoDate(e.startDate ?? e.programmeStartDate ?? e.commencementDate),
              endDate: toIsoDate(e.endDate ?? e.programmeEndDate ?? e.completionDate),
              trainingProvider: toText(e.trainingProvider ?? e.trainingProviderName ?? e.providerName, '-'),
              employer: toText(e.employer ?? e.employerName ?? e.companyName, '-'),
              status: cleanStatus(e.status ?? e.statusName ?? e.programmeCompletionStatus),
              reason,
              note: toText(e.note ?? e.notes ?? e.comments, '-'),
              documentCount: toNumber(e.documentCount ?? e.documentsCount ?? e.programmeDocumentCount, 0),
            };
          });
          return {
            qualificationId: toId(q.qualificationId ?? q.id ?? q.qualificationID),
            qualificationName: toText(q.qualificationName ?? q.qualification ?? q.name, 'Unspecified qualification'),
            enrolments,
          };
        });
      } else {
        // Sample payload shape: programmes -> enrolments; group rows into qualification buckets.
        const byQualification = new Map<string, QualificationGroup>();
        for (const enrol of rawProgrammeEnrolments) {
          const e = asObject(enrol) ?? {};
          const qualificationName =
            toText(
              e.qualificationDisplayName ??
                e.qualificationName ??
                e.customQualificationName ??
                e.qualification,
              'Unspecified qualification',
            ) || 'Unspecified qualification';
          const qualificationId = toId(e.qualificationId ?? e.qualificationID);
          const bucketKey = `${qualificationId ?? 'none'}::${qualificationName}`;
          if (!byQualification.has(bucketKey)) {
            byQualification.set(bucketKey, {
              qualificationId,
              qualificationName,
              enrolments: [],
            });
          }
          const reason =
            toText(e.reason ?? e.reasonForNonCompletion ?? e.programmeCompletionReason, '') ||
            toText(e.completionReasonDescription ?? e.otherReasonText, '-');
          byQualification.get(bucketKey)?.enrolments.push({
            startDate: toIsoDate(e.startDate ?? e.programmeStartDate ?? e.commencementDate),
            endDate: toIsoDate(e.endDate ?? e.programmeEndDate ?? e.completionDate),
            trainingProvider: toText(e.trainingProvider ?? e.trainingProviderName ?? e.providerName, '-'),
            employer: toText(e.employer ?? e.employerName ?? e.companyName, '-'),
            status: cleanStatus(e.status ?? e.statusName ?? e.programmeCompletionStatus),
            reason,
            note: toText(e.note ?? e.notes ?? e.comments, '-'),
            documentCount: toNumber(e.documentCount ?? e.documentsCount ?? e.programmeDocumentCount, 0),
          });
        }
        qualifications = Array.from(byQualification.values());
      }
      return {
        programmeId: toId(p.programmeId ?? p.id ?? p.programmeID),
        programmeName: toText(p.programmeName ?? p.programme ?? p.programmeDisplayName ?? p.name, 'Unspecified programme'),
        qualifications,
      };
    });

    return {
      beneficiaryId: toId(profile.beneficiaryId ?? b.beneficiaryId ?? b.id ?? b.beneficiaryID),
      fullName: toText(
        b.beneficiaryName ??
          `${toText(profile.firstName ?? b.firstName)} ${toText(profile.lastName ?? b.lastName)}`.trim(),
        'Unnamed beneficiary',
      ),
      idPassport: toText(profile.idNumber_Passport ?? b.idNumber_Passport ?? b.idNumberPassport ?? b.idPassport, '-'),
      gender: toText(profile.gender ?? b.gender, '-'),
      cellNo: toText(profile.cellNo ?? b.cellNo ?? b.mobileNo ?? b.contactMobileNo, '-'),
      emailAddress: toText(profile.emailAddress ?? b.emailAddress ?? b.email, '-'),
      province: toText(profile.physicalAddressProvince ?? b.physicalAddressProvince ?? b.province, '-'),
      status: toText(profile.status ?? b.status, '-'),
      programmes,
    };
  });

  const page = toNumber(root?.page ?? root?.pageNumber, 1);
  const pageSize = toNumber(root?.pageSize, 25);
  const totalCount = toNumber(root?.totalCount ?? root?.total, items.length);
  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize))),
  };
}

function normalizeOptions(data: unknown): Option[] {
  const rows = asArray(asObject(data)?.items ?? asObject(data)?.data ?? data);
  return rows
    .map((r) => {
      const o = asObject(r) ?? {};
      const name = toText(o.name ?? o.trainingProviderName ?? o.employerName);
      if (!name) return null;
      return { id: toNumber(o.id ?? o.trainingProviderId ?? o.employerId, NaN) || null, name };
    })
    .filter((x): x is Option => x != null);
}

export default function ProgrammeEnrolmentBeneficiariesPage() {
  const params = useSearchParams();
  const [openBeneficiaries, setOpenBeneficiaries] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(clampPage(params.get('page')));
  const [pageSize, setPageSize] = useState(clampPageSize(params.get('pageSize')));
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [province, setProvince] = useState(params.get('province') ?? '');
  const [trainingProviderId, setTrainingProviderId] = useState(params.get('trainingProviderId') ?? '');
  const [employerId, setEmployerId] = useState(params.get('employerId') ?? '');
  const [detailModal, setDetailModal] = useState<DetailModalState>(null);

  const baseFilters = useMemo(
    () => ({
      programmeId: params.get('programmeId') ?? '',
      qualificationId: params.get('qualificationId') ?? '',
      programmeCompletionStatusId: params.get('programmeCompletionStatusId') ?? '',
      programmeName: params.get('programmeName') ?? '',
      qualificationName: params.get('qualificationName') ?? '',
      statusName: params.get('statusName') ?? '',
    }),
    [params],
  );

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      programmeId: baseFilters.programmeId || undefined,
      qualificationId: baseFilters.qualificationId || undefined,
      programmeCompletionStatusId: baseFilters.programmeCompletionStatusId || undefined,
      trainingProviderId: trainingProviderId || undefined,
      employerId: employerId || undefined,
      province: province || undefined,
      search: search.trim() || undefined,
    }),
    [baseFilters, employerId, page, pageSize, province, search, trainingProviderId],
  );

  const listQuery = useQuery({
    queryKey: ['admin-programme-enrolment-beneficiaries', queryParams],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/Admin/programme-enrollments/beneficiaries', { params: queryParams });
      return normalizeBeneficiaries(data);
    },
    retry: false,
  });

  const trainingProviderQuery = useQuery({
    queryKey: ['admin-programme-link-training-providers-options'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/Admin/programme-link-options/training-providers');
      return normalizeOptions(data);
    },
    retry: false,
  });

  const employerQuery = useQuery({
    queryKey: ['admin-programme-link-employer-options'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/Admin/programme-link-options/employers');
      return normalizeOptions(data);
    },
    retry: false,
  });

  const items = listQuery.data?.items ?? [];
  const totalCount = listQuery.data?.totalCount ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;
  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const value = item.province?.trim();
      if (value && value !== '-') set.add(value);
    }
    if (province.trim()) set.add(province.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items, province]);

  return (
    <div className="mx-auto max-w-[1600px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Programme Enrolment Beneficiaries</h1>
            <p className="mt-1 text-sm text-slate-500">Comprehensive drilldown by beneficiary, programme, qualification and enrolment details.</p>
          </div>
          <Link href="/dashboard/admin/programme-enrolments" className={adminFormTheme.btnSecondary}>
            Back to Programme Enrolments
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {baseFilters.programmeName ? <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Programme: {baseFilters.programmeName}</span> : null}
          {baseFilters.qualificationName ? <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Qualification: {baseFilters.qualificationName}</span> : null}
          {baseFilters.statusName ? <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Status: {baseFilters.statusName}</span> : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search beneficiary, ID, email..."
            className={adminFormTheme.input}
          />
          <select
            value={trainingProviderId}
            onChange={(e) => {
              setTrainingProviderId(e.target.value);
              setPage(1);
            }}
            className={adminFormTheme.select}
          >
            <option value="">All training providers</option>
            {(trainingProviderQuery.data ?? []).map((o) => (
              <option key={`${o.id ?? 'tp'}-${o.name}`} value={o.id != null ? String(o.id) : ''}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            value={employerId}
            onChange={(e) => {
              setEmployerId(e.target.value);
              setPage(1);
            }}
            className={adminFormTheme.select}
          >
            <option value="">All employers</option>
            {(employerQuery.data ?? []).map((o) => (
              <option key={`${o.id ?? 'emp'}-${o.name}`} value={o.id != null ? String(o.id) : ''}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setPage(1);
            }}
            className={adminFormTheme.select}
          >
            <option value="">All provinces</option>
            {provinceOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {listQuery.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{apiErr(listQuery.error)}</div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
              <tr>
                <th className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-white/90" />
                    Beneficiary
                  </span>
                </th>
                <th className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <IdentificationIcon className="h-3.5 w-3.5 text-white/90" />
                    ID / Passport
                  </span>
                </th>
                <th className="px-3 py-2.5">Gender</th>
                <th className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <PhoneIcon className="h-3.5 w-3.5 text-white/90" />
                    Cell
                  </span>
                </th>
                <th className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <EnvelopeIcon className="h-3.5 w-3.5 text-white/90" />
                    Email
                  </span>
                </th>
                <th className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPinIcon className="h-3.5 w-3.5 text-white/90" />
                    Province
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-slate-500">Loading beneficiaries…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-slate-500">No beneficiaries found.</td>
                </tr>
              ) : (
                items.flatMap((beneficiary) => {
                  const key = String(beneficiary.beneficiaryId ?? beneficiary.fullName);
                  const isOpen = Boolean(openBeneficiaries[key]);
                  const parent = (
                    <tr key={key} className="bg-white transition hover:bg-emerald-50/30">
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setOpenBeneficiaries((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className="inline-flex items-center gap-2 text-left font-semibold text-slate-900"
                        >
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                              {beneficiary.fullName.charAt(0).toUpperCase()}
                            </span>
                            <span>{beneficiary.fullName}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{beneficiary.idPassport}</td>
                      <td className="px-3 py-2.5 text-slate-700">{beneficiary.gender}</td>
                      <td className="px-3 py-2.5 text-slate-700">{beneficiary.cellNo}</td>
                      <td className="px-3 py-2.5 text-slate-700">{beneficiary.emailAddress}</td>
                      <td className="px-3 py-2.5 text-slate-700">{beneficiary.province}</td>
                    </tr>
                  );
                  if (!isOpen) return [parent];

                  const detailRow = (
                    <tr key={`${key}-detail`} className="bg-emerald-50/10">
                      <td colSpan={6} className="px-3 py-3">
                        {beneficiary.programmes.length === 0 ? (
                          <p className="text-sm text-slate-500">No programme links for this beneficiary.</p>
                        ) : (
                          <div className="space-y-3">
                            {beneficiary.programmes.map((programme) => (
                              <div
                                key={`${key}-p-${programme.programmeId ?? programme.programmeName}`}
                                className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 shadow-sm transition hover:shadow-md"
                              >
                                <div
                                  className="border-b border-emerald-200/70 bg-emerald-100/50 px-4 py-3 text-base font-bold tracking-tight text-emerald-950"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="inline-flex items-center gap-2">
                                      <SparklesIcon className="h-4.5 w-4.5 text-emerald-700" />
                                      {programme.programmeName}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                                      <AcademicCapIcon className="h-3.5 w-3.5 text-hwseta-green" />
                                      {programme.qualifications.length}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-3 p-4">
                                  {programme.qualifications.map((qualification, qualificationIndex) => (
                                    <div
                                      key={`${key}-q-${qualification.qualificationId ?? qualification.qualificationName}`}
                                      className={`overflow-hidden rounded-xl border ${
                                        qualificationIndex % 2 === 0
                                          ? 'border-emerald-200/70 bg-white'
                                          : 'border-emerald-200/80 bg-emerald-50/40'
                                      }`}
                                    >
                                      <div
                                        className={`border-b px-4 py-2.5 text-sm font-bold ${
                                          qualificationIndex % 2 === 0
                                            ? 'border-emerald-200/70 bg-emerald-100/60 text-emerald-950'
                                            : 'border-emerald-200/70 bg-emerald-100/50 text-emerald-950'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="inline-flex items-center gap-2">
                                            <AcademicCapIcon className="h-4 w-4 text-hwseta-green" />
                                            {qualification.qualificationName}
                                          </span>
                                          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                                            <UserGroupIcon className="h-3.5 w-3.5 text-hwseta-green" />
                                            {qualification.enrolments.length}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                          <thead className="bg-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                                            <tr>
                                              <th className="px-3 py-2">
                                                <span className="inline-flex items-center gap-1.5">
                                                  <CalendarDaysIcon className="h-3.5 w-3.5 text-hwseta-green" />
                                                  Start Date
                                                </span>
                                              </th>
                                              <th className="px-3 py-2">End Date</th>
                                              <th className="px-3 py-2">Training Provider</th>
                                              <th className="px-3 py-2">Employer</th>
                                              <th className="px-3 py-2">Status</th>
                                              <th className="px-3 py-2">Reason</th>
                                              <th className="px-3 py-2">Note</th>
                                              <th className="px-3 py-2 text-center">Docs</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 bg-white">
                                            {qualification.enrolments.length === 0 ? (
                                              <tr>
                                                <td colSpan={8} className="px-3 py-3 text-center text-slate-500">No enrolment rows.</td>
                                              </tr>
                                            ) : (
                                              qualification.enrolments.map((enrolment, index) => (
                                                <tr
                                                  key={`${key}-e-${index}`}
                                                  className={`${
                                                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/75'
                                                  } hover:bg-emerald-50/50`}
                                                >
                                                  <td className="px-3 py-2.5 text-slate-700">{formatDate(enrolment.startDate)}</td>
                                                  <td className="px-3 py-2.5 text-slate-700">{formatDate(enrolment.endDate)}</td>
                                                  <td className="px-3 py-2.5 text-slate-700">{enrolment.trainingProvider}</td>
                                                  <td className="px-3 py-2.5 text-slate-700">{enrolment.employer}</td>
                                                  <td className="px-3 py-2.5 text-slate-700">{enrolment.status}</td>
                                                  <td className="px-3 py-2.5 text-slate-700">
                                                    {hasViewContent(enrolment.reason) ? (
                                                      <button
                                                        type="button"
                                                        onClick={() => setDetailModal({ title: 'Reason', content: enrolment.reason })}
                                                        className="font-semibold text-hwseta-green underline decoration-hwseta-green/60 underline-offset-2 hover:text-emerald-700"
                                                      >
                                                        View
                                                      </button>
                                                    ) : (
                                                      <span className="block text-center text-slate-500">-</span>
                                                    )}
                                                  </td>
                                                  <td className="px-3 py-2.5 text-slate-700">
                                                    {hasViewContent(enrolment.note) ? (
                                                      <button
                                                        type="button"
                                                        onClick={() => setDetailModal({ title: 'Note', content: enrolment.note })}
                                                        className="font-semibold text-hwseta-green underline decoration-hwseta-green/60 underline-offset-2 hover:text-emerald-700"
                                                      >
                                                        View
                                                      </button>
                                                    ) : (
                                                      <span className="block text-center text-slate-500">-</span>
                                                    )}
                                                  </td>
                                                  <td className="px-3 py-2.5 text-center text-slate-700">{enrolment.documentCount}</td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                  return [parent, detailRow];
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">Total records: <span className="font-semibold text-slate-900">{totalCount}</span></p>
          <div className="flex items-center gap-2">
            <select
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(clampPageSize(e.target.value));
                setPage(1);
              }}
              className={adminFormTheme.selectInline}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={adminFormTheme.btnSecondary}>
              Previous
            </button>
            <span className="text-sm font-semibold text-slate-700">Page {page} of {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={adminFormTheme.btnSecondary}>
              Next
            </button>
          </div>
        </div>
      </div>

      {detailModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">{detailModal.title}</h2>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{detailModal.content}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


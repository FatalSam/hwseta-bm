'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  FaArrowRight,
  FaChartLine,
  FaIdBadge,
  FaUserGraduate,
  FaUsers,
  FaWarehouse,
} from 'react-icons/fa';
import {
  BeneficiaryRegistrationsAreaCard,
  type AreaChartPoint,
  ProgrammeCompletionAreaCard,
} from '@/components/admin/AdminDashboardAreaCharts';
import {
  ComplaintsByTypeBarCard,
  ComplaintsOverviewDonutCard,
} from '@/components/admin/AdminDashboardInsightCards';
import { getAdminDashboardEmploymentTypeStatus } from '@/api/adminDashboard';
import { getAdminComplaintsDashboard } from '@/api/beneficiaryComplaints';
import { useAdminDashboardSnapshot } from '@/hooks/useAdminDashboardSnapshot';
import { useAdminBeneficiariesList } from '@/hooks/useAdminBeneficiaries';
import apiClient from '@/ultis/apiClient';

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

type DashboardRow = { label: string; count: number; percentage?: number };

function asObject(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toText(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function toMonthKey(value: unknown): string {
  const text = toText(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function prettifyMonthKey(value: string): string {
  if (!value) return '';
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleString('en-ZA', { month: 'short', year: 'numeric' });
}

function buildCountRows(values: Array<string | null | undefined>): DashboardRow[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = toText(raw) || 'Unspecified';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = values.length || 1;
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, percentage: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
}

function buildAgeBands(values: Array<number | null | undefined>): DashboardRow[] {
  const bands = [
    { label: '18-24', min: 18, max: 24, count: 0 },
    { label: '25-34', min: 25, max: 34, count: 0 },
    { label: '35-44', min: 35, max: 44, count: 0 },
    { label: '45-54', min: 45, max: 54, count: 0 },
    { label: '55+', min: 55, max: Number.POSITIVE_INFINITY, count: 0 },
  ];
  let knownCount = 0;
  for (const raw of values) {
    const age = Number(raw);
    if (!Number.isFinite(age) || age <= 0) continue;
    knownCount += 1;
    const band = bands.find((item) => age >= item.min && age <= item.max);
    if (band) band.count += 1;
  }
  const total = knownCount || 1;
  return bands
    .filter((band) => band.count > 0)
    .map((band) => ({ label: band.label, count: band.count, percentage: (band.count / total) * 100 }));
}

function normalizeProgrammeEnrolmentStatusSummary(data: unknown) {
  const root = asObject(data);
  const items = asArray(root?.items ?? root?.data ?? root?.programmes ?? data);
  const totals = new Map<string, number>();

  for (const item of items) {
    const row = asObject(item) ?? {};
    const statuses = asArray(row.statusTotals ?? row.statusCounts ?? row.counts ?? row.statuses);
    for (const statusRow of statuses) {
      const status = asObject(statusRow) ?? {};
      const name = toText(
        status.statusName ?? status.status ?? status.programmeCompletionStatus ?? status.name,
      );
      if (!name) continue;
      totals.set(name, (totals.get(name) ?? 0) + toNumber(status.enrolmentCount ?? status.count ?? status.total ?? status.value, 0));
    }
  }

  return {
    Completed: totals.get('Completed') ?? 0,
    'Dropped Out': totals.get('Dropped Out') ?? 0,
    'In Progress': totals.get('In Progress') ?? 0,
    'Not Completed': totals.get('Not Completed') ?? 0,
    Withdrawn: totals.get('Withdrawn') ?? 0,
  };
}

function normalizeProgrammeLinkReferenceCounts(data: unknown) {
  const root = asObject(data);
  const items = asArray(root?.items ?? root?.data ?? root?.results ?? root?.beneficiaries ?? data);
  const programmes = new Set<string>();
  const qualifications = new Set<string>();
  const trainingProviders = new Set<string>();
  const employers = new Set<string>();

  for (const item of items) {
    const beneficiary = asObject(item) ?? {};
    const programmeRows = asArray(beneficiary.programmes ?? beneficiary.programmeRows ?? beneficiary.programmeLinks ?? beneficiary.links);
    for (const programmeRow of programmeRows) {
      const programme = asObject(programmeRow) ?? {};
      const programmeId = toText(programme.programmeId ?? programme.programmeID ?? '');
      const programmeName = toText(programme.programmeName ?? programme.programme ?? programme.programmeDisplayName ?? programme.name);
      if (programmeId || programmeName) {
        programmes.add(`${programmeId || 'name'}::${programmeName || programmeId}`);
      }

      const enrolments = asArray(programme.enrolments ?? programme.programmeEnrolments ?? programme.links);
      for (const enrolmentRow of enrolments) {
        const enrolment = asObject(enrolmentRow) ?? {};
        const qualificationId = toText(enrolment.qualificationId ?? enrolment.qualificationID ?? '');
        const qualificationName = toText(
          enrolment.qualificationDisplayName ??
            enrolment.qualificationName ??
            enrolment.customQualificationName ??
            enrolment.qualification,
        );
        if (qualificationId || qualificationName) {
          qualifications.add(`${qualificationId || 'name'}::${qualificationName || qualificationId}`);
        }

        const trainingProviderId = toText(enrolment.trainingProviderId ?? '');
        const trainingProviderName = toText(enrolment.trainingProviderName ?? enrolment.trainingProvider ?? enrolment.providerName);
        if (trainingProviderId || trainingProviderName) {
          trainingProviders.add(`${trainingProviderId || 'name'}::${trainingProviderName || trainingProviderId}`);
        }

        const employerId = toText(enrolment.employerId ?? '');
        const employerName = toText(enrolment.employerName ?? enrolment.employer ?? enrolment.companyName);
        if (employerId || employerName) {
          employers.add(`${employerId || 'name'}::${employerName || employerId}`);
        }
      }
    }
  }

  return {
    programmes: programmes.size,
    qualifications: qualifications.size,
    trainingProviders: trainingProviders.size,
    employers: employers.size,
  };
}

/** Unique beneficiaries per programme name (for dashboard donut; capped). */
function buildBeneficiariesByProgrammeForDonut(data: unknown, max = 5): { label: string; count: number }[] {
  const root = asObject(data);
  const items = asArray(root?.items ?? root?.data ?? root?.results ?? root?.beneficiaries ?? data);
  const byName = new Map<string, Set<string>>();

  for (const item of items) {
    const beneficiary = asObject(item) ?? {};
    const bid = toText(
      beneficiary.beneficiaryId ??
        beneficiary.beneficiaryID ??
        beneficiary.id ??
        beneficiary.userId ??
        beneficiary.userID,
    );
    const perBeneficiaryKey = bid || `row-${byName.size}`;
    const programmeRows = asArray(
      beneficiary.programmes ?? beneficiary.programmeRows ?? beneficiary.programmeLinks ?? beneficiary.links,
    );
    const seen = new Set<string>();
    for (const programmeRow of programmeRows) {
      const programme = asObject(programmeRow) ?? {};
      const programmeName = toText(
        programme.programmeName ?? programme.programme ?? programme.programmeDisplayName ?? programme.name,
      );
      const pid = toText(programme.programmeId ?? programme.programmeID);
      const label = programmeName || (pid ? `Programme #${pid}` : 'Unnamed programme');
      if (seen.has(label)) continue;
      seen.add(label);
      if (!byName.has(label)) byName.set(label, new Set());
      byName.get(label)!.add(perBeneficiaryKey);
    }
  }

  return Array.from(byName.entries())
    .map(([label, set]) => ({ label, count: set.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

function endOfMonthMs(y: number, month0: number) {
  return new Date(y, month0 + 1, 0, 23, 59, 59, 999).getTime();
}

function isCompletedEnrolmentStatus(status: string): boolean {
  const t = status.toLowerCase();
  if (!t) return false;
  if (t.includes('not completed') || t.includes('not complete')) return false;
  return t === 'completed' || (t.includes('complete') && !t.includes('incomplete'));
}

function buildCompletionTrendFromPayload(
  data: unknown,
  monthCount: number,
): { points: AreaChartPoint[]; approximated: boolean } {
  const root = asObject(data);
  const items = asArray(root?.items ?? root?.data ?? root?.results ?? root?.beneficiaries ?? data);
  const enrols: { completed: boolean; endMs: number | null }[] = [];
  for (const item of items) {
    const b = asObject(item) ?? {};
    const programmeRows = asArray(b.programmes ?? b.programmeRows ?? b.programmeLinks ?? b.links);
    for (const programmeRow of programmeRows) {
      const p = asObject(programmeRow) ?? {};
      const enrolmentRows = asArray(p.enrolments ?? p.programmeEnrolments ?? p.links);
      for (const en of enrolmentRows) {
        const e = asObject(en) ?? {};
        const st = toText(e.status ?? e.statusName ?? e.programmeCompletionStatus);
        const raw = e.endDate ?? e.programmeEndDate ?? e.completionDate;
        const t = toText(raw);
        let endMs: number | null = null;
        if (t) {
          const d = new Date(t);
          if (!Number.isNaN(d.getTime())) endMs = d.getTime();
        }
        enrols.push({ completed: isCompletedEnrolmentStatus(st), endMs });
      }
    }
  }
  const total = enrols.length;
  if (total === 0) return { points: [], approximated: false };
  const now = new Date();
  const hasDate = enrols.some((e) => e.endMs != null);
  if (!hasDate) {
    const done = enrols.filter((e) => e.completed).length;
    const v = (100 * done) / total;
    const pts: AreaChartPoint[] = [];
    for (let k = monthCount - 1; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const longLabel = d.toLocaleString('en-ZA', { month: 'short', year: 'numeric' });
      const label = d.toLocaleString('en-ZA', { month: 'short' });
      pts.push({ key: `c-${k}`, label, longLabel, value: Math.round(v * 10) / 10 });
    }
    return { points: pts, approximated: true };
  }
  const pts: AreaChartPoint[] = [];
  for (let k = monthCount - 1; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const y = d.getFullYear();
    const m0 = d.getMonth();
    const endT = endOfMonthMs(y, m0);
    let done = 0;
    for (const e of enrols) {
      if (!e.completed) continue;
      if (e.endMs != null) {
        if (e.endMs <= endT) done++;
      } else if (k === 0) {
        done++;
      }
    }
    const longLabel = d.toLocaleString('en-ZA', { month: 'short', year: 'numeric' });
    const label = d.toLocaleString('en-ZA', { month: 'short' });
    const v = (100 * done) / total;
    pts.push({ key: `c-${k}`, label, longLabel, value: Math.min(100, Math.round(v * 10) / 10) });
  }
  return { points: pts, approximated: false };
}

function buildRegistrationLinePoints(
  rows: Array<Record<string, unknown>>,
  mode: 'this-year' | 'last-12',
  monthlyRows: { month: string; count: number }[],
  year: number,
): AreaChartPoint[] {
  const SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (mode === 'this-year') {
    const byM = new Map<number, number>();
    for (const row of rows) {
      const key = toMonthKey(row.registrationDate);
      if (!key) continue;
      const [y, m] = key.split('-').map(Number);
      if (y !== year) continue;
      byM.set(m - 1, (byM.get(m - 1) ?? 0) + 1);
    }
    return SHORT.map((label, i) => ({
      key: `${year}-${String(i + 1).padStart(2, '0')}`,
      label,
      longLabel: `${label} ${year}`,
      value: byM.get(i) ?? 0,
    }));
  }
  if (monthlyRows.length === 0) return [];
  return monthlyRows.map((row, i) => {
    const longLabel = row.month;
    const label = longLabel.split(/\s+/)[0] ?? longLabel;
    return { key: `reg-${i}`, label, longLabel, value: row.count };
  });
}

function normalizeProgrammeLinkReferenceBundle(data: unknown, completionMonthCount: number) {
  return {
    ...normalizeProgrammeLinkReferenceCounts(data),
    byProgramme: buildBeneficiariesByProgrammeForDonut(data, 5),
    completionTrend: buildCompletionTrendFromPayload(data, completionMonthCount),
  };
}

export default function AdminDashboardPage() {
  const [regRange, setRegRange] = useState<'this-year' | 'last-12'>('this-year');
  const [completionRange, setCompletionRange] = useState<'4' | '6' | '12'>('4');
  const { data, isLoading } = useAdminDashboardSnapshot(12, 10);
  const beneficiariesQuery = useAdminBeneficiariesList({ page: 1, pageSize: 1 });
  const beneficiaryProfilesQuery = useAdminBeneficiariesList({ page: 1, pageSize: 500 });
  const qualificationStatusQuery = useQuery({
    queryKey: ['admin-dashboard-qualification-status-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/Admin/programme-enrollments/drilldown');
      return normalizeProgrammeEnrolmentStatusSummary(data);
    },
    retry: false,
  });
  const programmeLinkReferenceQuery = useQuery({
    queryKey: ['admin-dashboard-programme-link-reference-counts', completionRange],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/Admin/programme-enrollments/beneficiaries', {
        params: { page: 1, pageSize: 500 },
      });
      return normalizeProgrammeLinkReferenceBundle(data, Number(completionRange));
    },
    retry: false,
  });
  const employmentTypeStatusQuery = useQuery({
    queryKey: ['admin-dashboard', 'employment-type-status'],
    queryFn: getAdminDashboardEmploymentTypeStatus,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const adminComplaintsDashboardQuery = useQuery({
    queryKey: ['admin-complaints', 'dashboard'],
    queryFn: getAdminComplaintsDashboard,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const summary = data?.summary;
  const complaintDash = adminComplaintsDashboardQuery.data;
  const complaintDashLoading = adminComplaintsDashboardQuery.isPending;
  const employmentTypeStatus = employmentTypeStatusQuery.data;
  const beneficiaryRows = beneficiaryProfilesQuery.data?.items ?? [];
  const fallbackMonthlyRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of beneficiaryRows) {
      const key = toMonthKey(row.registrationDate);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month: prettifyMonthKey(month), count }));
  }, [beneficiaryRows]);
  const monthlyRows = (data?.monthlyActivity?.length ?? 0) > 0 ? (data?.monthlyActivity ?? []) : fallbackMonthlyRows;
  const chartYear = new Date().getFullYear();
  const registrationLinePoints = useMemo(
    () =>
      buildRegistrationLinePoints(
        beneficiaryRows as Array<Record<string, unknown>>,
        regRange,
        monthlyRows,
        chartYear,
      ),
    [beneficiaryRows, chartYear, monthlyRows, regRange],
  );
  const latestMonth = monthlyRows.at(-1);
  const previousMonth = monthlyRows.at(-2);
  const thisMonthRegistrations = latestMonth?.count ?? 0;
  const lastMonthRegistrations = previousMonth?.count ?? 0;
  const monthlyChange =
    lastMonthRegistrations > 0
      ? ((thisMonthRegistrations - lastMonthRegistrations) / lastMonthRegistrations) * 100
      : thisMonthRegistrations > 0
        ? 100
        : 0;
  const maxMonthlyCount = Math.max(1, ...monthlyRows.map((row) => row.count));
  const genderRows = (data?.demographics.gender?.length ?? 0) > 0 ? (data?.demographics.gender ?? []) : buildCountRows(beneficiaryRows.map((row) => row.gender as string | null | undefined));
  const ageBandRows = (data?.demographics.ageBands?.length ?? 0) > 0 ? (data?.demographics.ageBands ?? []) : buildAgeBands(beneficiaryRows.map((row) => Number(row.age ?? 0)));
  const raceRows = (data?.demographics.raceGroups?.length ?? 0) > 0 ? (data?.demographics.raceGroups ?? []) : buildCountRows(beneficiaryRows.map((row) => row.raceGroup as string | null | undefined));
  const programmeLinkBundle = programmeLinkReferenceQuery.data;
  const linkedReferenceCounts = {
    programmes: programmeLinkBundle?.programmes ?? 0,
    qualifications: programmeLinkBundle?.qualifications ?? 0,
    trainingProviders: programmeLinkBundle?.trainingProviders ?? 0,
    employers: programmeLinkBundle?.employers ?? 0,
  };
  const completionTrend = programmeLinkBundle?.completionTrend;
  const qualificationStatuses = qualificationStatusQuery.data ?? {
    Completed: 0,
    'Dropped Out': 0,
    'In Progress': 0,
    'Not Completed': 0,
    Withdrawn: 0,
  };
  const dashboardCards = useMemo(
    () =>
      [
        {
          kind: 'metric' as const,
          title: 'Beneficiaries',
          href: '/dashboard/admin/beneficiaries',
          value: String(beneficiariesQuery.data?.totalCount ?? summary?.totalBeneficiaries ?? 0),
          extras: [
            { label: 'Active', value: String(summary?.activeBeneficiaries ?? '—') },
            { label: 'Inactive', value: String(summary?.inactiveBeneficiaries ?? '—') },
            { label: 'New this month', value: String(thisMonthRegistrations) },
          ],
          icon: FaUsers,
          accent: 'from-[#017f3f]/12 via-white to-white',
          iconBg: 'bg-[#017f3f]/10 text-[#017f3f]',
        },
        {
          kind: 'metric' as const,
          title: 'Programmes',
          href: '/dashboard/admin/programme-enrolments',
          value: String(linkedReferenceCounts.programmes),
          extras: [
            { label: 'Qualifications linked', value: String(linkedReferenceCounts.qualifications) },
            { label: 'Enrolments in progress', value: String(qualificationStatuses['In Progress']) },
            { label: 'Completed', value: String(qualificationStatuses.Completed) },
          ],
          icon: FaUserGraduate,
          accent: 'from-[#017f3f]/10 via-white to-white',
          iconBg: 'bg-[#017f3f]/10 text-[#017f3f]',
        },
        {
          kind: 'metric' as const,
          title: 'Qualifications',
          href: '/dashboard/admin/programme-enrolments',
          value: String(linkedReferenceCounts.qualifications),
          extras: [
            { label: 'In progress', value: String(qualificationStatuses['In Progress']) },
            { label: 'Completed', value: String(qualificationStatuses.Completed) },
            { label: 'Not completed', value: String(qualificationStatuses['Not Completed']) },
          ],
          icon: FaUserGraduate,
          accent: 'from-[#017f3f]/8 via-white to-[#feca07]/10',
          iconBg: 'bg-[#017f3f]/10 text-[#017f3f]',
        },
        {
          kind: 'metric' as const,
          title: 'Training Providers',
          href: '/dashboard/admin/training-providers',
          value: String(linkedReferenceCounts.trainingProviders),
          extras: [
            { label: 'Employers linked', value: String(linkedReferenceCounts.employers) },
            { label: 'Programmes covered', value: String(linkedReferenceCounts.programmes) },
            { label: 'Qualifications', value: String(linkedReferenceCounts.qualifications) },
          ],
          icon: FaWarehouse,
          accent: 'from-[#017f3f]/12 via-white to-white',
          iconBg: 'bg-[#017f3f]/10 text-[#017f3f]',
        },
        {
          kind: 'metric' as const,
          title: 'Employers',
          href: '/dashboard/admin/employers',
          value: String(linkedReferenceCounts.employers),
          extras: [
            { label: 'Training providers', value: String(linkedReferenceCounts.trainingProviders) },
            { label: 'Programmes', value: String(linkedReferenceCounts.programmes) },
            { label: 'Qualifications', value: String(linkedReferenceCounts.qualifications) },
          ],
          icon: FaIdBadge,
          accent: 'from-[#feca07]/12 via-white to-white',
          iconBg: 'bg-[#feca07]/16 text-[#b88700]',
        },
        {
          kind: 'statusChart' as const,
          title: 'Qualification status',
          href: '/dashboard/admin/programme-enrolments/beneficiaries?groupBy=qualification',
          statuses: qualificationStatuses,
          loading: qualificationStatusQuery.isLoading,
          icon: FaChartLine,
          accent: 'from-[#017f3f]/10 via-white to-[#feca07]/12',
          iconBg: 'bg-[#017f3f]/10 text-[#017f3f]',
        },
      ] as const,
    [
      beneficiariesQuery.data?.totalCount,
      summary,
      linkedReferenceCounts,
      qualificationStatuses,
      thisMonthRegistrations,
      qualificationStatusQuery.isLoading,
    ],
  );

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                href={card.href}
                className={cn(
                  'group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#017f3f]/25 hover:shadow-md',
                  card.accent,
                  card.kind === 'statusChart' ? 'min-h-[11rem]' : 'min-h-[12.5rem]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex rounded-xl p-2 ${card.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="rounded-full border border-slate-200/80 bg-white/90 p-1.5 text-slate-400 transition group-hover:border-[#017f3f]/20 group-hover:text-[#017f3f]">
                    <FaArrowRight className="h-3 w-3" />
                  </span>
                </div>

                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{card.title}</p>

                {card.kind === 'metric' ? (
                  <div className="mt-1 flex min-h-0 flex-1 flex-col">
                    <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{card.value}</p>
                    {'extras' in card && card.extras && card.extras.length > 0 ? (
                      <div className="mt-auto border-t border-slate-200/80 pt-3">
                        <ul className="space-y-1.5" role="list">
                          {card.extras.map((row) => (
                            <li
                              key={row.label}
                              className="flex items-center justify-between gap-2 text-[11px] leading-tight"
                            >
                              <span className="text-slate-500">{row.label}</span>
                              <span className="font-semibold tabular-nums text-slate-800">{row.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 flex min-h-0 flex-1 flex-col">
                    <QualificationStatusDistribution
                      statuses={card.statuses}
                      loading={card.loading}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] xl:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">This month vs last month</h2>
                <p className="mt-1 text-sm text-slate-500">Monthly beneficiary registrations from live beneficiary profile registration dates.</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-wide text-emerald-700">MoM</p>
                <p className={cn('mt-1 text-xl font-bold', monthlyChange >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {`${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{latestMonth?.month ?? 'This month'}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{thisMonthRegistrations}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{previousMonth?.month ?? 'Last month'}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{lastMonthRegistrations}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {monthlyRows.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-500">
                  {isLoading ? 'Loading monthly activity…' : 'No monthly registration data'}
                </div>
              ) : (
                monthlyRows.map((row) => (
                  <div key={`${row.month}-${row.count}`} className="grid grid-cols-[110px_1fr_56px] items-center gap-3">
                    <span className="text-sm font-medium text-slate-600">{row.month}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-hwseta-green to-emerald-400"
                        style={{ width: `${Math.max(6, (row.count / maxMonthlyCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-right text-sm font-semibold text-slate-900">{row.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <h2 className="text-xl font-bold text-slate-900">Employment status</h2>
            <div className="mt-4 space-y-3">
              <EmploymentCountRow
                label="Currently employed"
                value={employmentTypeStatus?.employed}
                loading={employmentTypeStatusQuery.isPending}
              />
              <EmploymentCountRow
                label="Not employed"
                value={employmentTypeStatus?.unemployed}
                loading={employmentTypeStatusQuery.isPending}
              />
              <EmploymentCountRow
                label="Volunteering"
                value={employmentTypeStatus?.volunteering}
                loading={employmentTypeStatusQuery.isPending}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BeneficiaryRegistrationsAreaCard
            points={registrationLinePoints}
            loading={beneficiaryProfilesQuery.isLoading}
            range={regRange}
            onRangeChange={setRegRange}
          />
          <ProgrammeCompletionAreaCard
            points={completionTrend?.points ?? []}
            loading={programmeLinkReferenceQuery.isPending}
            range={completionRange}
            onRangeChange={setCompletionRange}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ComplaintsOverviewDonutCard
            title="Complaints overview"
            segments={complaintDash?.byStatus ?? []}
            centerTotal={complaintDash?.total}
            loading={complaintDashLoading}
            error={adminComplaintsDashboardQuery.isError}
            footerHref="/dashboard/admin/complaints"
            footerLabel="View all complaints"
            colors={['#dc2626', '#059669', '#2563eb', '#d97706', '#64748b', '#7c3aed']}
          />
          <ComplaintsByTypeBarCard
            title="Complaints by type"
            rows={complaintDash?.byAgainstType ?? []}
            total={complaintDash?.total ?? 0}
            loading={complaintDashLoading}
            error={adminComplaintsDashboardQuery.isError}
            footerHref="/dashboard/admin/complaints"
            footerLabel="View all"
          />
        </section>

        <section className="rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Demographics</h2>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <DemographicList title="Gender" rows={genderRows} loading={isLoading || beneficiaryProfilesQuery.isLoading} />
            <DemographicList title="Age groups" rows={ageBandRows} loading={isLoading || beneficiaryProfilesQuery.isLoading} />
            <DemographicList title="Race groups" rows={raceRows} loading={isLoading || beneficiaryProfilesQuery.isLoading} />
          </div>
        </section>
      </div>
    </div>
  );
}

type QualificationStatusCounts = {
  Completed: number;
  'Dropped Out': number;
  'In Progress': number;
  'Not Completed': number;
  Withdrawn: number;
};

function QualificationStatusDistribution({
  statuses,
  loading,
}: {
  statuses: QualificationStatusCounts;
  loading: boolean;
}) {
  const segments = [
    { key: 'Completed', label: 'Completed', count: statuses.Completed, fill: '#059669' },
    { key: 'Dropped Out', label: 'Dropped Out', count: statuses['Dropped Out'], fill: '#d97706' },
    { key: 'In Progress', label: 'In Progress', count: statuses['In Progress'], fill: '#2563eb' },
    { key: 'Not Completed', label: 'Not Completed', count: statuses['Not Completed'], fill: '#64748b' },
    { key: 'Withdrawn', label: 'Withdrawn', count: statuses.Withdrawn, fill: '#e11d48' },
  ] as const;
  const total = segments.reduce((sum, row) => sum + row.count, 0);

  if (loading) {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-3 animate-pulse rounded-full bg-slate-200/70" />
        <div className="space-y-1.5">
          {segments.map((row) => (
            <div key={row.key} className="h-3.5 animate-pulse rounded bg-slate-200/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5" aria-label="Enrolment counts by qualification status">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200/70 ring-1 ring-slate-200/60"
        title={total > 0 ? `Total enrolments: ${total}` : 'No enrolments in this breakdown'}
      >
        {total > 0
          ? segments.map((row) =>
              row.count > 0 ? (
                <div
                  key={row.key}
                  style={{ width: `${(row.count / total) * 100}%`, backgroundColor: row.fill }}
                  className="min-w-px"
                  title={`${row.label}: ${row.count}`}
                />
              ) : null,
            )
          : null}
      </div>
      <ul className="space-y-1" role="list">
        {segments.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-2 text-[10px] leading-snug text-slate-700"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-sm ring-1 ring-black/5"
                style={{ backgroundColor: row.fill }}
                aria-hidden
              />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-slate-900">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmploymentCountRow({
  label,
  value,
  loading = false,
}: {
  label: string;
  value: number | undefined;
  loading?: boolean;
}) {
  const display =
    loading && (value == null || Number.isNaN(value))
      ? '…'
      : value == null || Number.isNaN(value)
        ? '—'
        : String(value);
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-900">{display}</span>
    </div>
  );
}

function DemographicList({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: { label: string; count: number; percentage?: number }[];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{loading ? 'Loading…' : 'No data'}</p>
        ) : (
          rows.map((row) => (
            <div key={`${title}-${row.label}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <span className="text-sm text-slate-700">{row.label}</span>
              <span className="text-sm font-semibold text-slate-900">
                {row.count}
                {row.percentage != null && Number.isFinite(row.percentage)
                  ? ` (${row.percentage.toFixed(1)}%)`
                  : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

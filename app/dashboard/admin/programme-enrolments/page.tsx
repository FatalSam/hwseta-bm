'use client';

import { useCallback, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import apiClient from '@/ultis/apiClient';
import { exportRowsToExcel } from '@/ultis/exportExcel';
import { FaFileExcel } from 'react-icons/fa';

type StatusCount = { status: string; count: number };
type QualificationRow = {
  qualificationId: number | null;
  qualification: string;
  beneficiaryCount: number;
  statusCounts: StatusCount[];
};
type ProgrammeDrilldownRow = {
  programmeId: number | null;
  programme: string;
  beneficiaryCount: number;
  statusCounts: StatusCount[];
  qualifications: QualificationRow[];
};

function apiErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const o = d as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
      if (typeof o.title === 'string') return o.title;
    }
    return e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

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

function normalizeDrilldownPayload(data: unknown): ProgrammeDrilldownRow[] {
  const root = asRecord(data);
  const programmesRaw = asArray(root?.items ?? root?.data ?? root?.programmes ?? root?.programmeDrilldown ?? data);

  return programmesRaw.map((p) => {
    const pObj = asRecord(p) ?? {};
    const qualificationsRaw = asArray(
      pObj.qualifications ?? pObj.children ?? pObj.rows ?? pObj.programmeQualifications,
    );

    const qualifications: QualificationRow[] = qualificationsRaw.map((q) => {
      const qObj = asRecord(q) ?? {};
      const statusRaw = asArray(qObj.statusBreakdown ?? qObj.statusCounts ?? qObj.completionStatuses ?? qObj.counts ?? qObj.statuses);
      return {
        qualificationId: (() => {
          const raw = qObj.qualificationId ?? qObj.qualificationID ?? qObj.id ?? qObj.ID;
          const n = Number(raw);
          return Number.isFinite(n) ? n : null;
        })(),
        qualification:
          toStringSafe(qObj.qualification) ||
          toStringSafe(qObj.qualificationName) ||
          toStringSafe(qObj.name) ||
          'Unspecified qualification',
        beneficiaryCount: toNumber(qObj.distinctBeneficiaryCount ?? qObj.beneficiaryCount ?? qObj.distinctCount ?? 0),
        statusCounts: statusRaw.map((s) => {
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
        }),
      };
    });

    const programmeStatusRaw = asArray(
      pObj.statusTotals ?? pObj.statusCounts ?? pObj.completionStatuses ?? pObj.counts ?? pObj.statuses,
    );

    return {
      programmeId: (() => {
        const raw = pObj.programmeId ?? pObj.programmeID ?? pObj.id ?? pObj.ID;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })(),
      programme:
        toStringSafe(pObj.programme) ||
        toStringSafe(pObj.programmeName) ||
        toStringSafe(pObj.name) ||
        'Unspecified programme',
      beneficiaryCount: toNumber(pObj.distinctBeneficiaryCount ?? pObj.beneficiaryCount ?? pObj.distinctCount ?? 0),
      statusCounts: programmeStatusRaw.map((s) => {
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
      }),
      qualifications,
    };
  });
}

function statusCountByName(statusCounts: StatusCount[], target: string): number {
  const targetNorm = target.toLowerCase();
  return statusCounts
    .filter((s) => s.status.toLowerCase() === targetNorm)
    .reduce((sum, s) => sum + s.count, 0);
}

function renderCountLink(
  value: number,
  onClick: () => void,
) {
  if (value <= 0) return <span>{value}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-semibold text-hwseta-green underline decoration-hwseta-green/60 underline-offset-2 hover:text-emerald-700"
    >
      {value}
    </button>
  );
}

export default function AdminProgrammeEnrolmentsPage() {
  const [search, setSearch] = useState('');
  const [openProgrammes, setOpenProgrammes] = useState<Record<string, boolean>>({});

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-programme-enrolments-drilldown'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/Admin/programme-enrollments/drilldown');
      return normalizeDrilldownPayload(data);
    },
    retry: false,
  });

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (r.programme.toLowerCase().includes(q)) return true;
      return r.qualifications.some((x) => x.qualification.toLowerCase().includes(q));
    });
  }, [rows, search]);

  const totalProgrammes = useMemo(() => rows.length, [rows]);

  const totalQualifications = useMemo(
    () => rows.reduce((sum, r) => sum + r.qualifications.length, 0),
    [rows],
  );

  const toggleOpen = (programme: string) => {
    setOpenProgrammes((prev) => ({ ...prev, [programme]: !prev[programme] }));
  };

  // Placeholder URL resolver; replace paths when endpoint URLs are provided.
  const openLink = useCallback((path: string | null) => {
    if (!path || typeof window === 'undefined') return;
    window.location.href = path;
  }, []);

  const statusIdByName = useCallback((status?: string): number | null => {
    if (!status || status === 'Beneficiaries') return null;
    const key = status.trim().toLowerCase();
    if (key === 'completed') return 1;
    if (key === 'not completed') return 2;
    if (key === 'in progress') return 3;
    if (key === 'dropped out') return 4;
    if (key === 'withdrawn') return 5;
    return null;
  }, []);

  const metricUrl = useCallback((metric: 'programmes' | 'qualifications') => {
    const params = new URLSearchParams();
    params.set('groupBy', metric === 'programmes' ? 'programme' : 'qualification');
    return `/dashboard/admin/programme-enrolments/beneficiaries?${params.toString()}`;
  }, []);

  const countUrl = useCallback(
    (kind: 'programme' | 'qualification', row: ProgrammeDrilldownRow | QualificationRow, status?: string) => {
      const params = new URLSearchParams();
      if (kind === 'programme') {
        const p = row as ProgrammeDrilldownRow;
        if (p.programmeId != null) params.set('programmeId', String(p.programmeId));
        params.set('programmeName', p.programme);
      } else {
        const q = row as QualificationRow;
        if (q.qualificationId != null) params.set('qualificationId', String(q.qualificationId));
        params.set('qualificationName', q.qualification);
      }
      const statusId = statusIdByName(status);
      if (statusId != null) params.set('programmeCompletionStatusId', String(statusId));
      if (status && status !== 'Beneficiaries') params.set('statusName', status);
      return `/dashboard/admin/programme-enrolments/beneficiaries?${params.toString()}`;
    },
    [statusIdByName],
  );

  const handleExportExcel = useCallback(() => {
    if (filtered.length === 0) return;
    const exportRows: Record<string, string | number | null>[] = [];
    for (const programme of filtered) {
      exportRows.push({
        'Programme / Qualification': `${programme.programme} (${programme.qualifications.length})`,
        Beneficiaries: programme.beneficiaryCount,
        Completed: statusCountByName(programme.statusCounts, 'Completed'),
        'Dropped Out': statusCountByName(programme.statusCounts, 'Dropped Out'),
        'In Progress': statusCountByName(programme.statusCounts, 'In Progress'),
        'Not Completed': statusCountByName(programme.statusCounts, 'Not Completed'),
        Withdrawn: statusCountByName(programme.statusCounts, 'Withdrawn'),
      });
      for (const q of programme.qualifications) {
        exportRows.push({
          'Programme / Qualification': `  ${q.qualification}`,
          Beneficiaries: q.beneficiaryCount,
          Completed: statusCountByName(q.statusCounts, 'Completed'),
          'Dropped Out': statusCountByName(q.statusCounts, 'Dropped Out'),
          'In Progress': statusCountByName(q.statusCounts, 'In Progress'),
          'Not Completed': statusCountByName(q.statusCounts, 'Not Completed'),
          Withdrawn: statusCountByName(q.statusCounts, 'Withdrawn'),
        });
      }
    }
    exportRowsToExcel('programme-enrolments', exportRows, 'ProgrammeEnrolments');
  }, [filtered]);

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Programme Enrolments</h1>
          </div>
          <div className="flex flex-wrap items-stretch justify-end gap-3">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center min-w-[9rem]">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Programmes</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-800">
                {renderCountLink(totalProgrammes, () => openLink(metricUrl('programmes')))}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center min-w-[9rem]">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Qualifications</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-800">
                {renderCountLink(totalQualifications, () => openLink(metricUrl('qualifications')))}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full max-w-xl">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by programme or qualification..."
              className={`${adminFormTheme.input} pl-9`}
            />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filtered.length === 0 || isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaFileExcel className="h-3.5 w-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiErr(error)}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
              <tr>
                <th className="px-3 py-2.5">Programme / Qualification</th>
                <th className="px-3 py-2.5 text-center">Beneficiaries</th>
                <th className="px-3 py-2.5 text-center">Completed</th>
                <th className="px-3 py-2.5 text-center">Dropped Out</th>
                <th className="px-3 py-2.5 text-center">In Progress</th>
                <th className="px-3 py-2.5 text-center">Not Completed</th>
                <th className="px-3 py-2.5 text-center">Withdrawn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-slate-500">
                    Loading programme enrolments…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-slate-500">
                    No programme enrolments found.
                  </td>
                </tr>
              ) : (
                filtered.flatMap((programme) => {
                  const isOpen = Boolean(openProgrammes[programme.programme]);
                  const parentRow = (
                    <tr key={programme.programme} className="align-top bg-emerald-50/20 hover:bg-emerald-50/40">
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleOpen(programme.programme)}
                          className="inline-flex items-center gap-2 text-left font-semibold text-slate-900"
                        >
                          {isOpen ? (
                            <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4 text-slate-500" />
                          )}
                          <span>
                            {programme.programme} ({programme.qualifications.length})
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-900">
                        {renderCountLink(programme.beneficiaryCount, () =>
                          openLink(countUrl('programme', programme, 'Beneficiaries')),
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700">
                        {renderCountLink(statusCountByName(programme.statusCounts, 'Completed'), () =>
                          openLink(countUrl('programme', programme, 'Completed')),
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700">
                        {renderCountLink(statusCountByName(programme.statusCounts, 'Dropped Out'), () =>
                          openLink(countUrl('programme', programme, 'Dropped Out')),
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700">
                        {renderCountLink(statusCountByName(programme.statusCounts, 'In Progress'), () =>
                          openLink(countUrl('programme', programme, 'In Progress')),
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700">
                        {renderCountLink(statusCountByName(programme.statusCounts, 'Not Completed'), () =>
                          openLink(countUrl('programme', programme, 'Not Completed')),
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700">
                        {renderCountLink(statusCountByName(programme.statusCounts, 'Withdrawn'), () =>
                          openLink(countUrl('programme', programme, 'Withdrawn')),
                        )}
                      </td>
                    </tr>
                  );

                  if (!isOpen) return [parentRow];

                  const childRows = programme.qualifications.map((q) => (
                    <tr
                      key={`${programme.programme}-${q.qualification}`}
                      className="bg-white hover:bg-emerald-50/20"
                    >
                      <td className="px-3 py-2.5 pl-10 text-slate-800">{q.qualification}</td>
                      <td className="px-3 py-2.5 text-center text-slate-700">
                        {renderCountLink(q.beneficiaryCount, () =>
                          openLink(countUrl('qualification', q, 'Beneficiaries')),
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-700">
                        {renderCountLink(statusCountByName(q.statusCounts, 'Completed'), () =>
                          openLink(countUrl('qualification', q, 'Completed')),
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-700">
                        {renderCountLink(statusCountByName(q.statusCounts, 'Dropped Out'), () =>
                          openLink(countUrl('qualification', q, 'Dropped Out')),
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-700">
                        {renderCountLink(statusCountByName(q.statusCounts, 'In Progress'), () =>
                          openLink(countUrl('qualification', q, 'In Progress')),
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-700">
                        {renderCountLink(statusCountByName(q.statusCounts, 'Not Completed'), () =>
                          openLink(countUrl('qualification', q, 'Not Completed')),
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-700">
                        {renderCountLink(statusCountByName(q.statusCounts, 'Withdrawn'), () =>
                          openLink(countUrl('qualification', q, 'Withdrawn')),
                        )}
                      </td>
                    </tr>
                  ));

                  return [parentRow, ...childRows];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

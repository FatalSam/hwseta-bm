'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FaCheckCircle,
  FaClock,
  FaEye,
  FaFolderOpen,
  FaListAlt,
  FaUndo,
} from 'react-icons/fa';
import {
  getAdminBeneficiaryComplaintActivitiesForBeneficiary,
  getAdminBeneficiaryComplaintById,
  getAdminComplaintLookups,
  getAdminComplaintsDashboard,
  listBeneficiaryComplaintsForAdmin,
  patchAdminBeneficiaryComplaintStatus,
  postAdminBeneficiaryComplaintAction,
  postAdminBeneficiaryComplaintForward,
  postAdminBeneficiaryComplaintNote,
  postAdminBeneficiaryComplaintToBeneficiary,
} from '@/api/beneficiaryComplaints';
import { listAdminBeneficiaries } from '@/api/adminBeneficiaries';
import { useNotifications } from '@/components/ui/notification';
import { formatComplaintDisplayDateTime } from '@/ultis/complaintsDisplay';

type AdminComplaintListRow = {
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryComplaintId: string;
  complaintReference?: string | null;
  complaintsStatusId?: number | null;
  complaintsStatusDescription?: string | null;
  complaintType?: string | null;
  complaintAgainstType?: string | null;
  complaintAgainstTypeId?: number | null;
  trainingProviderName?: string | null;
  employerName?: string | null;
  province?: string | null;
  dateCreated?: string | null;
  lastVisibleActivityDate?: string | null;
};

function toBeneficiaryName(raw: Record<string, unknown>): string {
  const name = String(raw.beneficiaryName ?? '').trim();
  if (name) return name;
  const first = String(raw.firstName ?? '').trim();
  const last = String(raw.lastName ?? '').trim();
  return [first, last].filter(Boolean).join(' ') || 'Unknown beneficiary';
}

function statusCountByName(
  items: Array<{ label: string; count: number }> | undefined,
  names: string[],
): number {
  if (!items || items.length === 0) return 0;
  const wanted = names.map((n) => n.trim().toLowerCase());
  const row = items.find((x) => wanted.includes(x.label.trim().toLowerCase()));
  return row?.count ?? 0;
}

export default function AdminComplaintsPage() {
  const { addNotification } = useNotifications();
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaintListRow | null>(null);
  const [statusId, setStatusId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [actionType, setActionType] = useState<'message' | 'note' | 'forward' | 'admin-action'>('message');
  const [actionMessage, setActionMessage] = useState('');
  const [actionVisibleToBeneficiary, setActionVisibleToBeneficiary] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [caseTab, setCaseTab] = useState<'workflow' | 'timeline'>('workflow');

  const dashboardQuery = useQuery({
    queryKey: ['admin-complaints-page', 'dashboard'],
    queryFn: getAdminComplaintsDashboard,
    retry: false,
  });
  const openCount = useMemo(
    () => statusCountByName(dashboardQuery.data?.byStatus, ['Open']),
    [dashboardQuery.data?.byStatus],
  );
  const inProgressCount = useMemo(
    () => statusCountByName(dashboardQuery.data?.byStatus, ['In Progress', 'InReview', 'In Review']),
    [dashboardQuery.data?.byStatus],
  );
  const closedCount = useMemo(
    () => statusCountByName(dashboardQuery.data?.byStatus, ['Closed']),
    [dashboardQuery.data?.byStatus],
  );
  const withdrawnCount = useMemo(
    () => statusCountByName(dashboardQuery.data?.byStatus, ['Withdrawn']),
    [dashboardQuery.data?.byStatus],
  );

  const lookupsQuery = useQuery({
    queryKey: ['admin-complaints-page', 'lookups'],
    queryFn: getAdminComplaintLookups,
    retry: false,
  });

  const beneficiariesQuery = useQuery({
    queryKey: ['admin-complaints-page', 'beneficiaries'],
    queryFn: () => listAdminBeneficiaries({ page: 1, pageSize: 100 }),
    retry: false,
  });

  const beneficiaryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of beneficiariesQuery.data?.items ?? []) {
      const o = row as Record<string, unknown>;
      const id = String(o.beneficiaryId ?? '').trim();
      if (!id) continue;
      map.set(id, toBeneficiaryName(o));
    }
    return map;
  }, [beneficiariesQuery.data?.items]);

  const beneficiaryProvinceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of beneficiariesQuery.data?.items ?? []) {
      const o = row as Record<string, unknown>;
      const id = String(o.beneficiaryId ?? '').trim();
      const province = String(o.physicalAddressProvince ?? '').trim();
      if (!id || !province) continue;
      map.set(id, province);
    }
    return map;
  }, [beneficiariesQuery.data?.items]);

  const againstTypeLabelById = useMemo(() => {
    const map = new Map<number, string>();
    (lookupsQuery.data?.againstTypes ?? []).forEach((item) => {
      map.set(item.complaintAgainstTypeId, item.description);
    });
    return map;
  }, [lookupsQuery.data?.againstTypes]);

  const statusIdByDescription = useMemo(() => {
    const map = new Map<string, number>();
    (lookupsQuery.data?.statuses ?? []).forEach((item) => {
      map.set(item.description.trim().toLowerCase(), item.complaintsStatusId);
    });
    return map;
  }, [lookupsQuery.data?.statuses]);

  const complaintsQuery = useQuery({
    queryKey: [
      'admin-complaints-page',
      'list',
      selectedBeneficiaryId || 'all',
      beneficiariesQuery.data?.items?.length ?? 0,
    ],
    enabled: !beneficiariesQuery.isPending,
    retry: false,
    queryFn: async (): Promise<AdminComplaintListRow[]> => {
      if (selectedBeneficiaryId) {
        const result = await listBeneficiaryComplaintsForAdmin(selectedBeneficiaryId, 1, 100);
        const name = beneficiaryMap.get(selectedBeneficiaryId) ?? 'Selected beneficiary';
        return result.items.map((item) => ({
          ...item,
          beneficiaryId: selectedBeneficiaryId,
          beneficiaryName: name,
          province: (item as unknown as Record<string, unknown>).province as string | undefined ?? beneficiaryProvinceMap.get(selectedBeneficiaryId) ?? null,
          beneficiaryComplaintId: item.beneficiaryComplaintId,
        }));
      }

      const ids = [...beneficiaryMap.keys()].slice(0, 60);
      if (ids.length === 0) return [];
      const all = await Promise.allSettled(ids.map((id) => listBeneficiaryComplaintsForAdmin(id, 1, 50)));
      const rows: AdminComplaintListRow[] = [];
      all.forEach((result, idx) => {
        if (result.status !== 'fulfilled') return;
        const beneficiaryId = ids[idx]!;
        const beneficiaryName = beneficiaryMap.get(beneficiaryId) ?? 'Unknown beneficiary';
        result.value.items.forEach((item) => {
          rows.push({
            ...item,
            beneficiaryId,
            beneficiaryName,
            province:
              ((item as unknown as Record<string, unknown>).province as string | undefined) ??
              beneficiaryProvinceMap.get(beneficiaryId) ??
              null,
            beneficiaryComplaintId: item.beneficiaryComplaintId,
          });
        });
      });
      rows.sort((a, b) => {
        const aa = new Date(a.lastVisibleActivityDate ?? a.dateCreated ?? 0).getTime();
        const bb = new Date(b.lastVisibleActivityDate ?? b.dateCreated ?? 0).getTime();
        return bb - aa;
      });
      return rows;
    },
  });

  const selectedComplaintDetailQuery = useQuery({
    queryKey: [
      'admin-complaints-page',
      'detail',
      selectedComplaint?.beneficiaryId ?? '',
      selectedComplaint?.beneficiaryComplaintId ?? '',
    ],
    enabled: !!selectedComplaint?.beneficiaryId && !!selectedComplaint?.beneficiaryComplaintId,
    retry: false,
    queryFn: async () => {
      const beneficiaryId = selectedComplaint!.beneficiaryId;
      const complaintId = selectedComplaint!.beneficiaryComplaintId;
      const [detail, activities] = await Promise.all([
        getAdminBeneficiaryComplaintById(beneficiaryId, complaintId),
        getAdminBeneficiaryComplaintActivitiesForBeneficiary(beneficiaryId, complaintId),
      ]);
      return { detail, activities };
    },
  });

  useEffect(() => {
    if (!selectedComplaint) {
      setStatusId('');
      return;
    }
    if (selectedComplaint.complaintsStatusId != null) {
      setStatusId(String(selectedComplaint.complaintsStatusId));
      return;
    }
    const desc = (selectedComplaint.complaintsStatusDescription ?? '').trim().toLowerCase();
    if (desc) {
      const mapped = statusIdByDescription.get(desc);
      if (mapped != null) {
        setStatusId(String(mapped));
        return;
      }
    }
    setStatusId('');
  }, [selectedComplaint, statusIdByDescription]);

  useEffect(() => {
    if (!selectedComplaintDetailQuery.data?.detail || !selectedComplaint) return;
    if (statusId) return;
    const detail = selectedComplaintDetailQuery.data.detail;
    const rawId = Number(
      (detail.complaintsStatusId as number | string | undefined) ??
        (detail.ComplaintsStatusID as number | string | undefined),
    );
    if (Number.isFinite(rawId)) {
      setStatusId(String(rawId));
      return;
    }
    const desc = String(
      (detail.complaintsStatusDescription as string | undefined) ??
        (detail.ComplaintsStatusDescription as string | undefined) ??
        (detail.complaintsStatus as string | undefined) ??
        '',
    )
      .trim()
      .toLowerCase();
    if (!desc) return;
    const mapped = statusIdByDescription.get(desc);
    if (mapped != null) setStatusId(String(mapped));
  }, [selectedComplaint, selectedComplaintDetailQuery.data?.detail, statusId, statusIdByDescription]);

  const handleApplyStatus = async () => {
    if (!selectedComplaint || !statusId) return;
    try {
      setIsSubmittingAction(true);
      await patchAdminBeneficiaryComplaintStatus(selectedComplaint.beneficiaryComplaintId, {
        newStatusId: Number(statusId),
        message: statusMessage.trim() || null,
      });
      await Promise.all([complaintsQuery.refetch(), selectedComplaintDetailQuery.refetch()]);
      addNotification({ type: 'success', title: 'Status updated', message: 'Complaint status was updated.' });
      setStatusMessage('');
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Could not update status',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handlePostAction = async () => {
    if (!selectedComplaint || !actionMessage.trim()) return;
    try {
      setIsSubmittingAction(true);
      const id = selectedComplaint.beneficiaryComplaintId;
      if (actionType === 'message') {
        await postAdminBeneficiaryComplaintToBeneficiary(id, { message: actionMessage.trim(), toUserId: null });
      } else if (actionType === 'note') {
        await postAdminBeneficiaryComplaintNote(id, {
          message: actionMessage.trim(),
          isVisibleToBeneficiary: actionVisibleToBeneficiary,
        });
      } else if (actionType === 'forward') {
        await postAdminBeneficiaryComplaintForward(id, {
          message: actionMessage.trim(),
          toUserId: null,
          metadataJson: null,
        });
      } else {
        await postAdminBeneficiaryComplaintAction(id, {
          message: actionMessage.trim(),
          isVisibleToBeneficiary: actionVisibleToBeneficiary,
        });
      }
      setActionMessage('');
      await Promise.all([complaintsQuery.refetch(), selectedComplaintDetailQuery.refetch()]);
      addNotification({ type: 'success', title: 'Action posted', message: 'Complaint activity was logged.' });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Could not post action',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Complaints</h1>
          <p className="mt-1 text-sm text-slate-600">Admin complaints dashboard and case workflow.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <Metric
              title="Total"
              value={dashboardQuery.data?.total}
              icon={FaListAlt}
              iconTone="emerald"
              subValueLabel="Opened in the last 30 days"
              subValue={dashboardQuery.data?.createdLast30Days}
            />
            <Metric title="Open" value={openCount} icon={FaFolderOpen} iconTone="blue" />
            <Metric title="In Progress" value={inProgressCount} icon={FaClock} iconTone="amber" />
            <Metric title="Closed" value={closedCount} icon={FaCheckCircle} iconTone="green" />
            <Metric title="Withdrawn" value={withdrawnCount} icon={FaUndo} iconTone="purple" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Beneficiary complaints</h2>
              <p className="text-sm text-slate-600">Select a beneficiary or view the latest complaints across beneficiaries.</p>
            </div>
            <div className="w-full sm:w-80">
              <label htmlFor="beneficiary-filter" className="mb-1 block text-xs font-semibold text-slate-500">
                Beneficiary filter
              </label>
              <select
                id="beneficiary-filter"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={selectedBeneficiaryId}
                onChange={(e) => {
                  setSelectedComplaint(null);
                  setSelectedBeneficiaryId(e.target.value);
                }}
              >
                <option value="">All loaded beneficiaries</option>
                {(beneficiariesQuery.data?.items ?? []).map((row) => {
                  const o = row as Record<string, unknown>;
                  const id = String(o.beneficiaryId ?? '');
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {beneficiaryMap.get(id) ?? id}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
                <tr>
                  <th className="px-3 py-2.5">Reference</th>
                  <th className="px-3 py-2.5">Beneficiary</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Against</th>
                  <th className="px-3 py-2.5">Training Provider</th>
                  <th className="px-3 py-2.5">Employer</th>
                  <th className="px-3 py-2.5">Province</th>
                  <th className="px-3 py-2.5">Date Created</th>
                  <th className="px-3 py-2.5">Last activity</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {complaintsQuery.isPending ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={11}>
                      Loading complaints...
                    </td>
                  </tr>
                ) : (complaintsQuery.data?.length ?? 0) === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={11}>
                      No complaints found.
                    </td>
                  </tr>
                ) : (
                  complaintsQuery.data!.map((row) => (
                    <tr key={`${row.beneficiaryId}-${row.beneficiaryComplaintId}`} className="hover:bg-emerald-50/30">
                      <td className="px-3 py-2.5">{row.complaintReference ?? row.beneficiaryComplaintId}</td>
                      <td className="px-3 py-2.5">{row.beneficiaryName}</td>
                      <td className="px-3 py-2.5">{row.complaintsStatusDescription ?? '-'}</td>
                      <td className="px-3 py-2.5">{row.complaintType ?? '-'}</td>
                      <td className="px-3 py-2.5">
                        {row.complaintAgainstType ??
                          (typeof row.complaintAgainstTypeId === 'number'
                            ? againstTypeLabelById.get(row.complaintAgainstTypeId) ?? '-'
                            : '-')}
                      </td>
                      <td className="px-3 py-2.5">{row.trainingProviderName ?? '-'}</td>
                      <td className="px-3 py-2.5">{row.employerName ?? '-'}</td>
                      <td className="px-3 py-2.5">{row.province ?? '-'}</td>
                      <td className="px-3 py-2.5">{formatComplaintDisplayDateTime(row.dateCreated ?? undefined)}</td>
                      <td className="px-3 py-2.5">
                        {row.lastVisibleActivityDate ? formatComplaintDisplayDateTime(row.lastVisibleActivityDate) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => {
                            setSelectedComplaint(row);
                            setStatusMessage('');
                            setCaseTab('workflow');
                          }}
                          aria-label="View case"
                          title="View case"
                        >
                          <FaEye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedComplaint ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label="Close case popup"
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
              onClick={() => setSelectedComplaint(null)}
            />
            <section className="relative z-10 max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl">
              <div className="sticky top-0 z-10 -m-5 mb-4 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Case {selectedComplaint.complaintReference ?? selectedComplaint.beneficiaryComplaintId}
                  </h2>
                  <p className="text-sm text-slate-600">{selectedComplaint.beneficiaryName}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  onClick={() => setSelectedComplaint(null)}
                >
                  Close
                </button>
              </div>

              <div className="mb-4 flex gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    caseTab === 'workflow'
                      ? 'bg-[#124a3f] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setCaseTab('workflow')}
                >
                  Workflow
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    caseTab === 'timeline'
                      ? 'bg-[#124a3f] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setCaseTab('timeline')}
                >
                  Timeline
                </button>
              </div>

              {caseTab === 'workflow' ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Status update</h3>
                    <div className="mt-3 space-y-3">
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={statusId}
                        onChange={(e) => setStatusId(e.target.value)}
                      >
                        <option value="">Select new status</option>
                        {(lookupsQuery.data?.statuses ?? []).map((s) => (
                          <option key={s.complaintsStatusId} value={String(s.complaintsStatusId)}>
                            {s.description}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={statusMessage}
                        onChange={(e) => setStatusMessage(e.target.value)}
                        rows={3}
                        placeholder="Optional status note..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={isSubmittingAction || !statusId}
                        onClick={() => void handleApplyStatus()}
                        className="rounded-lg bg-[#124a3f] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Apply status
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Post workflow action</h3>
                    <div className="mt-3 space-y-3">
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value as 'message' | 'note' | 'forward' | 'admin-action')}
                      >
                        <option value="message">Message to beneficiary</option>
                        <option value="note">Internal/visible note</option>
                        <option value="forward">Forward (log)</option>
                        <option value="admin-action">Admin action</option>
                      </select>
                      {(actionType === 'note' || actionType === 'admin-action') ? (
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={actionVisibleToBeneficiary}
                            onChange={(e) => setActionVisibleToBeneficiary(e.target.checked)}
                          />
                          Visible to beneficiary
                        </label>
                      ) : null}
                      <textarea
                        value={actionMessage}
                        onChange={(e) => setActionMessage(e.target.value)}
                        rows={4}
                        placeholder="Enter workflow message..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={isSubmittingAction || !actionMessage.trim()}
                        onClick={() => void handlePostAction()}
                        className="rounded-lg bg-[#124a3f] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Post action
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Timeline (including internal notes)</h3>
                  {selectedComplaintDetailQuery.isPending ? (
                    <p className="mt-3 text-sm text-slate-500">Loading timeline...</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {(selectedComplaintDetailQuery.data?.activities ?? []).map((a, idx) => (
                        <li key={a.activityId ?? `${idx}-${a.dateCreated}`} className="rounded-lg border border-slate-100 px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{String(a.activityType ?? 'Update')}</span>
                            {a.isVisibleToBeneficiary === false ? (
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] uppercase text-slate-700">Internal</span>
                            ) : null}
                            <span>
                              {formatComplaintDisplayDateTime(
                                String(a.dateCreated ?? a.createdAt ?? '') || undefined,
                              )}
                            </span>
                          </div>
                          {a.message ? <p className="mt-1 text-sm text-slate-800">{String(a.message)}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  iconTone = 'slate',
  subValueLabel,
  subValue,
}: {
  title: string;
  value: number | undefined;
  icon: typeof FaListAlt;
  iconTone?: 'emerald' | 'blue' | 'amber' | 'green' | 'purple' | 'teal' | 'slate' | 'cyan' | 'indigo';
  subValueLabel?: string;
  subValue?: number | undefined;
}) {
  const tones: Record<
    NonNullable<typeof iconTone>,
    { bg: string; text: string; ring: string }
  > = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', ring: 'ring-emerald-300/70' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-800', ring: 'ring-blue-300/70' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-800', ring: 'ring-amber-300/70' },
    green: { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-300/70' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-800', ring: 'ring-purple-300/70' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-800', ring: 'ring-teal-300/70' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-800', ring: 'ring-slate-300/70' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-800', ring: 'ring-cyan-300/70' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', ring: 'ring-indigo-300/70' },
  };
  const tone = tones[iconTone];

  return (
    <div className="h-full rounded-2xl border border-slate-300/80 bg-gradient-to-b from-white to-slate-50/60 px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{title}</p>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums text-slate-900">{value ?? '—'}</p>
      {subValueLabel ? (
        <p className="mt-1.5 text-[11px] text-slate-600">
          {subValueLabel}:{' '}
          <span className="font-bold tabular-nums text-slate-800">{subValue ?? '—'}</span>
        </p>
      ) : null}
    </div>
  );
}


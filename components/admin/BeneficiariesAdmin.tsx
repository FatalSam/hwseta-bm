'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { FaEdit, FaFileExcel, FaPlus, FaSearch, FaUsers } from 'react-icons/fa';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { SyncfusionIsoDatePicker } from '@/components/ui/SyncfusionIsoDatePicker';
import apiClient from '@/ultis/apiClient';
import { exportRowsToExcel } from '@/ultis/exportExcel';
import {
  useAdminBeneficiaryMutations,
  useAdminBeneficiariesList,
} from '@/hooks/useAdminBeneficiaries';
import type { AdminBeneficiary, AdminBeneficiarySavePayload } from '@/types/admin-beneficiaries';

type FilterOption = { id: string; name: string };

function normalizeProvinceName(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

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

function emptyDraft(): AdminBeneficiarySavePayload {
  return {
    userId: null,
    firstName: '',
    lastName: '',
    gender: '',
    raceGroup: '',
    idNumber_Passport: '',
    dob: '',
    cellNo: '',
    emailAddress: '',
    physicalAddressProvince: '',
    status: 'Active',
    registrationDate: '',
    notes: '',
  };
}

export default function BeneficiariesAdmin() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  /** Empty = no date filter (show all registration dates). */
  const [registrationFrom, setRegistrationFrom] = useState('');
  const [registrationTo, setRegistrationTo] = useState('');
  const [selectedEmployerId, setSelectedEmployerId] = useState('');
  const [selectedTrainingProviderId, setSelectedTrainingProviderId] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedProvinceName, setSelectedProvinceName] = useState('');

  const [employerOptions, setEmployerOptions] = useState<FilterOption[]>([]);
  const [trainingProviderOptions, setTrainingProviderOptions] = useState<FilterOption[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<FilterOption[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<AdminBeneficiarySavePayload>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useMemo(() => {
    const from = registrationFrom.trim();
    const to = registrationTo.trim();
    const provinceId = selectedProvinceId.trim();
    const province = selectedProvinceName.trim();
    return {
      page,
      pageSize,
      search: search.trim() || null,
      ...(from ? { registrationFrom: from } : {}),
      ...(to ? { registrationTo: to } : {}),
      employerId: selectedEmployerId.trim() || null,
      trainingProviderId: selectedTrainingProviderId.trim() || null,
      ...(provinceId ? { provinceId } : {}),
      ...(province ? { province } : {}),
    };
  }, [
    page,
    pageSize,
    registrationFrom,
    registrationTo,
    search,
    selectedEmployerId,
    selectedProvinceId,
    selectedProvinceName,
    selectedTrainingProviderId,
  ]);

  const { data, isLoading, error } = useAdminBeneficiariesList(query);
  const { createMutation } = useAdminBeneficiaryMutations();
  const apiRows = data?.items ?? [];
  const provinceFilter = selectedProvinceName.trim();
  const rows = useMemo(() => {
    if (!provinceFilter) return apiRows;
    const target = normalizeProvinceName(provinceFilter);
    return apiRows.filter((row) => normalizeProvinceName(row.physicalAddressProvince ?? row.province) === target);
  }, [apiRows, provinceFilter]);
  const totalCount = provinceFilter && rows.length !== apiRows.length ? rows.length : (data?.totalCount ?? 0);
  const totalPages = data?.totalPages ?? 1;
  const gridPageStart = (page - 1) * pageSize;

  const busy = createMutation.isPending;

  const handleExportExcel = () => {
    const exportRows = rows.map((row) => {
      const rawAge = row.age;
      const age =
        rawAge == null || typeof rawAge === 'object'
          ? ''
          : String(rawAge);
      const programmeCount = row.programmeLinkCount ?? row.programmeLinksCount;
      const programmes =
        typeof programmeCount === 'number' || typeof programmeCount === 'string' ? programmeCount : 0;

      return {
        beneficiaryName: String(
          row.beneficiaryName ??
            [row.firstName, row.lastName].filter(Boolean).join(' '),
        ).trim(),
        idNumberPassport: row.idNumber_Passport ?? '',
        registrationDate: String(row.registrationDate ?? '').slice(0, 10),
        gender: row.gender ?? '',
        age,
        cellNo: row.cellNo ?? '',
        programmes,
        province: String(row.physicalAddressProvince ?? row.province ?? '').trim(),
      };
    });
    exportRowsToExcel('admin-beneficiaries', exportRows, 'Beneficiaries');
  };

  useEffect(() => {
    let mounted = true;
    const loadFilters = async () => {
      try {
        const [provincesRes, employersRes, trainingProvidersRes] = await Promise.all([
          apiClient.get('/api/Dropdowns/provinces'),
          apiClient.get('/api/Admin/programme-link-options/employers'),
          apiClient.get('/api/Admin/programme-link-options/training-providers'),
        ]);
        if (!mounted) return;

        const provinceRows = Array.isArray(provincesRes.data) ? provincesRes.data : [];
        setProvinceOptions(
          provinceRows
            .map((p: Record<string, unknown>) => ({
              id: String(p.id ?? p.provinceId ?? p.provinceID ?? p.ProvinceID ?? '').trim(),
              name: String(p.name ?? p.provinceName ?? p.province ?? p.Province ?? '').trim(),
            }))
            .filter((o) => o.id && o.name),
        );

        const employerRows = Array.isArray(employersRes.data) ? employersRes.data : [];
        setEmployerOptions(
          employerRows
            .map((e: Record<string, unknown>) => ({
              id: String(e.id ?? e.employerId ?? e.employerID ?? '').trim(),
              name: String(e.name ?? e.employerName ?? e.employer ?? '').trim(),
            }))
            .filter((o) => o.name),
        );

        const trainingRows = Array.isArray(trainingProvidersRes.data) ? trainingProvidersRes.data : [];
        setTrainingProviderOptions(
          trainingRows
            .map((p: Record<string, unknown>) => ({
              id: String(p.id ?? p.trainingProviderId ?? p.trainingProviderID ?? '').trim(),
              name: String(p.name ?? p.trainingProviderName ?? p.trainingProvider ?? '').trim(),
            }))
            .filter((o) => o.name),
        );
      } catch {
        if (!mounted) return;
        setEmployerOptions([]);
        setTrainingProviderOptions([]);
        setProvinceOptions([]);
      }
    };
    loadFilters();
    return () => {
      mounted = false;
    };
  }, []);

  const openCreate = () => {
    setDraft(emptyDraft());
    setFormError(null);
    setFormOpen(true);
  };

  const openEditPage = (row: AdminBeneficiary) => {
    if (row.beneficiaryId == null) return;
    router.push(`/dashboard/admin/beneficiaries/${encodeURIComponent(String(row.beneficiaryId))}/edit`);
  };

  const submit = async () => {
    setFormError(null);
    if (!draft.firstName?.trim() || !draft.lastName?.trim()) {
      setFormError('First name and last name are required.');
      return;
    }
    try {
      const payload: AdminBeneficiarySavePayload = {
        ...draft,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        gender: draft.gender?.trim() || null,
        raceGroup: draft.raceGroup?.trim() || null,
        idNumber_Passport: draft.idNumber_Passport?.trim() || null,
        dob: draft.dob?.trim() || null,
        cellNo: draft.cellNo?.trim() || null,
        emailAddress: draft.emailAddress?.trim() || null,
        physicalAddressProvince: draft.physicalAddressProvince?.trim() || null,
        status: draft.status?.trim() || 'Active',
        registrationDate: draft.registrationDate?.trim() || null,
        notes: draft.notes?.trim() || null,
      };
      await createMutation.mutateAsync(payload);
      setFormOpen(false);
    } catch (e) {
      setFormError(apiErr(e));
    }
  };

  const actionIconBtn =
    'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-hwseta-green disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white pb-8">
      <div className="mb-4 flex items-center gap-2 px-4 text-sm text-gray-600 lg:px-6">
        <FaUsers className="h-4 w-4" />
        <span>/</span>
        <span className="font-medium text-gray-900">Admin</span>
        <span>/</span>
        <span className="font-medium text-gray-900">Beneficiaries</span>
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] lg:mx-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hwseta-green">Admin beneficiaries</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Beneficiaries</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
            <span className="rounded-full bg-hwseta-green/10 px-3 py-1.5 text-hwseta-green">Records</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">{totalCount} total</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)] lg:mx-6">
        <section className="p-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <p className="text-[11px] text-slate-500 md:col-span-2 xl:col-span-3">
                  Leave registration dates blank to list all beneficiaries; set a range to narrow results.
                </p>
                <label className="block">
                  <span className={adminFormTheme.label}>Registration from</span>
                  <SyncfusionIsoDatePicker
                    value={registrationFrom}
                    onChange={(iso) => {
                      setRegistrationFrom(iso);
                      setPage(1);
                    }}
                  />
                </label>
                <label className="block">
                  <span className={adminFormTheme.label}>Registration to</span>
                  <SyncfusionIsoDatePicker
                    value={registrationTo}
                    onChange={(iso) => {
                      setRegistrationTo(iso);
                      setPage(1);
                    }}
                  />
                </label>
                <span className="hidden xl:block" aria-hidden="true" />
                <label className="block">
                  <span className={adminFormTheme.label}>Employer</span>
                  <select
                    value={selectedEmployerId}
                    onChange={(e) => {
                      setSelectedEmployerId(e.target.value);
                      setPage(1);
                    }}
                    className={adminFormTheme.select}
                  >
                    <option value="">All employers</option>
                    {employerOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={adminFormTheme.label}>Training provider</span>
                  <select
                    value={selectedTrainingProviderId}
                    onChange={(e) => {
                      setSelectedTrainingProviderId(e.target.value);
                      setPage(1);
                    }}
                    className={adminFormTheme.select}
                  >
                    <option value="">All training providers</option>
                    {trainingProviderOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={adminFormTheme.label}>Province</span>
                  <select
                    value={selectedProvinceId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const selected = provinceOptions.find((p) => p.id === id);
                      setSelectedProvinceId(id);
                      setSelectedProvinceName(selected?.name ?? '');
                      setPage(1);
                    }}
                    className={adminFormTheme.select}
                  >
                    <option value="">All provinces</option>
                    {provinceOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <label className="block w-full max-w-xl">
                  <span className={adminFormTheme.label}>Search</span>
                  <div className="flex min-h-[42px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <FaSearch className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Name, ID, cellphone, email..."
                      className="w-full text-sm text-gray-700 outline-none"
                    />
                  </div>
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={rows.length === 0}
                    className="mr-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaFileExcel className="h-3.5 w-3.5" />
                    Export Excel
                  </button>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-hwseta-green bg-white px-4 py-2 text-sm font-semibold text-hwseta-green hover:bg-hwseta-green/5"
                  >
                    <FaPlus className="h-3.5 w-3.5" />
                    Add New Beneficiary
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {apiErr(error)}
              </div>
            )}

            <div className="mt-5 flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <div className="max-h-[min(60vh,560px)] overflow-auto">
                <table className="min-w-full whitespace-nowrap divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-hwseta-green text-white shadow-sm">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide">
                      <th className="px-5 py-3 text-white/90">Beneficiary Name</th>
                      <th className="px-5 py-3 text-white/90">ID/Passport</th>
                      <th className="px-5 py-3 text-white/90">Registration Date</th>
                      <th className="px-5 py-3 text-white/90">Gender</th>
                      <th className="px-5 py-3 text-white/90">Age</th>
                      <th className="px-5 py-3 text-white/90">Cell No</th>
                      <th className="px-5 py-3 text-center text-white/90">Programmes</th>
                      <th className="px-5 py-3 text-white/90">Province</th>
                      <th className="px-5 py-3 text-right text-white/90">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-16 text-center text-gray-500">Loading…</td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-16 text-center text-gray-500">No beneficiaries found.</td>
                      </tr>
                    ) : (
                      rows.map((row, index) => {
                        const displayName = String(
                          row.beneficiaryName ??
                          [row.firstName, row.lastName].filter(Boolean).join(' '),
                        ).trim();
                        const canEdit = row.beneficiaryId != null;

                        return (
                        <tr
                          key={String(row.beneficiaryId ?? `${row.firstName}-${row.lastName}`)}
                          className={cn(index % 2 === 0 ? 'bg-white hover:bg-emerald-50/40' : 'bg-slate-50/50 hover:bg-emerald-50/40')}
                        >
                          <td className="px-5 py-4">
                            {canEdit && displayName ? (
                              <button
                                type="button"
                                onClick={() => openEditPage(row)}
                                className="font-semibold text-hwseta-green hover:underline"
                                title="Edit beneficiary"
                              >
                                {displayName}
                              </button>
                            ) : (
                              <span className="font-semibold text-gray-900">{displayName || '—'}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-gray-600">{row.idNumber_Passport?.trim() || '—'}</td>
                          <td className="px-5 py-4 text-gray-600">
                            {String(row.registrationDate ?? '').slice(0, 10) || '—'}
                          </td>
                          <td className="px-5 py-4 text-gray-600">{String(row.gender ?? '').trim() || '—'}</td>
                          <td className="px-5 py-4 text-gray-600">
                            {row.age != null && typeof row.age !== 'object' ? String(row.age) : '—'}
                          </td>
                          <td className="px-5 py-4 text-gray-600">
                            {String(row.cellNo ?? '').trim() || '—'}
                          </td>
                          <td className="px-5 py-4 text-center text-gray-600">
                            {(() => {
                              const n = row.programmeLinkCount ?? row.programmeLinksCount ?? 0;
                              return typeof n === 'number' ? n : Number(n) || 0;
                            })()}
                          </td>
                          <td className="px-5 py-4 text-gray-600">
                            {String(row.physicalAddressProvince ?? row.province ?? '').trim() || '—'}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditPage(row)}
                                disabled={row.beneficiaryId == null}
                                className={actionIconBtn}
                                title="Edit"
                                aria-label="Edit"
                              >
                                <FaEdit className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalCount > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p>
                    Showing{' '}
                    <span className="font-semibold text-slate-800">
                      {gridPageStart + 1}–{Math.min(gridPageStart + rows.length, totalCount)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-800">{totalCount}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      Rows
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        className={adminFormTheme.selectInline}
                      >
                        {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((v) => Math.max(1, v - 1))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-500">Page {page} / {Math.max(1, totalPages)}</span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <BeneficiaryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add beneficiary"
        draft={draft}
        setDraft={setDraft}
        formError={formError}
        onSubmit={submit}
        busy={busy}
      />
    </div>
  );
}

function BeneficiaryFormModal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  draft: AdminBeneficiarySavePayload;
  setDraft: Dispatch<SetStateAction<AdminBeneficiarySavePayload>>;
  formError: string | null;
  onSubmit: () => void;
  busy: boolean;
}) {
  const { open, onClose, title, draft, setDraft, formError, onSubmit, busy } = props;

  const set = <K extends keyof AdminBeneficiarySavePayload>(key: K, value: AdminBeneficiarySavePayload[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
        </Transition.Child>
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <Dialog.Panel className={cn(adminFormTheme.modalPanelWide, 'flex max-h-[92vh] flex-col')}>
              <div className={adminFormTheme.modalHeader}>
                <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {formError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="First name *"><input className={adminFormTheme.input} value={draft.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} /></Field>
                  <Field label="Last name *"><input className={adminFormTheme.input} value={draft.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} /></Field>
                  <Field label="Gender"><input className={adminFormTheme.input} value={draft.gender ?? ''} onChange={(e) => set('gender', e.target.value)} /></Field>
                  <Field label="Race group"><input className={adminFormTheme.input} value={draft.raceGroup ?? ''} onChange={(e) => set('raceGroup', e.target.value)} /></Field>
                  <Field label="ID Number / Passport"><input className={adminFormTheme.input} value={draft.idNumber_Passport ?? ''} onChange={(e) => set('idNumber_Passport', e.target.value)} /></Field>
                  <Field label="Date of birth"><SyncfusionIsoDatePicker value={draft.dob ?? ''} onChange={(iso) => set('dob', iso || '')} /></Field>
                  <Field label="Cellphone"><input className={adminFormTheme.input} value={draft.cellNo ?? ''} onChange={(e) => set('cellNo', e.target.value)} /></Field>
                  <Field label="Email"><input type="email" className={adminFormTheme.input} value={draft.emailAddress ?? ''} onChange={(e) => set('emailAddress', e.target.value)} /></Field>
                  <Field label="Province"><input className={adminFormTheme.input} value={draft.physicalAddressProvince ?? ''} onChange={(e) => set('physicalAddressProvince', e.target.value)} /></Field>
                  <Field label="Status">
                    <select className={adminFormTheme.select} value={draft.status ?? 'Active'} onChange={(e) => set('status', e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </Field>
                  <Field label="Registration date"><SyncfusionIsoDatePicker value={draft.registrationDate ?? ''} onChange={(iso) => set('registrationDate', iso || '')} /></Field>
                  <div className="hidden sm:block" />
                  <Field label="Notes">
                    <textarea className={adminFormTheme.textarea} value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
                  </Field>
                </div>
              </div>
              <div className={adminFormTheme.modalFooter}>
                <button type="button" onClick={onClose} className={adminFormTheme.btnSecondary}>Cancel</button>
                <button type="button" onClick={onSubmit} disabled={busy} className={adminFormTheme.btnPrimary}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={adminFormTheme.label}>{label}</span>
      {children}
    </label>
  );
}

 'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { FaChalkboardTeacher, FaEdit, FaFileExcel, FaPlus, FaRedo, FaSearch } from 'react-icons/fa';
import { FormToggleSwitch } from '@/components/admin/FormToggleSwitch';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { SyncfusionIsoDatePicker } from '@/components/ui/SyncfusionIsoDatePicker';
import AccreditationBodiesMultiSelect from '@/components/admin/AccreditationBodiesMultiSelect';
import AdminAddressPlacesBlock from '@/components/admin/AdminAddressPlacesBlock';
import AdminAddressLocationSelects from '@/components/admin/AdminAddressLocationSelects';
import { useAuthStore } from '@/store/authStore';
import { useTrainingProviderMutations, useTrainingProvidersList } from '@/hooks/useTrainingProviders';
import { useAccreditationBodiesList } from '@/hooks/useProgrammeSetup';
import {
  getTrainingProvider,
  listTrainingProviderAccreditationBodies,
  setTrainingProviderAccreditationBodies,
} from '@/api/trainingProviders';
import { resolveAddressTextToDropdownIds } from '@/lib/resolveAddressTextToDropdownIds';
import {
  isValidEmail,
  isValidPhone,
  sanitizePhoneInput,
  validateAdminContactFields,
  type AdminContactFieldKey,
} from '@/lib/contactValidation';
import type { TrainingProvider, TrainingProviderId, TrainingProviderUpdatePayload } from '@/types/trainingProviders';
import { exportRowsToExcel } from '@/ultis/exportExcel';

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
      if (Array.isArray(o.errors)) return JSON.stringify(o.errors);
    }
    return e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

function emptyDraft(createdBy: number): TrainingProviderUpdatePayload {
  return {
    trainingProviderName: '',
    subSector: '',
    physicalAddress1: '',
    physicalAddress2: '',
    physicalAddress3: '',
    physicalAddressCode: '',
    province: null,
    municipality: null,
    district: null,
    area: '',
    code: '',
    provinceId: undefined,
    municipalityId: undefined,
    districtId: undefined,
    telephoneNo: '',
    emailAddress: '',
    status: 'Active',
    accreditationNumber: '',
    sdlNumber: '',
    registrationDate: '',
    companyRegNo: '',
    contactPersonFirstName: '',
    contactPersonLastName: '',
    contactPersonTelNo: '',
    contactPersonEmail: '',
    contactMobileNo: '',
    designation: '',
    webAddress: '',
    comments: '',
    accreditationBodyIds: [],
    etqa: false,
    softSkills: false,
    technicalSkills: false,
    createdBy,
  };
}

function recordToDraft(p: TrainingProvider, fallbackCreatedBy: number): TrainingProviderUpdatePayload {
  const physicalCode = p.physicalAddressCode ?? '';
  return {
    trainingProviderName: p.trainingProviderName ?? '',
    subSector: p.subSector ?? '',
    physicalAddress1: p.physicalAddress1 ?? '',
    physicalAddress2: p.physicalAddress2 ?? '',
    physicalAddress3: p.physicalAddress3 ?? '',
    physicalAddressCode: physicalCode,
    province: p.province ?? null,
    municipality: p.municipality ?? null,
    district: p.district ?? null,
    area: (p.area ?? p.physicalAddress2 ?? '').trim(),
    code: (p.code ?? physicalCode).trim(),
    provinceId: p.provinceId,
    municipalityId: p.municipalityId,
    districtId: p.districtId,
    telephoneNo: sanitizePhoneInput(p.telephoneNo ?? ''),
    emailAddress: p.emailAddress ?? '',
    status: p.status ?? 'Active',
    accreditationNumber: p.accreditationNumber ?? '',
    sdlNumber: p.sdlNumber ?? '',
    registrationDate: p.registrationDate ?? '',
    companyRegNo: p.companyRegNo ?? '',
    contactPersonFirstName: p.contactPersonFirstName ?? '',
    contactPersonLastName: p.contactPersonLastName ?? '',
    contactPersonTelNo: p.contactPersonTelNo ?? '',
    contactPersonEmail: p.contactPersonEmail ?? '',
    contactMobileNo: p.contactMobileNo ?? '',
    designation: p.designation ?? '',
    webAddress: p.webAddress ?? '',
    comments: p.comments ?? '',
    accreditationBodyIds: [],
    etqa: Boolean(p.etqa),
    softSkills: Boolean(p.softSkills),
    technicalSkills: Boolean(p.technicalSkills),
    createdBy: typeof p.createdBy === 'number' ? p.createdBy : fallbackCreatedBy,
  };
}

function providerKey(p: TrainingProvider): string {
  const id = p.trainingProviderId;
  if (id != null && String(id)) return String(id);
  return `${p.trainingProviderName ?? 'row'}-${p.emailAddress ?? ''}-${p.accreditationNumber ?? ''}`;
}

const inputClass = adminFormTheme.input;
const labelClass = adminFormTheme.label;

export default function TrainingProvidersAdmin() {
  const user = useAuthStore((s) => s.user);
  const createdBy = useMemo(() => {
    const n = Number.parseInt(String(user?.userID ?? ''), 10);
    return Number.isFinite(n) ? n : 1;
  }, [user?.userID]);

  const { data: providers = [], isLoading, error, refetch, isFetching } = useTrainingProvidersList();
  const { createMutation, updateMutation } = useTrainingProviderMutations();

  const [filter, setFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<TrainingProviderId | null>(null);
  const [draft, setDraft] = useState<TrainingProviderUpdatePayload>(() => emptyDraft(createdBy));
  const [formError, setFormError] = useState<string | null>(null);

  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(25);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => {
      const hay = [
        p.trainingProviderName,
        p.companyRegNo,
        p.province,
        p.telephoneNo,
        p.subSector,
        p.emailAddress,
        p.status,
        p.accreditationNumber,
        p.sdlNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [providers, filter]);

  useEffect(() => {
    setGridPage(1);
  }, [filter]);

  const totalGridCount = filtered.length;
  const totalGridPages = Math.max(1, Math.ceil(totalGridCount / gridPageSize));

  useEffect(() => {
    setGridPage((p) => Math.min(Math.max(1, p), totalGridPages));
  }, [totalGridPages]);
  const gridPageStart = (gridPage - 1) * gridPageSize;
  const pagedProviders = useMemo(() => {
    const start = (gridPage - 1) * gridPageSize;
    return filtered.slice(start, start + gridPageSize);
  }, [filtered, gridPage, gridPageSize]);

  const handleExportExcel = useCallback(() => {
    const rows = filtered.map((p) => ({
      trainingProviderId: p.trainingProviderId ?? '',
      trainingProviderName: p.trainingProviderName ?? '',
      companyRegNo: p.companyRegNo ?? '',
      province: p.province ?? '',
      telephoneNo: p.telephoneNo ?? '',
      subSector: p.subSector ?? '',
      status: p.status ?? '',
      emailAddress: p.emailAddress ?? '',
      sdlNumber: p.sdlNumber ?? '',
      municipality: p.municipality ?? '',
      district: p.district ?? '',
    }));
    exportRowsToExcel('training-providers', rows, 'TrainingProviders');
  }, [filtered]);

  const openCreate = useCallback(() => {
    setFormMode('create');
    setEditingId(null);
    setDraft(emptyDraft(createdBy));
    setFormError(null);
    setFormOpen(true);
  }, [createdBy]);

  const openEdit = useCallback(
    async (p: TrainingProvider) => {
      const id = p.trainingProviderId;
      if (id == null) return;
      setFormMode('edit');
      setEditingId(id);
      setFormError(null);
      let full: TrainingProvider = p;
      try {
        full = await getTrainingProvider(id);
      } catch {
        /* list row may be enough */
      }
      let accreditationBodyIds: number[] = [];
      try {
        const links = await listTrainingProviderAccreditationBodies(id);
        accreditationBodyIds = links
          .map((l) => Number(l.accreditationBodyId))
          .filter((n) => Number.isFinite(n));
      } catch {
        /* network / legacy API */
      }
      const base = recordToDraft(full, createdBy);
      const resolved = await resolveAddressTextToDropdownIds({
        province: base.province,
        municipality: base.municipality,
        district: base.district,
        physicalAddress2: base.physicalAddress2,
        provinceId: base.provinceId,
        municipalityId: base.municipalityId,
        districtId: base.districtId,
      });
      setDraft({
        ...base,
        provinceId: resolved.provinceId ?? base.provinceId,
        municipalityId: resolved.municipalityId ?? base.municipalityId,
        districtId: resolved.districtId !== undefined ? resolved.districtId : base.districtId,
        accreditationBodyIds,
      });
      setFormOpen(true);
    },
    [createdBy],
  );

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setFormError(null);
  }, []);

  const submitForm = useCallback(async () => {
    setFormError(null);
    try {
      if (!draft.trainingProviderName?.trim()) {
        setFormError('Training provider name is required.');
        return;
      }
      const { accreditationBodyIds, ...rest } = draft;
      const ids = draft.etqa ? (accreditationBodyIds ?? []) : [];
      const payload: TrainingProviderUpdatePayload = {
        ...rest,
        status: draft.status ?? 'Active',
        subSector: draft.subSector ?? '',
        webAddress: draft.webAddress ?? '',
        physicalAddress3: draft.physicalAddress3 ?? '',
        province: rest.province ?? null,
        municipality: rest.municipality?.trim() ? rest.municipality.trim() : null,
        district: rest.district ?? null,
        area: (rest.area ?? rest.physicalAddress2 ?? '').trim(),
        code: (rest.code ?? rest.physicalAddressCode ?? '').trim(),
        softSkills: Boolean(draft.softSkills),
        technicalSkills: Boolean(draft.technicalSkills),
        createdBy: draft.createdBy ?? createdBy,
      };
      if (formMode === 'create') {
        const created = await createMutation.mutateAsync({
          ...payload,
          registrationDate: payload.registrationDate || undefined,
        });
        const newId = created.trainingProviderId;
        if (newId != null) {
          await setTrainingProviderAccreditationBodies(newId, { accreditationBodyIds: ids });
        }
      } else if (editingId != null) {
        await updateMutation.mutateAsync({
          id: editingId,
          payload: {
            ...payload,
            registrationDate: payload.registrationDate || null,
          },
        });
        await setTrainingProviderAccreditationBodies(editingId, { accreditationBodyIds: ids });
      }
      closeForm();
    } catch (e) {
      setFormError(apiErr(e));
    }
  }, [closeForm, createMutation, createdBy, draft, editingId, formMode, updateMutation]);

  const busy = createMutation.isPending || updateMutation.isPending;

  const actionIconBtn =
    'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-hwseta-green disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white pb-8">
      <div className="mb-4 flex items-center gap-2 px-4 text-sm text-gray-600 lg:px-6">
        <FaChalkboardTeacher className="h-4 w-4" />
        <span>/</span>
        <span className="font-medium text-gray-900">Setup</span>
        <span>/</span>
        <span className="font-medium text-gray-900">Training Providers</span>
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] lg:mx-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hwseta-green">Training provider setup</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Training Providers</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage training provider records, contact details, and accreditation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
            <span className="rounded-full bg-hwseta-green/10 px-3 py-1.5 text-hwseta-green">Training Providers</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">{providers.length} records</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)] lg:mx-6">
        <section className="p-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Training Providers</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <FaRedo className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={filtered.length === 0}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                    Add New
                  </button>
                </div>
              </div>

              <div className="max-w-xl">
                <label className="sr-only">Search training providers</label>
                <div className="flex min-h-[42px] items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2">
                  <FaSearch className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search training providers…"
                    className="w-full text-sm text-gray-700 outline-none"
                  />
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
                      <th className="px-5 py-3 text-white/90">Provider Name</th>
                      <th className="px-5 py-3 text-white/90">Reg Number</th>
                      <th className="px-5 py-3 text-white/90">Province</th>
                      <th className="px-5 py-3 text-white/90">Primary Contact Number</th>
                      <th className="px-5 py-3 text-right text-white/90">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                        <td colSpan={5} className="px-5 py-16 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                        <td colSpan={5} className="px-5 py-16 text-center text-gray-500">
                      No training providers found.
                    </td>
                  </tr>
                ) : (
                      pagedProviders.map((p, index) => (
                        <tr
                          key={providerKey(p)}
                          className={cn(
                            index % 2 === 0 ? 'bg-white hover:bg-emerald-50/40' : 'bg-slate-50/50 hover:bg-emerald-50/40',
                          )}
                        >
                          <td className="px-5 py-4 font-semibold text-gray-900">{p.trainingProviderName ?? '—'}</td>
                          <td className="px-5 py-4 text-gray-600">{p.companyRegNo?.trim() || '—'}</td>
                          <td className="max-w-[180px] truncate px-5 py-4 text-gray-600">
                            {p.province?.trim() || '—'}
                          </td>
                          <td className="px-5 py-4 text-gray-600">
                            {p.telephoneNo?.trim() ? sanitizePhoneInput(p.telephoneNo) : '—'}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(p)}
                                disabled={p.trainingProviderId == null}
                                className={actionIconBtn}
                                title="Edit"
                                aria-label="Edit"
                              >
                                <FaEdit className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalGridCount > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Training Providers</span> found {totalGridCount}
                  </p>
                  <p>
                    Showing{' '}
                    <span className="font-semibold text-slate-800">
                      {gridPageStart + 1}–{Math.min(gridPageStart + pagedProviders.length, totalGridCount)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-800">{totalGridCount}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      Rows
                      <select
                        value={gridPageSize}
                        onChange={(e) => {
                          setGridPageSize(Number(e.target.value));
                          setGridPage(1);
                        }}
                        className={adminFormTheme.selectInline}
                      >
                        {[10, 25, 50, 100].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={gridPage <= 1}
                      onClick={() => setGridPage((pg) => Math.max(1, pg - 1))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-500">
                      Page {gridPage} / {totalGridPages}
                    </span>
                    <button
                      type="button"
                      disabled={gridPage >= totalGridPages}
                      onClick={() => setGridPage((pg) => Math.min(totalGridPages, pg + 1))}
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

      <ProviderFormModal
        open={formOpen}
        onClose={closeForm}
        title={formMode === 'create' ? 'Add training provider' : 'Edit training provider'}
        draft={draft}
        setDraft={setDraft}
        formError={formError}
        onSubmit={submitForm}
        busy={busy}
      />
    </div>
  );
}

function ProviderFormModal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  draft: TrainingProviderUpdatePayload;
  setDraft: Dispatch<SetStateAction<TrainingProviderUpdatePayload>>;
  formError: string | null;
  onSubmit: () => void;
  busy: boolean;
}) {
  const { open, onClose, title, draft, setDraft, formError, onSubmit, busy } = props;

  const [contactOpen, setContactOpen] = useState(true);
  const [contactErrors, setContactErrors] = useState<
    Partial<Record<AdminContactFieldKey, string>>
  >({});
  const { data: accreditationBodies = [], isLoading: accreditationBodiesLoading } =
    useAccreditationBodiesList(open);

  useEffect(() => {
    if (!open) return;
    setContactOpen(true);
    setContactErrors({});
  }, [open]);

  const handleSave = () => {
    const errs = validateAdminContactFields(draft);
    if (Object.keys(errs).length > 0) {
      setContactErrors(errs);
      return;
    }
    setContactErrors({});
    onSubmit();
  };

  const set = <K extends keyof TrainingProviderUpdatePayload>(key: K, v: TrainingProviderUpdatePayload[K]) => {
    setDraft((d) => ({ ...d, [key]: v }));
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
        </Transition.Child>
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <Dialog.Panel className={cn(adminFormTheme.modalPanelWide, 'flex max-h-[92vh] flex-col')}>
              <div className={adminFormTheme.modalHeader}>
                <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {formError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {formError}
                  </div>
                )}
                <div className="space-y-6">
                  <section>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Training provider name *">
                        <input
                          className={inputClass}
                          value={draft.trainingProviderName}
                          onChange={(e) => set('trainingProviderName', e.target.value)}
                        />
                      </Field>
                      <Field label="Company Registration Date">
                        <SyncfusionIsoDatePicker
                          value={draft.registrationDate?.slice(0, 10) ?? ''}
                          onChange={(iso) => set('registrationDate', iso || '')}
                        />
                      </Field>
                      <Field label="Accreditation Number">
                        <input
                          className={inputClass}
                          value={draft.accreditationNumber ?? ''}
                          onChange={(e) => set('accreditationNumber', e.target.value)}
                        />
                      </Field>
                      <Field label="Company Registration Number">
                        <input
                          className={inputClass}
                          value={draft.companyRegNo ?? ''}
                          onChange={(e) => set('companyRegNo', e.target.value)}
                        />
                      </Field>
                      <Field label="SDL/T Number">
                        <input className={inputClass} value={draft.sdlNumber ?? ''} onChange={(e) => set('sdlNumber', e.target.value)} />
                      </Field>
                      <div className="hidden sm:block" aria-hidden />
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-slate-800">ETQA &amp; accreditation</h3>
                    <div className="mt-3 space-y-3">
                      <FormToggleSwitch
                        checked={Boolean(draft.etqa)}
                        onChange={(next) => {
                          set('etqa', next);
                          if (!next) set('accreditationBodyIds', []);
                        }}
                        label="ETQA"
                        description="Training provider is ETQA-accredited."
                      />
                      {draft.etqa && (
                        <Field label="Accreditation Body">
                          <AccreditationBodiesMultiSelect
                            rows={accreditationBodies}
                            loading={accreditationBodiesLoading}
                            value={draft.accreditationBodyIds ?? []}
                            onChange={(ids) => set('accreditationBodyIds', ids)}
                          />
                        </Field>
                      )}
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-slate-800">Address</h3>
                    <AdminAddressPlacesBlock
                      open={open}
                      instanceId="training-provider-admin"
                      onApply={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                    />
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Address (line 1)">
                        <input
                          className={inputClass}
                          value={draft.physicalAddress1 ?? ''}
                          onChange={(e) => set('physicalAddress1', e.target.value)}
                        />
                      </Field>
                      <Field label="Address (line 2)">
                        <input
                          className={inputClass}
                          value={draft.physicalAddress3 ?? ''}
                          onChange={(e) => set('physicalAddress3', e.target.value)}
                        />
                      </Field>
                    </div>
                    <AdminAddressLocationSelects
                      open={open}
                      showIntro={false}
                      provinceId={draft.provinceId}
                      municipalityId={draft.municipalityId}
                      districtId={draft.districtId}
                      physicalAddress2={draft.physicalAddress2}
                      physicalAddressCode={draft.physicalAddressCode ?? ''}
                      onPatch={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                    />
                  </section>
                  <section>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-lg text-left outline-none ring-hwseta-green/30 focus-visible:ring-2"
                      onClick={() => setContactOpen((o) => !o)}
                      aria-expanded={contactOpen}
                    >
                      <h3 className="text-base font-semibold text-slate-800">Contact Details</h3>
                      {contactOpen ? (
                        <ChevronDownIcon className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                      )}
                    </button>
                    {contactOpen && (
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Contact first name">
                        <input
                          className={inputClass}
                          value={draft.contactPersonFirstName ?? ''}
                          onChange={(e) => set('contactPersonFirstName', e.target.value)}
                        />
                      </Field>
                      <Field label="Contact last name">
                        <input
                          className={inputClass}
                          value={draft.contactPersonLastName ?? ''}
                          onChange={(e) => set('contactPersonLastName', e.target.value)}
                        />
                      </Field>
                      <Field label="Primary Contact Number" error={contactErrors.telephoneNo}>
                        <input
                          className={cn(
                            inputClass,
                            contactErrors.telephoneNo && 'border-red-300 focus:border-red-500',
                          )}
                          inputMode="tel"
                          autoComplete="tel"
                          value={draft.telephoneNo ?? ''}
                          onChange={(e) => {
                            set('telephoneNo', sanitizePhoneInput(e.target.value));
                            setContactErrors((prev) => ({ ...prev, telephoneNo: undefined }));
                          }}
                          onBlur={() => {
                            const v = draft.telephoneNo ?? '';
                            if (v.trim() && !isValidPhone(v)) {
                              setContactErrors((prev) => ({
                                ...prev,
                                telephoneNo: 'Enter a valid South African contact number',
                              }));
                            }
                          }}
                        />
                      </Field>
                      <Field label="Primary Email Address" error={contactErrors.contactPersonEmail}>
                        <input
                          type="email"
                          className={cn(
                            inputClass,
                            contactErrors.contactPersonEmail && 'border-red-300 focus:border-red-500',
                          )}
                          autoComplete="email"
                          value={draft.contactPersonEmail ?? ''}
                          onChange={(e) => {
                            set('contactPersonEmail', e.target.value);
                            setContactErrors((prev) => ({
                              ...prev,
                              contactPersonEmail: undefined,
                            }));
                          }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v.trim() && !isValidEmail(v)) {
                              setContactErrors((prev) => ({
                                ...prev,
                                contactPersonEmail: 'Enter a valid email address',
                              }));
                            }
                          }}
                        />
                      </Field>
                      <Field label="Alternative Contact Number" error={contactErrors.contactMobileNo}>
                        <input
                          className={cn(
                            inputClass,
                            contactErrors.contactMobileNo && 'border-red-300 focus:border-red-500',
                          )}
                          inputMode="tel"
                          autoComplete="tel"
                          value={draft.contactMobileNo ?? ''}
                          onChange={(e) => {
                            set('contactMobileNo', sanitizePhoneInput(e.target.value));
                            setContactErrors((prev) => ({
                              ...prev,
                              contactMobileNo: undefined,
                            }));
                          }}
                          onBlur={() => {
                            const v = draft.contactMobileNo ?? '';
                            if (v.trim() && !isValidPhone(v)) {
                              setContactErrors((prev) => ({
                                ...prev,
                                contactMobileNo: 'Enter a valid South African contact number',
                              }));
                            }
                          }}
                        />
                      </Field>
                      <Field label="Alternative Email Address" error={contactErrors.emailAddress}>
                        <input
                          type="email"
                          className={cn(
                            inputClass,
                            contactErrors.emailAddress && 'border-red-300 focus:border-red-500',
                          )}
                          autoComplete="email"
                          value={draft.emailAddress ?? ''}
                          onChange={(e) => {
                            set('emailAddress', e.target.value);
                            setContactErrors((prev) => ({ ...prev, emailAddress: undefined }));
                          }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v.trim() && !isValidEmail(v)) {
                              setContactErrors((prev) => ({
                                ...prev,
                                emailAddress: 'Enter a valid email address',
                              }));
                            }
                          }}
                        />
                      </Field>
                      <Field label="Designation">
                        <input
                          className={inputClass}
                          value={draft.designation ?? ''}
                          onChange={(e) => set('designation', e.target.value)}
                        />
                      </Field>
                    </div>
                    )}
                  </section>
                </div>
              </div>
              <div className={adminFormTheme.modalFooter}>
                <button
                  type="button"
                  onClick={onClose}
                  className={adminFormTheme.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy}
                  className={adminFormTheme.btnPrimary}
                >
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

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}


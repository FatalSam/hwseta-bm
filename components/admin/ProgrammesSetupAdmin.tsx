'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import {
  FaBook,
  FaBuilding,
  FaEdit,
  FaFileExcel,
  FaGraduationCap,
  FaLayerGroup,
  FaPlus,
  FaProjectDiagram,
  FaRedo,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import { useAuthStore } from '@/store/authStore';
import {
  NqfSection,
  QualificationsSection,
  SubSectorsSection,
  UnitStandardsSection,
} from '@/components/admin/ProgrammesFrameworkAdmin';
import {
  useAllUnitStandardsList,
  useFrameworkMutations,
  useNqfLevelsList,
  useProgrammeMutations,
  useProgrammesList,
  useProgrammeTypesList,
  useQualificationsList,
  useSetasList,
  useSetupDocumentTypesList,
  useSubSectorsList,
} from '@/hooks/useProgrammeSetup';
import type { Programme, ProgrammeTypeRow, SetaRow, SetupDocumentTypeRow } from '@/types/programmeSetup';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { exportRowsToExcel } from '@/ultis/exportExcel';

/** Stable fallbacks so `data ?? []` in destructuring is not a new array every render. */
const EMPTY_PROGRAMMES: Programme[] = [];
const EMPTY_TYPES: ProgrammeTypeRow[] = [];
const EMPTY_SETAS: SetaRow[] = [];
const EMPTY_SETUP_DOC_TYPES: SetupDocumentTypeRow[] = [];

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

function parsePositiveInt(s: string, fallback: number): number {
  const n = Number.parseInt(String(s).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

type SetupTab = 'programmes' | 'qualifications' | 'unitStandards' | 'nqfLevels' | 'sectors';

const TABS: {
  key: SetupTab;
  label: string;
  icon: typeof FaProjectDiagram;
  emptyTitle: string;
  exportPrefix: string;
  description?: string;
}[] = [
  {
    key: 'programmes',
    label: 'Programmes',
    icon: FaProjectDiagram,
    emptyTitle: 'No programmes found',
    exportPrefix: 'programmes',
    description: 'Manage programme records.',
  },
  {
    key: 'qualifications',
    label: 'Qualifications',
    icon: FaBook,
    emptyTitle: '',
    exportPrefix: '',
    description: 'Qualifications for your organisation.',
  },
  {
    key: 'unitStandards',
    label: 'Unit Standards',
    icon: FaLayerGroup,
    emptyTitle: '',
    exportPrefix: '',
    description: 'Manage unit standards for each qualification.',
  },
  {
    key: 'nqfLevels',
    label: 'NQF Levels',
    icon: FaGraduationCap,
    emptyTitle: '',
    exportPrefix: '',
    description: 'Control the qualification framework levels available to programmes.',
  },
  {
    key: 'sectors',
    label: 'Sectors',
    icon: FaBuilding,
    emptyTitle: '',
    exportPrefix: '',
    description: 'Manage sectors used when linking qualifications.',
  },
];

type ProgrammeForm = {
  programmeName: string;
  programmeTypeId: number;
  programmeSubTypeId: number | null;
  qualificationId: number | null;
  setaId: number;
  startDate: string;
  endDate: string;
  budget: number;
  status: string;
  active: boolean;
  description: string;
  documentTypeIds: number[];
};

function emptyForm(): ProgrammeForm {
  return {
    programmeName: '',
    programmeTypeId: 0,
    programmeSubTypeId: null,
    qualificationId: null,
    setaId: 0,
    startDate: '',
    endDate: '',
    budget: 0,
    status: 'Active',
    active: true,
    description: '',
    documentTypeIds: [],
  };
}

function defaultProgrammeDateRange(): { startDate: string; endDate: string } {
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

/**
 * New programmes: API still expects category, dates, budget, status, qualification, etc.
 * Those controls were removed from the UI — apply stable defaults on create only.
 * Edits keep values loaded from the API (`recordToForm`).
 */
function buildProgrammeMutationPayload(
  formMode: 'create' | 'edit',
  draft: ProgrammeForm,
  types: ProgrammeTypeRow[],
): ProgrammeForm {
  if (formMode === 'edit') return draft;
  const dates = defaultProgrammeDateRange();
  const firstTypeId = types[0] ? Number(types[0].programmeTypeId) : 0;
  return {
    ...draft,
    programmeTypeId: firstTypeId,
    programmeSubTypeId: null,
    qualificationId: null,
    startDate: dates.startDate,
    endDate: dates.endDate,
    budget: 0,
    status: 'Active',
    active: true,
  };
}

function recordToForm(p: Programme): ProgrammeForm {
  return {
    programmeName: p.programmeName ?? '',
    programmeTypeId: typeof p.programmeTypeId === 'number' ? p.programmeTypeId : 0,
    programmeSubTypeId:
      p.programmeSubTypeId != null && typeof p.programmeSubTypeId === 'number'
        ? p.programmeSubTypeId
        : null,
    qualificationId:
      p.qualificationId != null && typeof p.qualificationId === 'number'
        ? p.qualificationId
        : null,
    setaId: typeof p.setaId === 'number' ? p.setaId : 0,
    startDate: (p.startDate ?? '').slice(0, 10),
    endDate: (p.endDate ?? '').slice(0, 10),
    budget: typeof p.budget === 'number' ? p.budget : 0,
    status: p.status ?? 'Active',
    active: Boolean(p.active),
    description: p.description ?? '',
    documentTypeIds: Array.isArray(p.documentTypeIds) ? [...p.documentTypeIds] : [],
  };
}

function programmeKey(p: Programme): string {
  const id = p.programmeId;
  if (id != null && String(id)) return String(id);
  return `${p.programmeName ?? 'row'}-${p.startDate ?? ''}`;
}

function requiredDocsCount(p: Programme): number {
  const ids = p.documentTypeIds;
  if (!Array.isArray(ids)) return 0;
  return new Set(ids.filter((n) => typeof n === 'number' && n > 0)).size;
}

export default function ProgrammesSetupAdmin() {
  const user = useAuthStore((s) => s.user);
  /** Internal scope for APIs that still expect a numeric org; not shown in UI. */
  const organisationId = useMemo(
    () => parsePositiveInt(String(user?.companyID ?? ''), 1),
    [user?.companyID],
  );
  const userId = useMemo(() => String(user?.userID ?? '').trim() || '1', [user?.userID]);
  const [activeTab, setActiveTab] = useState<SetupTab>('programmes');
  const [searchTerm, setSearchTerm] = useState('');
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(25);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const {
    data: programmes = EMPTY_PROGRAMMES,
    isLoading: loadingProgrammes,
    error: programmesError,
    refetch: refetchProgrammes,
    isFetching: fetchingProgrammes,
  } = useProgrammesList(organisationId);
  const {
    data: types = EMPTY_TYPES,
    refetch: refetchTypes,
    isFetching: fetchingTypes,
  } = useProgrammeTypesList(organisationId, false);
  const { data: nqfLevels = [] } = useNqfLevelsList();
  const { data: qualifications = [], refetch: refetchQualifications } = useQualificationsList(organisationId);
  const { rows: allUnitStandardRows, refetch: refetchUnitStandards } = useAllUnitStandardsList(organisationId);
  const { data: subSectorsList = [], refetch: refetchSubSectors } = useSubSectorsList();

  const { create, update } = useProgrammeMutations(organisationId);
  const fw = useFrameworkMutations(organisationId);
  const { data: setas = EMPTY_SETAS } = useSetasList();
  const {
    data: setupDocTypes = EMPTY_SETUP_DOC_TYPES,
    isLoading: setupDocTypesLoading,
    isFetching: setupDocTypesFetching,
    isError: setupDocTypesIsError,
    error: setupDocTypesQueryError,
    refetch: refetchSetupDocTypes,
  } = useSetupDocumentTypesList();

  const [draft, setDraft] = useState<ProgrammeForm>(() => emptyForm());

  const selectedProgrammeDocLabels = useMemo(() => {
    return draft.documentTypeIds
      .map((id) => setupDocTypes.find((dt) => Number(dt.documentTypeId) === id))
      .filter((row): row is SetupDocumentTypeRow => row != null)
      .map((row) => String(row.documentType ?? row.documentTypeId ?? ''));
  }, [draft.documentTypeIds, setupDocTypes]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingProgrammeId, setEditingProgrammeId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [programmeDocsDropdownOpen, setProgrammeDocsDropdownOpen] = useState(false);

  useEffect(() => {
    if (formOpen) {
      void refetchSetupDocTypes();
    }
  }, [formOpen, refetchSetupDocTypes]);

  useEffect(() => {
    if (!formOpen) setProgrammeDocsDropdownOpen(false);
  }, [formOpen]);

  useEffect(() => {
    setSearchTerm('');
    setPageSuccess(null);
    setGridPage(1);
  }, [activeTab]);

  const activeMeta = TABS.find((t) => t.key === activeTab)!;

  const filteredProgrammes = useMemo(() => {
    const rows = programmes.filter((p) => p.active !== false);
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) =>
      [p.programmeName, p.status, p.description, String(p.programmeTypeId), String(p.setaId)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [programmes, searchTerm]);

  const totalGridCount = filteredProgrammes.length;
  const totalGridPages = Math.max(1, Math.ceil(totalGridCount / gridPageSize) || 1);
  const gridPageStart = (gridPage - 1) * gridPageSize;

  useEffect(() => {
    setGridPage(1);
  }, [searchTerm, organisationId]);

  useEffect(() => {
    setGridPage((p) => Math.min(Math.max(1, p), totalGridPages));
  }, [totalGridPages]);

  const pagedProgrammes = useMemo(
    () => filteredProgrammes.slice(gridPageStart, gridPageStart + gridPageSize),
    [filteredProgrammes, gridPageStart, gridPageSize],
  );
  const pagedRowCount = pagedProgrammes.length;

  const tabCounts = useMemo(
    () => ({
      programmes: programmes.length,
      qualifications: qualifications.length,
      unitStandards: allUnitStandardRows.length,
      nqfLevels: nqfLevels.length,
      sectors: subSectorsList.length,
    }),
    [programmes.length, qualifications.length, allUnitStandardRows.length, nqfLevels.length, subSectorsList.length],
  );

  const pageError = activeTab === 'programmes' ? programmesError : null;

  const isLoadingTable = activeTab === 'programmes' ? loadingProgrammes : false;

  const showRequiredDocsColumn = true;
  const tableColSpan = 3;

  const refreshAll = useCallback(() => {
    setPageSuccess(null);
    void refetchProgrammes();
    void refetchTypes();
    void refetchQualifications();
    void refetchUnitStandards();
    void refetchSubSectors();
  }, [refetchProgrammes, refetchTypes, refetchQualifications, refetchUnitStandards, refetchSubSectors]);

  const handleExportExcel = useCallback(() => {
    if (activeTab !== 'programmes' || filteredProgrammes.length === 0) return;
    const sheetRows = filteredProgrammes.map((p) => ({
      Name: p.programmeName ?? '',
      RequiredDocs: requiredDocsCount(p),
      Cost: p.budget ?? '',
    }));
    exportRowsToExcel(activeMeta.exportPrefix, sheetRows, 'Programmes');
  }, [activeMeta.exportPrefix, activeTab, filteredProgrammes]);

  const openCreateProgramme = useCallback(() => {
    setFormMode('create');
    setEditingProgrammeId(null);
    setDraft(emptyForm());
    setFormError(null);
    setProgrammeDocsDropdownOpen(false);
    setFormOpen(true);
  }, []);

  const openEditProgramme = useCallback((p: Programme) => {
    const id = p.programmeId;
    if (id == null) return;
    setFormMode('edit');
    setEditingProgrammeId(String(id));
    setDraft(recordToForm(p));
    setFormError(null);
    setProgrammeDocsDropdownOpen(false);
    setFormOpen(true);
  }, []);

  const closeProgrammeForm = useCallback(() => {
    setFormOpen(false);
    setFormError(null);
    setProgrammeDocsDropdownOpen(false);
  }, []);

  const toggleDocType = useCallback((id: number) => {
    setDraft((d) => {
      const has = d.documentTypeIds.includes(id);
      return {
        ...d,
        documentTypeIds: has ? d.documentTypeIds.filter((x) => x !== id) : [...d.documentTypeIds, id],
      };
    });
  }, []);

  const submitProgramme = useCallback(async () => {
    setFormError(null);
    if (!draft.programmeName.trim()) {
      setFormError('Programme name is required.');
      return;
    }
    if (!draft.setaId || draft.setaId <= 0) {
      setFormError('Select a SETA.');
      return;
    }
    const payloadDraft = buildProgrammeMutationPayload(formMode, draft, types);
    if (formMode === 'create' && (!payloadDraft.programmeTypeId || payloadDraft.programmeTypeId <= 0)) {
      setFormError(
        'At least one programme category must exist before creating a programme. Contact your administrator if categories are not available.',
      );
      return;
    }
    try {
      if (formMode === 'create') {
        await create.mutateAsync({
          programmeName: payloadDraft.programmeName.trim(),
          programmeTypeId: payloadDraft.programmeTypeId,
          programmeSubTypeId: payloadDraft.programmeSubTypeId,
          qualificationId: payloadDraft.qualificationId,
          setaId: payloadDraft.setaId,
          startDate: payloadDraft.startDate,
          endDate: payloadDraft.endDate,
          budget: payloadDraft.budget,
          status: payloadDraft.status,
          active: payloadDraft.active,
          createdByUserId: userId,
          description: payloadDraft.description,
          documentTypeIds: payloadDraft.documentTypeIds,
          organisationId,
        });
      } else if (editingProgrammeId) {
        await update.mutateAsync({
          programmeId: editingProgrammeId,
          body: {
            programmeName: payloadDraft.programmeName.trim(),
            programmeTypeId: payloadDraft.programmeTypeId,
            programmeSubTypeId: payloadDraft.programmeSubTypeId,
            qualificationId: payloadDraft.qualificationId,
            setaId: payloadDraft.setaId,
            startDate: payloadDraft.startDate,
            endDate: payloadDraft.endDate,
            budget: payloadDraft.budget,
            status: payloadDraft.status,
            active: payloadDraft.active,
            createdByUserId: userId,
            lastModifiedByUserId: userId,
            description: payloadDraft.description,
            documentTypeIds: payloadDraft.documentTypeIds,
            organisationId,
          },
        });
      }
      setPageSuccess(formMode === 'create' ? 'Programme created.' : 'Programme updated.');
      closeProgrammeForm();
    } catch (e) {
      setFormError(apiErr(e));
    }
  }, [
    closeProgrammeForm,
    create,
    draft,
    editingProgrammeId,
    formMode,
    organisationId,
    types,
    update,
    userId,
  ]);

  const openAddForTab = () => {
    if (activeTab === 'programmes') openCreateProgramme();
  };

  const renderRows = () => {
    if (isLoadingTable) {
      return (
        <tr>
          <td colSpan={tableColSpan} className="px-5 py-16 text-center text-gray-500">
            Loading programmes…
          </td>
        </tr>
      );
    }
    if (totalGridCount === 0) {
      return (
        <tr>
          <td colSpan={tableColSpan} className="px-5 py-16 text-center text-gray-500">
            {activeMeta.emptyTitle}
          </td>
        </tr>
      );
    }
    return pagedProgrammes.map((p, index) => (
      <tr
        key={programmeKey(p)}
        className={cn(index % 2 === 0 ? 'bg-white hover:bg-emerald-50/40' : 'bg-slate-50/50 hover:bg-emerald-50/40')}
      >
        <td className="px-5 py-4 font-semibold text-gray-900">{p.programmeName ?? '—'}</td>
        {showRequiredDocsColumn ? (
          <td className="px-5 py-4 text-center text-gray-600">{requiredDocsCount(p)}</td>
        ) : null}
        <td className="px-5 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => openEditProgramme(p)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-hwseta-green"
              aria-label="Edit"
            >
              <FaEdit className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  const fetchingAny = fetchingProgrammes || fetchingTypes;

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white pb-8">
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <FaProjectDiagram className="h-4 w-4" />
        <span>/</span>
        <span className="font-medium text-gray-900">Setup</span>
        <span>/</span>
        <span className="font-medium text-gray-900">Programmes</span>
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hwseta-green">Programme Setup</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Programmes Setup Workspace</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage programmes and framework data: qualifications, unit standards, and NQF levels.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
            <span className="rounded-full bg-hwseta-green/10 px-3 py-1.5 text-hwseta-green">{activeMeta.label}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
              {activeTab === 'programmes' ? filteredProgrammes.length : tabCounts[activeTab]} records
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="border-b border-gray-200 bg-gray-50/70">
          <div className="overflow-x-auto px-2 pt-2">
            <div className="flex min-w-max items-stretch pb-2">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                const isLast = index === TABS.length - 1;
                const count = tabCounts[tab.key];
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'relative flex min-w-[210px] items-center justify-center gap-2 px-5 py-3 text-sm font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-hwseta-green text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-slate-100 hover:text-gray-800',
                    )}
                    style={{
                      clipPath: isLast
                        ? 'none'
                        : 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 16px 50%)',
                      marginLeft: index > 0 ? '-16px' : 0,
                      zIndex: isActive ? 20 : 10 - index,
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                    <span
                      className={cn(
                        'inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <section className="p-5">
          {activeTab === 'programmes' ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{activeMeta.label}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => refreshAll()}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-slate-50"
                    >
                      <FaRedo className={cn('h-3.5 w-3.5', fetchingAny && 'animate-spin')} />
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      disabled={filteredProgrammes.length === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaFileExcel className="h-3.5 w-3.5" />
                      Export Excel
                    </button>
                    <button
                      type="button"
                      onClick={openAddForTab}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-hwseta-green bg-white px-4 py-2 text-sm font-semibold text-hwseta-green hover:bg-hwseta-green/5"
                    >
                      <FaPlus className="h-3.5 w-3.5" />
                      Add New
                    </button>
                  </div>
                </div>

                <div className="max-w-xl">
                  <label className="sr-only">Search</label>
                  <div className="flex min-h-[42px] items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2">
                    <FaSearch className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search programmes..."
                      className="w-full text-sm text-gray-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {pageError != null ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {apiErr(pageError)}
                </div>
              ) : null}
              {pageSuccess ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {pageSuccess}
                </div>
              ) : null}

              <div className="mt-5 flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <div className="max-h-[min(60vh,560px)] overflow-auto">
                  <table className="min-w-full whitespace-nowrap divide-y divide-gray-200 text-sm">
                    <thead className="sticky top-0 z-10 bg-hwseta-green text-white shadow-sm">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide">
                        <th className="px-5 py-3 text-white/90">Name</th>
                        {showRequiredDocsColumn ? (
                          <th className="px-5 py-3 text-center text-white/90">Required Docs</th>
                        ) : (
                          <th className="px-5 py-3 text-white/90">Description</th>
                        )}
                        {!showRequiredDocsColumn ? (
                          <th className="px-5 py-3 text-white/90">Status</th>
                        ) : null}
                        <th className="px-5 py-3 text-right text-white/90">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">{renderRows()}</tbody>
                  </table>
                </div>
                {totalGridCount > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-800">{activeMeta.label}</span> found {totalGridCount}
                    </p>
                    <p>
                      Showing{' '}
                      <span className="font-semibold text-slate-800">
                        {gridPageStart + 1}–{Math.min(gridPageStart + pagedRowCount, totalGridCount)}
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
                        onClick={() => setGridPage((p) => Math.max(1, p - 1))}
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
                        onClick={() => setGridPage((p) => Math.min(totalGridPages, p + 1))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              {pageSuccess ? (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {pageSuccess}
                </div>
              ) : null}
              {activeTab === 'qualifications' ? (
                <QualificationsSection organisationId={organisationId} userId={userId} mut={fw} />
              ) : null}
              {activeTab === 'unitStandards' ? (
                <UnitStandardsSection
                  organisationId={organisationId}
                  userId={userId}
                  mut={fw}
                  subtitle={activeMeta.description}
                />
              ) : null}
              {activeTab === 'nqfLevels' ? (
                <NqfSection userId={userId} mut={fw} subtitle={activeMeta.description} />
              ) : null}
              {activeTab === 'sectors' ? (
                <SubSectorsSection userId={userId} mut={fw} subtitle={activeMeta.description} />
              ) : null}
            </div>
          )}
        </section>
      </div>

      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-hwseta-green px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-hwseta-green-dark"
      >
        Help
      </a>

      {/* Programme modal — styled like manage-mybeneficiary workspace */}
      <Transition appear show={formOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeProgrammeForm}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className={adminFormTheme.modalBackdrop} />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  className={cn(adminFormTheme.modalPanelWide, 'max-w-5xl')}
                >
                  <div className={adminFormTheme.modalHeader}>
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className={adminFormTheme.modalHeaderIcon}>
                        <FaProjectDiagram className="h-6 w-6" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className={adminFormTheme.modalKicker}>
                          {formMode === 'create' ? 'Create' : 'Edit'}
                        </p>
                        <Dialog.Title className={adminFormTheme.modalTitle}>Programme</Dialog.Title>
                        <p className={adminFormTheme.modalSubtitle}>
                          Complete the details below and save.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeProgrammeForm}
                      className={adminFormTheme.btnGhost}
                      aria-label="Close"
                    >
                      <FaTimes className="h-5 w-5" />
                    </button>
                  </div>
                  {formError ? (
                    <div
                      className="border-b border-hwseta-red/20 bg-red-50 px-6 py-3 text-sm text-hwseta-red"
                      role="alert"
                    >
                      {formError}
                    </div>
                  ) : null}
                  <div className={adminFormTheme.modalBody}>
                    <div className="md:col-span-2">
                      <label className={adminFormTheme.label}>
                        Programme name
                        <span className={adminFormTheme.required}>*</span>
                      </label>
                      <input
                        className={adminFormTheme.input}
                        placeholder="Enter programme name"
                        value={draft.programmeName}
                        onChange={(e) => setDraft((d) => ({ ...d, programmeName: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={adminFormTheme.label}>
                        SETA
                        <span className={adminFormTheme.required}>*</span>
                      </label>
                      <select
                        className={adminFormTheme.select}
                        value={draft.setaId || ''}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, setaId: parsePositiveInt(e.target.value, 0) }))
                        }
                      >
                        <option value="">Select SETA</option>
                        {setas.map((s) => (
                          <option key={String(s.setaId)} value={Number(s.setaId)}>
                            {s.setaName ?? s.setaId}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className={adminFormTheme.label}>Documents</label>
                      <div className="relative mt-1.5">
                        <button
                          type="button"
                          onClick={() => setProgrammeDocsDropdownOpen((prev) => !prev)}
                          className={cn(
                            adminFormTheme.field,
                            'flex w-full cursor-pointer items-center justify-between gap-2 text-left',
                          )}
                          title={
                            selectedProgrammeDocLabels.length > 0
                              ? selectedProgrammeDocLabels.join(', ')
                              : undefined
                          }
                        >
                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate',
                              setupDocTypesLoading && setupDocTypes.length === 0
                                ? 'text-slate-400'
                                : selectedProgrammeDocLabels.length > 0
                                  ? 'text-slate-700'
                                  : 'text-slate-400',
                            )}
                          >
                            {setupDocTypesLoading && setupDocTypes.length === 0
                              ? 'Loading document types…'
                              : selectedProgrammeDocLabels.length > 0
                                ? selectedProgrammeDocLabels.join(', ')
                                : 'Select documents'}
                          </span>
                          <span className="shrink-0 text-slate-500" aria-hidden>
                            {programmeDocsDropdownOpen ? '▲' : '▼'}
                          </span>
                        </button>
                        {programmeDocsDropdownOpen ? (
                          <div
                            className={cn(
                              'absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.12)]',
                              '[scrollbar-color:rgb(1,127,63)_rgb(241,245,249)] [scrollbar-width:thin]',
                              '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-hwseta-green',
                            )}
                          >
                            {setupDocTypesIsError ? (
                              <p className="px-3 py-2 text-sm text-red-600">
                                {apiErr(setupDocTypesQueryError)}
                              </p>
                            ) : setupDocTypesFetching && setupDocTypes.length === 0 ? (
                              <p className="px-3 py-2 text-sm text-slate-500">Loading document types…</p>
                            ) : setupDocTypes.length === 0 ? (
                              <p className="px-3 py-2 text-sm text-slate-500">No document types available.</p>
                            ) : (
                              setupDocTypes.map((dt, index) => {
                                const id = Number(dt.documentTypeId);
                                if (!Number.isFinite(id)) return null;
                                const optionName = String(dt.documentType ?? id);
                                const isChecked = draft.documentTypeIds.includes(id);
                                return (
                                  <label
                                    key={String(dt.documentTypeId ?? `${optionName}-${index}`)}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleDocType(id)}
                                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-hwseta-green focus:ring-2 focus:ring-hwseta-green/20"
                                    />
                                    <span className="whitespace-nowrap">{optionName}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Documents required </span>
                        (When applying online, the following documents will be required from the applicant.)
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className={adminFormTheme.label}>Description</label>
                      <textarea
                        className={adminFormTheme.textarea}
                        rows={3}
                        placeholder="Optional notes"
                        value={draft.description}
                        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className={adminFormTheme.modalFooter}>
                    <button type="button" onClick={closeProgrammeForm} className={adminFormTheme.btnSecondary}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitProgramme()}
                      disabled={create.isPending || update.isPending}
                      className={adminFormTheme.btnPrimary}
                    >
                      {formMode === 'create' ? 'Save programme' : 'Update programme'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

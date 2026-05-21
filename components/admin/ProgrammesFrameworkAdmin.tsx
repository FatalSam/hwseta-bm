'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { IconType } from 'react-icons';
import { Fragment, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { ArrowPathIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import { FaBook, FaGraduationCap, FaLayerGroup, FaProjectDiagram, FaSitemap } from 'react-icons/fa';
import { useAuthStore } from '@/store/authStore';
import {
  useAllUnitStandardsList,
  useFrameworkMutations,
  useNqfLevelsList,
  useQualificationsList,
  useSetasList,
  useSubSectorsList,
} from '@/hooks/useProgrammeSetup';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { DEFAULT_ACTIVE_DESCRIPTION, FormToggleSwitch } from '@/components/admin/FormToggleSwitch';
import type {
  NqfLevelRow,
  QualificationRow,
  SetaRow,
  SubSectorRow,
  UnitStandardRow,
} from '@/types/programmeSetup';

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const GRID_PAGE_SIZES = [10, 25, 50, 100] as const;

/** Matches Programmes tab: max-height scroll + sticky header + footer (rows / paging). */
function PaginatedGridShell({
  entityLabel,
  totalCount,
  gridPage,
  setGridPage,
  gridPageSize,
  setGridPageSize,
  children,
}: {
  entityLabel: string;
  totalCount: number;
  gridPage: number;
  setGridPage: Dispatch<SetStateAction<number>>;
  gridPageSize: number;
  setGridPageSize: (n: number) => void;
  children: ReactNode;
}) {
  const totalGridPages = Math.max(1, Math.ceil(totalCount / gridPageSize) || 1);
  const gridPageStart = (gridPage - 1) * gridPageSize;
  const showingStart = totalCount === 0 ? 0 : gridPageStart + 1;
  const showingEnd = totalCount === 0 ? 0 : Math.min(gridPageStart + gridPageSize, totalCount);

  useEffect(() => {
    setGridPage((p) => Math.min(Math.max(1, p), totalGridPages));
  }, [totalGridPages, setGridPage]);

  return (
    <div className="flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <div className="max-h-[min(60vh,560px)] overflow-auto">{children}</div>
      {totalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">{entityLabel}</span> found {totalCount}
          </p>
          <p>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {showingStart}–{showingEnd}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{totalCount}</span>
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
                {GRID_PAGE_SIZES.map((n) => (
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
  );
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

/** Same sections as manage-mybeneficiary `programme-framework` (setas → unitStandards). */
type FrameworkTab = 'setas' | 'nqf' | 'qualifications' | 'units';

const FRAMEWORK_TAB_ORDER: FrameworkTab[] = ['setas', 'nqf', 'qualifications', 'units'];

const FRAMEWORK_TAB_META: Record<
  FrameworkTab,
  { label: string; description: string; icon: IconType }
> = {
  setas: {
    label: 'SETAs',
    description: 'Maintain SETA reference data used by programme and qualification setup.',
    icon: FaSitemap,
  },
  nqf: {
    label: 'NQF Levels',
    description: 'Control the qualification framework levels available to programmes.',
    icon: FaGraduationCap,
  },
  qualifications: {
    label: 'Qualifications',
    description: 'Qualifications for your organisation.',
    icon: FaBook,
  },
  units: {
    label: 'Unit Standards',
    description: 'Manage unit standards for each qualification.',
    icon: FaLayerGroup,
  },
};

const EMPTY_SETAS: SetaRow[] = [];
const EMPTY_NQF: NqfLevelRow[] = [];
const EMPTY_QUALS: QualificationRow[] = [];

/** Sent on create / fallback when API omits values; hidden from qualification form UI. */
const DEFAULT_QUALIFICATION_CREDITS = 120;
const DEFAULT_QUALIFICATION_NOTIONAL_HOURS = 1200;

export default function ProgrammesFrameworkAdmin() {
  const user = useAuthStore((s) => s.user);
  const organisationId = useMemo(
    () => parsePositiveInt(String(user?.companyID ?? ''), 1),
    [user?.companyID],
  );
  const userId = useMemo(() => String(user?.userID ?? '').trim() || '1', [user?.userID]);
  const [tab, setTab] = useState<FrameworkTab>('setas');

  const mut = useFrameworkMutations(organisationId);

  const { data: setas = EMPTY_SETAS } = useSetasList();
  const { data: nqfLevels = EMPTY_NQF } = useNqfLevelsList();
  const { data: qualifications = EMPTY_QUALS } = useQualificationsList(organisationId);
  const { rows: allUnitStandardRows } = useAllUnitStandardsList(organisationId);

  const tabCount = (key: FrameworkTab) => {
    switch (key) {
      case 'setas':
        return setas.length;
      case 'nqf':
        return nqfLevels.length;
      case 'qualifications':
        return qualifications.length;
      case 'units':
        return allUnitStandardRows.length;
      default:
        return 0;
    }
  };

  const activeMeta = FRAMEWORK_TAB_META[tab];

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <FaProjectDiagram className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <span>/</span>
        <span className="font-medium text-slate-900">Setup</span>
        <span>/</span>
        <span className="font-medium text-slate-900">Programme Framework</span>
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hwseta-green">Programme Framework</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Programme Framework Workspace</h1>
            <p className="mt-1 text-sm text-slate-600">
              Maintain global framework data used across programme setup.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            <span className="rounded-full bg-hwseta-green/10 px-3 py-1.5 text-hwseta-green">
              {activeMeta.label}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
              {tabCount(tab)} records
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="border-b border-gray-200 bg-gray-50/70">
          <div className="overflow-x-auto px-2 pt-2">
            <div className="flex min-w-max items-stretch pb-2">
              {FRAMEWORK_TAB_ORDER.map((sectionKey, index) => {
                const meta = FRAMEWORK_TAB_META[sectionKey];
                const Icon = meta.icon;
                const isActive = tab === sectionKey;
                const isLast = index === FRAMEWORK_TAB_ORDER.length - 1;
                const count = tabCount(sectionKey);
                return (
                  <button
                    key={sectionKey}
                    type="button"
                    onClick={() => setTab(sectionKey)}
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
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">{meta.label}</span>
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
          {tab === 'setas' && (
            <SetasSection userId={userId} mut={mut} subtitle={activeMeta.description} />
          )}
          {tab === 'nqf' && <NqfSection userId={userId} mut={mut} subtitle={activeMeta.description} />}
          {tab === 'qualifications' && (
            <QualificationsSection organisationId={organisationId} userId={userId} mut={mut} />
          )}
          {tab === 'units' && (
            <UnitStandardsSection
              organisationId={organisationId}
              userId={userId}
              mut={mut}
              subtitle={activeMeta.description}
            />
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
    </div>
  );
}

type Mut = ReturnType<typeof useFrameworkMutations>;

function SetasSection({
  userId,
  mut,
  subtitle,
}: {
  userId: string;
  mut: Mut;
  subtitle?: string;
}) {
  const { data: rows = [], isLoading, error, refetch, isFetching } = useSetasList();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SetaRow | null>(null);
  const [setaName, setSetaName] = useState('');
  const [setaCode, setSetaCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(25);
  const pagedRows = useMemo(
    () => rows.slice((gridPage - 1) * gridPageSize, gridPage * gridPageSize),
    [rows, gridPage, gridPageSize],
  );

  const openCreate = () => {
    setEditing(null);
    setSetaName('');
    setSetaCode('');
    setContactEmail('');
    setActive(true);
    setFormError(null);
    setOpen(true);
  };
  const openEdit = (r: SetaRow) => {
    setEditing(r);
    setSetaName(r.setaName ?? '');
    setSetaCode(r.setaCode ?? '');
    setContactEmail(r.contactEmail ?? '');
    setActive(Boolean(r.active));
    setFormError(null);
    setOpen(true);
  };
  const save = async () => {
    setFormError(null);
    if (!setaName.trim() || !setaCode.trim()) {
      setFormError('Name and code are required.');
      return;
    }
    try {
      const id = editing?.setaId;
      if (id != null) {
        await mut.updateSeta.mutateAsync({
          id,
          body: {
            setaName: setaName.trim(),
            setaCode: setaCode.trim(),
            active,
            lastModifiedByUserId: userId,
          },
        });
      } else {
        await mut.createSeta.mutateAsync({
          setaName: setaName.trim(),
          setaCode: setaCode.trim(),
          contactEmail: contactEmail || undefined,
          active,
          createdByUserId: userId,
        });
      }
      setOpen(false);
    } catch (e) {
      setFormError(apiErr(e));
    }
  };

  return (
    <SectionShell
      title="SETAs"
      subtitle={subtitle}
      onRefresh={() => refetch()}
      refreshing={isFetching}
      onAdd={openCreate}
      error={error}
    >
      <PaginatedGridShell
        entityLabel="SETAs"
        totalCount={rows.length}
        gridPage={gridPage}
        setGridPage={setGridPage}
        gridPageSize={gridPageSize}
        setGridPageSize={setGridPageSize}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap divide-y divide-slate-200 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-slate-500">
                    Loading SETAs…
                  </td>
                </tr>
              ) : null}
              {pagedRows.map((r) => (
                <tr key={String(r.setaId)} className="hover:bg-emerald-50/30">
                  <td className="px-3 py-2 font-medium">{r.setaName ?? '—'}</td>
                  <td className="px-3 py-2">{r.setaCode ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex rounded p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                    No SETAs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PaginatedGridShell>
      <SimpleFormModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit SETA' : 'New SETA'}
        error={formError}
        saving={mut.createSeta.isPending || mut.updateSeta.isPending}
        onSave={() => void save()}
      >
        <label className={adminFormTheme.label}>Name</label>
        <input className={adminFormTheme.input} value={setaName} onChange={(e) => setSetaName(e.target.value)} />
        <label className={adminFormTheme.label}>Code</label>
        <input className={adminFormTheme.input} value={setaCode} onChange={(e) => setSetaCode(e.target.value)} />
        <label className={adminFormTheme.label}>Contact email</label>
        <input
          className={adminFormTheme.input}
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <FormToggleSwitch
          checked={active}
          onChange={setActive}
          label="Active"
          description={DEFAULT_ACTIVE_DESCRIPTION}
        />
      </SimpleFormModal>
    </SectionShell>
  );
}

export function NqfSection({
  userId,
  mut,
  subtitle,
}: {
  userId: string;
  mut: Mut;
  subtitle?: string;
}) {
  const { data: rows = [], isLoading, error, refetch, isFetching } = useNqfLevelsList();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NqfLevelRow | null>(null);
  const [levelNumber, setLevelNumber] = useState(1);
  const [levelName, setLevelName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(25);
  const pagedRows = useMemo(
    () => rows.slice((gridPage - 1) * gridPageSize, gridPage * gridPageSize),
    [rows, gridPage, gridPageSize],
  );

  const openCreate = () => {
    setEditing(null);
    setLevelNumber(1);
    setLevelName('');
    setDescription('');
    setActive(true);
    setFormError(null);
    setOpen(true);
  };
  const openEdit = (r: NqfLevelRow) => {
    setEditing(r);
    setLevelNumber(typeof r.levelNumber === 'number' ? r.levelNumber : 1);
    setLevelName(r.levelName ?? '');
    setDescription(r.description ?? '');
    setActive(Boolean(r.active));
    setFormError(null);
    setOpen(true);
  };
  const save = async () => {
    setFormError(null);
    if (!levelName.trim()) {
      setFormError('Level name is required.');
      return;
    }
    try {
      const id = editing?.nqfLevelId;
      if (id != null) {
        await mut.updateNqf.mutateAsync({
          id,
          body: {
            levelNumber,
            levelName: levelName.trim(),
            active,
            lastModifiedByUserId: userId,
          },
        });
      } else {
        await mut.createNqf.mutateAsync({
          levelNumber,
          levelName: levelName.trim(),
          description,
          active,
          createdByUserId: userId,
        });
      }
      setOpen(false);
    } catch (e) {
      setFormError(apiErr(e));
    }
  };

  return (
    <SectionShell
      title="NQF Levels"
      subtitle={subtitle}
      onRefresh={() => refetch()}
      refreshing={isFetching}
      onAdd={openCreate}
      error={error}
    >
      <PaginatedGridShell
        entityLabel="NQF levels"
        totalCount={rows.length}
        gridPage={gridPage}
        setGridPage={setGridPage}
        gridPageSize={gridPageSize}
        setGridPageSize={setGridPageSize}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap divide-y divide-slate-200 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-slate-500">
                    Loading NQF levels…
                  </td>
                </tr>
              ) : null}
              {pagedRows.map((r) => (
                <tr key={String(r.nqfLevelId)} className="hover:bg-emerald-50/30">
                  <td className="px-3 py-2">{r.levelNumber ?? '—'}</td>
                  <td className="px-3 py-2 font-medium">{r.levelName ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex rounded p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                    No NQF levels.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PaginatedGridShell>
      <SimpleFormModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit NQF level' : 'New NQF level'}
        error={formError}
        saving={mut.createNqf.isPending || mut.updateNqf.isPending}
        onSave={() => void save()}
      >
        <label className={adminFormTheme.label}>Level number</label>
        <input
          type="number"
          className={adminFormTheme.input}
          value={levelNumber}
          onChange={(e) => setLevelNumber(Number(e.target.value) || 0)}
        />
        <label className={adminFormTheme.label}>Name</label>
        <input className={adminFormTheme.input} value={levelName} onChange={(e) => setLevelName(e.target.value)} />
        <label className={adminFormTheme.label}>Description</label>
        <textarea
          className={adminFormTheme.textarea}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <FormToggleSwitch
          checked={active}
          onChange={setActive}
          label="Active"
          description={DEFAULT_ACTIVE_DESCRIPTION}
        />
      </SimpleFormModal>
    </SectionShell>
  );
}

export function SubSectorsSection({
  userId: _userId,
  mut,
  subtitle,
}: {
  userId: string;
  mut: Mut;
  subtitle?: string;
}) {
  void _userId;
  const { data: rows = [], isLoading, error, refetch, isFetching } = useSubSectorsList();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubSectorRow | null>(null);
  const [subSectorName, setSubSectorName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(25);
  const pagedRows = useMemo(
    () => rows.slice((gridPage - 1) * gridPageSize, gridPage * gridPageSize),
    [rows, gridPage, gridPageSize],
  );

  const openCreate = () => {
    setEditing(null);
    setSubSectorName('');
    setFormError(null);
    setOpen(true);
  };
  const openEdit = (r: SubSectorRow) => {
    setEditing(r);
    setSubSectorName(r.subSectorName ?? '');
    setFormError(null);
    setOpen(true);
  };
  const save = async () => {
    setFormError(null);
    if (!subSectorName.trim()) {
      setFormError('Name is required.');
      return;
    }
    try {
      const id = editing?.subSectorId;
      if (id != null) {
        await mut.updateSubSector.mutateAsync({
          id,
          body: { subSectorName: subSectorName.trim() },
        });
      } else {
        await mut.createSubSector.mutateAsync({
          subSectorName: subSectorName.trim(),
        });
      }
      setOpen(false);
    } catch (e) {
      setFormError(apiErr(e));
    }
  };

  return (
    <SectionShell
      title="Sectors"
      subtitle={subtitle}
      onRefresh={() => refetch()}
      refreshing={isFetching}
      onAdd={openCreate}
      error={error}
    >
      <PaginatedGridShell
        entityLabel="Sectors"
        totalCount={rows.length}
        gridPage={gridPage}
        setGridPage={setGridPage}
        gridPageSize={gridPageSize}
        setGridPageSize={setGridPageSize}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap divide-y divide-slate-200 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
              <tr>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-10 text-center text-slate-500">
                    Loading sectors…
                  </td>
                </tr>
              ) : null}
              {pagedRows.map((r) => (
                <tr key={String(r.subSectorId)} className="hover:bg-emerald-50/30">
                  <td className="px-3 py-2.5 font-medium text-slate-900">{r.subSectorName ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex rounded p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-slate-500">
                    No sectors yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PaginatedGridShell>
      <SimpleFormModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit sector' : 'New sector'}
        error={formError}
        saving={mut.createSubSector.isPending || mut.updateSubSector.isPending}
        onSave={() => void save()}
      >
        <label className={adminFormTheme.label}>Name</label>
        <input
          className={adminFormTheme.input}
          value={subSectorName}
          onChange={(e) => setSubSectorName(e.target.value)}
        />
      </SimpleFormModal>
    </SectionShell>
  );
}

export function QualificationsSection({
  organisationId,
  userId,
  mut,
}: {
  organisationId: number;
  userId: string;
  mut: Mut;
}) {
  const { data: nqf = [] } = useNqfLevelsList();
  const { data: subSectors = [] } = useSubSectorsList();
  const [nqfFilter, setNqfFilter] = useState(0);
  const { data: rows = [], isLoading, error, refetch, isFetching } = useQualificationsList(
    organisationId,
    nqfFilter > 0 ? nqfFilter : undefined,
  );
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(25);
  const pagedRows = useMemo(
    () => rows.slice((gridPage - 1) * gridPageSize, gridPage * gridPageSize),
    [rows, gridPage, gridPageSize],
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QualificationRow | null>(null);
  const [qName, setQName] = useState('');
  const [qCode, setQCode] = useState('');
  const [nqfLevelId, setNqfLevelId] = useState(0);
  const [subSectorId, setSubSectorId] = useState(0);
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setGridPage(1);
  }, [nqfFilter]);

  const creditsForApi = (row: QualificationRow | null) =>
    row != null && typeof row.totalCredits === 'number'
      ? row.totalCredits
      : DEFAULT_QUALIFICATION_CREDITS;
  const notionalHoursForApi = (row: QualificationRow | null) =>
    row != null && typeof row.notionalHours === 'number'
      ? row.notionalHours
      : DEFAULT_QUALIFICATION_NOTIONAL_HOURS;

  const subSectorLabel = (id: number | undefined) =>
    subSectors.find((s) => Number(s.subSectorId) === Number(id))?.subSectorName ?? '—';

  const openCreate = () => {
    setEditing(null);
    setQName('');
    setQCode('NA');
    setNqfLevelId(Number(nqf[0]?.nqfLevelId) || 0);
    setSubSectorId(0);
    setDescription('');
    setActive(true);
    setFormError(null);
    setOpen(true);
  };
  const openEdit = (r: QualificationRow) => {
    setEditing(r);
    setQName(r.qualificationName ?? '');
    setQCode(r.qualificationCode ?? '');
    setNqfLevelId(typeof r.nqfLevelId === 'number' ? r.nqfLevelId : 0);
    setSubSectorId(typeof r.subSectorId === 'number' ? r.subSectorId : 0);
    setDescription(r.description ?? '');
    setActive(Boolean(r.active));
    setFormError(null);
    setOpen(true);
  };
  const save = async () => {
    setFormError(null);
    if (!qName.trim() || !qCode.trim() || !nqfLevelId) {
      setFormError('Name, qualification code, and NQF level are required.');
      return;
    }
    if (!subSectorId) {
      setFormError('Sector is required.');
      return;
    }
    try {
      const id = editing?.qualificationId;
      const totalCredits = creditsForApi(editing);
      const notionalHours = notionalHoursForApi(editing);
      if (id != null) {
        await mut.updateQualification.mutateAsync({
          id,
          body: {
            qualificationName: qName.trim(),
            nqfLevelId,
            subSectorId,
            totalCredits,
            notionalHours,
            active,
            lastModifiedByUserId: userId,
            organisationId,
          },
        });
      } else {
        await mut.createQualification.mutateAsync({
          qualificationName: qName.trim(),
          qualificationCode: qCode.trim(),
          nqfLevelId,
          subSectorId,
          totalCredits: DEFAULT_QUALIFICATION_CREDITS,
          notionalHours: DEFAULT_QUALIFICATION_NOTIONAL_HOURS,
          description,
          active,
          createdByUserId: userId,
          organisationId,
        });
      }
      setOpen(false);
    } catch (e) {
      setFormError(apiErr(e));
    }
  };

  return (
    <SectionShell
      title="Qualifications"
      onRefresh={() => refetch()}
      refreshing={isFetching}
      onAdd={openCreate}
      error={error}
      belowTitleSlot={
        <select
          aria-label="Filter qualifications by NQF level"
          className={adminFormTheme.select}
          value={nqfFilter || ''}
          onChange={(e) => setNqfFilter(parsePositiveInt(e.target.value, 0))}
        >
          <option value="">All levels</option>
          {nqf.map((l) => (
            <option key={String(l.nqfLevelId)} value={Number(l.nqfLevelId)}>
              {l.levelName ?? l.nqfLevelId}
            </option>
          ))}
        </select>
      }
    >
      <PaginatedGridShell
        entityLabel="Qualifications"
        totalCount={rows.length}
        gridPage={gridPage}
        setGridPage={setGridPage}
        gridPageSize={gridPageSize}
        setGridPageSize={setGridPageSize}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap divide-y divide-slate-200 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
              <tr>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5">NQF</th>
                <th className="px-3 py-2.5">Sector</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                    Loading qualifications…
                  </td>
                </tr>
              ) : null}
              {pagedRows.map((r) => (
                <tr key={String(r.qualificationId)} className="hover:bg-emerald-50/30">
                  <td className="px-3 py-2.5 font-medium text-slate-900">{r.qualificationName ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-700">{r.qualificationCode ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.nqfLevelId ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{subSectorLabel(r.subSectorId)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex rounded p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    No qualifications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PaginatedGridShell>
      <SimpleFormModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit qualification' : 'New qualification'}
        error={formError}
        saving={mut.createQualification.isPending || mut.updateQualification.isPending}
        onSave={() => void save()}
      >
        <label className={adminFormTheme.label}>Name</label>
        <input className={adminFormTheme.input} value={qName} onChange={(e) => setQName(e.target.value)} />
        <label className={adminFormTheme.label}>Qualification Code</label>
        <input className={adminFormTheme.input} value={qCode} onChange={(e) => setQCode(e.target.value)} />
        <label className={adminFormTheme.label}>NQF level</label>
        <select
          className={adminFormTheme.select}
          value={nqfLevelId || ''}
          onChange={(e) => setNqfLevelId(parsePositiveInt(e.target.value, 0))}
        >
          <option value="">Select…</option>
          {nqf.map((l) => (
            <option key={String(l.nqfLevelId)} value={Number(l.nqfLevelId)}>
              {l.levelName ?? l.nqfLevelId}
            </option>
          ))}
        </select>
        <label className={adminFormTheme.label}>Sector</label>
        <select
          className={adminFormTheme.select}
          value={subSectorId || ''}
          onChange={(e) => setSubSectorId(parsePositiveInt(e.target.value, 0))}
          aria-label="Sector"
        >
          <option value="">Select…</option>
          {subSectors.map((s) => (
            <option key={String(s.subSectorId)} value={Number(s.subSectorId)}>
              {s.subSectorName ?? s.subSectorId}
            </option>
          ))}
        </select>
        <label className={adminFormTheme.label}>Description</label>
        <textarea
          className={adminFormTheme.textarea}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <FormToggleSwitch
          checked={active}
          onChange={setActive}
          label="Active"
          description={DEFAULT_ACTIVE_DESCRIPTION}
        />
      </SimpleFormModal>
    </SectionShell>
  );
}

export function UnitStandardsSection({
  organisationId,
  userId,
  mut,
  subtitle,
}: {
  organisationId: number;
  userId: string;
  mut: Mut;
  subtitle?: string;
}) {
  const { rows, quals, isLoading, error, refetch, isFetching } = useAllUnitStandardsList(organisationId);
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(25);
  const pagedRows = useMemo(
    () => rows.slice((gridPage - 1) * gridPageSize, gridPage * gridPageSize),
    [rows, gridPage, gridPageSize],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UnitStandardRow | null>(null);
  const [createQualId, setCreateQualId] = useState(0);
  const [code, setCode] = useState('');
  const [usName, setUsName] = useState('');
  const [credits, setCredits] = useState(10);
  const [notionalHours, setNotionalHours] = useState(100);
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const qualName = (qualificationId: number | string | undefined) =>
    quals.find((q) => Number(q.qualificationId) === Number(qualificationId))?.qualificationName ??
    (qualificationId != null ? String(qualificationId) : '—');

  const openCreate = () => {
    const first = Number(quals[0]?.qualificationId) || 0;
    if (!first) {
      setEditing(null);
      setCreateQualId(0);
      setCode('');
      setUsName('');
      setFormError('Add at least one qualification before creating unit standards.');
      setOpen(true);
      return;
    }
    setEditing(null);
    setCreateQualId(first);
    setCode('');
    setUsName('');
    setCredits(10);
    setNotionalHours(100);
    setActive(true);
    setFormError(null);
    setOpen(true);
  };
  const openEdit = (r: UnitStandardRow) => {
    setEditing(r);
    setCreateQualId(typeof r.qualificationId === 'number' ? r.qualificationId : 0);
    setCode(r.unitStandardCode ?? '');
    setUsName(r.unitStandardName ?? '');
    setCredits(typeof r.credits === 'number' ? r.credits : 0);
    setNotionalHours(typeof r.notionalHours === 'number' ? r.notionalHours : 0);
    setActive(Boolean(r.active));
    setFormError(null);
    setOpen(true);
  };
  const save = async () => {
    setFormError(null);
    const q =
      editing?.qualificationId ??
      (createQualId > 0 ? createQualId : Number(quals[0]?.qualificationId) || 0);
    if (!q || !usName.trim()) {
      setFormError('Qualification and unit standard name are required.');
      return;
    }
    if (!editing && !code.trim()) {
      setFormError('Unit standard code is required.');
      return;
    }
    try {
      const id = editing?.unitStandardId;
      if (id != null) {
        await mut.updateUnitStandard.mutateAsync({
          id,
          body: {
            qualificationId: q,
            unitStandardName: usName.trim(),
            credits,
            notionalHours,
            active,
            lastModifiedByUserId: userId,
            organisationId,
          },
        });
      } else {
        await mut.createUnitStandard.mutateAsync({
          qualificationId: q,
          unitStandardCode: code.trim(),
          unitStandardName: usName.trim(),
          credits,
          notionalHours,
          active,
          createdByUserId: userId,
          organisationId,
        });
      }
      setOpen(false);
    } catch (e) {
      setFormError(apiErr(e));
    }
  };

  return (
    <SectionShell
      title="Unit Standards"
      subtitle={subtitle}
      onRefresh={() => void refetch()}
      refreshing={isFetching}
      onAdd={openCreate}
      error={error}
    >
      <PaginatedGridShell
        entityLabel="Unit standards"
        totalCount={rows.length}
        gridPage={gridPage}
        setGridPage={setGridPage}
        gridPageSize={gridPageSize}
        setGridPageSize={setGridPageSize}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap divide-y divide-slate-200 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
              <tr>
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Qualification</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-slate-500">
                    Loading unit standards…
                  </td>
                </tr>
              ) : null}
              {pagedRows.map((r) => (
                <tr
                  key={String(r.unitStandardId)}
                  className="hover:bg-emerald-50/30"
                >
                  <td className="px-3 py-2.5">{r.unitStandardCode ?? '—'}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{r.unitStandardName ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{qualName(r.qualificationId)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex rounded p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && quals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No qualifications yet. Add qualifications first, then add unit standards.
                  </td>
                </tr>
              ) : null}
              {!isLoading && rows.length === 0 && quals.length > 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No unit standards for your organisation yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PaginatedGridShell>
      <SimpleFormModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit unit standard' : 'New unit standard'}
        error={formError}
        saving={mut.createUnitStandard.isPending || mut.updateUnitStandard.isPending}
        onSave={() => void save()}
      >
        {editing ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="text-slate-500">Qualification:</span>{' '}
            <span className="font-medium text-slate-900">{qualName(editing.qualificationId)}</span>
          </p>
        ) : (
          <>
            <label className={adminFormTheme.label}>Qualification</label>
            <select
              className={adminFormTheme.select}
              value={createQualId || ''}
              onChange={(e) => setCreateQualId(parsePositiveInt(e.target.value, 0))}
            >
              <option value="">Select…</option>
              {quals.map((q) => (
                <option key={String(q.qualificationId)} value={Number(q.qualificationId)}>
                  {q.qualificationName ?? q.qualificationId}
                </option>
              ))}
            </select>
            <label className={adminFormTheme.label}>Code</label>
            <input className={adminFormTheme.input} value={code} onChange={(e) => setCode(e.target.value)} />
          </>
        )}
        <label className={adminFormTheme.label}>Name</label>
        <input className={adminFormTheme.input} value={usName} onChange={(e) => setUsName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={adminFormTheme.label}>Credits</label>
            <input
              type="number"
              className={adminFormTheme.input}
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Notional hours</label>
            <input
              type="number"
              className={adminFormTheme.input}
              value={notionalHours}
              onChange={(e) => setNotionalHours(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <FormToggleSwitch
          checked={active}
          onChange={setActive}
          label="Active"
          description={DEFAULT_ACTIVE_DESCRIPTION}
        />
      </SimpleFormModal>
    </SectionShell>
  );
}

function SectionShell({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing,
  onAdd,
  error,
  filterSlot,
  belowTitleSlot,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onRefresh: () => void;
  refreshing: boolean;
  onAdd: () => void;
  error: unknown;
  filterSlot?: ReactNode;
  /** Renders under the title (and optional subtitle), left-aligned — e.g. filters. */
  belowTitleSlot?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
          {belowTitleSlot ? <div className="mt-3 max-w-xs">{belowTitleSlot}</div> : null}
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {filterSlot}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowPathIcon className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-full border-2 border-hwseta-green bg-white px-4 py-2 text-sm font-semibold text-hwseta-green hover:bg-hwseta-green/5"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add New
          </button>
        </div>
      </div>
      {error != null ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {apiErr(error)}
        </div>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function SimpleFormModal({
  open,
  onClose,
  title,
  children,
  error,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  error: string | null;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className={adminFormTheme.modalPanelSm}>
                <div className="border-b border-slate-200 px-6 py-5">
                  <Dialog.Title className="text-xl font-bold text-slate-900">{title}</Dialog.Title>
                  {error ? (
                    <p className="mt-2 text-sm text-hwseta-red" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className="max-h-[min(65vh,520px)] space-y-4 overflow-y-auto px-6 py-5">{children}</div>
                <div className={adminFormTheme.modalFooter}>
                  <button type="button" onClick={onClose} className={adminFormTheme.btnSecondary}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className={adminFormTheme.btnPrimary}
                  >
                    Save
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

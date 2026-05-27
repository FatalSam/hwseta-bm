'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { FaFileExcel, FaPlus, FaRedo } from 'react-icons/fa';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import {
  preventInvalidDateInputBeforeInput,
  preventInvalidDateInputKeyDown,
  preventInvalidDateInputPaste,
} from '@/components/ui/SyncfusionIsoDatePicker';
import { listManageForms, type FormListItem } from '@/api/formBuilder';
import { buildPublicFormPath, getAppBaseUrl } from '@/lib/appBaseUrl';
import { exportRowsToExcel } from '@/ultis/exportExcel';

function apiErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const o = d as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
    }
    return e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

function formatUpdatedAt(value: string | null): string {
  if (!value?.trim()) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 16);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function matchesDateRange(iso: string | null, from: string, to: string): boolean {
  if (!iso?.trim()) return !from && !to;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  if (from) {
    const start = new Date(`${from}T00:00:00`).getTime();
    if (t < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59.999`).getTime();
    if (t > end) return false;
  }
  return true;
}

function sortForms(rows: FormListItem[]): FormListItem[] {
  return [...rows].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return a.title.localeCompare(b.title);
  });
}

export default function FormBuilderListAdmin() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [updatedFrom, setUpdatedFrom] = useState('');
  const [updatedTo, setUpdatedTo] = useState('');

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['form-builder', 'manage-list'],
    queryFn: () => listManageForms(),
    retry: false,
  });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = sortForms(data ?? []);
    return all.filter((row) => {
      if (q && !row.title.toLowerCase().includes(q) && !row.id.toLowerCase().includes(q)) {
        return false;
      }
      return matchesDateRange(row.updatedAt, updatedFrom, updatedTo);
    });
  }, [data, search, updatedFrom, updatedTo]);

  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const appBase = getAppBaseUrl();

  const handleExport = () => {
    exportRowsToExcel(
      `forms-${new Date().toISOString().slice(0, 10)}.xlsx`,
      pagedRows.map((r) => ({
        Title: r.title,
        'Last updated': formatUpdatedAt(r.updatedAt),
        'Form ID': r.id,
      })),
      'Forms',
    );
  };

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <span className="font-medium text-slate-900">Forms</span>
          <span>/</span>
          <span className="font-medium text-slate-900">Builder</span>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Forms</h1>
            <p className="mt-1 text-sm text-slate-600">Build and manage dynamic forms.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className={adminFormTheme.btnSecondary}
            >
              <FaRedo className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={pagedRows.length === 0}
              className={adminFormTheme.btnSecondary}
            >
              <FaFileExcel />
              Export Excel
            </button>
            <Link href="/dashboard/admin/form-builder/new" className={adminFormTheme.btnPrimary}>
              <FaPlus />
              New form
            </Link>
          </div>
        </div>

        <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={adminFormTheme.label}>Search</label>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Form title or ID…"
              className={adminFormTheme.input}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Updated from</label>
            <input
              type="date"
              value={updatedFrom}
              onChange={(e) => {
                setUpdatedFrom(e.target.value);
                setPage(1);
              }}
              onBeforeInput={preventInvalidDateInputBeforeInput}
              onKeyDown={preventInvalidDateInputKeyDown}
              onPaste={preventInvalidDateInputPaste}
              className={adminFormTheme.input}
            />
          </div>
          <div>
            <label className={adminFormTheme.label}>Updated to</label>
            <input
              type="date"
              value={updatedTo}
              onChange={(e) => {
                setUpdatedTo(e.target.value);
                setPage(1);
              }}
              onBeforeInput={preventInvalidDateInputBeforeInput}
              onKeyDown={preventInvalidDateInputKeyDown}
              onPaste={preventInvalidDateInputPaste}
              className={adminFormTheme.input}
            />
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {apiErr(error)}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
                <tr>
                  <th className="px-3 py-2.5">Form</th>
                  <th className="px-3 py-2.5">Last updated</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                      {data?.length
                        ? 'No forms match your filters.'
                        : 'No forms yet. Create one to get started.'}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((form) => {
                    const publicHref = appBase
                      ? `${appBase}${buildPublicFormPath(form.id)}`
                      : buildPublicFormPath(form.id);
                    return (
                      <tr key={form.id} className="hover:bg-emerald-50/30">
                        <td className="px-3 py-2.5 font-medium text-slate-900">{form.title}</td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {formatUpdatedAt(form.updatedAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-3">
                            <Link
                              href={`/dashboard/admin/form-builder/${encodeURIComponent(form.id)}/edit`}
                              className="text-sm font-semibold text-hwseta-green hover:underline"
                            >
                              Edit
                            </Link>
                            <a
                              href={publicHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-hwseta-green hover:underline"
                            >
                              Open
                            </a>
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
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalCount)}
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
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

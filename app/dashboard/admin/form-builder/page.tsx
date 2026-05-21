'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { listManageForms, type FormListItem } from '@/api/formBuilder';
import { FaClipboardList, FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import { adminFormTheme } from '@/components/admin/adminFormTheme';

export default function AdminFormBuilderListPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setIsChecking(false);
      const hasToken = token || (typeof window !== 'undefined' && localStorage.getItem('auth'));
      if (!hasToken && !isAuthenticated) router.replace('/login');
    }, 80);
    return () => clearTimeout(t);
  }, [token, isAuthenticated, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setForms(await listManageForms());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load forms.');
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, load]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#124a3f] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <FaClipboardList className="h-4 w-4" />
          <span>/</span>
          <span className="font-medium text-slate-900">Organisation</span>
          <span>/</span>
          <span className="font-medium text-slate-900">Form builder</span>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Forms</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className={adminFormTheme.btnSecondary}
            >
              <FaRedo className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              href="/dashboard/admin/form-builder/new"
              className={adminFormTheme.btnPrimary}
            >
              New form
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <FaExclamationTriangle />
            {error}
          </div>
        )}

        <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
          {loading && forms.length === 0 ? (
            <li className="px-4 py-8 text-center text-zinc-500">Loading…</li>
          ) : forms.length ? (
            forms.map((form) => (
              <li key={form.id}>
                <Link
                  href={`/dashboard/admin/form-builder/${encodeURIComponent(form.id)}/edit`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-900">{form.title}</span>
                  <span className="text-sm text-zinc-500">
                    {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : ''}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-zinc-500">
              No forms yet. Create one to get started.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

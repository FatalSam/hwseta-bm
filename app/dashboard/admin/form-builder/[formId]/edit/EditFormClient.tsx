'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FormBuilderCanvas } from '@/components/form-builder';
import type { FormSettings } from '@/types/dynamicForm';
import { getPublicForm, updateManageForm } from '@/api/formBuilder';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { buildPublicFormPath } from '@/lib/appBaseUrl';

const decodeJwtPayload = (jwt: string | null | undefined): Record<string, unknown> | null => {
  if (!jwt) return null;
  const raw = jwt.trim().toLowerCase().startsWith('bearer ') ? jwt.trim().slice(7) : jwt.trim();
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

interface Props {
  formId: string;
  token: string | null;
}

export function EditFormClient({ formId, token }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [initialSettings, setInitialSettings] = useState<FormSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const userId = useMemo(() => {
    const p = decodeJwtPayload(token);
    const claim =
      p?.UserID ??
      p?.userID ??
      p?.userId ??
      p?.UserId ??
      p?.sub ??
      p?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    const resolved = claim == null ? '' : String(claim).trim();
    return resolved || null;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const detail = await getPublicForm(formId);
        if (cancelled) return;
        setTitle(detail.title);
        setDescription(detail.description ?? '');
        setInitialSettings(detail.settings);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load form.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const handleSave = async (settings: FormSettings) => {
    setSaveStatus('saving');
    try {
      await updateManageForm(formId, {
        title: title.trim() || 'Untitled form',
        description: description.trim() || null,
        settings,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16 text-slate-500">Loading form…</div>;
  }

  if (loadError || !initialSettings) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>;
  }

  const publicHref =
    typeof window !== 'undefined'
      ? `${window.location.origin}${buildPublicFormPath(formId)}`
      : buildPublicFormPath(formId);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/admin/form-builder"
          className="text-sm font-medium text-slate-600 transition hover:text-hwseta-green-dark"
        >
          ← Forms
        </Link>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.15)]">
        <div className="h-2 bg-hwseta-green" aria-hidden />
        <div className="flex flex-col gap-3 px-5 py-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={adminFormTheme.input}
            placeholder="Form title"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={adminFormTheme.input}
            placeholder="Form description (optional)"
          />
          <p className="text-sm text-slate-500">
            Public form:{' '}
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#124a3f] hover:text-[#0f3d34] hover:underline"
            >
              Open live form
            </a>
          </p>
          {!userId ? (
            <p className="text-xs text-amber-700">Signed-in user id is missing in token; save may fail.</p>
          ) : null}
        </div>
      </div>
      <FormBuilderCanvas
        key={formId}
        initialSettings={initialSettings}
        formId={formId}
        onSave={handleSave}
        saveStatus={saveStatus}
      />
    </div>
  );
}

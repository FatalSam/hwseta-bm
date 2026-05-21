'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPublicForm, submitPublicForm } from '@/api/formBuilder';
import { PublicForm } from '@/components/form-builder';
import type { FormSettings } from '@/types/dynamicForm';
import { useAuthStore } from '@/store/authStore';

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

export default function PublicFormPage() {
  const params = useParams();
  const formId = typeof params.formId === 'string' ? params.formId : '';
  const { token } = useAuthStore();
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [settings, setSettings] = useState<FormSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createdByUserId = useMemo(() => {
    const payload = decodeJwtPayload(token);
    const claim =
      payload?.UserID ??
      payload?.userID ??
      payload?.userId ??
      payload?.UserId ??
      payload?.sub ??
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

    return claim == null ? null : String(claim).trim() || null;
  }, [token]);

  useEffect(() => {
    if (!formId) {
      setError('Invalid form.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await getPublicForm(formId);
        if (cancelled) return;
        setTitle(detail.title);
        setDescription(detail.description);
        setSettings(detail.settings);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load form.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formId]);

  const onSubmit = useCallback(
    async (payload: Record<string, string | string[]>) => {
      await submitPublicForm(formId, {
        payload,
        createdByUserId,
      });
    },
    [createdByUserId, formId],
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-slate-100/90 py-10">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white px-6 py-10 text-center text-sm text-zinc-500 shadow-md">
            Loading form...
          </div>
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-[60vh] bg-slate-100/90 py-10">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error || 'This form could not be loaded.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-slate-100/90 py-10">
      <div className="mx-auto max-w-2xl px-4">
        {title ? (
          <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-6 py-5 shadow-md">
            <div className="mb-3 h-1.5 w-20 rounded-full bg-[#124a3f]" aria-hidden />
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
          </div>
        ) : null}
        <PublicForm settings={settings} formId={formId} onSubmit={onSubmit} />
      </div>
    </div>
  );
}

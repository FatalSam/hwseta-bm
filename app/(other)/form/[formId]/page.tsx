'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/breadcrumb';
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

function PublicFormShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-hwseta-green-muted/40">
      {children}
    </div>
  );
}

export default function PublicFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = typeof params.formId === 'string' ? params.formId : '';
  const distributionId = searchParams.get('d')?.trim() || null;
  const notificationId = searchParams.get('n')?.trim() || null;
  const { token } = useAuthStore();
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [settings, setSettings] = useState<FormSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbTitle = title?.trim() || 'Form';

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
        distributionId,
        notificationId,
        formTitle: title ?? undefined,
        settings: settings ?? undefined,
      });
    },
    [createdByUserId, distributionId, formId, notificationId, settings, title],
  );

  if (loading) {
    return (
      <PublicFormShell>
        <Breadcrumb breadcrumbTitle="Form" />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-2xl border border-slate-200/90 bg-white px-6 py-10 text-center text-sm text-zinc-500 shadow-md">
            Loading form...
          </div>
        </div>
      </PublicFormShell>
    );
  }

  if (error || !settings) {
    return (
      <PublicFormShell>
        <Breadcrumb breadcrumbTitle="Form" />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error || 'This form could not be loaded.'}
          </div>
        </div>
      </PublicFormShell>
    );
  }

  return (
    <PublicFormShell>
      <Breadcrumb breadcrumbTitle={breadcrumbTitle} />
      <div className="mx-auto max-w-2xl px-4 py-8 pb-12">
        {description ? (
          <p className="mb-6 text-center text-sm text-slate-600">{description}</p>
        ) : null}
        <PublicForm settings={settings} formId={formId} onSubmit={onSubmit} />
      </div>
    </PublicFormShell>
  );
}

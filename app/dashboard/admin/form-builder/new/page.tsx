'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { FormBuilderCanvas } from '@/components/form-builder';
import { getDefaultSettings } from '@/lib/form-builder-defaults';
import type { FormSettings } from '@/types/dynamicForm';
import { createManageForm } from '@/api/formBuilder';
import { decodeToken } from '@/lib/jwt-utils';

export default function NewAdminFormPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const userId = useMemo(() => {
    const fromStore = String(user?.userID ?? '').trim();
    if (fromStore) return fromStore;
    const p = decodeToken(token ?? '');
    const claim =
      p?.UserID ??
      p?.userID ??
      p?.userId ??
      p?.UserId ??
      p?.sub ??
      p?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    const resolved = claim == null ? '' : String(claim).trim();
    return resolved || null;
  }, [token, user?.userID]);

  const handleSave = async (settings: FormSettings) => {
    const hasAtLeastOneField = settings.sections.some((s) => (s.fields?.length ?? 0) > 0);
    if (!hasAtLeastOneField) {
      setSaveStatus('error');
      setSaveError('Add at least one field before saving the form.');
      return;
    }
    if (!userId) {
      setSaveStatus('error');
      setSaveError('Missing UserID in your session token. Please log out and log in again.');
      return;
    }
    setSaveError(null);
    setSaveStatus('saving');
    try {
      const id = await createManageForm({
        createdByUserId: userId,
        title: 'Untitled form',
        description: '',
        settings,
      });
      setSaveStatus('saved');
      router.push(`/dashboard/admin/form-builder/${encodeURIComponent(id)}/edit`);
    } catch (e) {
      setSaveStatus('error');
      setSaveError(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1200px] px-2 py-2 lg:px-4">
        <div className="mb-6">
          <Link
            href="/dashboard/admin/form-builder"
            className="text-sm font-medium text-slate-600 transition hover:text-hwseta-green-dark"
          >
            ← Forms
          </Link>
        </div>
        <div className="mb-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.15)]">
          <div className="h-2 bg-hwseta-green" aria-hidden />
          <div className="px-5 py-5">
            <h1 className="text-2xl font-semibold text-slate-900">New form</h1>
            <p className="mt-1 text-sm text-slate-500">
              Add questions below, then save. You can set the form title after the first save.
            </p>
          </div>
        </div>
        <FormBuilderCanvas
          initialSettings={getDefaultSettings()}
          formId={null}
          onSave={handleSave}
          saveStatus={saveStatus}
        />
        {saveError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from 'react';
import type { FormSettings, FormSection, FormField } from '@/types/dynamicForm';
import { FormFieldRenderer } from '@/components/form-builder-inputs';
import type { FieldValue } from '@/components/form-builder-inputs';
import { isFieldVisible } from '@/lib/form-builder-conditions';

interface Props {
  settings: FormSettings;
  formId: string;
  onSubmit: (payload: Record<string, FieldValue>) => Promise<void>;
}

export function PublicForm({ settings, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateValue = useCallback((fieldId: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const formValues = values as Record<string, FieldValue>;
      const vals = formValues as Record<string, string | string[]>;
      for (const section of settings.sections) {
        for (const field of section.fields) {
          if (!isFieldVisible(field.id, settings.conditions, vals)) continue;
          if (!field.required) continue;
          const v = formValues[field.id] ?? (field.type === 'checkboxes' ? [] : '');
          const empty = Array.isArray(v) ? v.length === 0 : String(v ?? '').trim() === '';
          if (empty) {
            setError(`Please fill in: ${field.label || 'required field'}.`);
            return;
          }
        }
      }

      setSubmitting(true);
      try {
        await onSubmit(values);
        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed');
      } finally {
        setSubmitting(false);
      }
    },
    [values, onSubmit, settings],
  );

  if (submitted) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-md">
        <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-[#124a3f]" aria-hidden />
        <p className="text-lg font-semibold text-slate-900">Thank you for your submission.</p>
      </div>
    );
  }

  const { sections, conditions } = settings;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          conditions={conditions}
          values={values}
          onValueChange={updateValue}
        />
      ))}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-[#124a3f] px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-[#0f3d34] disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}

function SectionBlock({
  section,
  conditions,
  values,
  onValueChange,
}: {
  section: FormSection;
  conditions: FormSettings['conditions'];
  values: Record<string, FieldValue>;
  onValueChange: (fieldId: string, value: FieldValue) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md">
      <div className="mb-4 h-1 w-12 rounded-full bg-[#124a3f]/80" aria-hidden />
      {section.title && <h2 className="mb-1 text-lg font-semibold text-slate-900">{section.title}</h2>}
      {section.description && <p className="mb-4 text-sm text-slate-600">{section.description}</p>}
      <div className="space-y-4">
        {section.fields.map((field) => {
          const visible = isFieldVisible(field.id, conditions, values as Record<string, string | string[]>);
          if (!visible) return null;
          return (
            <FieldBlock
              key={field.id}
              field={field}
              value={values[field.id] ?? (field.type === 'checkboxes' ? [] : '')}
              onChange={(v) => onValueChange(field.id, v)}
            />
          );
        })}
      </div>
    </div>
  );
}

function FieldBlock({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}) {
  return (
    <div>
      <FormFieldRenderer field={field} value={value} onChange={onChange} />
    </div>
  );
}

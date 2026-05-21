"use client";

import { useState, useMemo } from 'react';
import type { FormSection, FormField, ConditionRule } from '@/types/dynamicForm';
import { adminFormTheme } from '@/components/admin/adminFormTheme';

interface Props {
  fieldId: string;
  sections: FormSection[];
  conditions: ConditionRule[];
  onSave: (rule: ConditionRule) => void;
  onClose: () => void;
}

export function ConditionEditor({ fieldId, sections, conditions, onSave, onClose }: Props) {
  const existing = conditions.find((c) => c.targetFieldId === fieldId);
  const [sourceFieldId, setSourceFieldId] = useState(existing?.showWhen.fieldId ?? '');
  const [operator, setOperator] = useState<'equals' | 'not_equals' | 'one_of'>(
    (existing?.showWhen.operator as 'equals' | 'not_equals' | 'one_of') ?? 'equals',
  );
  const [value, setValue] = useState(
    Array.isArray(existing?.showWhen.value)
      ? (existing!.showWhen.value as string[]).join(', ')
      : ((existing?.showWhen.value as string) ?? ''),
  );

  const allFields: FormField[] = useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const sourceField = allFields.find((f) => f.id === sourceFieldId);
  const hasOptions = sourceField && ['dropdown', 'radio', 'checkboxes'].includes(sourceField.type);

  const handleSave = () => {
    if (!sourceFieldId.trim()) return;
    const val =
      operator === 'one_of'
        ? value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : value.trim();
    onSave({
      id: existing?.id ?? `cond-${Date.now()}`,
      targetFieldId: fieldId,
      showWhen: {
        fieldId: sourceFieldId,
        operator,
        value: val,
      },
    });
  };

  return (
    <div className={adminFormTheme.modalBackdrop}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`${adminFormTheme.modalPanelSm} p-6`}>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">Show field when</h3>
        <div className="space-y-4">
          <div>
            <label className={adminFormTheme.label}>Source field</label>
            <select
              value={sourceFieldId}
              onChange={(e) => setSourceFieldId(e.target.value)}
              className={adminFormTheme.select}
            >
              <option value="">Select field...</option>
              {allFields
                .filter((f) => f.id !== fieldId)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label || f.type}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={adminFormTheme.label}>Operator</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as 'equals' | 'not_equals' | 'one_of')}
              className={adminFormTheme.select}
            >
              <option value="equals">equals</option>
              <option value="not_equals">does not equal</option>
              <option value="one_of">is one of</option>
            </select>
          </div>
          <div>
            <label className={adminFormTheme.label}>
              Value{operator === 'one_of' ? ' (comma-separated)' : ''}
            </label>
            {hasOptions && operator !== 'one_of' ? (
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={adminFormTheme.select}
              >
                <option value="">Select...</option>
                {(sourceField?.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={operator === 'one_of' ? 'A, B, C' : 'Value'}
                className={adminFormTheme.input}
              />
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
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
            className={adminFormTheme.btnPrimary}
          >
            Save condition
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

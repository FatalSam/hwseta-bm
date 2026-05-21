"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from '@/types/dynamicForm';
import { FormFieldRenderer } from '@/components/form-builder-inputs';
import type { FieldValue } from '@/components/form-builder-inputs';
import { FaClone, FaTrashAlt } from 'react-icons/fa';

interface Props {
  field: FormField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  onLabelChange: (label: string) => void;
  onOptionsChange: (options: string[]) => void;
  onRequiredChange: (required: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddCondition: () => void;
  hasCondition: boolean;
  disabled?: boolean;
}

export function SortableFieldItem({
  field,
  value,
  onChange,
  onLabelChange,
  onOptionsChange,
  onRequiredChange,
  onDuplicate,
  onDelete,
  onAddCondition,
  hasCondition,
  disabled,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const required = !!field.required;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ${
        isDragging ? 'z-10 shadow-lg ring-2 ring-[#124a3f]/20' : ''
      }`}
    >
      <div className="absolute left-0 top-0 h-full w-1 bg-[#124a3f]" aria-hidden />

      <div className="pb-4 pl-4 pr-4 pt-3 sm:pl-5 sm:pr-5">
        <div className="mb-2 flex justify-center">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#124a3f] active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <svg className="mx-auto h-4 w-12" viewBox="0 0 48 16" fill="currentColor" aria-hidden>
              <circle cx="8" cy="4" r="1.5" />
              <circle cx="16" cy="4" r="1.5" />
              <circle cx="24" cy="4" r="1.5" />
              <circle cx="8" cy="12" r="1.5" />
              <circle cx="16" cy="12" r="1.5" />
              <circle cx="24" cy="12" r="1.5" />
            </svg>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <input
            type="text"
            value={field.label}
            onChange={(e) => onLabelChange(e.target.value)}
            disabled={disabled}
            className="w-full border-b-2 border-transparent pb-1 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#124a3f]/45"
            placeholder="Question / field label"
          />
          <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
            <FormFieldRenderer field={field} value={value} onChange={onChange} disabled={disabled} />
          </div>
          {(field.type === 'dropdown' || field.type === 'radio' || field.type === 'checkboxes') && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Options</p>
              {(field.options ?? []).map((opt, index) => (
                <div key={`${field.id}-opt-${index}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...(field.options ?? [])];
                      next[index] = e.target.value;
                      onOptionsChange(next);
                    }}
                    disabled={disabled}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#124a3f]/40 focus:ring-2 focus:ring-[#124a3f]/10"
                    placeholder={`Option ${index + 1}`}
                    aria-label={`Option ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const current = field.options ?? [];
                      if (current.length <= 1) return;
                      onOptionsChange(current.filter((_, i) => i !== index));
                    }}
                    disabled={disabled || (field.options ?? []).length <= 1}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onOptionsChange([...(field.options ?? []), 'New option'])}
                disabled={disabled}
                className="text-sm font-medium text-[#124a3f] hover:text-[#0f3d34] hover:underline"
              >
                + Add option
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onAddCondition}
              className={`text-left text-sm font-medium ${
                hasCondition ? 'text-[#124a3f]' : 'text-slate-500 hover:text-[#124a3f]'
              }`}
            >
              {hasCondition ? 'Edit condition' : '+ Add condition'}
            </button>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onDuplicate}
                disabled={disabled}
                title="Duplicate field"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#124a3f] disabled:opacity-40"
              >
                <FaClone className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={disabled}
                title="Delete field"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <FaTrashAlt className="h-4 w-4" />
              </button>
              <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
              <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg px-1 py-1">
                <span className="text-sm font-medium text-slate-600">Required</span>
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => onRequiredChange(e.target.checked)}
                  disabled={disabled}
                  className="peer sr-only"
                />
                <span
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                    required ? 'bg-[#124a3f]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      required ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

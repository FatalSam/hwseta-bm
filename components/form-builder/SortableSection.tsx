"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { FormSection as FormSectionType } from '@/types/dynamicForm';
import { SortableFieldItem } from './SortableFieldItem';
import type { FieldValue } from '@/components/form-builder-inputs';

interface Props {
  section: FormSectionType;
  fieldValues: Record<string, FieldValue>;
  onSectionTitleChange: (title: string) => void;
  onSectionDescriptionChange: (description: string) => void;
  onFieldValueChange: (fieldId: string, value: FieldValue) => void;
  onFieldLabelChange: (fieldId: string, label: string) => void;
  onFieldOptionsChange: (fieldId: string, options: string[]) => void;
  onFieldRequiredChange: (fieldId: string, required: boolean) => void;
  onDuplicateField: (fieldId: string) => void;
  onDeleteField: (fieldId: string) => void;
  onAddCondition: (fieldId: string) => void;
  getConditionForField: (fieldId: string) => boolean;
  onAddField: () => void;
  onDeleteSection: () => void;
  disabled?: boolean;
}

export function SortableSection({
  section,
  fieldValues,
  onSectionTitleChange,
  onSectionDescriptionChange,
  onFieldValueChange,
  onFieldLabelChange,
  onFieldOptionsChange,
  onFieldRequiredChange,
  onDuplicateField,
  onDeleteField,
  onAddCondition,
  getConditionForField,
  onAddField,
  onDeleteSection,
  disabled,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fieldIds = section.fields.map((f) => f.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ${
        isDragging ? 'z-10 opacity-95 ring-2 ring-[#124a3f]/25' : ''
      }`}
    >
      <div className="h-2 w-full bg-[#124a3f]" aria-hidden />
      <div className="p-4 sm:p-5">
        <div className="mb-5 flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="mt-1.5 cursor-grab touch-none rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#124a3f] active:cursor-grabbing"
            aria-label="Drag section to reorder"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a1 1 0 011 1v1h3V3a1 1 0 112 0v1h3a1 1 0 110 2h-3v1h3a1 1 0 110 2h-3v1a1 1 0 11-2 0v-1H8v1a1 1 0 11-2 0V8H3a1 1 0 010-2h3V5H3a1 1 0 010-2h3V3a1 1 0 011-1z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <input
              type="text"
              value={section.title}
              onChange={(e) => onSectionTitleChange(e.target.value)}
              disabled={disabled}
              className="w-full border-b-2 border-transparent bg-transparent pb-1 text-lg font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#124a3f]/40"
              placeholder="Section title"
            />
            <input
              type="text"
              value={section.description ?? ''}
              onChange={(e) => onSectionDescriptionChange(e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-[#124a3f]/35 focus:bg-white focus:ring-2 focus:ring-[#124a3f]/10"
              placeholder="Section description (optional)"
            />
          </div>
          <button
            type="button"
            onClick={onDeleteSection}
            className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
          >
            Remove section
          </button>
        </div>

        <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {section.fields.map((field) => (
              <SortableFieldItem
                key={field.id}
                field={field}
                value={fieldValues[field.id] ?? (field.type === 'checkboxes' ? [] : '')}
                onChange={(v) => onFieldValueChange(field.id, v)}
                onLabelChange={(label) => onFieldLabelChange(field.id, label)}
                onOptionsChange={(options) => onFieldOptionsChange(field.id, options)}
                onRequiredChange={(required) => onFieldRequiredChange(field.id, required)}
                onDuplicate={() => onDuplicateField(field.id)}
                onDelete={() => onDeleteField(field.id)}
                onAddCondition={() => onAddCondition(field.id)}
                hasCondition={getConditionForField(field.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>

        <button
          type="button"
          onClick={onAddField}
          className="mt-4 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-3 text-sm font-medium text-slate-600 transition hover:border-[#124a3f]/40 hover:bg-[#124a3f]/5 hover:text-[#124a3f]"
        >
          + Add field
        </button>
      </div>
    </div>
  );
}

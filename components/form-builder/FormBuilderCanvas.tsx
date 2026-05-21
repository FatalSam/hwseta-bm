"use client";

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { FormSection as FormSectionType, FormField, FormSettings, ConditionRule } from '@/types/dynamicForm';
import { createDefaultSection, createDefaultField } from '@/lib/form-builder-defaults';
import { FIELD_TYPES } from '@/components/form-builder-inputs';
import type { FieldType } from '@/types/dynamicForm';
import type { FieldValue } from '@/components/form-builder-inputs';
import { SortableSection } from './SortableSection';
import { ConditionEditor } from './ConditionEditor';
import { adminFormTheme } from '@/components/admin/adminFormTheme';

interface Props {
  initialSettings: FormSettings;
  /** Reserved for parity with reference UI; canvas state is driven by `initialSettings`. */
  formId: string | null;
  onSave: (settings: FormSettings) => Promise<void>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export function FormBuilderCanvas({ initialSettings, formId, onSave, saveStatus }: Props) {
  void formId;
  const [sections, setSections] = useState<FormSectionType[]>(
    initialSettings.sections.length ? initialSettings.sections : [],
  );
  const [conditions, setConditions] = useState<ConditionRule[]>(initialSettings.conditions ?? []);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [conditionEditorFieldId, setConditionEditorFieldId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const sectionIds = sections.map((s) => s.id);

  const addSection = useCallback(() => {
    setSections((prev) => [...prev, createDefaultSection(prev.length)]);
  }, []);

  const addField = useCallback((sectionId: string, type: FieldType) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const newField = createDefaultField(type, sec.fields.length);
        return {
          ...sec,
          fields: [...sec.fields, newField],
        };
      }),
    );
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<FormSectionType>) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)));
  }, []);

  const updateField = useCallback((sectionId: string, fieldId: string, updates: Partial<FormField>) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
        };
      }),
    );
  }, []);

  const duplicateField = useCallback((sectionId: string, fieldId: string) => {
    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const idx = s.fields.findIndex((f) => f.id === fieldId);
        if (idx === -1) return s;
        const f = s.fields[idx];
        const copy: FormField = {
          ...f,
          id: newId,
          label: `${f.label} (copy)`,
          order: idx + 1,
          options: f.options ? [...f.options] : undefined,
        };
        const fields = [...s.fields];
        fields.splice(idx + 1, 0, copy);
        return { ...s, fields: fields.map((ff, i) => ({ ...ff, order: i })) };
      }),
    );
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setSections((prev) => {
      const section = prev.find((s) => s.id === sectionId);
      const fieldIds = new Set(section?.fields.map((f) => f.id) ?? []);
      setConditions((cprev) => cprev.filter((c) => !fieldIds.has(c.targetFieldId)));
      return prev.filter((s) => s.id !== sectionId);
    });
  }, []);

  const deleteField = useCallback((fieldId: string) => {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        fields: s.fields.filter((f) => f.id !== fieldId),
      })),
    );
    setConditions((prev) => prev.filter((c) => c.targetFieldId !== fieldId));
  }, []);

  const getSectionByFieldId = (fieldId: string) => sections.find((s) => s.fields.some((f) => f.id === fieldId));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      if (sectionIds.includes(activeId)) {
        const oldIndex = sections.findIndex((s) => s.id === activeId);
        const newIndex = sections.findIndex((s) => s.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
        setSections((prev) => {
          const next = [...prev];
          const [removed] = next.splice(oldIndex, 1);
          next.splice(newIndex, 0, removed);
          return next.map((s, i) => ({ ...s, order: i }));
        });
        return;
      }

      const section = getSectionByFieldId(activeId);
      if (!section) return;
      const fieldIndex = section.fields.findIndex((f) => f.id === activeId);
      const overIndex = section.fields.findIndex((f) => f.id === overId);
      if (fieldIndex === -1 || overIndex === -1 || fieldIndex === overIndex) return;
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== section.id) return s;
          const next = [...s.fields];
          const [removed] = next.splice(fieldIndex, 1);
          next.splice(overIndex, 0, removed);
          return {
            ...s,
            fields: next.map((f, i) => ({ ...f, order: i })),
          };
        }),
      );
    },
    [sectionIds, sections, getSectionByFieldId],
  );

  const handleSave = useCallback(() => {
    const settings: FormSettings = {
      sections,
      conditions,
      uiSettings: initialSettings.uiSettings ?? {},
    };
    void onSave(settings);
  }, [sections, conditions, initialSettings.uiSettings, onSave]);

  const getConditionForField = (fieldId: string) => conditions.some((c) => c.targetFieldId === fieldId);

  const addOrEditCondition = (fieldId: string) => setConditionEditorFieldId(fieldId);
  const closeConditionEditor = () => setConditionEditorFieldId(null);
  const saveCondition = (rule: ConditionRule) => {
    setConditions((prev) => prev.filter((c) => c.targetFieldId !== rule.targetFieldId));
    setConditions((prev) => [...prev, rule]);
    setConditionEditorFieldId(null);
  };

  return (
    <div className="rounded-2xl bg-slate-100/95 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">Add field</span>
          {FIELD_TYPES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                if (sections.length === 0) {
                  setSections([{ ...createDefaultSection(0), fields: [createDefaultField(type, 0)] }]);
                } else {
                  const lastSection = sections[sections.length - 1];
                  if (lastSection) addField(lastSection.id, type);
                }
              }}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-hwseta-green/40 hover:bg-hwseta-green/5 hover:text-hwseta-green-dark"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={addSection}
            className="rounded-2xl border border-dashed border-hwseta-green/35 bg-hwseta-green/5 px-3 py-1.5 text-sm font-medium text-hwseta-green-dark hover:bg-hwseta-green/10"
          >
            + Section
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={adminFormTheme.btnPrimary}
          >
            Save form
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-5">
            {sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                fieldValues={fieldValues}
                onSectionTitleChange={(title) => updateSection(section.id, { title })}
                onSectionDescriptionChange={(description) => updateSection(section.id, { description })}
                onFieldValueChange={(fieldId, value) =>
                  setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
                }
                onFieldLabelChange={(fieldId, label) => updateField(section.id, fieldId, { label })}
                onFieldOptionsChange={(fieldId, options) => updateField(section.id, fieldId, { options })}
                onFieldRequiredChange={(fieldId, required) =>
                  updateField(section.id, fieldId, { required })
                }
                onDuplicateField={(fieldId) => duplicateField(section.id, fieldId)}
                onDeleteField={deleteField}
                onAddCondition={addOrEditCondition}
                getConditionForField={getConditionForField}
                onAddField={() => {
                  addField(section.id, 'short_text');
                }}
                onDeleteSection={() => deleteSection(section.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-500 shadow-inner">
          Add a section above, or click a field type to add the first section with a field.
        </div>
      )}

      {conditionEditorFieldId && (
        <ConditionEditor
          fieldId={conditionEditorFieldId}
          sections={sections}
          conditions={conditions}
          onSave={saveCondition}
          onClose={closeConditionEditor}
        />
      )}
    </div>
  );
}

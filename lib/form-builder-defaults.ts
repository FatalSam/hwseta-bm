import type { FormField, FormSection, FormSettings, FieldType } from '@/types/dynamicForm';

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const defaultSettings: FormSettings = {
  sections: [],
  conditions: [],
  uiSettings: {},
};

export function getDefaultSettings(): FormSettings {
  return JSON.parse(JSON.stringify(defaultSettings)) as FormSettings;
}

export function createDefaultField(type: FieldType, order: number): FormField {
  const id = newId();
  const base = {
    id,
    type,
    label: getDefaultLabel(type),
    order,
    required: false,
  };
  if (type === 'dropdown' || type === 'radio' || type === 'checkboxes') {
    return { ...base, options: ['Option 1', 'Option 2'] };
  }
  return base as FormField;
}

function getDefaultLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    short_text: 'Short text',
    long_text: 'Paragraph',
    dropdown: 'Dropdown',
    radio: 'Single choice',
    checkboxes: 'Multiple choice',
    date: 'Date',
  };
  return labels[type];
}

export function createDefaultSection(order: number): FormSection {
  return {
    id: newId(),
    title: 'Section',
    description: '',
    order,
    fields: [],
  };
}

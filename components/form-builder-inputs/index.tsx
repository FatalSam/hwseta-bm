"use client";

import type { FormField, FieldType } from '@/types/dynamicForm';
import { ShortTextInput } from './ShortTextInput';
import { LongTextInput } from './LongTextInput';
import { DropdownInput } from './DropdownInput';
import { RadioInput } from './RadioInput';
import { CheckboxesInput } from './CheckboxesInput';
import { DateInput } from './DateInput';

export { ShortTextInput, LongTextInput, DropdownInput, RadioInput, CheckboxesInput, DateInput };

export type FieldValue = string | string[];

interface FormFieldRendererProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  disabled?: boolean;
}

export function FormFieldRenderer({ field, value, onChange, disabled }: FormFieldRendererProps) {
  const str = typeof value === 'string' ? value : '';
  const arr = Array.isArray(value) ? value : [];

  switch (field.type) {
    case 'short_text':
      return <ShortTextInput field={field} value={str} onChange={(v) => onChange(v)} disabled={disabled} />;
    case 'long_text':
      return <LongTextInput field={field} value={str} onChange={(v) => onChange(v)} disabled={disabled} />;
    case 'dropdown':
      return <DropdownInput field={field} value={str} onChange={(v) => onChange(v)} disabled={disabled} />;
    case 'radio':
      return <RadioInput field={field} value={str} onChange={(v) => onChange(v)} disabled={disabled} />;
    case 'checkboxes':
      return <CheckboxesInput field={field} value={arr} onChange={(v) => onChange(v)} disabled={disabled} />;
    case 'date':
      return <DateInput field={field} value={str} onChange={(v) => onChange(v)} disabled={disabled} />;
    default:
      return <ShortTextInput field={field} value={str} onChange={(v) => onChange(v)} disabled={disabled} />;
  }
}

export const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'short_text', label: 'Short text' },
  { type: 'long_text', label: 'Paragraph' },
  { type: 'dropdown', label: 'Dropdown' },
  { type: 'radio', label: 'Single choice' },
  { type: 'checkboxes', label: 'Multiple choice' },
  { type: 'date', label: 'Date' },
];

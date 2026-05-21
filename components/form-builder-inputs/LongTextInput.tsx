"use client";

import type { FormField } from '@/types/dynamicForm';

interface Props {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LongTextInput({ field, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-zinc-700">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        required={field.required}
        rows={4}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-zinc-100"
      />
    </div>
  );
}

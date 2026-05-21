"use client";

import type { FormField } from '@/types/dynamicForm';

interface Props {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DropdownInput({ field, value, onChange, disabled }: Props) {
  const options = field.options ?? [];

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-zinc-700">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={field.required}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-zinc-100"
      >
        <option value="">Select...</option>
        {options.map((opt, index) => (
          <option key={`${field.id}-opt-${index}`} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

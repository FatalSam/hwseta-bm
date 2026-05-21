"use client";

import type { FormField } from '@/types/dynamicForm';

interface Props {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RadioInput({ field, value, onChange, disabled }: Props) {
  const options = field.options ?? [];

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-zinc-700">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt, index) => (
          <label key={`${field.id}-opt-${index}`} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={field.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              disabled={disabled}
              required={field.required}
              className="h-4 w-4 border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-zinc-900">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

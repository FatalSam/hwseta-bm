"use client";

import type { FormField } from '@/types/dynamicForm';

interface Props {
  field: FormField;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function CheckboxesInput({ field, value, onChange, disabled }: Props) {
  const options = field.options ?? [];
  const set = new Set(value);

  function toggle(opt: string) {
    if (set.has(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  }

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
              type="checkbox"
              checked={set.has(opt)}
              onChange={() => toggle(opt)}
              disabled={disabled}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-zinc-900">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

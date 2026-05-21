'use client';

import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import type { ChangedEventArgs } from '@syncfusion/ej2-react-calendars';
import { cn } from '@/ultis/cn';

/** Convert stored yyyy-mm-dd to a local calendar Date (no UTC shift). */
export function isoDateStringToLocalDate(iso: string): Date | undefined {
  const trimmed = iso.trim();
  if (!trimmed) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  const [y, m, d] = trimmed.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Convert picked Date to yyyy-mm-dd for forms and API. */
export function localDateToIsoDate(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type SyncfusionIsoDatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  max?: Date;
  min?: Date;
  hasError?: boolean;
  id?: string;
  className?: string;
  /** Popup layer; keep above profile drawers/tabs (default 12000). */
  zIndex?: number;
};

/**
 * Syncfusion calendar popup (same stack as company profile / admin forms).
 * Display format dd/MM/yyyy; state remains ISO yyyy-mm-dd.
 */
export function SyncfusionIsoDatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  disabled,
  max,
  min,
  hasError,
  id,
  className,
  zIndex = 12000,
}: SyncfusionIsoDatePickerProps) {
  return (
    <div
      className={cn(
        'profile-syncfusion-datepicker w-full [&_.e-input-group]:min-h-[48px] [&_.e-input-group]:rounded-xl',
        hasError && 'rounded-xl ring-2 ring-red-500/25',
        className,
      )}
    >
      <DatePickerComponent
        id={id}
        value={isoDateStringToLocalDate(value)}
        format="dd/MM/yyyy"
        placeholder={placeholder}
        floatLabelType="Never"
        enabled={!disabled}
        cssClass={cn('e-outline w-full', hasError && 'e-error')}
        openOnFocus
        showClearButton={false}
        max={max}
        min={min}
        zIndex={zIndex}
        change={(args: ChangedEventArgs) => {
          onChange(localDateToIsoDate(args.value as Date | null));
        }}
      />
    </div>
  );
}

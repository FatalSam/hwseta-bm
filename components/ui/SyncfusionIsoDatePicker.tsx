'use client';

import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import type { ChangedEventArgs } from '@syncfusion/ej2-react-calendars';
import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react';
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

const DATE_ALLOWED_CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

function isDateInputTarget(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement;
}

export function preventInvalidDateInputKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (!isDateInputTarget(event.target)) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (DATE_ALLOWED_CONTROL_KEYS.has(event.key)) return;
  if (event.key.length === 1 && !/[\d/\-\s]/.test(event.key)) {
    event.preventDefault();
  }
}

export function preventInvalidDateInputPaste(event: ClipboardEvent<HTMLElement>) {
  if (!isDateInputTarget(event.target)) return;
  const text = event.clipboardData.getData('text');
  if (/[A-Za-z]/.test(text)) {
    event.preventDefault();
  }
}

export function preventInvalidDateInputBeforeInput(event: FormEvent<HTMLElement>) {
  if (!isDateInputTarget(event.target)) return;
  const nativeEvent = event.nativeEvent as InputEvent;
  if (nativeEvent.data && /[A-Za-z]/.test(nativeEvent.data)) {
    event.preventDefault();
  }
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
      onBeforeInputCapture={preventInvalidDateInputBeforeInput}
      onKeyDownCapture={preventInvalidDateInputKeyDown}
      onPasteCapture={preventInvalidDateInputPaste}
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

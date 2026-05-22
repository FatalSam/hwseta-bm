'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Copy aligned with manage-mybeneficiary “Active” toggle helper text. */
export const DEFAULT_ACTIVE_DESCRIPTION =
  'Controls whether this record is available for operational use.';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: string;
  className?: string;
  /** Tighter card for stacked lists (e.g. document type pickers). */
  density?: 'default' | 'compact';
  /**
   * `toolbar` — single pill row next to search (no helper text).
   * `card` — bordered card with optional description (default).
   */
  variant?: 'card' | 'toolbar';
};

export function FormToggleSwitch({
  checked,
  onChange,
  label,
  description,
  className,
  density = 'default',
  variant = 'card',
}: Props) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const showDescription = variant === 'card' && Boolean(description);

  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      onClick={() => onChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onChange(!checked);
        }
      }}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-hwseta-green/40 focus-visible:ring-offset-2',
        checked
          ? 'border-hwseta-green bg-hwseta-green shadow-[0_4px_12px_rgba(1,127,63,0.35)]'
          : variant === 'toolbar'
            ? 'border-slate-200/90 bg-slate-100'
            : 'border-slate-300 bg-slate-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );

  if (variant === 'toolbar') {
    return (
      <div
        className={cn(
          'flex w-max max-w-full shrink-0 items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-2',
          'min-h-[42px]',
          className,
        )}
      >
        <p id={labelId} className="whitespace-nowrap text-sm font-semibold text-slate-800">
          {label}
        </p>
        {track}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        density === 'compact' ? 'px-3 py-2.5' : 'px-4 py-3.5',
        className,
      )}
    >
      <div className="flex w-full items-center justify-between gap-4">
        <div className="min-w-0 flex-1" id={labelId}>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {showDescription ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
        {track}
      </div>
    </div>
  );
}

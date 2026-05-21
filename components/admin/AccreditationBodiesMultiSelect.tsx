'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { accreditationBodyOptionLabel } from '@/lib/accreditationBodyUi';
import type { AccreditationBodyRow } from '@/types/programmeSetup';

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const inputClass = adminFormTheme.input;

type Props = {
  rows: AccreditationBodyRow[];
  loading: boolean;
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

export default function AccreditationBodiesMultiSelect({
  rows,
  loading,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const summary = useMemo(() => {
    if (loading) return 'Loading accreditation bodies…';
    if (value.length === 0) return 'Select accreditation bodies…';
    if (value.length === 1) {
      const row = rows.find((r) => Number(r.accreditationBodyId) === value[0]);
      return row ? accreditationBodyOptionLabel(row) : '1 selected';
    }
    return `${value.length} selected`;
  }, [loading, value, rows]);

  const toggle = (rawId: number | string | undefined) => {
    if (rawId == null) return;
    const id = typeof rawId === 'number' ? rawId : Number(rawId);
    if (!Number.isFinite(id)) return;
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          inputClass,
          'flex w-full items-center justify-between gap-2 text-left',
          (disabled || loading) && 'cursor-not-allowed opacity-60',
        )}
        onClick={() => !disabled && !loading && setOpen((o) => !o)}
        disabled={disabled || loading}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 truncate">{summary}</span>
        <ChevronDownIcon
          className={cn('h-4 w-4 shrink-0 text-slate-500 transition', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && (
        <div
          className="absolute z-[70] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
          aria-multiselectable
        >
          {rows.length === 0 && !loading ? (
            <p className="px-3 py-2 text-sm text-slate-500">No accreditation bodies found.</p>
          ) : (
            rows.map((row) => {
              const idRaw = row.accreditationBodyId;
              if (idRaw == null) return null;
              const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
              if (!Number.isFinite(id)) return null;
              const checked = value.includes(id);
              return (
                <label
                  key={String(id)}
                  className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-emerald-50/30"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-hwseta-green focus:ring-hwseta-green"
                    checked={checked}
                    onChange={() => toggle(id)}
                  />
                  <span className="text-slate-800">{accreditationBodyOptionLabel(row)}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

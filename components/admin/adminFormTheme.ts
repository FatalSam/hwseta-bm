/**
 * Shared form + modal styling for admin programme setup / framework.
 * Brand: green #017f3f, red #d81920, yellow #feca07 (Tailwind: hwseta-*).
 */

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-hwseta-green focus:ring-2 focus:ring-hwseta-green/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

/** Same as `field` but extra right padding for the dropdown chevron (avoids `px-3` clipping the icon). */
const selectField =
  'w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-hwseta-green focus:ring-2 focus:ring-hwseta-green/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

/** Chevron + appearance reset — see `.hwseta-select-native` in `app/globals.css`. */
const selectChevron = 'hwseta-select-native';

/** Canonical native select (aligned with manage-mybeneficiary `fieldInput` + visible chevron). */
const selectBase = `${selectField} ${selectChevron}`;

export const adminFormTheme = {
  field,
  input: field,
  select: selectBase,
  /** Same as `select` — toolbar filters use the same control as modals. */
  selectPill: selectBase,
  /** Pagination / compact row — same visuals, width content-driven. */
  selectInline: `${selectBase} w-auto min-w-[4.25rem]`,
  textarea: `${field} min-h-[88px] resize-y`,

  label: 'mb-1.5 block text-sm font-semibold text-slate-700',
  /** Blue asterisk to match reference “required” indicator */
  required: 'ml-0.5 font-semibold text-sky-600',

  btnPrimary:
    'inline-flex items-center justify-center gap-2 rounded-2xl bg-hwseta-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-hwseta-green-dark disabled:pointer-events-none disabled:opacity-50',
  btnSecondary:
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50',
  btnDanger:
    'inline-flex items-center justify-center gap-2 rounded-2xl bg-hwseta-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-hwseta-red-dark disabled:opacity-50',
  btnGhost:
    'rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700',

  /** Semi-transparent layer only; parent handles scroll/centering. */
  modalBackdrop: 'fixed inset-0 bg-slate-950/45 backdrop-blur-[2px]',
  modalPanelSm: 'relative w-full max-w-lg overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.28)]',
  modalPanelWide:
    'relative w-full max-w-4xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.28)]',
  modalHeader: 'flex items-start justify-between border-b border-slate-200 px-6 py-5',
  modalHeaderIcon:
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-hwseta-green to-hwseta-green-dark text-white shadow-[0_10px_24px_rgba(1,127,63,0.25)]',
  modalKicker: 'text-xs font-semibold uppercase tracking-wide text-hwseta-green',
  modalTitle: 'mt-1 text-2xl font-bold text-slate-900',
  modalSubtitle: 'mt-1 text-sm text-slate-500',
  modalBody: 'grid max-h-[min(78vh,640px)] gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2',
  modalFooter: 'flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4',

  tabBar: 'grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 p-2 md:col-span-2',
  tabActive:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-hwseta-green px-4 py-3 text-sm font-semibold text-white shadow-sm',
  tabInactive:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100',

  docBox: 'max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/30 p-3',
} as const;

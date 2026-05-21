import {
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaFolderOpen,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';

/** Date and time for timelines and server timestamps (en-ZA). Date-only `yyyy-MM-dd` is treated as local midnight. */
export function formatComplaintDisplayDateTime(value: string | null | undefined): string {
  if (value == null || value === '') return '—';
  const s = typeof value === 'string' ? value.trim() : String(value).trim();
  if (!s) return '—';

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (ymd && !s.includes('T') && !s.includes(' ')) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const day = Number(ymd[3]);
    const localMidnight = new Date(y, m - 1, day, 0, 0, 0, 0);
    if (!Number.isNaN(localMidnight.getTime())) {
      return localMidnight.toLocaleString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateComplaintText(value: string, maxLen: number): string {
  const t = value.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trim()}…`;
}

export function getComplaintStatusPresentation(
  description: string | null | undefined,
  code: string | null | undefined,
): { Icon: IconType; iconClass: string } {
  const raw = `${description ?? ''} ${code ?? ''}`.toLowerCase();
  if (/\bopen\b/.test(raw)) {
    return { Icon: FaFolderOpen, iconClass: 'text-emerald-600' };
  }
  if (/\b(closed|resolved|withdrawn)\b/.test(raw)) {
    return { Icon: FaCheckCircle, iconClass: 'text-slate-500' };
  }
  if (/\b(review|progress|awaiting|pending)\b/.test(raw)) {
    return { Icon: FaClock, iconClass: 'text-amber-600' };
  }
  return { Icon: FaClipboardList, iconClass: 'text-slate-400' };
}

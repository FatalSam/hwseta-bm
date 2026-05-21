'use client';

import {
  FaChevronRight,
  FaComments,
  FaFileAlt,
  FaHistory,
  FaInfoCircle,
} from 'react-icons/fa';
import type { BeneficiaryComplaintListItem } from '@/types/beneficiaryComplaints';
import { cn } from '@/ultis/cn';
import {
  formatComplaintDisplayDateTime,
  getComplaintStatusPresentation,
  truncateComplaintText,
} from '@/ultis/complaintsDisplay';

export type BeneficiaryComplaintsTableProps = {
  items: BeneficiaryComplaintListItem[];
  isLoading: boolean;
  /** When true, rows toggle selection and show timeline affordances (beneficiary portal). */
  interactive?: boolean;
  selectedComplaintId?: string | null;
  onToggleRow?: (complaintId: string) => void;
  showViewTimelineHint?: boolean;
  /** Section heading (e.g. "My complaints"); omit in compact/admin embeds. */
  title?: string;
  subtitle?: string;
  showCount?: boolean;
  emptyMessage: string;
  emptyHint?: string;
};

export default function BeneficiaryComplaintsTable({
  items,
  isLoading,
  interactive = false,
  selectedComplaintId = null,
  onToggleRow,
  showViewTimelineHint = false,
  title,
  subtitle,
  showCount = true,
  emptyMessage,
  emptyHint,
}: BeneficiaryComplaintsTableProps) {
  return (
    <>
      {(title || subtitle || showCount) && (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          {title || subtitle ? (
            <div>
              {title ? <h2 className="text-xl font-bold text-gray-900">{title}</h2> : null}
              {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
            </div>
          ) : (
            <div />
          )}
          {showCount && !isLoading ? (
            <p className="text-sm font-medium text-slate-600">{items.length} complaint(s)</p>
          ) : null}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#124a3f] border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 py-14 text-center">
          <p className="text-sm text-gray-600">{emptyMessage}</p>
          {emptyHint ? <p className="mt-2 text-xs text-gray-500">{emptyHint}</p> : null}
        </div>
      ) : (
        <>
          {interactive && showViewTimelineHint ? (
            <div
              className="mb-4 flex gap-3 rounded-xl border border-emerald-200/90 bg-emerald-50/60 px-3 py-3 text-sm text-emerald-950 sm:items-center sm:px-4"
              role="note"
            >
              <FaInfoCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
              <p>
                <span className="font-semibold">View complaint:</span> click any row (or press Enter when focused) to
                open the complaint details and activity timeline.
              </p>
            </div>
          ) : null}

          <div className="max-h-[min(480px,70vh)] overflow-auto rounded-xl border border-slate-100 shadow-[inset_0_1px_0_0_rgba(15,23,42,0.04)] [scrollbar-gutter:stable]">
            <table className="min-w-[920px] divide-y divide-slate-100 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex items-center gap-2">
                      <FaFileAlt className="h-3.5 w-3.5 opacity-90" aria-hidden />
                      Reference
                    </span>
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Complaint type
                  </th>
                  <th scope="col" className="min-w-[140px] px-3 py-3">
                    Training provider
                  </th>
                  <th scope="col" className="min-w-[140px] px-3 py-3">
                    Employer
                  </th>
                  <th scope="col" className="min-w-[180px] px-3 py-3">
                    <span className="inline-flex items-center gap-2">
                      <FaHistory className="h-3.5 w-3.5 opacity-90" aria-hidden />
                      Last activity
                    </span>
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-2">
                      <FaComments className="h-3.5 w-3.5 opacity-90" aria-hidden />
                      Activities
                    </span>
                  </th>
                  <th scope="col" className="w-12 whitespace-nowrap px-2 py-3 text-center">
                    <span className="sr-only">View timeline</span>
                    <FaChevronRight className="mx-auto h-3.5 w-3.5 opacity-90" aria-hidden />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((row, rowIndex) => {
                  const labelRef =
                    row.complaintReference ?? truncateComplaintText(row.beneficiaryComplaintId, 12);
                  const statusVisual = getComplaintStatusPresentation(
                    row.complaintsStatusDescription,
                    row.complaintsStatus,
                  );
                  const StatusIcon = statusVisual.Icon;
                  const rowSelected = interactive && selectedComplaintId === row.beneficiaryComplaintId;
                  return (
                    <tr
                      key={row.beneficiaryComplaintId}
                      tabIndex={interactive ? 0 : undefined}
                      title={
                        interactive
                          ? 'Click to view this complaint'
                          : undefined
                      }
                      aria-label={interactive ? `View complaint ${labelRef}` : undefined}
                      className={cn(
                        interactive &&
                          'group cursor-pointer border-l-4 border-transparent transition-colors',
                        rowIndex % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40',
                        interactive && 'hover:border-[#124a3f] hover:bg-emerald-50/80',
                        rowSelected && 'border-[#124a3f] bg-emerald-100/45',
                        !interactive && 'hover:bg-emerald-50/30',
                      )}
                      onClick={
                        interactive && onToggleRow
                          ? () => onToggleRow(row.beneficiaryComplaintId)
                          : undefined
                      }
                      onKeyDown={
                        interactive && onToggleRow
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onToggleRow(row.beneficiaryComplaintId);
                              }
                            }
                          : undefined
                      }
                    >
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                          <FaFileAlt className="h-3.5 w-3.5 shrink-0 text-[#124a3f]/80" aria-hidden />
                          {row.complaintReference ?? truncateComplaintText(row.beneficiaryComplaintId, 12)}
                        </span>
                      </td>
                      <td className="max-w-[180px] px-3 py-2.5 text-slate-700">
                        <span className="flex items-start gap-2">
                          <StatusIcon
                            className={cn('mt-0.5 h-4 w-4 shrink-0', statusVisual.iconClass)}
                            aria-hidden
                          />
                          <span className="line-clamp-2 leading-snug">
                            {row.complaintsStatusDescription ?? row.complaintsStatus ?? '—'}
                          </span>
                        </span>
                      </td>
                      <td className="min-w-[160px] px-3 py-2.5 align-top text-slate-700">
                        <span className="block break-words leading-snug">
                          {row.complaintTypeName || row.complaintType || '—'}
                        </span>
                      </td>
                      <td className="min-w-[140px] px-3 py-2.5 align-top text-slate-700">
                        <span className="block break-words leading-snug">{row.trainingProviderName ?? '—'}</span>
                      </td>
                      <td className="min-w-[140px] px-3 py-2.5 align-top text-slate-700">
                        <span className="block break-words leading-snug">{row.employerName ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <span className="flex gap-2">
                          <FaHistory className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                          <span>
                            <span className="block text-xs text-slate-500">
                              {formatComplaintDisplayDateTime(row.lastVisibleActivityDate || row.dateCreated)}
                            </span>
                            <span className="mt-1 line-clamp-2 block text-sm">
                              {row.lastVisibleActivityMessagePreview
                                ? truncateComplaintText(row.lastVisibleActivityMessagePreview, 120)
                                : row.lastVisibleActivityType || '—'}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-700">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <FaComments className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                          {row.visibleActivityCount ?? '—'}
                        </span>
                      </td>
                      <td className="w-12 px-2 py-2.5 text-center align-middle">
                        <FaChevronRight
                          className={cn(
                            'mx-auto h-4 w-4 shrink-0 text-slate-300 transition-colors',
                            interactive && 'group-hover:text-[#124a3f]/90',
                            rowSelected && 'text-[#124a3f]',
                          )}
                          aria-hidden
                        />
                        <span className="sr-only">View timeline</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

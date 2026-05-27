"use client";

import { useMemo } from "react";
import { cn } from "@/ultis/cn";
import type { BeneficiaryProfileOptions } from "@/types/beneficiaryProfile";
import type { IconType } from "react-icons";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaChevronDown,
  FaGraduationCap,
  FaHourglassHalf,
  FaMinusCircle,
  FaPlus,
  FaSpinner,
  FaTimesCircle,
  FaTrashAlt,
} from "react-icons/fa";
import type { ProgrammeCompletionStatus, ProgrammeLinkDraft } from "@/components/beneficiary-profile/programmeLinkMapping";

type MyProgrammesListCardProps = {
  programmeLinks: ProgrammeLinkDraft[];
  programmeOptions: BeneficiaryProfileOptions;
  qualificationNameById: Map<string, string>;
  /** Profile tab: full row actions; dashboard: Edit only (add handled by header button). */
  actionsMode: "full" | "editOnly";
  programmeDeletingClientId?: string | null;
  isSavingProgrammeDraft?: boolean;
  onEditRow: (clientId: string) => void;
  onRemoveRow?: (row: ProgrammeLinkDraft) => void;
  showAddProgrammeButton?: boolean;
  onAddProgramme?: () => void;
};

function formatDateForDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  const iso = parsed.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function getDateSortValue(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getProgrammeStatusUi(status: ProgrammeCompletionStatus): {
  label: string;
  icon: IconType;
  badgeClassName: string;
  iconClassName: string;
} {
  switch (status) {
    case "Completed":
      return {
        label: "Completed",
        icon: FaCheckCircle,
        badgeClassName: "bg-[#017f3f]/10 text-[#017f3f]",
        iconClassName: "text-[#017f3f]",
      };
    case "In Progress":
      return {
        label: "In Progress",
        icon: FaHourglassHalf,
        badgeClassName: "bg-sky-50 text-sky-700",
        iconClassName: "text-sky-700",
      };
    case "Not Completed":
      return {
        label: "Not Completed",
        icon: FaTimesCircle,
        badgeClassName: "bg-red-50 text-red-600",
        iconClassName: "text-red-600",
      };
    case "Withdrawn":
      return {
        label: "Withdrawn",
        icon: FaMinusCircle,
        badgeClassName: "bg-amber-50 text-amber-700",
        iconClassName: "text-amber-700",
      };
    case "Dropped Out":
      return {
        label: "Dropped Out",
        icon: FaExclamationTriangle,
        badgeClassName: "bg-orange-50 text-orange-700",
        iconClassName: "text-orange-700",
      };
    default:
      return {
        label: "Awaiting response",
        icon: FaSpinner,
        badgeClassName: "bg-[#feca07]/20 text-[#8a6a00]",
        iconClassName: "text-[#8a6a00]",
      };
  }
}

const PROGRAMME_GRID_STATUS_COUNT_ORDER: (ProgrammeCompletionStatus | "__pending__")[] = [
  "Completed",
  "In Progress",
  "Not Completed",
  "Withdrawn",
  "Dropped Out",
  "__pending__",
];

export default function MyProgrammesListCard({
  programmeLinks,
  programmeOptions,
  qualificationNameById,
  actionsMode,
  programmeDeletingClientId = null,
  isSavingProgrammeDraft = false,
  onEditRow,
  onRemoveRow,
  showAddProgrammeButton = false,
  onAddProgramme,
}: MyProgrammesListCardProps) {
  const programmeCompletionStatusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of programmeLinks) {
      const key = row.completedProgramme === "" ? "__pending__" : row.completedProgramme;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [programmeLinks]);
  const sortedProgrammeLinks = useMemo(
    () =>
      [...programmeLinks].sort((a, b) => {
        const dateDelta = getDateSortValue(b.dateCreated) - getDateSortValue(a.dateCreated);
        if (dateDelta !== 0) return dateDelta;

        return String(b.beneficiaryProgrammeLinkId ?? "").localeCompare(String(a.beneficiaryProgrammeLinkId ?? ""));
      }),
    [programmeLinks],
  );

  const getProgrammeName = (row: ProgrammeLinkDraft): string =>
    programmeOptions.programmes.find((option) => String(option.id) === row.programmeId)?.name ||
    row.programmeName ||
    "Not provided";

  const getQualificationName = (row: ProgrammeLinkDraft): string =>
    (row.qualificationId ? qualificationNameById.get(row.qualificationId) : undefined) ||
    row.qualificationName ||
    "Not provided";

  const getTrainingProviderName = (row: ProgrammeLinkDraft): string =>
    programmeOptions.trainingProviders.find((option) => String(option.id) === row.trainingProviderId)?.name ||
    row.trainingProviderName ||
    "Not provided";

  const getEmployerName = (row: ProgrammeLinkDraft): string =>
    programmeOptions.employers.find((option) => String(option.id) === row.employerId)?.name ||
    row.employerName ||
    "Not provided";

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h4 className="text-base font-semibold text-slate-900">My Programmes</h4>
          </div>
          <div className="text-xs font-medium text-slate-500 sm:text-right">
            {programmeLinks.length === 0
              ? "No programmes in the list yet"
              : `${programmeLinks.length} ${programmeLinks.length === 1 ? "programme" : "programmes"} found`}
          </div>
        </div>
      </div>

      {programmeLinks.length > 0 ? (
        <div className="border-b border-slate-200 bg-white px-5 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {PROGRAMME_GRID_STATUS_COUNT_ORDER.map((statusKey) => {
                const count = programmeCompletionStatusCounts.get(statusKey) ?? 0;
                if (count === 0) return null;
                const ui = getProgrammeStatusUi(statusKey === "__pending__" ? "" : statusKey);
                const StatusIcon = ui.icon;
                return (
                  <span
                    key={statusKey}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-slate-100/80 px-3 py-1.5 text-xs font-semibold shadow-sm",
                      ui.badgeClassName,
                    )}
                  >
                    <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", ui.iconClassName)} />
                    <span>{ui.label}</span>
                    <span className="tabular-nums text-slate-600">{count}</span>
                  </span>
                );
              })}
            </div>
            {showAddProgrammeButton && onAddProgramme ? (
              <button
                type="button"
                onClick={onAddProgramme}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#017f3f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016533] sm:self-auto"
              >
                <FaPlus className="h-3.5 w-3.5" aria-hidden />
                Manage Programmes
              </button>
            ) : null}
          </div>
        </div>
      ) : showAddProgrammeButton && onAddProgramme ? (
        <div className="border-b border-slate-200 bg-white px-5 py-3 sm:px-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onAddProgramme}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#017f3f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016533]"
            >
              <FaPlus className="h-3.5 w-3.5" aria-hidden />
              Manage Programmes
            </button>
          </div>
        </div>
      ) : null}

      <div className="px-3 py-4 sm:px-5">
        {programmeLinks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-slate-500">
            <div className="mx-auto flex max-w-md flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#017f3f]/10 text-[#017f3f]">
                <FaGraduationCap className="h-7 w-7" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">No programme links added yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedProgrammeLinks.map((row, index) => {
              const statusUi = getProgrammeStatusUi(row.completedProgramme);
              const StatusIcon = statusUi.icon;
              const programmeName = getProgrammeName(row);
              const qualificationName = getQualificationName(row);
              const trainingProviderName = getTrainingProviderName(row);
              const employerName = getEmployerName(row);
              const startDate = formatDateForDisplay(row.startDate) || "No start date";
              const endDate = formatDateForDisplay(row.endDate) || "No end date";
              const dateCreated = formatDateForDisplay(row.dateCreated) || "Not provided";
              const createdBy = row.createdBy || row.createdByUserId || "Not provided";

              return (
                <details
                  key={row.clientId}
                  open={index === 0}
                  className={cn(
                    "group rounded-2xl border border-slate-200 shadow-sm transition hover:border-[#017f3f]/30 hover:shadow-md",
                    index % 2 === 0 ? "bg-white" : "bg-emerald-50/40",
                  )}
                >
                  <summary className="flex cursor-pointer list-none flex-col gap-4 px-4 py-4 marker:hidden sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex min-w-0 gap-3">
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#017f3f]/10 text-sm font-bold text-[#017f3f]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 sm:text-base">{programmeName}</p>
                        <p className="mt-1 text-sm text-slate-600">{qualificationName}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                          statusUi.badgeClassName,
                        )}
                      >
                        <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", statusUi.iconClassName)} />
                        <span>{statusUi.label}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        View details
                        <FaChevronDown className="h-3 w-3 transition group-open:rotate-180" aria-hidden />
                      </span>
                    </div>
                  </summary>

                  <div
                    className={cn(
                      "border-t border-slate-100 px-4 py-4 sm:px-5",
                      index % 2 === 0 ? "bg-slate-50/70" : "bg-emerald-50/60",
                    )}
                  >
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Training Provider
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">{trainingProviderName}</dd>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Employer</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">{employerName}</dd>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Documents</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">
                          {row.proofFiles.length} {row.proofFiles.length === 1 ? "document" : "documents"}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Programme Start Date
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">{startDate}</dd>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Programme End Date
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">{endDate}</dd>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date Created</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">{dateCreated}</dd>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created By</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">{createdBy}</dd>
                      </div>
                    </dl>

                    {actionsMode === "full" && onRemoveRow ? (
                      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={programmeDeletingClientId === row.clientId}
                          onClick={() => onEditRow(row.clientId)}
                          className="inline-flex items-center justify-center rounded-xl border border-[#017f3f]/20 bg-white px-4 py-2 text-sm font-semibold text-[#017f3f] shadow-sm transition hover:bg-[#017f3f]/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit programme
                        </button>
                        {row.completedProgramme === "Completed" ? (
                          <span
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-400"
                            title="Completed programmes cannot be removed"
                            aria-label="Delete not available for completed programmes"
                          >
                            Delete unavailable
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={programmeDeletingClientId === row.clientId || isSavingProgrammeDraft}
                            onClick={() => void onRemoveRow(row)}
                            className={cn(
                              "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50",
                              (programmeDeletingClientId === row.clientId || isSavingProgrammeDraft) &&
                                "cursor-not-allowed opacity-60 hover:bg-white",
                            )}
                            title="Remove programme from list"
                            aria-label="Remove programme row"
                          >
                            {programmeDeletingClientId === row.clientId ? (
                              <FaSpinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <FaTrashAlt className="h-4 w-4" />
                            )}
                            Remove
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/components/ui/notification";
import { cn } from "@/ultis/cn";
import { SyncfusionIsoDatePicker } from "@/components/ui/SyncfusionIsoDatePicker";
import apiClient from "@/ultis/apiClient";
import {
  createBeneficiaryProgrammeLink,
  downloadBeneficiaryProgrammeLinkDocument,
  deleteBeneficiaryProgrammeLinkDocument,
  deleteBeneficiaryProgrammeLink,
  getProgrammeCompletionStatuses,
  getProgrammeCompletionStatusReasons,
  getBeneficiaryProfileOptions,
  getMyBeneficiaryProfile,
  listStipendFrequencies,
  listBeneficiaryProgrammeLinkDocuments,
  listBeneficiaryProgrammeLinks,
  replaceBeneficiaryProgrammeLinkDocumentFile,
  saveMyBeneficiaryProfile,
  uploadBeneficiaryProgrammeLinkDocuments,
  updateBeneficiaryProgrammeLink,
} from "@/api/beneficiaryProfile";
import {
  getAdminBeneficiary,
  listAdminBeneficiaryProgrammeLinks,
  updateAdminBeneficiary,
} from "@/api/adminBeneficiaries";
import { listQualifications } from "@/api/programmeSetup";
import { adminFormTheme } from "@/components/admin/adminFormTheme";
import AdminBeneficiaryWorkspacePanel from "@/components/admin/AdminBeneficiaryWorkspacePanel";
import MyProgrammesListCard from "@/components/beneficiary-profile/MyProgrammesListCard";
import { environment } from "@/config/environment";
import type { AdminBeneficiarySavePayload } from "@/types/admin-beneficiaries";
import type {
  BeneficiaryEntityId,
  BeneficiaryProfileOptions,
  BeneficiaryProfileRecord,
  BeneficiaryProfileSavePayload,
  BeneficiaryProgrammeLink,
  BeneficiaryProgrammeLinkPayload,
  ProgrammeCompletionStatusOption,
  ProgrammeCompletionStatusReasonOption,
} from "@/types/beneficiaryProfile";
import {
  hydrateBeneficiaryProgrammeLinks,
  mapLinkDocumentToEvidenceFile,
  type ProgrammeCompletionStatus,
  type ProgrammeEvidenceFile,
  type ProgrammeLinkDraft,
  type ProgrammeProofUploadPreference,
} from "@/components/beneficiary-profile/programmeLinkMapping";
import type { IconType } from "react-icons";
import {
  FaUser,
  FaExclamationTriangle,
  FaSave,
  FaMapMarkerAlt,
  FaBriefcase,
  FaIdCard,
  FaCamera,
  FaUpload,
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaChevronRight,
  FaGraduationCap,
  FaCheck,
  FaPlus,
  FaSpinner,
  FaFileSignature,
  FaExternalLinkAlt,
  FaTimes,
} from "react-icons/fa";

type ApiOption = { id?: number | string; name?: string; code?: string; postalCode?: string };
type ProfilePageProps = {
  adminMode?: boolean;
  adminBeneficiaryId?: string | number | null;
};
type ProfileTabId = "personal" | "address" | "programmes" | "employment" | "submit";
type EmploymentSelection = "" | "Currently Employed" | "Not employed" | "Volunteering";
type ProgrammeDraftCustomField = "programme" | "qualification" | "trainingProvider" | "employer";
type SearchableOption = { value: string; label: string };

/** Dropdown `name` from `GET /api/Dropdowns/stipend-frequencies` — maps to `stipend: false`. */
const STIPEND_PAY_FREQUENCY_NONE = "I did not receive a stipend";

function stipendReceivedFromPayFrequency(frequency: string): boolean {
  const trimmed = frequency.trim();
  if (!trimmed) return false;
  return trimmed.toLowerCase() !== STIPEND_PAY_FREQUENCY_NONE.toLowerCase();
}

const EMPTY_PROGRAMME_OPTIONS: BeneficiaryProfileOptions = {
  programmes: [],
  trainingProviders: [],
  employers: [],
};

const DEFAULT_PROGRAMME_DRAFT_CUSTOM_FIELDS: Record<ProgrammeDraftCustomField, boolean> = {
  programme: false,
  qualification: false,
  trainingProvider: false,
  employer: false,
};

const BENEFICIARY_TERMS_SECTIONS = [
  {
    title: "Beneficiary Registration and Profile Information",
    content:
      "When you register on the HWSETA Beneficiary Portal, you agree to provide accurate, complete, and up-to-date information. You are responsible for keeping your login details secure and for reviewing your profile information before submission.",
  },
  {
    title: "Use of Personal Information",
    content:
      "Your personal information is collected and stored so that HWSETA can process your profile, assess beneficiary-related requests, and improve service delivery. Information submitted through the portal may be retained for administrative, reporting, compliance, and support purposes.",
  },
  {
    title: "Information Sharing",
    content:
      "HWSETA may share your information with authorised internal teams, approved partners, training providers, employers, funders, or other relevant stakeholders where required to support the services, programmes, or opportunities linked to your profile.",
  },
  {
    title: "Data Security",
    content:
      "We apply reasonable technical and administrative safeguards to protect your information against unauthorised access, misuse, loss, or disclosure. While every reasonable effort is made to secure your data, no internet-based service can guarantee absolute security.",
  },
  {
    title: "Access, Review, and Correction",
    content:
      "You may request access to the information held about you, and you may request corrections where information is inaccurate or incomplete. Portal users are expected to keep their own details accurate and updated wherever possible.",
  },
  {
    title: "Changes to These Terms",
    content:
      "HWSETA may update these Terms and Conditions from time to time. Continued use of the portal after such updates means you accept the latest version that applies at the time of submission.",
  },
  {
    title: "Contact Information",
    content:
      "If you have questions about these Terms and Conditions or about how your information is handled, please contact HWSETA at hwseta@hwseta.org.za.",
  },
];

function createProgrammeDraft(): ProgrammeLinkDraft {
  return {
    clientId: `programme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    programmeId: "",
    programmeName: "",
    qualificationId: "",
    qualificationName: "",
    trainingProviderId: "",
    trainingProviderName: "",
    employerId: "",
    employerName: "",
    startDate: "",
    endDate: "",
    programmeCompletionStatusId: "",
    completedProgramme: "",
    proofUploadPreference: "",
    completionReasonId: "",
    proofFiles: [],
    deletedDocumentIds: [],
    incompleteReason: "",
    otherReasonText: "",
    notes: "",
    createdByUserId: "",
    createdBy: "",
    dateCreated: "",
    proofUploadDocumentTitle: "",
  };
}

function normalizeString(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function nullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeId(value: string): BeneficiaryEntityId | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

function formatDateForInput(value: unknown): string {
  const raw = normalizeString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function formatDateForApi(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}T00:00:00`).toISOString();
  return trimmed;
}

function formatDocumentUploadedDisplay(iso: string | null | undefined): string {
  const raw = normalizeString(iso);
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return raw || "—";
}

function shouldCaptureProgrammeCompletion(): boolean {
  return true;
}

function isProgrammeStatusNeedingReason(status: ProgrammeCompletionStatus): boolean {
  return status === "Not Completed" || status === "Withdrawn" || status === "Dropped Out";
}

function syncProgrammeOutcomeState(row: ProgrammeLinkDraft): ProgrammeLinkDraft {
  if (row.completedProgramme === "Completed") {
    return {
      ...row,
      proofUploadPreference:
        row.proofUploadPreference ||
        (row.proofFiles.length > 0 ? "upload-now" : "upload-later"),
      completionReasonId: "",
      incompleteReason: "",
      otherReasonText: "",
    };
  }

  if (isProgrammeStatusNeedingReason(row.completedProgramme)) {
    return {
      ...row,
    };
  }

  return {
    ...row,
    proofUploadPreference: "",
    completionReasonId: "",
    incompleteReason: "",
    otherReasonText: "",
  };
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} bytes`;
}

function resolveProgrammeEvidenceTitle(file: ProgrammeEvidenceFile, pendingBatchTitle: string): string {
  if (file.file instanceof File) {
    const pending = normalizeString(pendingBatchTitle);
    return pending || "—";
  }
  const fromApi = normalizeString(file.documentTitle);
  return fromApi || "—";
}

function buildProgrammeProofDocumentTitle(programmeName: string, idPassport: string): string {
  const programmePrefix = normalizeString(programmeName).slice(0, 3);
  const idPassportValue = normalizeString(idPassport);

  if (!programmePrefix || !idPassportValue) return "";
  return `${programmePrefix}_${idPassportValue}`;
}

function proofFilePersistedOnServer(file: ProgrammeEvidenceFile): boolean {
  return file.beneficiaryProgrammeLinkDocumentId != null && !(file.file instanceof File);
}

function isProofNewUploadBlockedByMissingTitle(
  draft: Pick<ProgrammeLinkDraft, "completedProgramme" | "proofUploadPreference">,
  generatedDocumentTitle: string,
): boolean {
  return (
    draft.completedProgramme === "Completed" &&
    draft.proofUploadPreference === "upload-now" &&
    !normalizeString(generatedDocumentTitle)
  );
}

function canRemoveProofEvidenceFile(completedProgramme: ProgrammeCompletionStatus, file: ProgrammeEvidenceFile): boolean {
  if (file.file instanceof File) return true;
  if (completedProgramme !== "Completed") return true;
  return !proofFilePersistedOnServer(file);
}

function normalizeSignatureDataUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return trimmed;
  return `data:image/png;base64,${trimmed}`;
}

function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let year = 0;
  let month = 0;
  let day = 0;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    [year, month, day] = trimmed.split("-").map((part) => parseInt(part, 10));
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    [day, month, year] = trimmed.split("/").map((part) => parseInt(part, 10));
  } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    [year, month, day] = trimmed.split("/").map((part) => parseInt(part, 10));
  } else {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function computeAgeFromDateOfBirth(value: string): number | null {
  const dob = parseDateInput(value);
  if (!dob) return null;

  const today = new Date();
  if (dob > today) return null;

  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function isAtLeastAge(value: string, minimumAge: number): boolean {
  const age = computeAgeFromDateOfBirth(value);
  return age != null && age >= minimumAge;
}

function yesNoToBoolean(value: string): boolean {
  return value.trim().toLowerCase() === "yes";
}

function booleanToYesNo(value: unknown): string {
  return value === true ? "Yes" : value === false ? "No" : "";
}

const HIDDEN_CONTACT_NAME_FALLBACK = "N/A";
const HIDDEN_CONTACT_PHONE_FALLBACK = "0000000000";
const HIDDEN_CONTACT_EMAIL_FALLBACK = "notprovided@example.com";

function pickFirstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return "";
}

function pickFirstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(normalizeString(value));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function pickFirstBoolean(record: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    const normalized = normalizeString(value).toLowerCase();
    if (normalized === "true" || normalized === "yes" || normalized === "1") return true;
    if (normalized === "false" || normalized === "no" || normalized === "0") return false;
  }
  return null;
}

function hasBeneficiaryProfileData(profile: BeneficiaryProfileRecord): boolean {
  return (
    pickFirstString(profile, ["firstName", "FirstName"]) !== "" ||
    pickFirstString(profile, ["lastName", "LastName", "surname", "Surname"]) !== "" ||
    pickFirstString(profile, ["idNumber_Passport", "IdNumber_Passport", "idNumberPassport"]) !== "" ||
    pickFirstString(profile, ["cellNo", "CellNo", "cellphoneNumber", "CellphoneNumber"]) !== "" ||
    pickFirstString(profile, ["emailAddress", "EmailAddress", "email", "Email"]) !== "" ||
    pickFirstString(profile, ["physicalAddress1", "PhysicalAddress1"]) !== "" ||
    pickFirstString(profile, ["gender", "Gender"]) !== "" ||
    pickFirstString(profile, ["raceGroup", "RaceGroup"]) !== ""
  );
}

function pickProgrammeLinksFromProfile(profile: BeneficiaryProfileRecord): BeneficiaryProgrammeLink[] {
  const candidates = [
    profile.programmeLinks,
    profile.beneficiaryProgrammeLinks,
    profile.programLinks,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as BeneficiaryProgrammeLink[];
    }
  }
  return [];
}

function getProgrammeRowDisplayName(row: ProgrammeLinkDraft, programmeOptions: BeneficiaryProfileOptions): string {
  const name =
    programmeOptions.programmes.find((option) => String(option.id) === row.programmeId)?.name ||
    row.programmeName ||
    "";
  const trimmed = name.trim();
  return trimmed || "Programme";
}

function isProgrammeRowBlank(row: ProgrammeLinkDraft): boolean {
  return [
    row.programmeId,
    row.programmeName,
    row.qualificationId,
    row.qualificationName,
    row.trainingProviderId,
    row.trainingProviderName,
    row.employerId,
    row.employerName,
    row.startDate,
    row.endDate,
    row.programmeCompletionStatusId,
    row.completedProgramme,
    row.proofUploadPreference,
    row.completionReasonId,
    row.incompleteReason,
    row.otherReasonText,
    row.notes,
  ].every((value) => normalizeString(value) === "");
}

// Google Maps JS (Places Autocomplete) — minimal types
type AddressComponent = { long_name: string; types: string[] };
type GooglePlace = {
  formatted_address?: string;
  address_components?: AddressComponent[];
};
type GoogleAutocomplete = {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => GooglePlace;
};
type GoogleMapsApi = {
  maps: {
    event: { clearInstanceListeners: (instance: unknown) => void };
    places: {
      Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => GoogleAutocomplete;
    };
  };
};

function profileSelectClass(hasError: boolean, variant?: "errorBg") {
  return cn(
    adminFormTheme.select,
    hasError &&
      (variant === "errorBg"
        ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
        : "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"),
  );
}

function profileInputClass(hasError: boolean) {
  return cn(
    "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm text-slate-800 transition-all duration-200 focus:outline-none focus:ring-4",
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
      : "border-gray-200 focus:border-[#017f3f] focus:ring-[#017f3f]/10",
  );
}

function getProgrammeDraftCustomFieldState(
  draft: ProgrammeLinkDraft,
): Record<ProgrammeDraftCustomField, boolean> {
  return {
    programme: !draft.programmeId && !!draft.programmeName.trim(),
    qualification: !draft.qualificationId && !!draft.qualificationName.trim(),
    trainingProvider: !draft.trainingProviderId && !!draft.trainingProviderName.trim(),
    employer: !draft.employerId && !!draft.employerName.trim(),
  };
}

function SearchableSelectField({
  label,
  placeholder,
  value,
  selectedLabel,
  options,
  onSelect,
  disabled = false,
  error,
  customVisible = false,
  customTriggerLabel,
  customInputPlaceholder,
  customValue = "",
  onShowCustom,
  onHideCustom,
  onCustomChange,
  helperText,
  openWithFullList = false,
  selectionOnly = false,
  resetToken,
}: {
  label: string;
  placeholder: string;
  value: string;
  selectedLabel: string;
  options: SearchableOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  error?: string;
  customVisible?: boolean;
  customTriggerLabel?: string;
  customInputPlaceholder?: string;
  customValue?: string;
  onShowCustom?: () => void;
  onHideCustom?: () => void;
  onCustomChange?: (value: string) => void;
  helperText?: string;
  openWithFullList?: boolean;
  selectionOnly?: boolean;
  resetToken?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedLabel);
    }
  }, [isOpen, selectedLabel]);

  useEffect(() => {
    setIsOpen(false);
    setQuery(selectedLabel);
  }, [resetToken, selectedLabel]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  return (
    <div className="relative space-y-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>

      {!customVisible && (
        <div className="relative">
          <input
            type="text"
            value={isOpen ? query : selectedLabel}
            onFocus={() => {
              if (disabled) return;
              setIsOpen(true);
              setQuery(openWithFullList || selectionOnly ? "" : selectedLabel);
            }}
            onClick={() => {
              if (disabled) return;
              setIsOpen(true);
              setQuery(openWithFullList || selectionOnly ? "" : selectedLabel);
            }}
            onChange={(e) => {
              if (disabled || selectionOnly) return;
              setIsOpen(true);
              setQuery(e.target.value);
            }}
            onBlur={() => {
              window.setTimeout(() => {
                setIsOpen(false);
                setQuery(selectedLabel);
              }, 120);
            }}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={selectionOnly}
            className={cn(
              profileInputClass(!!error),
              disabled && "cursor-not-allowed bg-slate-50 text-slate-400",
              selectionOnly && !disabled && "cursor-pointer",
              "pr-11",
            )}
          />
          <FaChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          {isOpen && !disabled && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
              <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                {query.trim() ? `Filtered results (${filteredOptions.length})` : `Options (${options.length})`}
              </div>
              <div className="max-h-64 overflow-y-auto py-2">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={`${option.value}-${option.label}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onSelect(option.value);
                        setIsOpen(false);
                        setQuery(option.label);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-[#017f3f]/5",
                        value === option.value ? "bg-[#017f3f]/8 text-[#017f3f]" : "text-slate-700",
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {value === option.value && <FaCheck className="ml-3 h-3.5 w-3.5 shrink-0" />}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    {selectionOnly ? "No options available." : "No matches found. Try another search or add a custom value."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!customVisible && customTriggerLabel && onShowCustom && (
        <button
          type="button"
          onClick={onShowCustom}
          className="inline-flex items-center rounded-full border border-[#feca07]/45 bg-[#feca07]/12 px-3 py-1.5 text-xs font-semibold text-[#d81920] transition hover:border-[#d81920]/40 hover:bg-[#feca07]/20 hover:text-[#b1141a]"
        >
          {customTriggerLabel}
        </button>
      )}

      {customVisible && onCustomChange && (
        <div className="space-y-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder={customInputPlaceholder}
            className={profileInputClass(!!error)}
          />
          {onHideCustom && (
            <button
              type="button"
              onClick={onHideCustom}
              className="inline-flex items-center rounded-full border border-[#017f3f]/35 bg-[#017f3f]/8 px-3 py-1.5 text-xs font-semibold text-[#017f3f] transition hover:border-[#017f3f]/50 hover:bg-[#017f3f]/12"
            >
              Use dropdown instead
            </button>
          )}
        </div>
      )}

      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

function SegmentedControl({
  value,
  onChange,
  hasError,
  options,
  columnsClassName = "grid-cols-2",
  focusClassName,
  activeClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  hasError: boolean;
  options: Array<{ value: string; label: string }>;
  columnsClassName?: string;
  focusClassName?: string;
  activeClassName?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-invalid={hasError}
      className={cn(
        "grid w-full rounded-xl border-2 bg-white p-[3px] transition-all duration-200",
        columnsClassName,
        hasError
          ? "border-red-300 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10"
          : focusClassName ?? "border-gray-200 focus-within:border-[#017f3f] focus-within:ring-4 focus-within:ring-[#017f3f]/10",
      )}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-[42px] rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none",
              active
                ? activeClassName ??
                    "bg-[linear-gradient(135deg,#017f3f_0%,#015c2e_100%)] text-white shadow-[0_10px_20px_rgba(1,127,63,0.18)]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function YesNoSegmentedControl({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (next: "Yes" | "No") => void;
  hasError: boolean;
}) {
  return (
    <SegmentedControl
      value={value}
      onChange={(next) => onChange(next as "Yes" | "No")}
      hasError={hasError}
      options={[
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ]}
      columnsClassName="grid-cols-2"
    />
  );
}

export default function ProfilePage({ adminMode = false, adminBeneficiaryId = null }: ProfilePageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated, initialize } = useAuthStore();
  const { addNotification, clearAll, removeNotification } = useNotifications();
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTabId>("personal");
  const activeTabRef = useRef<ProfileTabId>(activeTab);
  activeTabRef.current = activeTab;
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const hasWarnedMissingGoogleKeyRef = useRef(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  
  // Collapsible sections state
  const [isProfilePhotoOpen, setIsProfilePhotoOpen] = useState(false);
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true);

  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteInstanceRef = useRef<GoogleAutocomplete | null>(null);
  const programmeProofDragDepthRef = useRef(0);
  const programmeProofReplaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const programmeProofReplaceTargetDocumentIdRef = useRef<BeneficiaryEntityId | null>(null);
  const [replacingProgrammeProofDocumentId, setReplacingProgrammeProofDocumentId] =
    useState<BeneficiaryEntityId | null>(null);
  const programmeFormTopRef = useRef<HTMLDivElement | null>(null);
  const programmeEditorDetailsPanelRef = useRef<HTMLDivElement | null>(null);
  const programmeEditHandledRef = useRef<string | null>(null);

  // Profile photo refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);

  // Dropdown data state
  const [genders, setGenders] = useState<ApiOption[]>([]);
  const [raceGroups, setRaceGroups] = useState<ApiOption[]>([]);
  const [residentialTypes, setResidentialTypes] = useState<ApiOption[]>([]);
  const [highestEducation, setHighestEducation] = useState<ApiOption[]>([]);
  const [provinces, setProvinces] = useState<ApiOption[]>([]);
  const [homeLanguages, setHomeLanguages] = useState<ApiOption[]>([]);
  const [countries, setCountries] = useState<ApiOption[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<ApiOption[]>([]);
  const [employmentTypesEmployed, setEmploymentTypesEmployed] = useState<ApiOption[]>([]);
  const [employmentTypesUnemployed, setEmploymentTypesUnemployed] = useState<ApiOption[]>([]);
  const [unemploymentReasons, setUnemploymentReasons] = useState<ApiOption[]>([]);
  const [salaryGroups, setSalaryGroups] = useState<ApiOption[]>([]);
  const [stipendFrequencies, setStipendFrequencies] = useState<ApiOption[]>([]);
  const [grantTypes, setGrantTypes] = useState<ApiOption[]>([]);
  const [qualificationOptions, setQualificationOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [municipalities, setMunicipalities] = useState<ApiOption[]>([]);
  const [districts, setDistricts] = useState<ApiOption[]>([]);
  const [suburbs, setSuburbs] = useState<ApiOption[]>([]);
  const [postalCodes, setPostalCodes] = useState<ApiOption[]>([]);
  const [programmeOptions, setProgrammeOptions] = useState<BeneficiaryProfileOptions>(EMPTY_PROGRAMME_OPTIONS);
  const [programmeCompletionStatuses, setProgrammeCompletionStatuses] = useState<ProgrammeCompletionStatusOption[]>([]);
  const [programmeCompletionReasonsByStatus, setProgrammeCompletionReasonsByStatus] = useState<
    Record<string, ProgrammeCompletionStatusReasonOption[]>
  >({});
  const [programmeLinks, setProgrammeLinks] = useState<ProgrammeLinkDraft[]>([]);
  const [programmeDraft, setProgrammeDraft] = useState<ProgrammeLinkDraft>(() => createProgrammeDraft());
  const programmeDraftRef = useRef(programmeDraft);
  programmeDraftRef.current = programmeDraft;
  const [programmeDraftCustomFields, setProgrammeDraftCustomFields] = useState<Record<ProgrammeDraftCustomField, boolean>>(
    DEFAULT_PROGRAMME_DRAFT_CUSTOM_FIELDS,
  );
  const [editingProgrammeClientId, setEditingProgrammeClientId] = useState<string | null>(null);
  const [isProgrammeEditorOpen, setIsProgrammeEditorOpen] = useState(false);
  const [programmeEditorModalTab, setProgrammeEditorModalTab] = useState<"details" | "completion">("details");
  const [deletedProgrammeLinkIds, setDeletedProgrammeLinkIds] = useState<BeneficiaryEntityId[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingProgrammeDraft, setIsSavingProgrammeDraft] = useState(false);
  const [programmeDeletingClientId, setProgrammeDeletingClientId] = useState<string | null>(null);
  // Form state (starts empty; will be populated from profile or prefill data)
  const [formData, setFormData] = useState(() => createEmptyFormData());
  const [savedSignaturePreview, setSavedSignaturePreview] = useState("");
  const [isProgrammeProofDragActive, setIsProgrammeProofDragActive] = useState(false);

  useEffect(() => {
    if (isProgrammeEditorOpen) {
      setProgrammeEditorModalTab("details");
    }
  }, [isProgrammeEditorOpen]);

  // Store IDs for cascading dropdowns
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);

  const provincesRef = useRef<ApiOption[]>([]);
  const municipalitiesRef = useRef<ApiOption[]>([]);
  const districtsRef = useRef<ApiOption[]>([]);
  const suburbsRef = useRef<ApiOption[]>([]);
  const postalCodesRef = useRef<ApiOption[]>([]);
  const programmeCompletionReasonsByStatusRef = useRef<Record<string, ProgrammeCompletionStatusReasonOption[]>>({});
  const isAdminView = Boolean(adminMode && adminBeneficiaryId != null && String(adminBeneficiaryId).trim() !== "");
  const effectiveBeneficiaryId = isAdminView
    ? String(adminBeneficiaryId).trim()
    : String(user?.userID ?? "").trim();
  const programmeOrganisationId = useMemo(() => {
    const parsed = Number(String(user?.companyID ?? "").trim());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [user?.companyID]);
  const qualificationNameById = useMemo(
    () => new Map(qualificationOptions.map((option) => [option.id, option.name])),
    [qualificationOptions],
  );
  const programmeSearchOptions = useMemo<SearchableOption[]>(
    () =>
      programmeOptions.programmes.map((option) => ({
        value: String(option.id ?? ""),
        label: option.name ?? "",
      })),
    [programmeOptions.programmes],
  );
  const getGeneratedProgrammeProofDocumentTitle = useCallback(
    (row: ProgrammeLinkDraft) => {
      const programmeName =
        programmeOptions.programmes.find((option) => String(option.id) === row.programmeId)?.name ||
        row.programmeName ||
        "";

      return buildProgrammeProofDocumentTitle(programmeName, formData.idPassport);
    },
    [formData.idPassport, programmeOptions.programmes],
  );
  const generatedProgrammeProofDocumentTitle = useMemo(
    () => getGeneratedProgrammeProofDocumentTitle(programmeDraft),
    [getGeneratedProgrammeProofDocumentTitle, programmeDraft],
  );
  const generatedProgrammeProofDocumentTitleRef = useRef(generatedProgrammeProofDocumentTitle);
  generatedProgrammeProofDocumentTitleRef.current = generatedProgrammeProofDocumentTitle;
  const trainingProviderSearchOptions = useMemo<SearchableOption[]>(() => {
    const fromApi = programmeOptions.trainingProviders.map((option) => ({
      value: String(option.id ?? ""),
      label: option.name ?? "",
    }));
    const id = normalizeString(programmeDraft.trainingProviderId);
    const name = normalizeString(programmeDraft.trainingProviderName);
    if (id && !fromApi.some((o) => o.value === id)) {
      return [{ value: id, label: name || id }, ...fromApi];
    }
    if (!id && name) {
      return [{ value: name, label: name }, ...fromApi];
    }
    return fromApi;
  }, [programmeOptions.trainingProviders, programmeDraft.trainingProviderId, programmeDraft.trainingProviderName]);

  const employerSearchOptions = useMemo<SearchableOption[]>(() => {
    const fromApi = programmeOptions.employers.map((option) => ({
      value: String(option.id ?? ""),
      label: option.name ?? "",
    }));
    const id = normalizeString(programmeDraft.employerId);
    const name = normalizeString(programmeDraft.employerName);
    if (id && !fromApi.some((o) => o.value === id)) {
      return [{ value: id, label: name || id }, ...fromApi];
    }
    if (!id && name) {
      return [{ value: name, label: name }, ...fromApi];
    }
    return fromApi;
  }, [programmeOptions.employers, programmeDraft.employerId, programmeDraft.employerName]);

  useEffect(() => {
    provincesRef.current = provinces;
  }, [provinces]);
  useEffect(() => {
    municipalitiesRef.current = municipalities;
  }, [municipalities]);
  useEffect(() => {
    districtsRef.current = districts;
  }, [districts]);
  useEffect(() => {
    suburbsRef.current = suburbs;
  }, [suburbs]);
  useEffect(() => {
    postalCodesRef.current = postalCodes;
  }, [postalCodes]);

  function createEmptyFormData() {
    return {
    // Personal Details
    firstName: "",
    surname: "",
    idPassport: "",
    dateOfBirth: "",
    gender: "",
    raceGroup: "",
    nationality: "",
    saCitizen: "",
    homeLanguage: "",
    maritalStatus: "",
    physicalDisability: "",
    physicalDisabilityDetails: "",
    militaryVeteran: "No",
    receivingGrant: "",
    receivingIncome: "",
    highestEducation: "",
    driversLicense: "No",
    criminalRecord: "No",
    stateCharge: "",
    tattoos: "No",
    tattoosLocation: "",
    cellphoneNumber: "",
    emailAddress: "",
    telephoneNumberHome: "",
    // Emergency Contact 1
    emergencyContact1FirstName: HIDDEN_CONTACT_NAME_FALLBACK,
    emergencyContact1Surname: HIDDEN_CONTACT_NAME_FALLBACK,
    emergencyContact1TelNumber: HIDDEN_CONTACT_PHONE_FALLBACK,
    emergencyContact1Email: HIDDEN_CONTACT_EMAIL_FALLBACK,
    // Emergency Contact 2
    emergencyContact2FirstName: HIDDEN_CONTACT_NAME_FALLBACK,
    emergencyContact2Surname: HIDDEN_CONTACT_NAME_FALLBACK,
    emergencyContact2TelNumber: "",
    emergencyContact2Email: "",
    // Physical Address
    settlementType: "",
    addressLine1: "",
    addressLine2: "",
    province: "",
    area: "",
    municipality: "",
    suburb: "",
    code: "",
    // Employment Details
    employmentSelection: "" as EmploymentSelection,
    stipend: false,
    employmentType: "",
    contractEndDate: "",
    companyName: "",
    contactSupervisor: "",
    lineManagerEmail: "",
    employmentProvince: "",
    employmentAddressLine1: "",
    employmentAddressLine2: "",
    employmentCode: "",
    salaryGroup: "",
    stipendPayFrequency: "",
    occupationPosition: "",
    telephoneNumber: "",
    employmentNote: "",
    employmentStatus: "",
    unemploymentReason: "",
    signature: "",
    acceptedTerms: false,
    };
  }

  const getProgrammeFieldError = (clientId: string, field: string) =>
    validationErrors[`programme-${clientId}-${field}`];

  /** Full qualification list for programme links (not filtered by selected programme). */
  const programmeDraftQualificationOptions = useMemo<SearchableOption[]>(() => {
    const fromApi = qualificationOptions.map((q) => ({
      value: q.id,
      label: q.name,
    }));
    const id = normalizeString(programmeDraft.qualificationId);
    const name = normalizeString(programmeDraft.qualificationName);
    if (id && !fromApi.some((o) => o.value === id)) {
      return [
        {
          value: id,
          label: name || qualificationNameById.get(id) || id,
        },
        ...fromApi,
      ];
    }
    if (!id && name) {
      return [{ value: name, label: name }, ...fromApi];
    }
    return fromApi;
  }, [qualificationOptions, programmeDraft.qualificationId, programmeDraft.qualificationName, qualificationNameById]);
  const activeProgrammeLinks = useMemo(
    () => programmeLinks.filter((row) => !isProgrammeRowBlank(row)),
    [programmeLinks],
  );

  /** Completed with no proof files (e.g. upload later) — stepper warning + banner. */
  const programmesMissingProofEvidenceRows = useMemo(
    () =>
      programmeLinks.filter(
        (row) =>
          row.completedProgramme === "Completed" &&
          row.proofFiles.length === 0 &&
          row.proofUploadPreference !== "upload-now",
      ),
    [programmeLinks],
  );

  const programmeCompletionStatusOptions = useMemo<SearchableOption[]>(
    () =>
      programmeCompletionStatuses.map((status) => ({
        value: String(status.programmeCompletionStatusId),
        label: status.programmeCompletionStatus,
      })),
    [programmeCompletionStatuses],
  );
  const programmeDraftReasonOptions = useMemo(
    () =>
      programmeDraft.programmeCompletionStatusId
        ? programmeCompletionReasonsByStatus[programmeDraft.programmeCompletionStatusId] ?? []
        : [],
    [programmeCompletionReasonsByStatus, programmeDraft.programmeCompletionStatusId],
  );
  const programmeDraftNeedsCompletionFlow = useMemo(() => shouldCaptureProgrammeCompletion(), []);

  /** Completed + Upload now: generated title must exist before attaching new proof files. */
  const programmeProofNewUploadBlockedByMissingTitle = useMemo(
    () => isProofNewUploadBlockedByMissingTitle(programmeDraft, generatedProgrammeProofDocumentTitle),
    [generatedProgrammeProofDocumentTitle, programmeDraft],
  );

  useEffect(() => {
    programmeCompletionReasonsByStatusRef.current = programmeCompletionReasonsByStatus;
  }, [programmeCompletionReasonsByStatus]);

  useEffect(() => {
    const endDateErrorKey = `programme-${programmeDraft.clientId}-endDate`;

    setValidationErrors((prev) => {
      const next = { ...prev };

      if (
        programmeDraft.startDate &&
        programmeDraft.endDate &&
        programmeDraft.endDate < programmeDraft.startDate
      ) {
        next[endDateErrorKey] = "Start date cannot be greater than end date";
      } else if (next[endDateErrorKey] === "Start date cannot be greater than end date") {
        delete next[endDateErrorKey];
      }

      return next;
    });
  }, [programmeDraft]);

  const clearProgrammeValidationErrors = useCallback((clientId: string) => {
    setValidationErrors((prev) => {
      const next = { ...prev };
      Object.keys(next)
        .filter((key) => key.startsWith(`programme-${clientId}-`))
        .forEach((key) => delete next[key]);
      return next;
    });
  }, []);

  const showProgrammeDraftCustomField = useCallback((field: ProgrammeDraftCustomField) => {
    setProgrammeDraftCustomFields((current) => ({ ...current, [field]: true }));
  }, []);

  const hideProgrammeDraftCustomField = useCallback((field: ProgrammeDraftCustomField) => {
    setProgrammeDraftCustomFields((current) => ({ ...current, [field]: false }));
  }, []);

  const ensureProgrammeCompletionReasonsLoaded = useCallback(
    async (programmeCompletionStatusId: string) => {
      const normalizedStatusId = normalizeString(programmeCompletionStatusId);
      if (!normalizedStatusId || programmeCompletionReasonsByStatusRef.current[normalizedStatusId]) {
        return;
      }

      const reasons = await getProgrammeCompletionStatusReasons(normalizedStatusId);
      setProgrammeCompletionReasonsByStatus((current) => ({
        ...current,
        [normalizedStatusId]: reasons,
      }));
    },
    [],
  );

  useEffect(() => {
    if (!programmeDraft.programmeCompletionStatusId) return;
    ensureProgrammeCompletionReasonsLoaded(programmeDraft.programmeCompletionStatusId).catch((error) => {
      console.warn("Failed to load programme completion reasons", error);
    });
  }, [ensureProgrammeCompletionReasonsLoaded, programmeDraft.programmeCompletionStatusId]);

  const resetProgrammeDraft = useCallback(() => {
    clearProgrammeValidationErrors(programmeDraft.clientId);
    setProgrammeDraft(createProgrammeDraft());
    setProgrammeDraftCustomFields(DEFAULT_PROGRAMME_DRAFT_CUSTOM_FIELDS);
    setEditingProgrammeClientId(null);
  }, [clearProgrammeValidationErrors, programmeDraft.clientId]);

  const validateProgrammeRow = useCallback((row: ProgrammeLinkDraft, allowBlank = true) => {
    const errors: Record<string, string> = {};
    if (allowBlank && isProgrammeRowBlank(row)) return errors;

    if (!row.programmeId) {
      errors[`programme-${row.clientId}-programme`] = "Select a programme";
    }
    const hasTrainingProvider = !!row.trainingProviderId || !!nullableString(row.trainingProviderName);
    const hasEmployer = !!row.employerId || !!nullableString(row.employerName);
    if (!hasTrainingProvider && !hasEmployer) {
      const providerOrEmployerError = "Select or type at least one: training provider or employer";
      errors[`programme-${row.clientId}-trainingProvider`] = providerOrEmployerError;
      errors[`programme-${row.clientId}-employer`] = providerOrEmployerError;
    }
    if (!row.startDate) {
      errors[`programme-${row.clientId}-startDate`] = "Start date is required";
    }
    if (row.startDate && row.endDate && row.endDate < row.startDate) {
      errors[`programme-${row.clientId}-endDate`] = "Start date cannot be greater than end date";
    }

    if (shouldCaptureProgrammeCompletion()) {
      if (!row.programmeCompletionStatusId || !row.completedProgramme) {
        errors[`programme-${row.clientId}-completedProgramme`] =
          "Select a completion status";
      }

      if (row.completedProgramme === "Completed" && !row.proofUploadPreference) {
        errors[`programme-${row.clientId}-proofUploadPreference`] = "Select whether to upload proof now or later";
      }

      if (row.completedProgramme === "Completed" && row.proofUploadPreference === "upload-now" && row.proofFiles.length === 0) {
        errors[`programme-${row.clientId}-proofFiles`] = "Upload at least one proof document";
      }

      const hasPendingProofUploads = row.proofFiles.some((f) => f.file instanceof File);
      if (
        row.completedProgramme === "Completed" &&
        row.proofUploadPreference === "upload-now" &&
        hasPendingProofUploads &&
        isProofNewUploadBlockedByMissingTitle(row, getGeneratedProgrammeProofDocumentTitle(row))
      ) {
        errors[`programme-${row.clientId}-proofUploadDocumentTitle`] =
          "Select a programme and capture ID/Passport Nr before uploading proof documents";
      }

      if (isProgrammeStatusNeedingReason(row.completedProgramme) && (!row.completionReasonId || !row.incompleteReason)) {
        errors[`programme-${row.clientId}-incompleteReason`] = "Select a reason for not completing the programme";
      }

      if (isProgrammeStatusNeedingReason(row.completedProgramme) && row.incompleteReason === "Other" && !nullableString(row.otherReasonText)) {
        errors[`programme-${row.clientId}-otherReasonText`] = "Enter the other reason";
      }
    }

    return errors;
  }, [getGeneratedProgrammeProofDocumentTitle]);

  const PROGRAMME_EDITOR_DETAILS_FIELDS = ["programme", "trainingProvider", "employer", "startDate", "endDate"] as const;

  const buildProgrammeDetailsValidationErrors = useCallback((row: ProgrammeLinkDraft) => {
    const errors: Record<string, string> = {};
    if (!row.programmeId) {
      errors[`programme-${row.clientId}-programme`] = "Select a programme";
    }
    const hasTrainingProvider = !!row.trainingProviderId || !!nullableString(row.trainingProviderName);
    const hasEmployer = !!row.employerId || !!nullableString(row.employerName);
    if (!hasTrainingProvider && !hasEmployer) {
      const providerOrEmployerError = "Select or type at least one: training provider or employer";
      errors[`programme-${row.clientId}-trainingProvider`] = providerOrEmployerError;
      errors[`programme-${row.clientId}-employer`] = providerOrEmployerError;
    }
    if (!row.startDate) {
      errors[`programme-${row.clientId}-startDate`] = "Start date is required";
    }
    if (row.startDate && row.endDate && row.endDate < row.startDate) {
      errors[`programme-${row.clientId}-endDate`] = "Start date cannot be greater than end date";
    }
    return errors;
  }, []);

  const applyProgrammeDetailsValidationToState = useCallback(
    (row: ProgrammeLinkDraft) => {
      const detailErrors = buildProgrammeDetailsValidationErrors(row);
      setValidationErrors((prev) => {
        const next = { ...prev };
        for (const field of PROGRAMME_EDITOR_DETAILS_FIELDS) {
          delete next[`programme-${row.clientId}-${field}`];
        }
        Object.assign(next, detailErrors);
        return next;
      });
      return detailErrors;
    },
    [buildProgrammeDetailsValidationErrors],
  );

  const goToProgrammeEditorCompletionTab = useCallback(() => {
    const detailErrors = applyProgrammeDetailsValidationToState(programmeDraft);
    if (Object.keys(detailErrors).length > 0) {
      addNotification({
        type: "warning",
        title: "Check programme details",
        message: "Please complete the required fields on Programme details before continuing.",
      });
      window.requestAnimationFrame(() => {
        programmeEditorDetailsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    setProgrammeEditorModalTab("completion");
  }, [applyProgrammeDetailsValidationToState, programmeDraft, addNotification]);

  const updateProgrammeDraft = (updater: (current: ProgrammeLinkDraft) => ProgrammeLinkDraft) => {
    setProgrammeDraft((current) => syncProgrammeOutcomeState(updater(current)));
    clearProgrammeValidationErrors(programmeDraft.clientId);
    clearAll();
  };

  const appendProgrammeProofFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      if (
        isProofNewUploadBlockedByMissingTitle(
          programmeDraftRef.current,
          generatedProgrammeProofDocumentTitleRef.current,
        )
      ) {
        addNotification({
          type: "warning",
          title: "Document title unavailable",
          message: "Select a programme and ensure ID/Passport Nr is captured before uploading proof documents.",
        });
        return;
      }

      updateProgrammeDraft((current) => ({
        ...current,
        proofFiles: [
          ...current.proofFiles,
          ...files.map((file) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            file,
            isPersisted: false,
          })),
        ],
      }));
    },
    [addNotification, updateProgrammeDraft],
  );

  const handleProgrammeProofFilesSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;

      appendProgrammeProofFiles(files);
      event.target.value = "";
    },
    [appendProgrammeProofFiles],
  );

  const handleBeginReplaceProgrammeProofDocument = useCallback(
    (existingDocumentId: BeneficiaryEntityId) => {
      if (programmeDraftRef.current.beneficiaryProgrammeLinkId == null) {
        addNotification({
          type: "error",
          title: "Save programme first",
          message: "Save this programme before replacing proof documents.",
        });
        return;
      }
      programmeProofReplaceTargetDocumentIdRef.current = existingDocumentId;
      programmeProofReplaceFileInputRef.current?.click();
    },
    [addNotification],
  );

  const handleProgrammeProofReplaceFileSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const targetDocumentId = programmeProofReplaceTargetDocumentIdRef.current;
      programmeProofReplaceTargetDocumentIdRef.current = null;

      const picked = event.target.files?.[0];
      event.target.value = "";

      if (!targetDocumentId || !picked) return;

      const draftSnapshot = programmeDraftRef.current;
      const programmeLinkId = draftSnapshot.beneficiaryProgrammeLinkId;

      if (programmeLinkId == null) {
        addNotification({
          type: "error",
          title: "Unable to update",
          message: "This programme is not saved yet.",
        });
        return;
      }

      const titleForReplace = normalizeString(generatedProgrammeProofDocumentTitleRef.current);
      if (!titleForReplace) {
        addNotification({
          type: "warning",
          title: "Document title unavailable",
          message: "Select a programme and ensure ID/Passport Nr is captured before replacing this proof.",
        });
        return;
      }

      setReplacingProgrammeProofDocumentId(targetDocumentId);
      try {
        await replaceBeneficiaryProgrammeLinkDocumentFile(targetDocumentId, picked, {
          documentTitle: titleForReplace,
        });

        const documents = await listBeneficiaryProgrammeLinkDocuments(programmeLinkId);
        const refreshedProofFiles = documents.map((doc) => mapLinkDocumentToEvidenceFile(doc));

        setProgrammeDraft((current) => ({
          ...current,
          proofFiles: refreshedProofFiles,
        }));

        setProgrammeLinks((rows) =>
          rows.map((row) =>
            row.clientId === draftSnapshot.clientId ? { ...row, proofFiles: refreshedProofFiles } : row,
          ),
        );

        addNotification({
          type: "success",
          title: "Document replaced",
          message: "The proof document was replaced successfully.",
          duration: 4500,
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "We could not replace this document right now. Please try again.";
        addNotification({
          type: "error",
          title: "Replace failed",
          message,
        });
      } finally {
        setReplacingProgrammeProofDocumentId(null);
      }
    },
    [addNotification],
  );

  const handleProgrammeProofDragEnter = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    programmeProofDragDepthRef.current += 1;
    setIsProgrammeProofDragActive(true);
  }, []);

  const handleProgrammeProofDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setIsProgrammeProofDragActive(true);
  }, []);

  const handleProgrammeProofDragLeave = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    programmeProofDragDepthRef.current = Math.max(0, programmeProofDragDepthRef.current - 1);
    if (programmeProofDragDepthRef.current === 0) {
      setIsProgrammeProofDragActive(false);
    }
  }, []);

  const handleProgrammeProofDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      programmeProofDragDepthRef.current = 0;
      setIsProgrammeProofDragActive(false);
      appendProgrammeProofFiles(Array.from(event.dataTransfer.files ?? []));
    },
    [appendProgrammeProofFiles],
  );

  const handleOpenProgrammeProofFile = useCallback(async (file: ProgrammeEvidenceFile) => {
    try {
      if (file.file instanceof File) {
        const localUrl = URL.createObjectURL(file.file);
        window.open(localUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(localUrl), 60_000);
        return;
      }

      if (file.beneficiaryProgrammeLinkDocumentId != null) {
        const blob = await downloadBeneficiaryProgrammeLinkDocument(file.beneficiaryProgrammeLinkDocumentId);
        const downloadUrl = URL.createObjectURL(blob);
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
        return;
      }

      if (file.fileUrl) {
        window.open(file.fileUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We could not open this document right now.";
      addNotification({
        type: "error",
        title: "Open Failed",
        message,
      });
    }
  }, [addNotification]);

  const removeProgrammeProofFile = useCallback(
    (fileId: string) => {
      const removedFile = programmeDraft.proofFiles.find((file) => file.id === fileId);
      if (!removedFile) return;
      if (!canRemoveProofEvidenceFile(programmeDraft.completedProgramme, removedFile)) return;

      updateProgrammeDraft((current) => ({
        ...current,
        proofFiles: current.proofFiles.filter((file) => file.id !== fileId),
        deletedDocumentIds:
          removedFile.beneficiaryProgrammeLinkDocumentId != null &&
          !current.deletedDocumentIds.includes(removedFile.beneficiaryProgrammeLinkDocumentId as BeneficiaryEntityId)
            ? [...current.deletedDocumentIds, removedFile.beneficiaryProgrammeLinkDocumentId as BeneficiaryEntityId]
            : current.deletedDocumentIds,
      }));
    },
    [programmeDraft.completedProgramme, programmeDraft.proofFiles, updateProgrammeDraft],
  );

  /** Remove row from UI; queue server id for delete on next full profile save (no profile yet). */
  const removeProgrammeRowLocal = useCallback(
    (clientId: string) => {
      setProgrammeLinks((current) => {
        const row = current.find((item) => item.clientId === clientId);
        if (row?.beneficiaryProgrammeLinkId != null) {
          setDeletedProgrammeLinkIds((ids) => [...ids, row.beneficiaryProgrammeLinkId as BeneficiaryEntityId]);
        }
        return current.filter((item) => item.clientId !== clientId);
      });
      clearProgrammeValidationErrors(clientId);
      if (editingProgrammeClientId === clientId) {
        resetProgrammeDraft();
      }
      clearAll();
    },
    [clearAll, clearProgrammeValidationErrors, editingProgrammeClientId, resetProgrammeDraft],
  );

  const executeProgrammeRemove = useCallback(
    async (row: ProgrammeLinkDraft) => {
      const persistDeleteOnServer = hasProfile === true && row.beneficiaryProgrammeLinkId != null;

      if (persistDeleteOnServer) {
        setProgrammeDeletingClientId(row.clientId);
        try {
          await deleteBeneficiaryProgrammeLink(row.beneficiaryProgrammeLinkId as BeneficiaryEntityId);
          setProgrammeLinks((current) => current.filter((item) => item.clientId !== row.clientId));
          clearProgrammeValidationErrors(row.clientId);
          if (editingProgrammeClientId === row.clientId) {
            resetProgrammeDraft();
          }
          clearAll();
          addNotification({
            type: "success",
            title: "Profile Updated",
            message: "Your profile and programme links have been updated.",
            duration: 4500,
          });
        } catch (error) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : "We could not update your profile right now. Please try again.";
          addNotification({
            type: "error",
            title: "Update Failed",
            message,
          });
        } finally {
          setProgrammeDeletingClientId(null);
        }
        return;
      }

      removeProgrammeRowLocal(row.clientId);
      addNotification({
        type: "success",
        title: "Profile Updated",
        message: "Your profile and programme links have been updated.",
        duration: 4500,
      });
    },
    [
      addNotification,
      clearAll,
      clearProgrammeValidationErrors,
      editingProgrammeClientId,
      hasProfile,
      removeProgrammeRowLocal,
      resetProgrammeDraft,
    ],
  );

  const handleRemoveProgrammeRow = useCallback(
    (row: ProgrammeLinkDraft) => {
      if (row.completedProgramme === "Completed") {
        return;
      }

      let notificationId = "";
      notificationId = addNotification({
        type: "warning",
        title: "Remove programme?",
        message: "This programme will be removed from your list. This cannot be undone.",
        duration: 0,
        secondaryAction: {
          label: "Cancel",
          onClick: () => removeNotification(notificationId),
        },
        action: {
          label: "Remove",
          onClick: () => {
            removeNotification(notificationId);
            void executeProgrammeRemove(row);
          },
        },
      });
    },
    [addNotification, executeProgrammeRemove, removeNotification],
  );

  const buildProgrammePayload = (row: ProgrammeLinkDraft): BeneficiaryProgrammeLinkPayload => {
    const qualificationId = row.qualificationId;
    const qualificationName = row.qualificationName;
    const requiresReason = isProgrammeStatusNeedingReason(row.completedProgramme);
    const selectedReasonIsOther = row.incompleteReason === "Other";

    return {
      programmeId: normalizeId(row.programmeId),
      programmeName: row.programmeId ? null : nullableString(row.programmeName),
      qualificationId: normalizeId(qualificationId),
      customQualificationName: qualificationId ? null : nullableString(qualificationName),
      startDate: formatDateForApi(row.startDate),
      endDate: formatDateForApi(row.endDate),
      trainingProviderId: normalizeId(row.trainingProviderId),
      trainingProviderName: row.trainingProviderId ? null : nullableString(row.trainingProviderName),
      employerId: normalizeId(row.employerId),
      employerName: row.employerId ? null : nullableString(row.employerName),
      programmeCompletionStatusId: normalizeId(row.programmeCompletionStatusId),
      completionReasonId: requiresReason ? normalizeId(row.completionReasonId) : null,
      otherReasonText: requiresReason && selectedReasonIsOther ? nullableString(row.otherReasonText) : null,
      notes: null,
    };
  };

  const persistProgrammeLinkDocumentChanges = useCallback(
    async (row: ProgrammeLinkDraft, programmeLinkId: BeneficiaryEntityId) => {
      if (row.deletedDocumentIds.length > 0) {
        await Promise.all(
          row.deletedDocumentIds.map((documentId) => deleteBeneficiaryProgrammeLinkDocument(documentId)),
        );
      }

      const existingDocumentIds = row.proofFiles
        .map((file) => file.beneficiaryProgrammeLinkDocumentId)
        .filter((id): id is BeneficiaryEntityId => id != null);

      if (row.completedProgramme !== "Completed") {
        await Promise.all(
          existingDocumentIds.map((documentId) => deleteBeneficiaryProgrammeLinkDocument(documentId)),
        );
        return;
      }

      const newFiles = row.proofFiles
        .map((file) => file.file)
        .filter((file): file is File => file instanceof File);

      if (newFiles.length > 0) {
        const trimmedTitle = getGeneratedProgrammeProofDocumentTitle(row);
        if (!trimmedTitle) {
          throw new Error("Select a programme and capture ID/Passport Nr before uploading proof documents.");
        }
        await uploadBeneficiaryProgrammeLinkDocuments(programmeLinkId, newFiles, {
          documentTitle: trimmedTitle,
        });
      }
    },
    [getGeneratedProgrammeProofDocumentTitle],
  );

  const loadProgrammeRowForEdit = useCallback(
    async (clientId: string) => {
      const row = programmeLinks.find((item) => item.clientId === clientId);
      if (!row) return;

      setProgrammeDraft({ ...row, proofFiles: [...row.proofFiles] });
      setProgrammeDraftCustomFields(getProgrammeDraftCustomFieldState(row));
      setEditingProgrammeClientId(clientId);
      setIsProgrammeEditorOpen(true);
      clearProgrammeValidationErrors(clientId);
      clearAll();

      window.requestAnimationFrame(() => {
        programmeFormTopRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        programmeFormTopRef.current?.focus({ preventScroll: true });
      });

      if (row.programmeCompletionStatusId) {
        ensureProgrammeCompletionReasonsLoaded(row.programmeCompletionStatusId).catch((error) => {
          console.warn("Failed to load programme completion reasons for edit", error);
        });
      }
    },
    [clearAll, clearProgrammeValidationErrors, ensureProgrammeCompletionReasonsLoaded, programmeLinks],
  );

  const refreshProgrammeLinksFromServer = useCallback(async () => {
    const links =
      isAdminView && effectiveBeneficiaryId
        ? await listAdminBeneficiaryProgrammeLinks(effectiveBeneficiaryId)
        : await listBeneficiaryProgrammeLinks();
    const hydratedLinks = await hydrateBeneficiaryProgrammeLinks(links);
    setProgrammeLinks(hydratedLinks);
    setDeletedProgrammeLinkIds([]);
    return hydratedLinks;
  }, [effectiveBeneficiaryId, isAdminView]);

  useEffect(() => {
    if (isAdminView) return;
    const tab = searchParams.get("tab");
    if (tab === "programmes") setActiveTab("programmes");
    else if (tab === "personal") setActiveTab("personal");
    else if (tab === "address") setActiveTab("address");
    else if (tab === "employment") setActiveTab("employment");
    else if (tab === "submit") setActiveTab("submit");
  }, [isAdminView, searchParams]);

  useEffect(() => {
    if (isAdminView) return;
    const edit = searchParams.get("edit");
    if (!edit) {
      programmeEditHandledRef.current = null;
      return;
    }
    if (activeTab !== "programmes" || programmeLinks.length === 0) return;
    if (programmeEditHandledRef.current === edit) return;

    const match = programmeLinks.find(
      (r) =>
        (r.beneficiaryProgrammeLinkId != null && String(r.beneficiaryProgrammeLinkId) === edit) ||
        r.clientId === edit,
    );
    if (!match) return;

    programmeEditHandledRef.current = edit;
    void loadProgrammeRowForEdit(match.clientId);
    router.replace("/dashboard/beneficiary/profile?tab=programmes", { scroll: false });
  }, [activeTab, isAdminView, programmeLinks, searchParams, loadProgrammeRowForEdit, router]);

  const saveProgrammeDraft = useCallback(async () => {
    const errors = validateProgrammeRow(programmeDraft, false);
    clearProgrammeValidationErrors(programmeDraft.clientId);

    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => ({ ...prev, ...errors }));
      return;
    }

    const mergedEditRow =
      editingProgrammeClientId != null
        ? {
            ...programmeDraft,
            proofFiles: [...programmeDraft.proofFiles],
            clientId: editingProgrammeClientId,
          }
        : null;

    const shouldPersistProgrammeOnServer =
      hasProfile === true &&
      mergedEditRow != null &&
      mergedEditRow.beneficiaryProgrammeLinkId != null;

    if (shouldPersistProgrammeOnServer) {
      const programmeLinkId = mergedEditRow.beneficiaryProgrammeLinkId as BeneficiaryEntityId;
      setIsSavingProgrammeDraft(true);
      try {
        await updateBeneficiaryProgrammeLink(programmeLinkId, buildProgrammePayload(mergedEditRow));
        await persistProgrammeLinkDocumentChanges(mergedEditRow, programmeLinkId);
        await refreshProgrammeLinksFromServer();

        addNotification({
          type: "success",
          title: "Programme updated",
          message: "Your programme details and proof documents have been saved.",
          duration: 4500,
        });
        clearAll();
        resetProgrammeDraft();
        setIsProgrammeEditorOpen(false);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "We could not save this programme right now. Please try again.";
        addNotification({
          type: "error",
          title: "Save failed",
          message,
        });
      } finally {
        setIsSavingProgrammeDraft(false);
      }
      return;
    }

    const shouldCreateProgrammeOnServer =
      hasProfile === true &&
      editingProgrammeClientId == null &&
      programmeDraft.beneficiaryProgrammeLinkId == null;

    if (shouldCreateProgrammeOnServer) {
      setIsSavingProgrammeDraft(true);
      try {
        const saved = await createBeneficiaryProgrammeLink(buildProgrammePayload(programmeDraft));
        const programmeLinkId = saved.beneficiaryProgrammeLinkId;
        if (programmeLinkId == null) {
          throw new Error("The server did not return a programme link id.");
        }

        const rowForDocs: ProgrammeLinkDraft = {
          ...programmeDraft,
          proofFiles: [...programmeDraft.proofFiles],
          beneficiaryProgrammeLinkId: programmeLinkId,
        };
        await persistProgrammeLinkDocumentChanges(rowForDocs, programmeLinkId);
        await refreshProgrammeLinksFromServer();

        addNotification({
          type: "success",
          title: "Programme added",
          message: "Your programme and proof documents have been saved.",
          duration: 4500,
        });
        clearAll();
        resetProgrammeDraft();
        setIsProgrammeEditorOpen(false);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "We could not add this programme right now. Please try again.";
        addNotification({
          type: "error",
          title: "Save failed",
          message,
        });
      } finally {
        setIsSavingProgrammeDraft(false);
      }
      return;
    }

    if (editingProgrammeClientId) {
      setProgrammeLinks((current) =>
        current.map((row) =>
          row.clientId === editingProgrammeClientId
            ? {
                ...programmeDraft,
                proofFiles: [...programmeDraft.proofFiles],
                clientId: editingProgrammeClientId,
              }
            : row,
        ),
      );
    } else {
      setProgrammeLinks((current) => [
        ...current,
        {
          ...programmeDraft,
          proofFiles: [...programmeDraft.proofFiles],
        },
      ]);
    }

    clearAll();
    resetProgrammeDraft();
    setIsProgrammeEditorOpen(false);
  }, [
    addNotification,
    buildProgrammePayload,
    clearAll,
    clearProgrammeValidationErrors,
    createBeneficiaryProgrammeLink,
    editingProgrammeClientId,
    hasProfile,
    persistProgrammeLinkDocumentChanges,
    programmeDraft,
    refreshProgrammeLinksFromServer,
    resetProgrammeDraft,
    validateProgrammeRow,
  ]);

  const buildProfilePayload = (): BeneficiaryProfileSavePayload => {
    const grantType = formData.receivingGrant || "";
    const employmentSelection = (formData.employmentSelection || "") as EmploymentSelection;
    const employed = employmentSelection === "Currently Employed";
    const unemployed = employmentSelection === "Not employed";
    const volunteering = employmentSelection === "Volunteering";
    const municipalityId = selectedMunicipalityId && selectedMunicipalityId > 0 ? selectedMunicipalityId : null;
    const districtId = selectedDistrictId && selectedDistrictId > 0 ? selectedDistrictId : null;
    const dob = formData.dateOfBirth ? formatDateForApi(formData.dateOfBirth) : null;
    const contractEndDate = formData.contractEndDate ? formatDateForApi(formData.contractEndDate) : null;
    const beneficiaryId = effectiveBeneficiaryId || "";
    const formFlags = formData as Record<string, unknown>;
    const volunteeringReceivesStipend =
      volunteering && stipendReceivedFromPayFrequency(formData.stipendPayFrequency);

    return {
      beneficiaryId,
      firstName: formData.firstName || "",
      lastName: formData.surname || "",
      southAfricanCitizen: yesNoToBoolean(formData.saCitizen),
      physicalDisability: yesNoToBoolean(formData.physicalDisability),
      physicalDisabilityType:
        formData.physicalDisability === "Yes"
          ? formData.physicalDisabilityDetails.trim()
          : "",
      militaryVeteran: yesNoToBoolean(formData.militaryVeteran || "No"),
      idNumber_Passport: formData.idPassport || "",
      dob,
      gender: formData.gender || "",
      raceGroup: formData.raceGroup || "",
      medicalCondition:
        formData.physicalDisability === "Yes"
          ? formData.physicalDisabilityDetails.trim() || "NA"
          : "NA",
      highestEducation: formData.highestEducation || "",
      receive_Income_FinancialSupport: yesNoToBoolean(formData.receivingIncome),
      grantRecipient: grantType !== "" && grantType !== "No",
      grantType: grantType !== "" && grantType !== "No" ? grantType : "",
      childSupportGrant: grantType === "Child Support Grant (CSG)",
      disabilityGrant: grantType === "Disability Grant",
      govermentPension: grantType === "Government Pension",
      fosterCareGrant: grantType === "Foster Care Grant",
      physicalAddress1: formData.addressLine1 || "",
      physicalAddress2: formData.addressLine2 || "",
      physicalAddressProvince: formData.province || "",
      municipalityId,
      wardId: null,
      districtId,
      physicalAddressCode: formData.code || "",
      telNoHome: "",
      cellNo: formData.cellphoneNumber || "",
      emailAddress: formData.emailAddress || "",
      employed,
      stipend: volunteering ? volunteeringReceivesStipend : false,
      companyName: formData.companyName || "",
      occupation: formData.occupationPosition || "",
      workAddressProvince: formData.employmentProvince || "",
      workAddress1: formData.employmentAddressLine1 || "",
      workAddress2: formData.employmentAddressLine2 || "",
      workAddressCode: formData.employmentCode || "",
      telNoWork: formData.telephoneNumber || "",
      contactPerson_Supervisor: formData.contactSupervisor || "",
      lineManagerEmail: formData.lineManagerEmail || "",
      registrationDate: new Date().toISOString(),
      status: "In Progress Locked",
      employmentTypeStatus: employed
        ? formData.employmentType || ""
        : unemployed
        ? formData.employmentStatus || ""
        : volunteering
        ? "Volunteering"
        : "",
      salaryGroup:
        employed || volunteeringReceivesStipend ? formData.salaryGroup || "" : "",
      stipendPayFrequency: volunteering
        ? String(formData.stipendPayFrequency || "").trim().slice(0, 50) || null
        : null,
      employmentNoteComment: formData.employmentNote || "",
      contractEndDate,
      unemploymentReason: unemployed ? formData.unemploymentReason || "" : "",
      familyMemberName:
        `${formData.emergencyContact1FirstName || HIDDEN_CONTACT_NAME_FALLBACK} ${formData.emergencyContact1Surname || HIDDEN_CONTACT_NAME_FALLBACK}`.trim(),
      familyMemberContactNumber: formData.emergencyContact1TelNumber || HIDDEN_CONTACT_PHONE_FALLBACK,
      country: formData.nationality || "South Africa",
      suburbName: formData.suburb || "",
      receiveGrant: formData.receivingGrant || "",
      residentialType: formData.settlementType || "",
      nationality: formData.nationality || "",
      homeLanguage: formData.homeLanguage || "",
      maritalStatus: formData.maritalStatus || "",
      driversLicense: formData.driversLicense || "No",
      criminalRecord: formData.criminalRecord || "No",
      tattoos: formData.tattoos || "No",
      stateCharge: formData.criminalRecord === "Yes" ? formData.stateCharge || null : null,
      tattooLocation: formData.tattoos === "Yes" ? formData.tattoosLocation || null : null,
      thirdFirstName: formData.emergencyContact2FirstName || HIDDEN_CONTACT_NAME_FALLBACK,
      thirdSurName: formData.emergencyContact2Surname || HIDDEN_CONTACT_NAME_FALLBACK,
      thirdTel: formData.emergencyContact2TelNumber || HIDDEN_CONTACT_PHONE_FALLBACK,
      thirdEmail: formData.emergencyContact2Email || HIDDEN_CONTACT_EMAIL_FALLBACK,
      artisan: Boolean(formFlags.artisan),
      tertiary: Boolean(formFlags.tertiary),
      beneficiaryPhoto: profilePhoto ?? null,
      eSignature: formData.signature || null,
      termsAndConditionsAccepted: Boolean(formFlags.acceptedTerms),
      userConsentAccepted: Boolean(formFlags.acceptedTerms),
    };
  };

  const validateProgrammeRows = () => {
    const errors: Record<string, string> = {};
    if (!isAdminView && activeProgrammeLinks.length === 0) {
      errors.programmeLinks = "Add at least one programme link";
    }
    for (const row of programmeLinks) {
      Object.assign(errors, validateProgrammeRow(row));
    }
    if (
      programmeDraft.startDate &&
      programmeDraft.endDate &&
      programmeDraft.endDate < programmeDraft.startDate
    ) {
      errors[`programme-${programmeDraft.clientId}-endDate`] =
        "Start date cannot be greater than end date";
    }
    return errors;
  };

  const applyProfileToForm = useCallback((profile: BeneficiaryProfileRecord) => {
    const employmentTypeStatus = pickFirstString(profile, ["employmentTypeStatus"]);
    const savedSignature = normalizeSignatureDataUrl(
      pickFirstString(profile, ["eSignature", "signature", "eSignatureBase64", "ESignature"]) || "",
    );
    const acceptedTerms =
      pickFirstBoolean(profile, [
        "termsAndConditionsAccepted",
        "termsAccepted",
        "userConsentAccepted",
        "acceptedTerms",
      ]) ?? Boolean(savedSignature);
    const employmentSelection: EmploymentSelection =
      employmentTypeStatus === "Volunteering"
        ? "Volunteering"
        : profile.employed === true
        ? "Currently Employed"
        : profile.employed === false
        ? "Not employed"
        : "";
    const stipendPayFrequency = pickFirstString(profile, ["stipendPayFrequency", "StipendPayFrequency"]);
    const profileStipend = pickFirstBoolean(profile, ["stipend", "receivesStipend", "receiveStipend"]) === true;
    const stipend =
      employmentSelection === "Volunteering"
        ? stipendPayFrequency
          ? stipendReceivedFromPayFrequency(stipendPayFrequency)
          : profileStipend
        : false;

    setFormData({
      ...createEmptyFormData(),
      firstName: pickFirstString(profile, ["firstName", "FirstName"]),
      surname: pickFirstString(profile, ["lastName", "LastName", "surname", "Surname"]),
      idPassport: pickFirstString(profile, ["idNumber_Passport"]),
      dateOfBirth: formatDateForInput(profile.dob),
      gender: pickFirstString(profile, ["gender"]),
      raceGroup: pickFirstString(profile, ["raceGroup"]),
      nationality: pickFirstString(profile, ["nationality"]) || "South Africa",
      saCitizen: booleanToYesNo(profile.southAfricanCitizen),
      homeLanguage: pickFirstString(profile, ["homeLanguage"]),
      maritalStatus: pickFirstString(profile, ["maritalStatus"]),
      physicalDisability: booleanToYesNo(profile.physicalDisability),
      physicalDisabilityDetails:
        pickFirstString(profile, ["physicalDisabilityType", "medicalCondition"]) !== "NA"
          ? pickFirstString(profile, ["physicalDisabilityType", "medicalCondition"])
          : "",
      militaryVeteran: booleanToYesNo(profile.militaryVeteran) || "No",
      receivingGrant: pickFirstString(profile, ["grantType", "receiveGrant", "receivingGrant"]),
      receivingIncome: booleanToYesNo(profile.receive_Income_FinancialSupport),
      highestEducation: pickFirstString(profile, ["highestEducation"]),
      driversLicense: pickFirstString(profile, ["driversLicense"]) || "No",
      criminalRecord: pickFirstString(profile, ["criminalRecord"]) || "No",
      stateCharge: "",
      tattoos: pickFirstString(profile, ["tattoos"]) || "No",
      tattoosLocation: "",
      cellphoneNumber: pickFirstString(profile, ["cellNo"]),
      emailAddress: pickFirstString(profile, ["emailAddress"]) || user?.email || "",
      telephoneNumberHome: "",
      emergencyContact1FirstName: pickFirstString(profile, ["secondFirstName"]) || HIDDEN_CONTACT_NAME_FALLBACK,
      emergencyContact1Surname: pickFirstString(profile, ["secondSurName"]) || HIDDEN_CONTACT_NAME_FALLBACK,
      emergencyContact1TelNumber: pickFirstString(profile, ["secondTel"]) || HIDDEN_CONTACT_PHONE_FALLBACK,
      emergencyContact1Email: pickFirstString(profile, ["secondEmail"]) || HIDDEN_CONTACT_EMAIL_FALLBACK,
      emergencyContact2FirstName: pickFirstString(profile, ["thirdFirstName"]) || HIDDEN_CONTACT_NAME_FALLBACK,
      emergencyContact2Surname: pickFirstString(profile, ["thirdSurName"]) || HIDDEN_CONTACT_NAME_FALLBACK,
      emergencyContact2TelNumber: pickFirstString(profile, ["thirdTel"]),
      emergencyContact2Email: pickFirstString(profile, ["thirdEmail"]),
      settlementType: pickFirstString(profile, ["residentialType"]),
      addressLine1: pickFirstString(profile, ["physicalAddress1"]),
      addressLine2: pickFirstString(profile, ["physicalAddress2"]),
      province: pickFirstString(profile, ["physicalAddressProvince"]),
      area: "",
      municipality: "",
      suburb: pickFirstString(profile, ["suburbName"]),
      code: pickFirstString(profile, ["physicalAddressCode"]),
      employmentSelection,
      stipend,
      employmentType: employmentSelection === "Currently Employed" ? employmentTypeStatus : "",
      contractEndDate: formatDateForInput(profile.contractEndDate),
      companyName: pickFirstString(profile, ["companyName"]),
      contactSupervisor: pickFirstString(profile, ["contactPerson_Supervisor"]),
      lineManagerEmail: pickFirstString(profile, [
        "lineManagerEmail",
        "supervisorEmail",
        "contactPerson_SupervisorEmail",
        "contactPerson_Supervisor_Email",
      ]),
      employmentProvince: pickFirstString(profile, ["workAddressProvince"]),
      employmentAddressLine1: pickFirstString(profile, ["workAddress1"]),
      employmentAddressLine2: pickFirstString(profile, ["workAddress2"]),
      employmentCode: pickFirstString(profile, ["workAddressCode"]),
      salaryGroup: pickFirstString(profile, ["salaryGroup"]),
      stipendPayFrequency,
      occupationPosition: pickFirstString(profile, ["occupation"]),
      telephoneNumber: pickFirstString(profile, ["telNoWork"]),
      employmentNote: pickFirstString(profile, ["employmentNoteComment"]),
      employmentStatus: employmentSelection === "Not employed" ? employmentTypeStatus : "",
      unemploymentReason:
        employmentSelection === "Not employed" ? pickFirstString(profile, ["unemploymentReason"]) : "",
      signature: savedSignature,
      acceptedTerms,
    });
    setSavedSignaturePreview(savedSignature);
    setSelectedMunicipalityId(
      pickFirstNumber(profile, ["municipalityId", "municipalityID"]),
    );
    setSelectedDistrictId(
      pickFirstNumber(profile, ["districtId", "districtID"]),
    );

    const photo = normalizeString(profile.beneficiaryPhoto);
    if (photo) {
      setProfilePhoto(photo.startsWith("data:") ? photo : `data:image/jpeg;base64,${photo}`);
    } else {
      setProfilePhoto(null);
    }
  }, [user?.email]);

  const teardownPlacesAutocomplete = useCallback(() => {
    const ac = autocompleteInstanceRef.current;
    const g = (window as typeof window & { google?: GoogleMapsApi }).google;
    if (ac && g?.maps?.event) {
      try {
        g.maps.event.clearInstanceListeners(ac);
      } catch {
        /* ignore */
      }
    }
    autocompleteInstanceRef.current = null;
  }, []);

  // Initialize Google Maps Autocomplete (uses refs inside place_changed so dropdown data is never stale)
  const initAutocomplete = useCallback(() => {
    try {
      const g = (window as typeof window & { google?: GoogleMapsApi }).google;
      if (autocompleteInstanceRef.current) return;
      if (!g?.maps?.places) {
        if (process.env.NODE_ENV === 'development') {
          console.warn("Google Maps Places API not available yet");
        }
        return;
      }

      const input = addressInputRef.current || (document.getElementById("address-autocomplete-input") as HTMLInputElement | null);
      if (!input) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Address input element not found");
        }
        return;
      }

      if (!addressInputRef.current && input) {
        addressInputRef.current = input;
      }

      const ac = new g.maps.places.Autocomplete(input, {
        fields: ["formatted_address", "address_components", "geometry"],
        types: ["geocode"],
        componentRestrictions: { country: ["za"] },
      });

      // Helper function to get component by types
      const getComponent = (components: AddressComponent[], types: string[]) => {
        return components.find(c => types.some(t => c.types.includes(t)))?.long_name || "";
      };

      // Helper function to insert value into dropdown if it doesn't exist
      const insertIfMissing = (
        value: string,
        array: ApiOption[],
        setter: (arr: ApiOption[]) => void
      ) => {
        if (!value) return false;
        const exists = array.some(item => {
          const compareValue = (item.name ?? item.code ?? item.postalCode ?? '').toString().toLowerCase();
          return compareValue === value.toLowerCase();
        });
        if (!exists) {
          const newItem: ApiOption = { id: Date.now(), name: value };
          setter([...array, newItem]);
          return true;
        }
        return false;
      };

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();

        if (!place.address_components?.length) return;

        const display = place.formatted_address?.trim();
        if (display) input.value = display;

        const components = place.address_components;

        // Extract address components using the helper
        const streetNumber = getComponent(components, ['street_number']);
        const route = getComponent(components, ['route']);
        const addressLine1 = streetNumber && route ? `${streetNumber} ${route}` : (route || streetNumber || '');
        const addressLine2 = getComponent(components, ['subpremise']);
        const province = getComponent(components, ['administrative_area_level_1']);
        const municipality = getComponent(components, ['administrative_area_level_2']);
        
        // Extract area/district and suburb more intelligently
        // Get all available components for debugging
        const locality = getComponent(components, ['locality']);
        const sublocality = getComponent(components, ['sublocality']);
        const sublocalityLevel1 = getComponent(components, ['sublocality_level_1']);
        const neighborhood = getComponent(components, ['neighborhood']);
        const hadSuburbHint = Boolean(
          sublocalityLevel1 ||
          neighborhood ||
          (sublocality && locality && sublocality !== locality)
        );
        const hadAreaHint = Boolean(locality || sublocality);
        
        // For South African addresses:
        // - District/Area is usually the larger area (locality like "Durban")
        // - Suburb is usually the smaller area (sublocality or neighborhood like "Chatsworth")
        let areaDistrict = locality || sublocality || '';
        let suburb = sublocalityLevel1 || neighborhood || '';
        
        // If we have sublocality but no suburb yet, and locality exists, use sublocality as suburb
        if (!suburb && sublocality && locality && sublocality !== locality) {
          suburb = sublocality;
          areaDistrict = locality; // Keep locality as district
        }
        // If we only have sublocality (no locality), it might be the suburb
        else if (!suburb && sublocality && !locality) {
          suburb = sublocality;
          areaDistrict = ''; // No district available
        }
        // If both are the same, try to parse from formatted address
        else if (areaDistrict && suburb && areaDistrict.toLowerCase() === suburb.toLowerCase()) {
          // They're the same, try to extract from formatted address
          if (place.formatted_address) {
            const parts = place.formatted_address.split(',').map(p => p.trim());
            // For "Street, Suburb, City/District, Province, Country" format
            // Example: "17 Joyhurst St, Chatsworth, Durban, KwaZulu-Natal, South Africa"
            // Parts: [0] Street, [1] Suburb, [2] City/District, [3] Province, [4] Country
            if (parts.length >= 3) {
              const potentialSuburb = parts[1];
              const potentialDistrict = parts[2];
              // Only use if they're different and don't contain commas (not combined values)
              if (potentialSuburb && potentialDistrict && 
                  potentialSuburb !== potentialDistrict &&
                  !potentialSuburb.includes(',') && 
                  !potentialDistrict.includes(',')) {
                suburb = potentialSuburb;
                areaDistrict = potentialDistrict;
              }
            } else if (parts.length >= 2) {
              // If only 2 parts, keep district as is, try to get suburb from 2nd part
              const potentialSuburb = parts[1];
              if (potentialSuburb && potentialSuburb !== areaDistrict && !potentialSuburb.includes(',')) {
                suburb = potentialSuburb;
              }
            }
          }
          // If still the same after parsing, clear suburb to avoid confusion
          if (areaDistrict && suburb && areaDistrict.toLowerCase() === suburb.toLowerCase()) {
            suburb = '';
          }
          // Also clear if either contains a comma (suggesting it's a combined value)
          if (areaDistrict && areaDistrict.includes(',')) {
            areaDistrict = '';
          }
          if (suburb && suburb.includes(',')) {
            suburb = '';
          }
        }
        
        const code = getComponent(components, ['postal_code']);

        // Clean up extracted values - remove any commas and trim
        areaDistrict = areaDistrict.split(',')[0].trim();
        suburb = suburb.split(',')[0].trim();

        // Fallback rule requested:
        // - If Suburb is missing from Google, default Suburb to Area (District) and force districtID = -1
        // - If Area (District) is missing from Google, default Area (District) to Suburb and force districtID = -1
        // Note: Only apply when Google truly didn't provide that component (avoid re-introducing duplicates).
        let forceDistrictIdMinus1 = false;
        if (!suburb && areaDistrict && !hadSuburbHint) {
          suburb = areaDistrict;
          forceDistrictIdMinus1 = true;
        } else if (!areaDistrict && suburb && !hadAreaHint) {
          areaDistrict = suburb;
          forceDistrictIdMinus1 = true;
        }

        // Avoid duplicates in normal cases (but allow when we intentionally defaulted)
        if (
          !forceDistrictIdMinus1 &&
          areaDistrict &&
          suburb &&
          areaDistrict.toLowerCase() === suburb.toLowerCase()
        ) {
          suburb = '';
        }

        // If no street number/route, use formatted address as line 1
        const finalAddressLine1 = addressLine1 || (place.formatted_address ? place.formatted_address.split(',')[0] : '');
        
        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 Google Maps Address Components:', {
            formatted_address: place.formatted_address,
            components: {
              locality,
              sublocality,
              sublocalityLevel1,
              neighborhood,
              municipality,
              province
            },
            extracted: {
              areaDistrict,
              suburb
            }
          });
        }

        // Try to match province and cascade dropdowns (always use latest API lists via refs)
        const matchedProvince = provincesRef.current.find(
          (p) =>
            (p.name ?? "").toLowerCase().includes(province.toLowerCase()) ||
            province.toLowerCase().includes((p.name ?? "").toLowerCase())
        );

          if (matchedProvince) {
            if (forceDistrictIdMinus1) {
            // Explicitly force district ID to -1 when we had to default district/suburb values
            setSelectedDistrictId(-1);
          }
          
          // Set initial form data and clear addressLine1 validation error
          setFormData((prev) => ({
            ...prev,
            addressLine1: finalAddressLine1,
            addressLine2: addressLine2 || '',
            province: matchedProvince.name ?? '',
            municipality,
            suburb,
            area: areaDistrict,
            code,
          }));
          // Clear addressLine1 validation error if it exists
          setValidationErrors((prev) => {
            const newErrors = {...prev};
            if (newErrors.addressLine1) delete newErrors.addressLine1;
            return newErrors;
          });

          // Cascade load municipalities and try to match
          apiClient.get(`/api/Dropdowns/municipalities?provinceId=${matchedProvince.id}`)
            .then((municipalitiesRes) => {
              const municipalitiesData = municipalitiesRes.data || [];
              setMunicipalities(municipalitiesData);
              
              const matchedMunicipality = municipalitiesData.find((m: ApiOption) => {
                const muniName = (m.name ?? '').toLowerCase();
                const target = municipality.toLowerCase().trim();
                if (!target) return false; // don't match empty -> avoids selecting first option
                return muniName.includes(target) || target.includes(muniName);
              });
              
              if (matchedMunicipality) {
                setSelectedMunicipalityId(typeof matchedMunicipality.id === 'number' ? matchedMunicipality.id : null);
                setFormData((prev) => ({ ...prev, municipality: matchedMunicipality.name }));
                
                // Load districts
                apiClient.get(`/api/Dropdowns/districts?municipalityId=${matchedMunicipality.id}`)
                  .then((districtsRes) => {
                    const districtsData = districtsRes.data || [];
                    setDistricts(districtsData);

                    // If we intentionally defaulted suburb/area, do not auto-match district id.
                    if (forceDistrictIdMinus1) {
                      setSelectedDistrictId(-1);
                      return;
                    }
                    
                    // Improved district matching - try exact match first, then partial
                    const areaDistrictLower = areaDistrict.toLowerCase().trim();
                    const matchedDistrict = areaDistrictLower
                      ? districtsData.find((d: ApiOption) => {
                          const distName = (d.name ?? '').toLowerCase().trim();
                          // Try exact match first
                          if (distName === areaDistrictLower) return true;
                          // Try case-insensitive exact match
                          if (distName.toUpperCase() === areaDistrictLower.toUpperCase()) return true;
                          // Try partial match
                          if (distName.includes(areaDistrictLower) || areaDistrictLower.includes(distName)) return true;
                          return false;
                        })
                      : undefined;
                    
                    if (matchedDistrict) {
                      const districtId = typeof matchedDistrict.id === 'number' ? matchedDistrict.id : null;
                      setSelectedDistrictId(districtId);
                      setFormData((prev) => ({ ...prev, area: matchedDistrict.name }));
                      
                      // Debug logging in development
                      if (process.env.NODE_ENV === 'development') {
                        console.log('✅ District matched:', {
                          searched: areaDistrict,
                          found: matchedDistrict.name,
                          id: districtId,
                          allDistricts: districtsData.map((d: ApiOption) => d.name)
                        });
                      }
                      
                      // Load suburbs
                      apiClient.get(`/api/Dropdowns/suburbs?districtId=${matchedDistrict.id}`)
                        .then((suburbsRes) => {
                          const suburbsData = suburbsRes.data || [];
                          setSuburbs(suburbsData);
                          
                          const suburbLower = suburb.toLowerCase().trim();
                          const matchedSuburb = suburbLower
                            ? suburbsData.find((s: ApiOption) => {
                                const subName = (s.name ?? '').toLowerCase().trim();
                                return subName.includes(suburbLower) || suburbLower.includes(subName);
                              })
                            : undefined;
                          
                          if (matchedSuburb) {
                            setFormData((prev) => ({ ...prev, suburb: matchedSuburb.name }));
                            
                            // Load postal codes
                            apiClient.get(`/api/Dropdowns/postal-codes/by-suburb?suburbId=${matchedSuburb.id}`)
                              .then((postalCodesRes) => {
                                const postalCodesData = Array.isArray(postalCodesRes.data) ? postalCodesRes.data : [];
                                setPostalCodes(postalCodesData);
                                
                                // Try to match postal code
                                if (Array.isArray(postalCodesData) && postalCodesData.length > 0) {
                                  const matchedPostalCode = postalCodesData.find((pc: { code?: string; postalCode?: string }) => 
                                    pc.code === code || pc.postalCode === code
                                  );
                                  
                                  if (matchedPostalCode) {
                                    setFormData((prev) => ({ 
                                      ...prev, 
                                      code: matchedPostalCode.code || matchedPostalCode.postalCode 
                                    }));
                                  } else if (code) {
                                    // Use Google Maps postal code if no match found
                                    setFormData((prev) => ({ ...prev, code }));
                                  }
                                } else if (code) {
                                  // Use Google Maps postal code if no postal codes from API
                                  setFormData((prev) => ({ ...prev, code }));
                                }
                              })
                              .catch(console.error);
                          } else if (suburb) {
                            // No suburb match found - insert into suburbs and use Google Maps data
                            insertIfMissing(suburb, suburbsData, setSuburbs);
                            setFormData((prev) => ({ ...prev, suburb, code }));
                            
                            // Insert postal code if it exists
                            if (code) {
                              insertIfMissing(code, postalCodesRef.current, setPostalCodes);
                            }
                          }
                        })
                        .catch(console.error);
                    } else if (areaDistrict) {
                      // No district match found - log for debugging
                      if (process.env.NODE_ENV === 'development') {
                        console.warn('⚠️ District not matched:', {
                          searched: areaDistrict,
                          availableDistricts: districtsData.map((d: ApiOption) => d.name),
                          municipality: matchedMunicipality.name,
                          municipalityId: matchedMunicipality.id
                        });
                      }
                      
                      // Insert into districts and use Google Maps data
                      insertIfMissing(areaDistrict, districtsData, setDistricts);
                      // Set district ID to -1 when no match found
                      setSelectedDistrictId(-1);
                      setFormData((prev) => ({ ...prev, area: areaDistrict, suburb, code }));
                      
                      // Also insert suburb and code if they exist
                      if (suburb) {
                        insertIfMissing(suburb, suburbsRef.current, setSuburbs);
                      }
                      if (code) {
                        insertIfMissing(code, postalCodesRef.current, setPostalCodes);
                      }
                    } else {
                      // No district value at all or no match found - set to -1
                      setSelectedDistrictId(-1);
                    }
                  })
                  .catch(console.error);
              } else if (municipality) {
                // No municipality match found - insert into municipalities and use Google Maps data
                insertIfMissing(municipality, municipalitiesData, setMunicipalities);
                // Set municipality ID to -1 when no match found
                setSelectedMunicipalityId(-1);
                setFormData((prev) => ({ ...prev, municipality, area: areaDistrict, suburb, code }));
                
                // Also set district ID to -1 if no district match
                if (areaDistrict) {
                  setSelectedDistrictId(-1);
                }
              } else {
                // No municipality value at all - set to -1
                setSelectedMunicipalityId(-1);
                if (areaDistrict) {
                  setSelectedDistrictId(-1);
                }
              }
            })
            .catch(console.error);
        } else if (province) {
          // No province match found - insert into provinces and use all Google Maps data
          insertIfMissing(province, provincesRef.current, setProvinces);
          // Set IDs to -1 when no matches found
          setSelectedMunicipalityId(-1);
          if (areaDistrict) {
            setSelectedDistrictId(-1);
          }
          setFormData((prev) => ({
            ...prev,
            addressLine1: finalAddressLine1,
            addressLine2,
            province,
            municipality,
            suburb,
            area: areaDistrict,
            code,
          }));
          // Clear addressLine1 validation error if it exists
          setValidationErrors((prev) => {
            const newErrors = {...prev};
            if (newErrors.addressLine1) delete newErrors.addressLine1;
            return newErrors;
          });
          
          // Try to load municipalities if we can find province ID later
          // For now, just insert municipality if it exists
          if (municipality) {
            insertIfMissing(municipality, municipalitiesRef.current, setMunicipalities);
          }
          if (areaDistrict) {
            insertIfMissing(areaDistrict, districtsRef.current, setDistricts);
          }
          if (suburb) {
            insertIfMissing(suburb, suburbsRef.current, setSuburbs);
          }
          if (code) {
            insertIfMissing(code, postalCodesRef.current, setPostalCodes);
          }
        } else {
          // No province data at all
          setFormData((prev) => ({
            ...prev,
            addressLine1: finalAddressLine1,
            addressLine2,
          }));
          // Clear addressLine1 validation error if it exists
          setValidationErrors((prev) => {
            const newErrors = {...prev};
            if (newErrors.addressLine1) delete newErrors.addressLine1;
            return newErrors;
          });
        }
      });

      if (input) {
        input.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') e.preventDefault();
        });
      }

      autocompleteInstanceRef.current = ac;
    } catch (e) {
      console.error("Failed to init Google Autocomplete", e);
    }
  }, []);

  // Tear down Autocomplete when leaving the address tab so the next visit re-binds cleanly
  useEffect(() => {
    if (activeTab !== "address") {
      teardownPlacesAutocomplete();
    }
  }, [activeTab, teardownPlacesAutocomplete]);

  // Check if Google Maps is loaded and initialize when address tab is active
  useEffect(() => {
    if (activeTab !== 'address') return;
    
    const tryInit = () => {
      const g = (window as typeof window & { google?: GoogleMapsApi }).google;
      const input = addressInputRef.current || document.getElementById('address-autocomplete-input') as HTMLInputElement;
      
      if (g?.maps?.places && input && !autocompleteInstanceRef.current) {
        // Update ref if we found it by ID
        if (!addressInputRef.current && input) {
          addressInputRef.current = input;
        }
        initAutocomplete();
        return true;
      }
      return false;
    };

    // Try immediately
    if (tryInit()) return;

    // If not ready, try multiple times with increasing delays
    const timers = [
      setTimeout(() => tryInit(), 100),
      setTimeout(() => tryInit(), 500),
      setTimeout(() => tryInit(), 1000),
    ];

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [activeTab, initAutocomplete]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (isAdminView) {
      setIsChecking(false);
      return;
    }
    const checkAuth = () => {
      setIsChecking(false);
      const hasToken = token || (typeof window !== 'undefined' && (sessionStorage.getItem('auth') || localStorage.getItem('auth')));
      if (!hasToken && !isAuthenticated) {
        router.replace("/login");
      }
    };

    // Small delay to allow auth store to initialize
    const timeoutId = setTimeout(checkAuth, 100);
    return () => clearTimeout(timeoutId);
  }, [isAdminView, router, token, isAuthenticated]);

  useEffect(() => {
    if (isAdminView && !effectiveBeneficiaryId) {
      setIsLoadingProfile(false);
      setHasProfile(false);
      return;
    }
    if (!isAdminView && (!isAuthenticated || !user?.userID)) {
      setIsLoadingProfile(false);
      setHasProfile(false);
      return;
    }

    let isMounted = true;

    const loadBeneficiaryProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const profile = isAdminView
          ? await getAdminBeneficiary(effectiveBeneficiaryId)
          : await getMyBeneficiaryProfile();
        if (!isMounted) return;

        if (hasBeneficiaryProfileData(profile)) {
          applyProfileToForm(profile);
          setHasProfile(true);
        } else if (isAdminView) {
          applyProfileToForm(profile);
          setHasProfile(false);
        } else {
          setHasProfile(false);
        }

        if (isAdminView && effectiveBeneficiaryId) {
          let adminProgrammeLinks = pickProgrammeLinksFromProfile(profile);
          if (adminProgrammeLinks.length === 0) {
            adminProgrammeLinks = await listAdminBeneficiaryProgrammeLinks(effectiveBeneficiaryId);
          }
          const hydratedLinks = await hydrateBeneficiaryProgrammeLinks(adminProgrammeLinks);
          if (isMounted) {
            setProgrammeLinks(hydratedLinks);
            setDeletedProgrammeLinkIds([]);
            setProgrammeDraft(createProgrammeDraft());
            setProgrammeDraftCustomFields(DEFAULT_PROGRAMME_DRAFT_CUSTOM_FIELDS);
            setEditingProgrammeClientId(null);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.warn("Failed to load beneficiary profile, falling back to user data", error);
        setHasProfile(false);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadBeneficiaryProfile().catch((error) => {
      if (!isMounted) return;
      console.warn("Unexpected beneficiary profile load failure", error);
      setHasProfile(false);
      setIsLoadingProfile(false);
    });

    return () => {
      isMounted = false;
    };
  }, [applyProfileToForm, effectiveBeneficiaryId, isAdminView, isAuthenticated, user?.userID]);

  useEffect(() => {
    if (isAdminView) {
      if (!isAuthenticated || !user?.userID) {
        setProgrammeOptions(EMPTY_PROGRAMME_OPTIONS);
        setProgrammeCompletionStatuses([]);
        setProgrammeCompletionReasonsByStatus({});
        return;
      }

      let isMounted = true;

      const loadAdminProgrammeMeta = async () => {
        const [optionsResult, statusesResult] = await Promise.allSettled([
          getBeneficiaryProfileOptions(),
          getProgrammeCompletionStatuses(),
        ]);

        if (!isMounted) return;

        if (optionsResult.status === "fulfilled") {
          setProgrammeOptions(optionsResult.value);
        } else {
          console.warn("Failed to load programme link options (admin)", optionsResult.reason);
          setProgrammeOptions(EMPTY_PROGRAMME_OPTIONS);
        }

        if (statusesResult.status === "fulfilled") {
          setProgrammeCompletionStatuses(statusesResult.value);
        } else {
          console.warn("Failed to load programme completion statuses (admin)", statusesResult.reason);
          setProgrammeCompletionStatuses([]);
        }
        setProgrammeCompletionReasonsByStatus({});
      };

      loadAdminProgrammeMeta().catch((error) => {
        if (!isMounted) return;
        console.warn("Failed to initialize programme metadata (admin)", error);
        setProgrammeOptions(EMPTY_PROGRAMME_OPTIONS);
        setProgrammeCompletionStatuses([]);
      });

      return () => {
        isMounted = false;
      };
    }

    if (!isAuthenticated || !user?.userID) {
      setProgrammeOptions(EMPTY_PROGRAMME_OPTIONS);
      setProgrammeCompletionStatuses([]);
      setProgrammeCompletionReasonsByStatus({});
      setProgrammeLinks([]);
      setDeletedProgrammeLinkIds([]);
      setProgrammeDraft(createProgrammeDraft());
      setProgrammeDraftCustomFields(DEFAULT_PROGRAMME_DRAFT_CUSTOM_FIELDS);
      setEditingProgrammeClientId(null);
      return;
    }

    let isMounted = true;

    const loadProgrammeLinksData = async () => {
      const [optionsResult, statusesResult, linksResult] = await Promise.allSettled([
        getBeneficiaryProfileOptions(),
        getProgrammeCompletionStatuses(),
        listBeneficiaryProgrammeLinks(),
      ]);

      if (!isMounted) return;

      if (optionsResult.status === "fulfilled") {
        setProgrammeOptions(optionsResult.value);
      } else {
        console.warn("Failed to load programme link options", optionsResult.reason);
        setProgrammeOptions(EMPTY_PROGRAMME_OPTIONS);
      }

      if (statusesResult.status === "fulfilled") {
        setProgrammeCompletionStatuses(statusesResult.value);
      } else {
        console.warn("Failed to load programme completion statuses", statusesResult.reason);
        setProgrammeCompletionStatuses([]);
      }
      setProgrammeCompletionReasonsByStatus({});

      if (linksResult.status === "fulfilled") {
        const hydratedLinks = await hydrateBeneficiaryProgrammeLinks(linksResult.value ?? []);
        setProgrammeLinks(hydratedLinks);

        const uniqueStatusIds = Array.from(
          new Set(
            hydratedLinks
              .map((row) => row.programmeCompletionStatusId)
              .filter((value) => normalizeString(value) !== ""),
          ),
        );
        await Promise.all(uniqueStatusIds.map((statusId) => ensureProgrammeCompletionReasonsLoaded(statusId)));
      } else {
        console.warn("Failed to load programme links", linksResult.reason);
        setProgrammeLinks([]);
      }

      setDeletedProgrammeLinkIds([]);
      setProgrammeDraft(createProgrammeDraft());
      setProgrammeDraftCustomFields(DEFAULT_PROGRAMME_DRAFT_CUSTOM_FIELDS);
      setEditingProgrammeClientId(null);
    };

    loadProgrammeLinksData().catch((error) => {
      if (!isMounted) return;
      console.warn("Failed to initialize programme links", error);
      setProgrammeOptions(EMPTY_PROGRAMME_OPTIONS);
      setProgrammeCompletionStatuses([]);
      setProgrammeLinks([]);
      setProgrammeDraft(createProgrammeDraft());
      setProgrammeDraftCustomFields(DEFAULT_PROGRAMME_DRAFT_CUSTOM_FIELDS);
      setEditingProgrammeClientId(null);
    });

    return () => {
      isMounted = false;
    };
  }, [ensureProgrammeCompletionReasonsLoaded, isAdminView, isAuthenticated, user?.userID]);

  // Handle save/update profile
  const handleSaveProfile = async () => {
    if (!isAdminView && !user?.userID) {
      addNotification({
        type: "error",
        title: "Update Failed",
        message: "You must be logged in to update your profile.",
      });
      return;
    }
    if (isAdminView && !effectiveBeneficiaryId) {
      addNotification({
        type: "error",
        title: "Update Failed",
        message: "Missing beneficiary id for admin edit.",
      });
      return;
    }

    clearAll();
    setIsSavingProfile(true);

    try {
      if (isAdminView) {
        await updateAdminBeneficiary(
          effectiveBeneficiaryId,
          buildProfilePayload() as unknown as AdminBeneficiarySavePayload,
        );
        setSavedSignaturePreview(normalizeSignatureDataUrl(String(formData.signature || "")));
        clearSignatureCanvasOnly();
        addNotification({
          type: "success",
          title: "Profile Updated",
          message: "Beneficiary profile has been updated.",
          duration: 4500,
        });
        return;
      }

      await saveMyBeneficiaryProfile(buildProfilePayload());

      const activeRows = programmeLinks.filter((row) => !isProgrammeRowBlank(row));
      await Promise.all([
        ...deletedProgrammeLinkIds.map((id) => deleteBeneficiaryProgrammeLink(id)),
      ]);

      for (const row of activeRows) {
        const payload = buildProgrammePayload(row);
        const savedProgrammeLink =
          row.beneficiaryProgrammeLinkId != null
            ? await updateBeneficiaryProgrammeLink(row.beneficiaryProgrammeLinkId, payload)
            : await createBeneficiaryProgrammeLink(payload);

        const programmeLinkId = savedProgrammeLink.beneficiaryProgrammeLinkId ?? row.beneficiaryProgrammeLinkId;
        if (programmeLinkId == null) {
          continue;
        }

        await persistProgrammeLinkDocumentChanges(row, programmeLinkId);
      }

      const refreshedLinks = await listBeneficiaryProgrammeLinks();
      const hydratedLinks = await hydrateBeneficiaryProgrammeLinks(refreshedLinks);
      setProgrammeLinks(hydratedLinks);
      setDeletedProgrammeLinkIds([]);
      setSavedSignaturePreview(normalizeSignatureDataUrl(String(formData.signature || "")));
      clearSignatureCanvasOnly();
      setProgrammeDraft(createProgrammeDraft());
      setProgrammeDraftCustomFields(DEFAULT_PROGRAMME_DRAFT_CUSTOM_FIELDS);
      setEditingProgrammeClientId(null);
      window.dispatchEvent(new Event("hwseta:beneficiary-profile-saved"));
      addNotification({
        type: "success",
        title: "Profile Updated",
        message: "Your profile and programme links have been updated.",
        duration: 4500,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We could not update your profile right now. Please try again.";
      addNotification({
        type: "error",
        title: "Update Failed",
        message,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Compress and resize image
  const compressImage = (dataUrl: string, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to JPEG with compression
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } else {
          resolve(dataUrl); // Fallback to original if canvas fails
        }
      };
      img.onerror = () => {
        resolve(dataUrl); // Fallback to original if image load fails
      };
      img.src = dataUrl;
    });
  };

  // Profile photo handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const originalDataUrl = reader.result as string;
          // Compress and resize the image
          const compressedDataUrl = await compressImage(originalDataUrl);
          setProfilePhoto(compressedDataUrl);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please select an image file');
      }
    }
  };

  const handleOpenCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      // Create a video element to show camera preview
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.maxWidth = '640px';
      video.style.borderRadius = '8px';
      
      // Create a container for the camera preview
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.right = '0';
      container.style.bottom = '0';
      container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.zIndex = '9999';
      
      // Create capture button
      const captureBtn = document.createElement('button');
      captureBtn.textContent = 'Capture Photo';
      captureBtn.style.marginTop = '20px';
      captureBtn.style.padding = '12px 24px';
      captureBtn.style.backgroundColor = '#017f3f';
      captureBtn.style.color = 'white';
      captureBtn.style.border = 'none';
      captureBtn.style.borderRadius = '8px';
      captureBtn.style.cursor = 'pointer';
      captureBtn.style.fontSize = '16px';
      captureBtn.style.fontWeight = 'bold';
      
      // Create cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.marginTop = '10px';
      cancelBtn.style.padding = '12px 24px';
      cancelBtn.style.backgroundColor = '#6b7280';
      cancelBtn.style.color = 'white';
      cancelBtn.style.border = 'none';
      cancelBtn.style.borderRadius = '8px';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.style.fontSize = '16px';
      
      // Create canvas for capturing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      captureBtn.onclick = async () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
        const originalDataUrl = canvas.toDataURL('image/jpeg');
        
        // Compress and resize the captured image
        const compressedDataUrl = await compressImage(originalDataUrl);
        setProfilePhoto(compressedDataUrl);
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(container);
      };
      
      cancelBtn.onclick = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(container);
      };
      
      container.appendChild(video);
      container.appendChild(captureBtn);
      container.appendChild(cancelBtn);
      document.body.appendChild(container);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check your permissions or use the upload option.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Fetch municipalities by province
  const fetchMunicipalities = async (provinceId: number) => {
    try {
      const response = await apiClient.get(`/api/Dropdowns/municipalities?provinceId=${provinceId}`);
      const data = response.data || [];
      setMunicipalities(data);
      // Reset dependent dropdowns
      setDistricts([]);
      setSuburbs([]);
      setPostalCodes([]);
      setSelectedMunicipalityId(null);
      setSelectedDistrictId(null);
      setFormData(prev => ({ ...prev, municipality: '', area: '', suburb: '', code: '' }));
      return data;
    } catch (error) {
      console.error('Error fetching municipalities:', error);
      setMunicipalities([]);
      return [];
    }
  };

  // Fetch districts by municipality
  const fetchDistricts = async (municipalityId: number) => {
    try {
      const response = await apiClient.get(`/api/Dropdowns/districts?municipalityId=${municipalityId}`);
      const data = response.data || [];
      setDistricts(data);
      // Reset dependent dropdowns
      setSuburbs([]);
      setPostalCodes([]);
      setSelectedDistrictId(null);
      setFormData(prev => ({ ...prev, area: '', suburb: '', code: '' }));
      return data;
    } catch (error) {
      console.error('Error fetching districts:', error);
      setDistricts([]);
      return [];
    }
  };

  // Fetch suburbs by district
  const fetchSuburbs = async (districtId: number) => {
    try {
      const response = await apiClient.get(`/api/Dropdowns/suburbs?districtId=${districtId}`);
      const data = response.data || [];
      setSuburbs(data);
      // Reset dependent dropdowns
      setPostalCodes([]);
      setFormData(prev => ({ ...prev, suburb: '', code: '' }));
      return data;
    } catch (error) {
      console.error('Error fetching suburbs:', error);
      setSuburbs([]);
      return [];
    }
  };

  // Fetch postal codes by suburb
  const fetchPostalCodes = async (suburbId: number) => {
    try {
      const response = await apiClient.get(`/api/Dropdowns/postal-codes/by-suburb?suburbId=${suburbId}`);
      const data = Array.isArray(response.data) ? response.data : [];
      setPostalCodes(data);
      setFormData(prev => ({ ...prev, code: '' }));
      return data;
    } catch (error) {
      console.error('Error fetching postal codes:', error);
      setPostalCodes([]);
      return [];
    }
  };

  // Handle province change
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceName = e.target.value;
    const province = provinces.find(p => p.name === provinceName);
    
    if (province) {
      const provinceId = typeof province.id === 'number' ? province.id : null;
      setFormData(prev => ({ ...prev, province: provinceName }));
      if (provinceId !== null) {
        fetchMunicipalities(provinceId);
      }
    } else {
      setMunicipalities([]);
      setDistricts([]);
      setSuburbs([]);
      setPostalCodes([]);
      setFormData(prev => ({ ...prev, province: '', municipality: '', area: '', suburb: '', code: '' }));
    }
  };

  // Handle municipality change
  const handleMunicipalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const municipalityName = e.target.value;
    const municipality = municipalities.find(m => m.name === municipalityName);
    
    if (municipality) {
      const municipalityId = typeof municipality.id === 'number' ? municipality.id : null;
      setSelectedMunicipalityId(municipalityId);
      setFormData(prev => ({ ...prev, municipality: municipalityName }));
      if (municipalityId !== null) {
        fetchDistricts(municipalityId);
      }
    } else {
      setSelectedMunicipalityId(null);
      setDistricts([]);
      setSuburbs([]);
      setPostalCodes([]);
      setFormData(prev => ({ ...prev, municipality: '', area: '', suburb: '', code: '' }));
    }
  };

  // Handle district (area) change
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const districtName = e.target.value;
    const district = districts.find(d => d.name === districtName);
    
    if (district) {
      const districtId = typeof district.id === 'number' ? district.id : null;
      setSelectedDistrictId(districtId);
      setFormData(prev => ({ ...prev, area: districtName }));
      if (districtId !== null) {
        fetchSuburbs(districtId);
      }
    } else {
      setSelectedDistrictId(null);
      setSuburbs([]);
      setPostalCodes([]);
      setFormData(prev => ({ ...prev, area: '', suburb: '', code: '' }));
    }
  };

  // Handle suburb change
  const handleSuburbChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const suburbName = e.target.value;
    const suburb = suburbs.find(s => s.name === suburbName);
    
    if (suburb) {
      const suburbId = typeof suburb.id === 'number' ? suburb.id : null;
      setFormData(prev => ({ ...prev, suburb: suburbName }));
      if (suburbId !== null) {
        fetchPostalCodes(suburbId);
      } else {
        setPostalCodes([]);
        setFormData(prev => ({ ...prev, code: '' }));
      }
    } else {
      setPostalCodes([]);
      setFormData(prev => ({ ...prev, suburb: '', code: '' }));
    }
  };

  // Load municipality and district names when provinces are loaded and we have IDs from profile
  useEffect(() => {
    const loadMunicipalityFromProfile = async () => {
      // Only proceed if we have a municipality ID, province name, and provinces are loaded
      if (!selectedMunicipalityId || !provinces.length || !hasProfile) return;
      
      // Get current formData to check province
      setFormData((prev) => {
        const provinceName = prev.province;
        if (!provinceName || prev.municipality) return prev; // Already loaded
        
        const provinceMatch = provinces.find((p: ApiOption) => 
          p.name?.toLowerCase() === provinceName.toLowerCase()
        );
        
        if (provinceMatch?.id) {
          apiClient.get(`/api/Dropdowns/municipalities?provinceId=${provinceMatch.id}`)
            .then((municipalitiesRes) => {
              const municipalitiesData = municipalitiesRes.data || [];
              setMunicipalities(municipalitiesData);
              
              const matchedMunicipality = municipalitiesData.find((m: ApiOption) => m.id === selectedMunicipalityId);
              if (matchedMunicipality?.name) {
                setFormData((current) => {
                  if (current.municipality) return current; // Already set
                  const updated = { ...current, municipality: matchedMunicipality.name };
                  
                  // Load districts if we have districtID
                  if (selectedDistrictId && !current.area) {
                    apiClient.get(`/api/Dropdowns/districts?municipalityId=${selectedMunicipalityId}`)
                      .then((districtsRes) => {
                        const districtsData = districtsRes.data || [];
                        setDistricts(districtsData);
                        
                        const matchedDistrict = districtsData.find((d: ApiOption) => d.id === selectedDistrictId);
                        if (matchedDistrict?.name) {
                          setFormData((latest) => ({ ...latest, area: matchedDistrict.name }));
                        }
                      })
                      .catch(console.error);
                  }
                  return updated;
                });
              }
            })
            .catch(console.error);
        }
        return prev;
      });
    };
    
    loadMunicipalityFromProfile();
  }, [provinces, selectedMunicipalityId, selectedDistrictId, hasProfile]);


  // Fetch dropdown data from APIs (isolated failures: one 500 must not wipe every list)
  useEffect(() => {
    const dropdownEndpoints: { label: string; url: string }[] = [
      { label: "genders", url: "/api/Dropdowns/genders" },
      { label: "race-groups", url: "/api/Dropdowns/race-groups" },
      { label: "residential-types", url: "/api/Dropdowns/residential-types" },
      { label: "highest-education", url: "/api/Dropdowns/highest-education" },
      { label: "provinces", url: "/api/Dropdowns/provinces" },
      { label: "home-languages", url: "/api/Dropdowns/home-languages" },
      { label: "countries", url: "/api/Dropdowns/countries" },
      { label: "marital-statuses", url: "/api/Dropdowns/marital-statuses" },
      { label: "employment-types (employed)", url: "/api/Dropdowns/employment-types?isEmployedType=true" },
      { label: "employment-types (unemployed)", url: "/api/Dropdowns/employment-types?isEmployedType=false" },
      { label: "unemployment-reasons", url: "/api/Dropdowns/unemployment-reasons" },
      { label: "salary-groups", url: "/api/Dropdowns/salary-groups" },
      { label: "grant-types", url: "/api/Dropdowns/grant-types" },
    ];

    const pickArray = (res: PromiseSettledResult<{ data?: unknown }>): ApiOption[] => {
      if (res.status !== "fulfilled") return [];
      const d = res.value.data;
      return Array.isArray(d) ? (d as ApiOption[]) : [];
    };

    const fetchDropdownData = async () => {
      const results = await Promise.allSettled(dropdownEndpoints.map((d) => apiClient.get(d.url)));

      if (process.env.NODE_ENV === "development") {
        results.forEach((res, i) => {
          if (res.status === "rejected") {
            const r = res.reason as Error & { status?: number; url?: string };
            console.warn(
              `[Profile dropdowns] ${dropdownEndpoints[i].label} failed — ${dropdownEndpoints[i].url}`,
              r?.message ?? r
            );
          }
        });
      }

      setGenders(pickArray(results[0]));
      setRaceGroups(pickArray(results[1]));
      setResidentialTypes(pickArray(results[2]));
      setHighestEducation(pickArray(results[3]));
      setProvinces(pickArray(results[4]));
      setHomeLanguages(pickArray(results[5]));
      setCountries(pickArray(results[6]));
      setMaritalStatuses(pickArray(results[7]));
      setEmploymentTypesEmployed(pickArray(results[8]));
      setEmploymentTypesUnemployed(pickArray(results[9]));
      setUnemploymentReasons(pickArray(results[10]));
      setSalaryGroups(pickArray(results[11]));
      setGrantTypes(pickArray(results[12]));
    };

    fetchDropdownData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const frequencies = await listStipendFrequencies();
        if (!cancelled) {
          setStipendFrequencies(
            frequencies.map((frequency) => ({
              id: frequency.id,
              name: frequency.name,
            })),
          );
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Profile dropdowns] stipend-frequencies failed — /api/Dropdowns/stipend-frequencies", error);
        }
        if (!cancelled) {
          setStipendFrequencies([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // If the logged-in user changes, reset any previous user's values immediately.
  useEffect(() => {
    if (!user?.userID) return;
    if (isAdminView) return;
    setFormData({
      ...createEmptyFormData(),
      firstName: user.firstName || "",
      surname: user.lastName || "",
      emailAddress: user.email || "",
    });
    setSavedSignaturePreview("");
    setProfilePhoto(null);
    setHasProfile(null);
    setSelectedMunicipalityId(null);
    setSelectedDistrictId(null);
    setMunicipalities([]);
    setDistricts([]);
    setSuburbs([]);
    setPostalCodes([]);
    setProgrammeLinks([]);
    setDeletedProgrammeLinkIds([]);
    clearAll();
  }, [clearAll, isAdminView, user?.userID, user?.firstName, user?.lastName, user?.email]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const qualifications = await listQualifications(programmeOrganisationId);
        if (cancelled) return;

        setQualificationOptions(
          qualifications.flatMap((qualification) => {
            const id = qualification.qualificationId;
            const name = qualification.qualificationName;
            if (id == null || name == null) return [];

            const normalizedId = String(id).trim();
            const normalizedName = String(name).trim();
            if (!normalizedId || !normalizedName) return [];

            return [{ id: normalizedId, name: normalizedName }];
          }),
        );
      } catch {
        if (!cancelled) {
          setQualificationOptions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [programmeOrganisationId]);

  // Try to match district when districts are loaded and formData.area is set
  useEffect(() => {
    if (districts.length === 0 || selectedDistrictId) return;
    
    // Access current formData value using functional update
    setFormData((current) => {
      if (!current.area) return current;
      
      const areaLower = current.area.toLowerCase().trim();
      const matchedDistrict = districts.find((d: ApiOption) => {
        const distName = (d.name ?? '').toLowerCase().trim();
        // Try exact match first
        if (distName === areaLower) return true;
        // Try case-insensitive exact match
        if (distName.toUpperCase() === areaLower.toUpperCase()) return true;
        // Try partial match
        if (distName.includes(areaLower) || areaLower.includes(distName)) return true;
        return false;
      });
      
      if (matchedDistrict) {
        const districtId = typeof matchedDistrict.id === 'number' ? matchedDistrict.id : null;
        setSelectedDistrictId(districtId);
        // Update formData.area to use the exact name from API (handles case differences)
        if (matchedDistrict.name && matchedDistrict.name !== current.area) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ District matched in useEffect:', {
              searched: current.area,
              found: matchedDistrict.name,
              id: districtId
            });
          }
          return { ...current, area: matchedDistrict.name };
        } else if (process.env.NODE_ENV === 'development') {
          console.log('✅ District matched in useEffect:', {
            searched: current.area,
            found: matchedDistrict.name,
            id: districtId
          });
        }
      }
      return current; // No changes
    });
  }, [districts, selectedDistrictId]);

  // Email is the username: keep it synced from the authenticated user and prevent edits.
  useEffect(() => {
    if (!user?.email) return;
    setFormData((prev) => {
      if (prev.emailAddress && prev.emailAddress.trim()) return prev;
      return { ...prev, emailAddress: user.email };
    });
  }, [user?.email]);

  const tabs: Array<{ id: ProfileTabId; label: string; icon: IconType }> = [
    { id: "personal", label: "Personal Details", icon: FaIdCard },
    { id: "address", label: "Physical Address", icon: FaMapMarkerAlt },
    { id: "programmes", label: "Programmes", icon: FaGraduationCap },
    { id: "employment", label: "Employment Details", icon: FaBriefcase },
    { id: "submit", label: "Submit", icon: FaFileSignature },
  ];

  const tabOrder: ProfileTabId[] = ["personal", "address", "programmes", "employment", "submit"];
  const currentTabIndex = tabOrder.indexOf(activeTab);
  const renderRequiredMark = (field: string) =>
    validationErrors[field] ? <span className="text-red-500">*</span> : null;

  useEffect(() => {
    // Clear errors when changing steps
    setValidationErrors({});
  }, [activeTab]);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValidPhone = (value: string) => {
    const v = value.trim().replace(/[\s()-]+/g, '');
    if (!v) return true; // optional unless required
    return /^(?:\+27|27|0)\d{9}$/.test(v);
  };
  const isValidDob = (value: string) => {
    return parseDateInput(value) !== null;
  };

  const sanitizePhoneInput = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+")) {
      return `+${cleaned.slice(1).replace(/\+/g, "")}`;
    }
    return cleaned.replace(/\+/g, "");
  };

  const setFieldError = useCallback((field: string, message?: string) => {
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  }, []);

  const handlePhoneFieldChange = useCallback(
    (field: "cellphoneNumber" | "emergencyContact2TelNumber" | "telephoneNumber", value: string) => {
      const sanitized = sanitizePhoneInput(value);
      setFormData((prev) => ({ ...prev, [field]: sanitized }));

      if (!sanitized.trim()) {
        setFieldError(field, field === "cellphoneNumber" ? "Required" : undefined);
        return;
      }

      setFieldError(
        field,
        isValidPhone(sanitized) ? undefined : "Enter a valid South African contact number",
      );
    },
    [setFieldError],
  );

  const handlePhoneFieldBlur = useCallback(
    (field: "cellphoneNumber" | "emergencyContact2TelNumber" | "telephoneNumber", value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setFieldError(field, field === "cellphoneNumber" ? "Required" : undefined);
        return;
      }

      setFieldError(field, isValidPhone(trimmed) ? undefined : "Enter a valid South African contact number");
    },
    [setFieldError],
  );

  const handleEmailFieldChange = useCallback(
    (field: "emergencyContact2Email", value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (!value.trim()) {
        setFieldError(field);
        return;
      }
      setFieldError(field, isValidEmail(value) ? undefined : "Enter a valid email address");
    },
    [setFieldError],
  );

  const handleEmailFieldBlur = useCallback(
    (field: "emergencyContact2Email", value: string) => {
      if (!value.trim()) {
        setFieldError(field);
        return;
      }
      setFieldError(field, isValidEmail(value) ? undefined : "Enter a valid email address");
    },
    [setFieldError],
  );

  const openTermsPopup = useCallback(() => {
    setIsTermsModalOpen(true);
  }, []);

  const getSignaturePoint = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }, []);

  const startSignatureDrawing = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = signatureCanvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      const point = getSignaturePoint(event);
      if (!context || !point) return;

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      setIsDrawingSignature(true);
      context.beginPath();
      context.lineWidth = 2;
      context.lineCap = "round";
      context.strokeStyle = "#017f3f";
      context.moveTo(point.x, point.y);
      context.lineTo(point.x + 0.1, point.y + 0.1);
      context.stroke();
      setFieldError("signature");
    },
    [getSignaturePoint, setFieldError],
  );

  const drawSignature = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingSignature) return;

      const canvas = signatureCanvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      const point = getSignaturePoint(event);
      if (!context || !point) return;

      event.preventDefault();
      context.lineTo(point.x, point.y);
      context.stroke();
    },
    [getSignaturePoint, isDrawingSignature],
  );

  const stopSignatureDrawing = useCallback(
    (event?: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event) {
        event.preventDefault();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }

      if (!isDrawingSignature) return;

      const canvas = signatureCanvasRef.current;
      const context = canvas?.getContext("2d");
      if (context) {
        context.beginPath();
      }
      if (canvas) {
        setFormData((prev) => ({ ...prev, signature: canvas.toDataURL() }));
        setFieldError("signature");
      }
      setIsDrawingSignature(false);
    },
    [isDrawingSignature, setFieldError],
  );

  const clearSignature = useCallback(() => {
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    setFormData((prev) => ({ ...prev, signature: "" }));
    setFieldError("signature", "Signature is required");
  }, [setFieldError]);

  const clearSignatureCanvasOnly = useCallback(() => {
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const handleSaCitizenChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, saCitizen: value };
      if (value === 'Yes') {
        // Force SA nationality when user is a citizen
        next.nationality = 'South Africa';
      } else if (value === 'No') {
        // If they are not a citizen and nationality was SA, clear it
        if ((prev.nationality || '').trim().toLowerCase() === 'south africa') {
          next.nationality = '';
        }
      }
      return next;
    });
  };

  const handleNationalityChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, nationality: value };
      if ((value || '').trim().toLowerCase() === 'south africa') {
        next.saCitizen = 'Yes';
      } else if (value) {
        next.saCitizen = 'No';
      }
      return next;
    });
  };

  // Auto-clear validation errors as the user fixes fields (don't add new errors automatically)
  useEffect(() => {
    const keys = Object.keys(validationErrors);
    if (keys.length === 0) return;
    const computed =
      activeTab === "personal"
        ? validatePersonalBasicInfo()
        : activeTab === "address"
        ? validateAddress()
        : activeTab === "programmes"
        ? validateProgrammeRows()
        : activeTab === "employment"
        ? validateEmployment()
        : validateSubmit();
    const kept: Record<string, string> = {};
    for (const k of keys) {
      if (computed[k]) kept[k] = computed[k];
    }
    const keptKeys = Object.keys(kept);
    if (keptKeys.length !== keys.length) {
      setValidationErrors(kept);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, activeTab, programmeLinks]);

  const validatePersonalBasicInfo = () => {
    const e: Record<string, string> = {};
    // Basic Information section only
    const required: Array<keyof typeof formData> = [
      'firstName',
      'surname',
      'idPassport',
      'dateOfBirth',
      'gender',
      'raceGroup',
      'nationality',
      'saCitizen',
      'homeLanguage',
      'physicalDisability',
      'maritalStatus',
      'receivingIncome',
      'receivingGrant',
      'highestEducation',
      'cellphoneNumber',
      'emailAddress',
    ];
    for (const key of required) {
      const val = String((formData as Record<string, unknown>)[key] ?? '').trim();
      if (!val) e[String(key)] = 'Required';
    }
    if (formData.dateOfBirth && !isValidDob(formData.dateOfBirth)) {
      e.dateOfBirth = 'Use format dd/mm/yyyy';
    } else if (formData.dateOfBirth && !isAtLeastAge(formData.dateOfBirth, 15)) {
      e.dateOfBirth = 'Beneficiary must be at least 15 years old';
    }
    if (formData.emailAddress && !isValidEmail(formData.emailAddress)) {
      e.emailAddress = 'Enter a valid email address';
    }
    if (!isValidPhone(formData.cellphoneNumber)) {
      e.cellphoneNumber = 'Enter a valid South African contact number';
    }
    if (formData.emergencyContact2TelNumber && !isValidPhone(formData.emergencyContact2TelNumber)) {
      e.emergencyContact2TelNumber = 'Enter a valid South African contact number';
    }
    if (formData.emergencyContact2Email && !isValidEmail(formData.emergencyContact2Email)) {
      e.emergencyContact2Email = 'Enter a valid email address';
    }
    if (formData.physicalDisability === 'Yes' && !String(formData.physicalDisabilityDetails || '').trim()) {
      e.physicalDisabilityDetails = 'Required';
    }
    return e;
  };

  const validateAddress = () => {
    const e: Record<string, string> = {};
    // Only require addressLine1 (from Google Maps search) and settlementType
    if (!formData.addressLine1?.trim()) {
      e.addressLine1 = 'Please search and select an address';
    }
    if (!formData.settlementType?.trim()) {
      e.settlementType = 'Required';
    }
    return e;
  };

  const validateEmployment = () => {
    const e: Record<string, string> = {};
    const employmentSelection = (formData.employmentSelection || "") as EmploymentSelection;

    if (!employmentSelection) {
      e.employmentSelection = 'Please select an employment status';
      return e;
    }

    if (employmentSelection === "Currently Employed") {
      // Only require Employment Type and Salary Group when Yes is selected
      if (!String(formData.employmentType || '').trim()) {
        e.employmentType = 'Required';
      }
      if (!String(formData.salaryGroup || '').trim()) {
        e.salaryGroup = 'Required';
      }
      // Optional validation for other fields if they are filled
      if (formData.employmentType === 'Contract' && !formData.contractEndDate) {
        e.contractEndDate = 'Required for Contract employment';
      }
      if (formData.employmentCode && !/^\d+$/.test(formData.employmentCode.trim())) {
        e.employmentCode = 'Code must be numeric';
      }
      if (formData.telephoneNumber && !isValidPhone(formData.telephoneNumber)) {
        e.telephoneNumber = 'Enter a valid South African contact number';
      }
    } else if (employmentSelection === "Not employed") {
      // Not employed - require Employment Status and Reason
      if (!String(formData.employmentStatus || '').trim()) {
        e.employmentStatus = 'Required';
      }
      if (!String(formData.unemploymentReason || '').trim()) {
        e.unemploymentReason = 'Required';
      }
    } else if (employmentSelection === "Volunteering") {
      if (!String(formData.stipendPayFrequency || "").trim()) {
        e.stipendPayFrequency = "Required";
      }
      if (formData.stipend && !String(formData.salaryGroup || "").trim()) {
        e.salaryGroup = "Required";
      }
    }

    return e;
  };

  const validateSubmit = () => {
    const e: Record<string, string> = {};
    if (!formData.signature) {
      e.signature = "Please sign before submitting your profile";
    }
    if (!formData.acceptedTerms) {
      e.acceptedTerms = "You must agree to the Terms and Conditions";
    }
    return e;
  };

  const programmeRowsValidationErrors = validateProgrammeRows();
  const programmesStepNeedsProofAttention =
    programmesMissingProofEvidenceRows.length > 0 && Object.keys(programmeRowsValidationErrors).length === 0;

  const tabCompletion: Record<ProfileTabId, boolean> = {
    personal: Object.keys(validatePersonalBasicInfo()).length === 0,
    address: Object.keys(validateAddress()).length === 0,
    programmes:
      Object.keys(programmeRowsValidationErrors).length === 0 && programmesMissingProofEvidenceRows.length === 0,
    employment: Object.keys(validateEmployment()).length === 0,
    submit: Object.keys(validateSubmit()).length === 0,
  };

  const validateFullProfile = () => {
    const personalErrors = validatePersonalBasicInfo();
    const addressErrors = validateAddress();
    const programmeErrors = validateProgrammeRows();
    const employmentErrors = validateEmployment();
    const submitErrors = validateSubmit();

    const combinedErrors = {
      ...personalErrors,
      ...addressErrors,
      ...programmeErrors,
      ...employmentErrors,
      ...submitErrors,
    };

    const firstInvalidTab =
      Object.keys(personalErrors).length > 0
        ? "personal"
        : Object.keys(addressErrors).length > 0
        ? "address"
        : Object.keys(programmeErrors).length > 0
        ? "programmes"
        : Object.keys(employmentErrors).length > 0
        ? "employment"
        : Object.keys(submitErrors).length > 0
        ? "submit"
        : null;

    return { combinedErrors, firstInvalidTab };
  };

  const showValidationToast = useCallback(
    (errors: Record<string, string>, title = "Validation Required") => {
      const firstMessage = Object.values(errors)[0];
      if (!firstMessage) return;

      clearAll();
      addNotification({
        type: "warning",
        title,
        message: firstMessage,
        duration: 4200,
      });
    },
    [addNotification, clearAll],
  );

  const validateCurrentStep = () => {
    const e =
      activeTab === "personal"
        ? validatePersonalBasicInfo()
        : activeTab === "address"
        ? validateAddress()
        : activeTab === "programmes"
        ? validateProgrammeRows()
        : validateEmployment();
    setValidationErrors(e);
    if (Object.keys(e).length > 0) {
      showValidationToast(e, "Please Review This Section");
    }
    return Object.keys(e).length === 0;
  };

  const handleStepNavigate = (target: ProfileTabId) => {
    const targetIndex = tabOrder.indexOf(target);
    if (targetIndex <= currentTabIndex) {
      setValidationErrors({});
      setActiveTab(target);
      return;
    }
    if (validateCurrentStep()) {
      setActiveTab(target);
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    const next = tabOrder[currentTabIndex + 1];
    if (next) setActiveTab(next);
  };

  const handleBack = () => {
    const prev = tabOrder[currentTabIndex - 1];
    if (prev) {
      setValidationErrors({});
      setActiveTab(prev);
    }
  };

  const googleMapsApiKey = environment.googleMapsApiKey;
  const hasGoogleMapsApiKey = !!googleMapsApiKey;
  const shouldLoadGoogleMaps = activeTab === 'address' && hasGoogleMapsApiKey;

  // Warn once if user opens Address tab without a key (prevents noisy console spam)
  useEffect(() => {
    if (activeTab !== 'address') return;
    if (hasGoogleMapsApiKey) return;
    if (hasWarnedMissingGoogleKeyRef.current) return;
    hasWarnedMissingGoogleKeyRef.current = true;
    console.warn(
      "Google Maps Autocomplete is disabled: missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. " +
      "Add it to .env.local and restart the dev server."
    );
  }, [activeTab, hasGoogleMapsApiKey]);

  const adminBeneficiaryDisplayName = useMemo(() => {
    const parts = [normalizeString(formData.firstName), normalizeString(formData.surname)].filter(Boolean);
    return parts.join(' ');
  }, [formData.firstName, formData.surname]);

  const adminBeneficiaryAge = useMemo(
    () => computeAgeFromDateOfBirth(formData.dateOfBirth),
    [formData.dateOfBirth],
  );

  const adminSmsModalLabel = useMemo(() => {
    const name = adminBeneficiaryDisplayName;
    const id = normalizeString(formData.idPassport);
    if (name && id) return `${name} - ${id}`;
    if (name) return name;
    if (id) return id;
    return "Beneficiary";
  }, [adminBeneficiaryDisplayName, formData.idPassport]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#017f3f]/20 border-t-[#017f3f] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const profileMain = (
    <>
            {/* Progress steps — horizontal stepper (circles + connectors; labels centered below each step) */}
            <nav className="mb-8 w-full" aria-label="Profile steps">
              <ol className="m-0 flex w-full list-none gap-0 p-0">
                {tabs.map((tab, index) => {
                  const isActive = activeTab === tab.id;
                  const isCompleted = tabCompletion[tab.id];
                  const isProgrammesProofWarning = tab.id === "programmes" && programmesStepNeedsProofAttention;
                  const isUpcoming =
                    !isCompleted && !isProgrammesProofWarning && currentTabIndex < index;
                  const previousTab = index > 0 ? tabs[index - 1] : null;
                  const previousTabCompleted = previousTab ? tabCompletion[previousTab.id] : false;
                  return (
                    <li key={tab.id} className="flex min-w-0 flex-1 flex-col items-center">
                      <div className="flex w-full items-center justify-center">
                        {index > 0 && (
                          <div
                            className={cn(
                              "min-h-[2px] min-w-0 flex-1 rounded-full transition-colors",
                              previousTabCompleted
                                ? "h-[3px] bg-hwseta-green-dark sm:h-1"
                                : "h-0.5 bg-slate-300 sm:h-[3px]",
                            )}
                            aria-hidden
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleStepNavigate(tab.id)}
                          className={cn(
                            "relative z-10 mx-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-white text-xs font-semibold transition-colors sm:h-11 sm:w-11 sm:text-sm",
                            isCompleted &&
                              "border-hwseta-green-dark text-hwseta-green-dark hover:border-hwseta-green",
                            isProgrammesProofWarning &&
                              "border-amber-500 text-amber-600 bg-amber-50/90 hover:border-amber-600 hover:bg-amber-50",
                            isActive &&
                              !isCompleted &&
                              !isProgrammesProofWarning &&
                              "border-hwseta-green-dark text-hwseta-green-dark shadow-[0_0_0_3px_rgba(1,127,63,0.15)]",
                            isActive &&
                              isProgrammesProofWarning &&
                              "shadow-[0_0_0_3px_rgba(245,158,11,0.35)]",
                            isUpcoming &&
                              "border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50",
                          )}
                          aria-current={isActive ? "step" : undefined}
                          aria-label={
                            isProgrammesProofWarning
                              ? "Programmes: proof of evidence still needed for completed programme(s)"
                              : undefined
                          }
                        >
                          {isCompleted ? (
                            <FaCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                          ) : isProgrammesProofWarning ? (
                            <FaExclamationTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                          ) : (
                            index + 1
                          )}
                        </button>
                        {index < tabs.length - 1 && (
                          <div
                            className={cn(
                              "min-h-[2px] min-w-0 flex-1 rounded-full transition-colors",
                              isCompleted
                                ? "h-[3px] bg-hwseta-green-dark sm:h-1"
                                : "h-0.5 bg-slate-300 sm:h-[3px]",
                            )}
                            aria-hidden
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStepNavigate(tab.id)}
                        className={cn(
                          "mt-3 w-full max-w-[9.5rem] px-1 text-center text-[0.65rem] leading-snug transition-colors sm:max-w-[11rem] sm:text-sm",
                          isActive && !isProgrammesProofWarning && "font-semibold text-hwseta-green-dark",
                          isActive && isProgrammesProofWarning && "font-semibold text-amber-800",
                          isCompleted && !isActive && "font-medium text-slate-600 hover:text-hwseta-green-dark",
                          isProgrammesProofWarning && !isActive && "font-semibold text-amber-800 hover:text-amber-900",
                          isUpcoming && "font-medium text-slate-500 hover:text-slate-700",
                        )}
                      >
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Form Content */}
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
              {/* Personal Details Tab */}
              {activeTab === 'personal' && (
                <div className="space-y-6 px-6 pb-8 pt-6 sm:px-8">
                    {/* Profile Photo Section - Collapsible */}
                    <div className="border-b border-slate-200/80 pb-6">
                      <button
                        type="button"
                        onClick={() => setIsProfilePhotoOpen(!isProfilePhotoOpen)}
                        className="flex w-full items-center justify-between py-1 transition-colors hover:opacity-80"
                      >
                        <div className="flex flex-col items-start">
                          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FaCamera className="h-5 w-5 text-[#017f3f]" />
                            Profile Photo
                          </h2>
                          <p className="mt-1 text-sm text-gray-500">Upload or capture your profile picture</p>
                        </div>
                        {isProfilePhotoOpen ? (
                          <FaChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <FaChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                      
                      {isProfilePhotoOpen && (
                        <div className="pt-4">
                          <div className="flex flex-row items-center justify-end gap-4">
                            <div className="flex flex-row gap-2">
                              <button
                                type="button"
                                onClick={handleOpenCamera}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#017f3f] text-white font-semibold hover:bg-[#015c2e] transition-colors"
                              >
                                <FaCamera className="w-4 h-4" />
                                <span>Open Camera</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleUploadClick}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 hover:border-[#017f3f] transition-colors"
                              >
                                <FaUpload className="w-4 h-4" />
                                <span>Upload Photo</span>
                              </button>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                            </div>
                            <div className="w-40 h-40 rounded-2xl bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300 flex-shrink-0">
                              {profilePhoto ? (
                                // eslint-disable-next-line @next/next/no-img-element -- data URL preview from upload/camera
                                <img 
                                  src={profilePhoto} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FaUser className="w-16 h-16 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Basic Information Section - Collapsible */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsBasicInfoOpen(!isBasicInfoOpen)}
                        className="flex w-full items-center justify-between py-1 transition-colors hover:opacity-80"
                      >
                        <div className="flex flex-col items-start">
                          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FaIdCard className="h-5 w-5 text-[#017f3f]" />
                            Basic Information
                          </h2>
                          <p className="mt-1 text-sm text-gray-500">Your basic personal information</p>
                        </div>
                        {isBasicInfoOpen ? (
                          <FaChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <FaChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                      
                      {isBasicInfoOpen && (
                        <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">First Name {renderRequiredMark("firstName")}</label>
                                <input
                                  type="text"
                                  value={formData.firstName}
                                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                  aria-invalid={!!validationErrors.firstName}
                                  className={cn(
                                    "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4",
                                    validationErrors.firstName
                                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                                      : "border-gray-200 focus:border-[#017f3f] focus:ring-[#017f3f]/10"
                                  )}
                                />
                                {validationErrors.firstName && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.firstName}</p>
                                )}
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Surname {renderRequiredMark("surname")}</label>
                                <input
                                  type="text"
                                  value={formData.surname}
                                  onChange={(e) => setFormData({...formData, surname: e.target.value})}
                                  aria-invalid={!!validationErrors.surname}
                                  className={cn(
                                    "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4",
                                    validationErrors.surname
                                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                                      : "border-gray-200 focus:border-[#017f3f] focus:ring-[#017f3f]/10"
                                  )}
                                />
                                {validationErrors.surname && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.surname}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">ID/Passport Nr {renderRequiredMark("idPassport")}</label>
                                <input
                                  type="text"
                                  value={formData.idPassport}
                                  onChange={(e) => setFormData({...formData, idPassport: e.target.value})}
                                  disabled={hasProfile === true}
                                  aria-invalid={!!validationErrors.idPassport}
                                  className={cn(
                                    "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
                                    validationErrors.idPassport
                                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                                      : "border-gray-200 focus:border-[#017f3f] focus:ring-[#017f3f]/10"
                                  )}
                                />
                                {validationErrors.idPassport && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.idPassport}</p>
                                )}
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Date of Birth {renderRequiredMark("dateOfBirth")}</label>
                                <SyncfusionIsoDatePicker
                                  value={formData.dateOfBirth}
                                  onChange={(iso) => setFormData((prev) => ({ ...prev, dateOfBirth: iso }))}
                                  max={new Date()}
                                  hasError={!!validationErrors.dateOfBirth}
                                />
                                {validationErrors.dateOfBirth && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.dateOfBirth}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Gender {renderRequiredMark("gender")}</label>
                                <select
                                  value={formData.gender}
                                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                  aria-invalid={!!validationErrors.gender}
                                  className={profileSelectClass(!!validationErrors.gender)}
                                >
                                  <option value="">Select Gender</option>
                                  {genders.map((gender) => (
                                    <option key={gender.id ?? gender.name} value={gender.name}>
                                      {gender.name}
                                    </option>
                                  ))}
                                </select>
                                {validationErrors.gender && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.gender}</p>
                                )}
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Race Group {renderRequiredMark("raceGroup")}</label>
                                <select
                                  value={formData.raceGroup}
                                  onChange={(e) => setFormData({...formData, raceGroup: e.target.value})}
                                  aria-invalid={!!validationErrors.raceGroup}
                                  className={profileSelectClass(!!validationErrors.raceGroup)}
                                >
                                  <option value="">Select Race Group</option>
                                  {raceGroups.map((raceGroup) => (
                                    <option key={raceGroup.id ?? raceGroup.name} value={raceGroup.name}>
                                      {raceGroup.name}
                                    </option>
                                  ))}
                                </select>
                                {validationErrors.raceGroup && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.raceGroup}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">South African Citizen? {renderRequiredMark("saCitizen")}</label>
                                <YesNoSegmentedControl
                                  value={formData.saCitizen}
                                  onChange={(next) => handleSaCitizenChange(next)}
                                  hasError={!!validationErrors.saCitizen}
                                />
                                {validationErrors.saCitizen && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.saCitizen}</p>
                                )}
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Nationality {renderRequiredMark("nationality")}</label>
                                <select
                                  value={formData.nationality}
                                  onChange={(e) => handleNationalityChange(e.target.value)}
                                  aria-invalid={!!validationErrors.nationality}
                                  className={profileSelectClass(!!validationErrors.nationality)}
                                >
                                  <option value="">Select Nationality</option>
                                  {countries.map((country) => (
                                    <option key={country.id || country.name} value={country.name}>
                                      {country.name}
                                    </option>
                                  ))}
                                </select>
                                {validationErrors.nationality && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.nationality}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Home Language {renderRequiredMark("homeLanguage")}</label>
                                <select
                                  value={formData.homeLanguage}
                                  onChange={(e) => setFormData({...formData, homeLanguage: e.target.value})}
                                  aria-invalid={!!validationErrors.homeLanguage}
                                  className={profileSelectClass(!!validationErrors.homeLanguage)}
                                >
                                  <option value="">Select Home Language</option>
                                  {homeLanguages.map((hl) => (
                                    <option key={hl.id || hl.name} value={hl.name}>
                                      {hl.name}
                                    </option>
                                  ))}
                                </select>
                                {validationErrors.homeLanguage && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.homeLanguage}</p>
                                )}
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Marital Status {renderRequiredMark("maritalStatus")}</label>
                                <select
                                  value={formData.maritalStatus}
                                  onChange={(e) => setFormData({...formData, maritalStatus: e.target.value})}
                                  aria-invalid={!!validationErrors.maritalStatus}
                                  className={profileSelectClass(!!validationErrors.maritalStatus)}
                                >
                                  <option value="">Select Marital Status</option>
                                  {maritalStatuses.map((status) => (
                                    <option key={status.id || status.name} value={status.name}>
                                      {status.name}
                                    </option>
                                  ))}
                                </select>
                                {validationErrors.maritalStatus && (
                                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.maritalStatus}</p>
                                )}
                              </div>
                            </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Highest Education {renderRequiredMark("highestEducation")}</label>
                          <select
                            value={formData.highestEducation}
                            onChange={(e) => setFormData({...formData, highestEducation: e.target.value})}
                            aria-invalid={!!validationErrors.highestEducation}
                            className={profileSelectClass(!!validationErrors.highestEducation)}
                          >
                            <option value="">Select Highest Education</option>
                            {highestEducation.map((education) => (
                              <option key={education.id ?? education.name} value={education.name}>
                                {education.name}
                              </option>
                            ))}
                          </select>
                          {validationErrors.highestEducation && (
                            <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.highestEducation}</p>
                          )}
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Physical Disability {renderRequiredMark("physicalDisability")}</label>
                          <YesNoSegmentedControl
                            value={formData.physicalDisability}
                            onChange={(next) =>
                              setFormData({
                                ...formData,
                                physicalDisability: next,
                                physicalDisabilityDetails: next === "Yes" ? formData.physicalDisabilityDetails : "",
                              })
                            }
                            hasError={!!validationErrors.physicalDisability}
                          />
                          {validationErrors.physicalDisability && (
                            <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.physicalDisability}</p>
                          )}
                        </div>
                      </div>

                      {formData.physicalDisability === "Yes" && (
                        <div className="mt-6">
                          <label className="mb-2 block text-sm font-semibold text-gray-700">If yes, please specify {renderRequiredMark("physicalDisabilityDetails")}</label>
                          <input
                            type="text"
                            value={formData.physicalDisabilityDetails}
                            onChange={(e) => setFormData({...formData, physicalDisabilityDetails: e.target.value})}
                            placeholder="Specify the physical disability"
                            aria-invalid={!!validationErrors.physicalDisabilityDetails}
                            className={cn(
                              "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4",
                              validationErrors.physicalDisabilityDetails
                                ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                                : "border-gray-200 focus:border-[#017f3f] focus:ring-[#017f3f]/10"
                            )}
                          />
                          {validationErrors.physicalDisabilityDetails && (
                            <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.physicalDisabilityDetails}</p>
                          )}
                        </div>
                      )}

                      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Are you receiving a Grant? {renderRequiredMark("receivingGrant")}</label>
                          <select
                            value={formData.receivingGrant}
                            onChange={(e) => setFormData({...formData, receivingGrant: e.target.value})}
                            aria-invalid={!!validationErrors.receivingGrant}
                            className={profileSelectClass(!!validationErrors.receivingGrant)}
                          >
                            <option value="">Select Grant Type</option>
                            {grantTypes.map((grant) => (
                              <option key={grant.id || grant.name} value={grant.name}>
                                {grant.name}
                              </option>
                            ))}
                          </select>
                          {validationErrors.receivingGrant && (
                            <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.receivingGrant}</p>
                          )}
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Are you receiving an income or financial support? {renderRequiredMark("receivingIncome")}</label>
                          <YesNoSegmentedControl
                            value={formData.receivingIncome}
                            onChange={(next) => setFormData({...formData, receivingIncome: next})}
                            hasError={!!validationErrors.receivingIncome}
                          />
                          {validationErrors.receivingIncome && (
                            <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.receivingIncome}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Primary Cellphone Number {renderRequiredMark("cellphoneNumber")}</label>
                          <input
                            type="text"
                            inputMode="tel"
                            value={formData.cellphoneNumber}
                            onChange={(e) => handlePhoneFieldChange("cellphoneNumber", e.target.value)}
                            onBlur={(e) => handlePhoneFieldBlur("cellphoneNumber", e.target.value)}
                            aria-invalid={!!validationErrors.cellphoneNumber}
                            className={cn(
                              "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4",
                              validationErrors.cellphoneNumber
                                ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                                : "border-gray-200 focus:border-[#017f3f] focus:ring-[#017f3f]/10"
                            )}
                          />
                          {validationErrors.cellphoneNumber && (
                            <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.cellphoneNumber}</p>
                          )}
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Primary Email Address {renderRequiredMark("emailAddress")}</label>
                          <input
                            type="email"
                            value={formData.emailAddress}
                            disabled
                            readOnly
                            aria-invalid={!!validationErrors.emailAddress}
                            className={cn(
                              "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed",
                              validationErrors.emailAddress
                                ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                                : "border-gray-200 focus:border-[#017f3f] focus:ring-[#017f3f]/10"
                            )}
                          />
                          {validationErrors.emailAddress && (
                            <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.emailAddress}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Alternative Contact Number</label>
                          <input
                            type="text"
                            inputMode="tel"
                            value={formData.emergencyContact2TelNumber}
                            onChange={(e) => handlePhoneFieldChange("emergencyContact2TelNumber", e.target.value)}
                            onBlur={(e) => handlePhoneFieldBlur("emergencyContact2TelNumber", e.target.value)}
                            aria-invalid={!!validationErrors.emergencyContact2TelNumber}
                            className={profileInputClass(!!validationErrors.emergencyContact2TelNumber)}
                          />
                          {validationErrors.emergencyContact2TelNumber && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {validationErrors.emergencyContact2TelNumber}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Alternative Email Address</label>
                          <input
                            type="email"
                            value={formData.emergencyContact2Email}
                            onChange={(e) => handleEmailFieldChange("emergencyContact2Email", e.target.value)}
                            onBlur={(e) => handleEmailFieldBlur("emergencyContact2Email", e.target.value)}
                            aria-invalid={!!validationErrors.emergencyContact2Email}
                            className={profileInputClass(!!validationErrors.emergencyContact2Email)}
                          />
                          {validationErrors.emergencyContact2Email && (
                            <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.emergencyContact2Email}</p>
                          )}
                        </div>
                      </div>

                    </div>
                      )}
                    </div>
                </div>
              )}

              {/* Physical Address Tab */}
              {activeTab === 'address' && (
                <div className="px-6 pb-8 pt-6 sm:px-8">
                    <div className="bg-gray-50/50 rounded-xl p-6 space-y-6">
                      {/* Google Maps Address Search */}
                      <div>
                        {!hasGoogleMapsApiKey && (
                          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <strong className="font-semibold">Address search is disabled.</strong> Add{" "}
                            <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">
                              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                            </code>{" "}
                            to <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">.env.local</code>, enable{" "}
                            <strong>Maps JavaScript API</strong> and <strong>Places API</strong> for that key, then restart
                            the dev server.
                          </div>
                        )}
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          <FaMapMarkerAlt className="inline h-4 w-4 mr-2 text-[#017f3f]" />
                          Search Address
                          <span className="ml-1 text-red-600">*</span>
                        </label>
                        <p className="mb-3 text-xs text-gray-500">Start typing to search for your address using Google Maps</p>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                            <FaMapMarkerAlt className="h-5 w-5" />
                          </span>
                          <input
                            ref={addressInputRef}
                            type="text"
                            defaultValue=""
                            placeholder="Start typing an address"
                            autoComplete="off"
                            id="address-autocomplete-input"
                            className="w-full rounded-xl border-2 border-gray-200 bg-white pl-9 pr-3 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Powered by Google Places</p>
                      </div>

                      {/* Address Line 1 and Line 2 - Same Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Address (line 1)
                            {validationErrors.addressLine1 && (
                              <span className="ml-1 text-red-600 text-xs">*</span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={formData.addressLine1}
                            onChange={(e) => {
                              setFormData({...formData, addressLine1: e.target.value});
                              if (validationErrors.addressLine1 && e.target.value.trim()) {
                                const newErrors = {...validationErrors};
                                delete newErrors.addressLine1;
                                setValidationErrors(newErrors);
                              }
                            }}
                            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                          />
                          {validationErrors.addressLine1 && (
                            <p className="mt-1 text-xs text-red-600">{validationErrors.addressLine1}</p>
                          )}
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">Address (line 2)</label>
                          <input
                            type="text"
                            value={formData.addressLine2}
                            onChange={(e) => setFormData({...formData, addressLine2: e.target.value})}
                            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                          />
                        </div>
                      </div>

                      {/* Rest of the fields in two columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-5">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Province</label>
                            <select
                              value={formData.province}
                              onChange={handleProvinceChange}
                              disabled
                              className={adminFormTheme.select}
                            >
                              <option value="">Select Province</option>
                              {provinces.map((province) => (
                                <option key={province.id} value={province.name}>
                                  {province.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Municipality</label>
                            <select
                              value={formData.municipality}
                              onChange={handleMunicipalityChange}
                              disabled
                              className={adminFormTheme.select}
                            >
                              <option value="">Select Municipality</option>
                              {municipalities.map((municipality) => (
                                <option key={municipality.id} value={municipality.name}>
                                  {municipality.name}
                                </option>
                              ))}
                              {formData.municipality && !municipalities.some(m => m.name === formData.municipality) && (
                                <option value={formData.municipality}>{formData.municipality}</option>
                              )}
                            </select>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-5">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Area (District)</label>
                            <select
                              value={formData.area}
                              onChange={handleDistrictChange}
                              disabled
                              className={adminFormTheme.select}
                            >
                              <option value="">Select Area</option>
                              {districts.map((district) => (
                                <option key={district.id} value={district.name}>
                                  {district.name}
                                </option>
                              ))}
                              {formData.area && !districts.some(d => d.name === formData.area) && (
                                <option value={formData.area}>{formData.area}</option>
                              )}
                            </select>
                          </div>

                          {/* Suburb and Code - Same Row (70% / 30%) */}
                          <div className="grid grid-cols-1 md:grid-cols-[70%_30%] gap-6">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-700">Suburb</label>
                              <select
                                value={formData.suburb}
                                onChange={handleSuburbChange}
                                disabled
                                className={adminFormTheme.select}
                              >
                                <option value="">Select Suburb</option>
                                {suburbs.map((suburb) => (
                                  <option key={suburb.id} value={suburb.name}>
                                    {suburb.name}
                                  </option>
                                ))}
                                {formData.suburb && !suburbs.some(s => s.name === formData.suburb) && (
                                  <option value={formData.suburb}>{formData.suburb}</option>
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-700">Code</label>
                              <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({...formData, code: e.target.value})}
                                placeholder="Enter postal code"
                                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Settlement Type - Last Row */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Settlement Type
                          <span className="ml-1 text-red-600">*</span>
                          {validationErrors.settlementType && (
                            <span className="ml-2 text-xs text-red-600">({validationErrors.settlementType})</span>
                          )}
                        </label>
                        <select
                          value={formData.settlementType}
                          onChange={(e) => {
                            setFormData({...formData, settlementType: e.target.value});
                            if (validationErrors.settlementType && e.target.value.trim()) {
                              const newErrors = {...validationErrors};
                              delete newErrors.settlementType;
                              setValidationErrors(newErrors);
                            }
                          }}
                          className={profileSelectClass(!!validationErrors.settlementType, "errorBg")}
                        >
                          <option value="">Select Settlement Type</option>
                          {residentialTypes.map((type) => (
                            <option key={type.id ?? type.name} value={type.name}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        {validationErrors.settlementType && (
                          <p className="mt-1 text-xs text-red-600">{validationErrors.settlementType}</p>
                        )}
                      </div>
                    </div>
                </div>
              )}

              {/* Programmes (Step 3) */}
              {activeTab === "programmes" && (
                <div className="px-6 pb-8 pt-6 sm:px-8">
                  <div className="space-y-6">
                    {programmesMissingProofEvidenceRows.length > 0 && (
                      <div className="rounded-xl bg-amber-50/95 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <FaExclamationTriangle className="h-5 w-5" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-amber-950 sm:text-base">
                              Proof of evidence still needed
                            </h3>
                            <p className="mt-1 text-sm text-amber-900/90">
                              The following programme(s) are marked <span className="font-semibold">Completed</span> but
                              have no proof documents uploaded yet. You can upload them when you are ready — choose{" "}
                              <span className="font-semibold">Edit</span> on the row in the list below, then add files
                              under proof of evidence.
                            </p>
                            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm font-medium text-amber-950">
                              {programmesMissingProofEvidenceRows.map((row) => (
                                <li key={row.clientId}>
                                  <span className="font-semibold">{getProgrammeRowDisplayName(row, programmeOptions)}</span>
                                  {" — "}
                                  completed, but no proof of evidence uploaded.
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={programmeFormTopRef} tabIndex={-1} className="outline-none">
                      <div className="mb-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            resetProgrammeDraft();
                            setIsProgrammeEditorOpen(true);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#017f3f] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016533]"
                        >
                          <FaPlus className="h-3.5 w-3.5" />
                          Add Programme
                        </button>
                      </div>

                      {isProgrammeEditorOpen && (
                      <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:p-6">
                        <button
                          type="button"
                          aria-label="Close programme editor"
                          onClick={() => setIsProgrammeEditorOpen(false)}
                          className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
                        />
                        <div
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="programme-editor-title"
                          className="relative z-10 max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl"
                        >
                          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-4 backdrop-blur-sm sm:px-6">
                            <h4 id="programme-editor-title" className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                              {editingProgrammeClientId ? "Edit programme" : "Add programme"}
                            </h4>
                            <button
                              type="button"
                              onClick={() => setIsProgrammeEditorOpen(false)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 sm:self-center"
                              aria-label="Close"
                            >
                              ×
                            </button>
                          </div>

                          <div className="px-5 pb-7 pt-3 sm:px-6">
                            <p className="mb-4 text-sm leading-relaxed text-slate-600">
                              Complete the fields below, then use <span className="font-semibold text-slate-800">Next</span>{" "}
                              to review completion and proof, or switch tabs once details are valid.
                            </p>
                            <div>
                              <div
                                role="tablist"
                                aria-label="Programme editor sections"
                                className="mb-4 flex flex-wrap gap-2"
                              >
                                <button
                                  type="button"
                                  role="tab"
                                  aria-selected={programmeEditorModalTab === "details"}
                                  id="programme-editor-tab-details"
                                  aria-controls="programme-editor-panel-details"
                                  tabIndex={programmeEditorModalTab === "details" ? 0 : -1}
                                  onClick={() => setProgrammeEditorModalTab("details")}
                                  className={cn(
                                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#017f3f]/35",
                                    programmeEditorModalTab === "details"
                                      ? "bg-hwseta-green text-white shadow-md shadow-emerald-900/15"
                                      : "bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200/85 hover:bg-slate-50 hover:text-slate-900",
                                  )}
                                >
                                  <FaGraduationCap className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                                  Programme details
                                </button>
                                <button
                                  type="button"
                                  role="tab"
                                  aria-selected={programmeEditorModalTab === "completion"}
                                  id="programme-editor-tab-completion"
                                  aria-controls="programme-editor-panel-completion"
                                  tabIndex={programmeEditorModalTab === "completion" ? 0 : -1}
                                  onClick={() => {
                                    if (programmeEditorModalTab === "completion") return;
                                    void goToProgrammeEditorCompletionTab();
                                  }}
                                  className={cn(
                                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#017f3f]/35",
                                    programmeEditorModalTab === "completion"
                                      ? "bg-hwseta-green text-white shadow-md shadow-emerald-900/15"
                                      : "bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200/85 hover:bg-slate-50 hover:text-slate-900",
                                  )}
                                >
                                  <FaCheck className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                                  Completion &amp; proof
                                </button>
                              </div>
                              <div className="bg-[linear-gradient(180deg,#fafdfb_0%,#f8fafc_100%)] px-5 py-5 sm:px-6 sm:py-6">
                              {programmeEditorModalTab === "details" ? (
                              <div
                                ref={programmeEditorDetailsPanelRef}
                                role="tabpanel"
                                id="programme-editor-panel-details"
                                aria-labelledby="programme-editor-tab-details"
                                className="grid grid-cols-1 gap-5 xl:grid-cols-2"
                              >
                            <SearchableSelectField
                              label="Programme"
                              placeholder="Select a programme"
                              value={programmeDraft.programmeId}
                              selectedLabel={
                                programmeSearchOptions.find((option) => option.value === programmeDraft.programmeId)?.label ?? ""
                              }
                              options={programmeSearchOptions}
                              openWithFullList
                              selectionOnly
                              resetToken={`programme-${programmeDraftCustomFields.programme}-${programmeDraft.programmeId}-${programmeDraft.programmeName}`}
                              onSelect={(nextProgrammeId) => {
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  programmeId: nextProgrammeId,
                                  programmeName: "",
                                }));
                                setProgrammeDraftCustomFields((current) => ({
                                  ...current,
                                  programme: false,
                                }));
                              }}
                              error={getProgrammeFieldError(programmeDraft.clientId, "programme")}
                            />

                            <SearchableSelectField
                              label="Qualification"
                              placeholder={
                                programmeDraftQualificationOptions.length === 0
                                  ? "Loading qualifications..."
                                  : "Type to search qualifications"
                              }
                              value={
                                programmeDraft.qualificationId ||
                                (!programmeDraft.qualificationId && programmeDraft.qualificationName.trim()
                                  ? programmeDraft.qualificationName
                                  : "")
                              }
                              selectedLabel={
                                programmeDraft.qualificationId
                                  ? programmeDraftQualificationOptions.find(
                                      (option) => option.value === programmeDraft.qualificationId,
                                    )?.label ??
                                    qualificationNameById.get(programmeDraft.qualificationId) ??
                                    programmeDraft.qualificationName
                                  : programmeDraft.qualificationName
                              }
                              options={programmeDraftQualificationOptions}
                              openWithFullList
                              resetToken={`qualification-${programmeDraftCustomFields.qualification}-${programmeDraft.qualificationId}-${programmeDraft.qualificationName}-${programmeDraftQualificationOptions.length}`}
                              onSelect={(value) =>
                                updateProgrammeDraft((current) => {
                                  const byId = qualificationOptions.find((q) => q.id === value);
                                  if (byId) {
                                    return {
                                      ...current,
                                      qualificationId: byId.id,
                                      qualificationName: byId.name,
                                    };
                                  }
                                  const nameFromId = qualificationNameById.get(value);
                                  if (nameFromId) {
                                    return {
                                      ...current,
                                      qualificationId: value,
                                      qualificationName: nameFromId,
                                    };
                                  }
                                  const byName = qualificationOptions.find((q) => q.name === value);
                                  if (byName) {
                                    return {
                                      ...current,
                                      qualificationId: byName.id,
                                      qualificationName: byName.name,
                                    };
                                  }
                                  return {
                                    ...current,
                                    qualificationId: "",
                                    qualificationName: value,
                                  };
                                })
                              }
                              disabled={programmeDraftQualificationOptions.length === 0}
                              customVisible={programmeDraftCustomFields.qualification}
                              customTriggerLabel="Can't find the qualification? Click here to add manually"
                              customInputPlaceholder="Type qualification manually"
                              customValue={programmeDraft.qualificationName}
                              onShowCustom={() => {
                                showProgrammeDraftCustomField("qualification");
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  qualificationId: "",
                                  qualificationName: "",
                                }));
                              }}
                              onHideCustom={() => {
                                hideProgrammeDraftCustomField("qualification");
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  qualificationId: "",
                                  qualificationName: "",
                                }));
                              }}
                              onCustomChange={(value) =>
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  qualificationId: "",
                                  qualificationName: value,
                                }))
                              }
                            />

                            <SearchableSelectField
                              label="Training Provider"
                              placeholder="Type to search providers"
                              value={programmeDraft.trainingProviderId}
                              selectedLabel={
                                trainingProviderSearchOptions.find(
                                  (option) => option.value === programmeDraft.trainingProviderId,
                                )?.label ??
                                programmeDraft.trainingProviderName ??
                                ""
                              }
                              options={trainingProviderSearchOptions}
                              openWithFullList
                              resetToken={`training-provider-${programmeDraftCustomFields.trainingProvider}-${programmeDraft.trainingProviderId}-${programmeDraft.trainingProviderName}-${trainingProviderSearchOptions.length}`}
                              onSelect={(value) =>
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  trainingProviderId: value,
                                  trainingProviderName: "",
                                }))
                              }
                              error={getProgrammeFieldError(programmeDraft.clientId, "trainingProvider")}
                              customVisible={programmeDraftCustomFields.trainingProvider}
                              customTriggerLabel="Can't find the provider? Click here to add manually"
                              customInputPlaceholder="Type training provider manually"
                              customValue={programmeDraft.trainingProviderName}
                              onShowCustom={() => {
                                showProgrammeDraftCustomField("trainingProvider");
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  trainingProviderId: "",
                                }));
                              }}
                              onHideCustom={() => {
                                hideProgrammeDraftCustomField("trainingProvider");
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  trainingProviderName: "",
                                }));
                              }}
                              onCustomChange={(value) =>
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  trainingProviderName: value,
                                  trainingProviderId: "",
                                }))
                              }
                            />

                            <SearchableSelectField
                              label="Employer"
                              placeholder="Type to search employers"
                              value={programmeDraft.employerId}
                              selectedLabel={
                                employerSearchOptions.find((option) => option.value === programmeDraft.employerId)?.label ??
                                programmeDraft.employerName ??
                                ""
                              }
                              options={employerSearchOptions}
                              openWithFullList
                              resetToken={`employer-${programmeDraftCustomFields.employer}-${programmeDraft.employerId}-${programmeDraft.employerName}-${employerSearchOptions.length}`}
                              onSelect={(value) =>
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  employerId: value,
                                  employerName: "",
                                }))
                              }
                              error={getProgrammeFieldError(programmeDraft.clientId, "employer")}
                              customVisible={programmeDraftCustomFields.employer}
                              customTriggerLabel="Can't find the employer? Click here to add manually"
                              customInputPlaceholder="Type employer manually"
                              customValue={programmeDraft.employerName}
                              onShowCustom={() => {
                                showProgrammeDraftCustomField("employer");
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  employerId: "",
                                }));
                              }}
                              onHideCustom={() => {
                                hideProgrammeDraftCustomField("employer");
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  employerName: "",
                                }));
                              }}
                              onCustomChange={(value) =>
                                updateProgrammeDraft((current) => ({
                                  ...current,
                                  employerName: value,
                                  employerId: "",
                                }))
                              }
                            />

                            <div className="space-y-2.5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Estimated Programme Start Date
                              </p>
                              <SyncfusionIsoDatePicker
                                value={programmeDraft.startDate}
                                onChange={(iso) =>
                                  updateProgrammeDraft((current) => ({
                                    ...current,
                                    startDate: iso,
                                  }))
                                }
                                hasError={!!getProgrammeFieldError(programmeDraft.clientId, "startDate")}
                              />
                              {getProgrammeFieldError(programmeDraft.clientId, "startDate") && (
                                <p className="text-xs font-medium text-red-600">
                                  {getProgrammeFieldError(programmeDraft.clientId, "startDate")}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2.5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Estimated Programme End Date
                              </p>
                              <SyncfusionIsoDatePicker
                                value={programmeDraft.endDate}
                                onChange={(iso) =>
                                  updateProgrammeDraft((current) => ({
                                    ...current,
                                    endDate: iso,
                                  }))
                                }
                                hasError={!!getProgrammeFieldError(programmeDraft.clientId, "endDate")}
                              />
                              {getProgrammeFieldError(programmeDraft.clientId, "endDate") && (
                                <p className="text-xs font-medium text-red-600">
                                  {getProgrammeFieldError(programmeDraft.clientId, "endDate")}
                                </p>
                              )}
                            </div>

                            <div className="mt-1 flex justify-end xl:col-span-2">
                              <button
                                type="button"
                                onClick={() => void goToProgrammeEditorCompletionTab()}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#017f3f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#016533] hover:shadow-md"
                              >
                                Next
                                <FaChevronRight className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                          </div>
                              ) : programmeDraftNeedsCompletionFlow ? (
                              <div
                                role="tabpanel"
                                id="programme-editor-panel-completion"
                                aria-labelledby="programme-editor-tab-completion"
                                className="flex flex-col gap-5"
                              >
                                  <div className="space-y-2.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                      Programme Status
                                    </p>
                                    <select
                                      value={programmeDraft.programmeCompletionStatusId}
                                      onChange={(e) =>
                                        updateProgrammeDraft((current) => ({
                                          ...current,
                                          programmeCompletionStatusId: e.target.value,
                                          completedProgramme:
                                            programmeCompletionStatuses.find(
                                              (status) => String(status.programmeCompletionStatusId) === e.target.value,
                                            )?.programmeCompletionStatus as ProgrammeCompletionStatus ?? "",
                                          completionReasonId: "",
                                          incompleteReason: "",
                                          otherReasonText: "",
                                        }))
                                      }
                                      className={profileSelectClass(
                                        !!getProgrammeFieldError(programmeDraft.clientId, "completedProgramme"),
                                        "errorBg",
                                      )}
                                    >
                                      <option value="">Select programme status</option>
                                      {programmeCompletionStatusOptions.map((status) => (
                                        <option key={status.value} value={status.value}>
                                          {status.label}
                                        </option>
                                      ))}
                                    </select>
                                    {getProgrammeFieldError(programmeDraft.clientId, "completedProgramme") && (
                                      <p className="text-xs font-medium text-red-600">
                                        {getProgrammeFieldError(programmeDraft.clientId, "completedProgramme")}
                                      </p>
                                    )}
                                  </div>

                                  {programmeDraft.completedProgramme === "Completed" && (
                                    <div className="space-y-4">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Upload Proof of Programme Completion
                                      </p>
                                      <p className="mt-2 text-sm text-slate-600">
                                        Upload supporting documents as proof of completion now or later.
                                      </p>

                                      <div className="mt-4 space-y-2.5">
                                        <SegmentedControl
                                          value={programmeDraft.proofUploadPreference}
                                          onChange={(next) =>
                                            updateProgrammeDraft((current) => ({
                                              ...current,
                                              proofUploadPreference: next as ProgrammeProofUploadPreference,
                                            }))
                                          }
                                          hasError={!!getProgrammeFieldError(programmeDraft.clientId, "proofUploadPreference")}
                                          options={[
                                            { value: "upload-now", label: "Upload now" },
                                            { value: "upload-later", label: "Upload later" },
                                          ]}
                                          columnsClassName="grid-cols-2"
                                          focusClassName="border-[#feca07]/50 focus-within:border-[#feca07] focus-within:ring-4 focus-within:ring-[#feca07]/20"
                                          activeClassName="bg-[linear-gradient(135deg,#feca07_0%,#e8b500_100%)] text-slate-900 shadow-[0_10px_20px_rgba(254,202,7,0.32)]"
                                        />
                                        {getProgrammeFieldError(programmeDraft.clientId, "proofUploadPreference") && (
                                          <p className="text-xs font-medium text-red-600">
                                            {getProgrammeFieldError(programmeDraft.clientId, "proofUploadPreference")}
                                          </p>
                                        )}
                                      </div>

                                      {programmeDraft.proofUploadPreference === "upload-now" && (
                                      <div className="mt-4 space-y-4">
                                        <div
                                          onDragEnter={handleProgrammeProofDragEnter}
                                          onDragOver={handleProgrammeProofDragOver}
                                          onDragLeave={handleProgrammeProofDragLeave}
                                          onDrop={handleProgrammeProofDrop}
                                          className={cn(
                                            "rounded-[1.4rem] border border-dashed p-2 transition-all duration-200",
                                            programmeProofNewUploadBlockedByMissingTitle && "opacity-[0.55]",
                                            isProgrammeProofDragActive && !programmeProofNewUploadBlockedByMissingTitle
                                              ? "border-[#017f3f] bg-[#017f3f]/10 shadow-[0_0_0_4px_rgba(1,127,63,0.12)]"
                                              : "border-[#017f3f]/20 bg-transparent",
                                          )}
                                          aria-disabled={programmeProofNewUploadBlockedByMissingTitle}
                                        >
                                          <label
                                            htmlFor="programme-proof-upload"
                                            className={cn(
                                              "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4 text-sm font-semibold transition",
                                              programmeProofNewUploadBlockedByMissingTitle
                                                ? "cursor-not-allowed border-slate-200/80 bg-slate-50 text-slate-500"
                                                : isProgrammeProofDragActive
                                                  ? "border-[#017f3f]/50 bg-[#017f3f]/10 text-[#017f3f]"
                                                  : "border-[#017f3f]/35 bg-[#017f3f]/5 text-[#017f3f] hover:bg-[#017f3f]/10",
                                            )}
                                          >
                                            <FaUpload className="h-4 w-4" />
                                            <span>
                                              {isProgrammeProofDragActive
                                                ? "Drop proof documents here"
                                                : "Upload proof documents"}
                                            </span>
                                          </label>
                                        </div>
                                        <input
                                          id="programme-proof-upload"
                                          type="file"
                                          multiple
                                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                          disabled={programmeProofNewUploadBlockedByMissingTitle}
                                          onChange={handleProgrammeProofFilesSelected}
                                          className="sr-only"
                                          aria-describedby="programme-proof-upload-hint"
                                        />
                                        <input
                                          ref={programmeProofReplaceFileInputRef}
                                          type="file"
                                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                          aria-hidden="true"
                                          tabIndex={-1}
                                          className="sr-only"
                                          onChange={handleProgrammeProofReplaceFileSelected}
                                        />
                                        <p id="programme-proof-upload-hint" className="text-xs text-slate-500">
                                          {programmeProofNewUploadBlockedByMissingTitle
                                            ? "Select a programme and capture ID/Passport Nr before browsing or dragging new files onto this control."
                                            : "Drag and drop files here or click to browse. Supported formats: PDF, JPG, PNG, DOC, DOCX"}
                                        </p>

                                        {programmeDraft.proofFiles.length > 0 && (
                                          <div className="overflow-x-auto rounded-xl border border-slate-100">
                                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                              <thead>
                                                <tr className="bg-hwseta-green text-xs font-semibold uppercase text-white shadow-sm">
                                                  <th className="px-3 py-2.5">Document name</th>
                                                  <th className="px-3 py-2.5">Title</th>
                                                  <th className="px-3 py-2.5">Date uploaded</th>
                                                  <th className="px-3 py-2.5">Uploaded By</th>
                                                  <th className="px-3 py-2.5 text-right">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 bg-white">
                                                {programmeDraft.proofFiles.map((file) => {
                                                  const canOpen =
                                                    Boolean(file.fileUrl) ||
                                                    file.file instanceof File ||
                                                    file.beneficiaryProgrammeLinkDocumentId != null;
                                                  const allowRemoveProof = canRemoveProofEvidenceFile(
                                                    programmeDraft.completedProgramme,
                                                    file,
                                                  );
                                                  const showProofReplacementAction =
                                                    programmeDraft.completedProgramme === "Completed" &&
                                                    proofFilePersistedOnServer(file);
                                                  const proofReplaceInProgress =
                                                    replacingProgrammeProofDocumentId != null;
                                                  const replacingThisProofRow =
                                                    proofReplaceInProgress &&
                                                    String(replacingProgrammeProofDocumentId) ===
                                                      String(file.beneficiaryProgrammeLinkDocumentId ?? "");

                                                  return (
                                                    <tr
                                                      key={file.id}
                                                      className="hover:bg-emerald-50/30"
                                                    >
                                                      <td className="px-3 py-2.5">
                                                        {canOpen ? (
                                                          <button
                                                            type="button"
                                                            onClick={() => handleOpenProgrammeProofFile(file)}
                                                            className="font-medium text-[#017f3f] underline decoration-[#017f3f]/30 underline-offset-2 transition hover:text-[#016533]"
                                                            title={`Open ${file.name}`}
                                                          >
                                                            {file.name}
                                                          </button>
                                                        ) : (
                                                          <span className="font-medium text-slate-800">{file.name}</span>
                                                        )}
                                                        <div className="text-xs text-slate-400">
                                                          {formatFileSize(file.size)}
                                                        </div>
                                                      </td>
                                                      <td className="max-w-[12rem] break-words px-3 py-2.5 text-slate-700">
                                                        {resolveProgrammeEvidenceTitle(
                                                          file,
                                                          generatedProgrammeProofDocumentTitle,
                                                        )}
                                                      </td>
                                                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                                                        {file.file instanceof File ? "—" : formatDocumentUploadedDisplay(file.dateCreated)}
                                                      </td>
                                                      <td className="px-3 py-2.5 text-slate-600">
                                                        {file.file instanceof File
                                                          ? "—"
                                                          : normalizeString(file.uploadedBy) || "—"}
                                                      </td>
                                                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle">
                                                        {allowRemoveProof ? (
                                                          <button
                                                            type="button"
                                                            onClick={() => removeProgrammeProofFile(file.id)}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                                            aria-label={`Remove ${file.name}`}
                                                          >
                                                            <FaTimes className="h-3 w-3" />
                                                          </button>
                                                        ) : showProofReplacementAction &&
                                                          file.beneficiaryProgrammeLinkDocumentId != null ? (
                                                          <button
                                                            type="button"
                                                            disabled={
                                                              programmeDraft.beneficiaryProgrammeLinkId == null ||
                                                              proofReplaceInProgress
                                                            }
                                                            onClick={() =>
                                                              handleBeginReplaceProgrammeProofDocument(
                                                                file.beneficiaryProgrammeLinkDocumentId as BeneficiaryEntityId,
                                                              )
                                                            }
                                                            className="text-sm font-semibold text-[#017f3f] underline decoration-[#017f3f]/30 underline-offset-2 transition hover:text-[#016533] disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                                                            title="Pick a new file for this proof."
                                                          >
                                                            {replacingThisProofRow ? "Updating…" : "Update"}
                                                          </button>
                                                        ) : (
                                                          <span className="inline-flex justify-end text-xs tabular-nums text-slate-400">
                                                            —
                                                          </span>
                                                        )}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}

                                        {getProgrammeFieldError(programmeDraft.clientId, "proofFiles") && (
                                          <p className="text-xs font-medium text-red-600">
                                            {getProgrammeFieldError(programmeDraft.clientId, "proofFiles")}
                                          </p>
                                        )}
                                      </div>
                                      )}
                                    </div>
                                  )}

                                  {(programmeDraft.completedProgramme === "Not Completed" ||
                                    programmeDraft.completedProgramme === "Withdrawn" ||
                                    programmeDraft.completedProgramme === "Dropped Out") && (
                                    <div className="space-y-2.5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Select a Reason
                                      </p>
                                      <select
                                        value={programmeDraft.completionReasonId}
                                        onChange={(e) =>
                                          updateProgrammeDraft((current) => ({
                                            ...current,
                                            completionReasonId: e.target.value,
                                            incompleteReason:
                                              programmeDraftReasonOptions.find(
                                                (reason) => String(reason.completionReasonId) === e.target.value,
                                              )?.completionReasonDescription ?? "",
                                            otherReasonText:
                                              programmeDraftReasonOptions.find(
                                                (reason) => String(reason.completionReasonId) === e.target.value,
                                              )?.completionReasonDescription === "Other"
                                                ? current.otherReasonText
                                                : "",
                                          }))
                                        }
                                        className={profileSelectClass(
                                          !!getProgrammeFieldError(programmeDraft.clientId, "incompleteReason"),
                                          "errorBg",
                                        )}
                                      >
                                        <option value="">Select a reason</option>
                                        {programmeDraftReasonOptions.map((reason) => (
                                          <option key={String(reason.completionReasonId)} value={String(reason.completionReasonId)}>
                                            {reason.completionReasonDescription}
                                          </option>
                                        ))}
                                      </select>
                                      {getProgrammeFieldError(programmeDraft.clientId, "incompleteReason") && (
                                        <p className="text-xs font-medium text-red-600">
                                          {getProgrammeFieldError(programmeDraft.clientId, "incompleteReason")}
                                        </p>
                                      )}

                                      {programmeDraft.incompleteReason === "Other" && (
                                        <div className="space-y-2.5">
                                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            Other Reason
                                          </p>
                                          <textarea
                                            value={programmeDraft.otherReasonText}
                                            onChange={(e) =>
                                              updateProgrammeDraft((current) => ({
                                                ...current,
                                                otherReasonText: e.target.value,
                                              }))
                                            }
                                            rows={3}
                                            maxLength={500}
                                            placeholder="Type the other reason"
                                            className={profileInputClass(
                                              !!getProgrammeFieldError(programmeDraft.clientId, "otherReasonText"),
                                            )}
                                          />
                                          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                                            <span>Only required when the selected reason is Other.</span>
                                            <span>{programmeDraft.otherReasonText.length}/500</span>
                                          </div>
                                          {getProgrammeFieldError(programmeDraft.clientId, "otherReasonText") && (
                                            <p className="text-xs font-medium text-red-600">
                                              {getProgrammeFieldError(programmeDraft.clientId, "otherReasonText")}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </div>
                              ) : (
                              <div
                                role="tabpanel"
                                id="programme-editor-panel-completion-empty"
                                aria-labelledby="programme-editor-tab-completion"
                                className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/95 px-4 py-14 text-center"
                              >
                                <p className="text-sm font-medium text-slate-700">Nothing to complete here yet</p>
                                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
                                  Completion status and proof uploads appear when this programme uses the completion
                                  workflow. You can edit programme details on the first tab or close when finished.
                                </p>
                              </div>
                              )}
                              </div>
                            </div>

                          {programmeEditorModalTab === "completion" && (
                          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/90 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                            <button
                              type="button"
                              disabled={isSavingProgrammeDraft}
                              onClick={() => setProgrammeEditorModalTab("details")}
                              className={cn(
                                "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md",
                                isSavingProgrammeDraft && "cursor-not-allowed opacity-70 hover:translate-y-0 hover:shadow-sm",
                              )}
                            >
                              <FaChevronLeft className="h-3.5 w-3.5" aria-hidden />
                              Back
                            </button>
                            <div className="flex flex-1 flex-wrap gap-3 sm:justify-end">
                            <button
                              type="button"
                              disabled={isSavingProgrammeDraft}
                              onClick={() => void saveProgrammeDraft()}
                              className={cn(
                                "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#017f3f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#016533] hover:shadow-md",
                                isSavingProgrammeDraft && "cursor-not-allowed opacity-70 hover:translate-y-0 hover:shadow-sm",
                              )}
                            >
                              {isSavingProgrammeDraft ? (
                                <FaSpinner className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FaPlus className="h-3.5 w-3.5" />
                              )}
                              <span>
                                {isSavingProgrammeDraft
                                  ? "Saving…"
                                  : editingProgrammeClientId
                                    ? "Update Details"
                                    : "Save Details"}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={isSavingProgrammeDraft}
                              onClick={() => setIsProgrammeEditorOpen(false)}
                              className={cn(
                                "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md",
                                isSavingProgrammeDraft && "cursor-not-allowed opacity-70 hover:translate-y-0 hover:shadow-sm",
                              )}
                            >
                              Close
                            </button>
                            </div>
                          </div>
                          )}
                          </div>
                        </div>
                      </div>
                      )}
                    </div>

                    <MyProgrammesListCard
                      programmeLinks={programmeLinks}
                      programmeOptions={programmeOptions}
                      qualificationNameById={qualificationNameById}
                      actionsMode="full"
                      programmeDeletingClientId={programmeDeletingClientId}
                      isSavingProgrammeDraft={isSavingProgrammeDraft}
                      onEditRow={(clientId) => void loadProgrammeRowForEdit(clientId)}
                      onRemoveRow={handleRemoveProgrammeRow}
                    />
                  </div>
                </div>
              )}

              {/* Employment Details Tab (Step 4) */}
              {activeTab === 'employment' && (
                <div className="px-6 pb-8 pt-6 sm:px-8">
                    <div className="space-y-6">
                      <div>
                        <div className="mb-4 flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#feca07]/15 text-[#d89f00]">
                            <FaBriefcase className="h-5 w-5" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-800">
                              Employment Status
                              {renderRequiredMark("employmentSelection") && <span className="ml-1">{renderRequiredMark("employmentSelection")}</span>}
                            </label>
                            <p className="mt-1 text-sm text-slate-600">
                              Choose the option that best describes your current work situation.
                            </p>
                          </div>
                        </div>

                        <SegmentedControl
                          value={formData.employmentSelection}
                          onChange={(next) => {
                            const sel = next as EmploymentSelection;
                            setFormData({
                              ...formData,
                              employmentSelection: sel,
                              stipend:
                                sel === "Volunteering"
                                  ? formData.stipendPayFrequency
                                    ? stipendReceivedFromPayFrequency(formData.stipendPayFrequency)
                                    : formData.stipend
                                  : false,
                              ...(sel !== "Volunteering"
                                ? {
                                    stipendPayFrequency: "",
                                    ...(sel === "Not employed" ? { salaryGroup: "" } : {}),
                                  }
                                : {}),
                            });
                            if (validationErrors.employmentSelection) {
                              const newErrors = {...validationErrors};
                              delete newErrors.employmentSelection;
                              setValidationErrors(newErrors);
                            }
                          }}
                          hasError={!!validationErrors.employmentSelection}
                          options={[
                            { value: "Currently Employed", label: "Currently Employed" },
                            { value: "Not employed", label: "Not employed" },
                            { value: "Volunteering", label: "Volunteering" },
                          ]}
                          columnsClassName="grid-cols-1 sm:grid-cols-3"
                          focusClassName="border-slate-200/80 focus-within:border-[#feca07] focus-within:ring-2 focus-within:ring-[#feca07]/15"
                          activeClassName="bg-[#feca07] text-slate-900"
                        />

                        {validationErrors.employmentSelection && (
                          <p className="mt-2 text-xs text-red-600">{validationErrors.employmentSelection}</p>
                        )}
                      </div>

                      {/* Conditional Fields - If Employed (Yes) */}
                      {formData.employmentSelection === "Currently Employed" && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-5">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Employment Type
                              <span className="ml-1 text-red-600">*</span>
                              {validationErrors.employmentType && (
                                <span className="ml-2 text-xs text-red-600">({validationErrors.employmentType})</span>
                              )}
                            </label>
                            <select
                              value={formData.employmentType}
                              onChange={(e) => {
                                setFormData({...formData, employmentType: e.target.value});
                                // Clear validation error when selection is made
                                if (validationErrors.employmentType && e.target.value.trim()) {
                                  const newErrors = {...validationErrors};
                                  delete newErrors.employmentType;
                                  setValidationErrors(newErrors);
                                }
                              }}
                              className={profileSelectClass(!!validationErrors.employmentType, "errorBg")}
                            >
                              <option value="">Select Employment Type</option>
                            {employmentTypesEmployed.map((type) => (
                              <option key={type.id || type.name} value={type.name}>
                                {type.name}
                              </option>
                            ))}
                            </select>
                            {validationErrors.employmentType && (
                              <p className="mt-1 text-xs text-red-600">{validationErrors.employmentType}</p>
                            )}
                          </div>

                          {formData.employmentType === 'Contract' && (
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-700">Contract End Date</label>
                              <SyncfusionIsoDatePicker
                                value={formData.contractEndDate}
                                onChange={(iso) => setFormData((prev) => ({ ...prev, contractEndDate: iso }))}
                              />
                            </div>
                          )}

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Company Name</label>
                            <input
                              type="text"
                              value={formData.companyName}
                              onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Line Manager Name</label>
                            <input
                              type="text"
                              value={formData.contactSupervisor}
                              onChange={(e) => setFormData({...formData, contactSupervisor: e.target.value})}
                              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Province</label>
                            <select
                              value={formData.employmentProvince}
                              onChange={(e) => setFormData({...formData, employmentProvince: e.target.value})}
                              className={adminFormTheme.select}
                            >
                              <option value="">Select Province</option>
                              {provinces.map((province) => (
                                <option key={province.id} value={province.name}>
                                  {province.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Address (line 1)</label>
                            <input
                              type="text"
                              value={formData.employmentAddressLine1}
                              onChange={(e) => setFormData({...formData, employmentAddressLine1: e.target.value})}
                              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Code</label>
                            <input
                              type="text"
                              value={formData.employmentCode}
                              onChange={(e) => setFormData({...formData, employmentCode: e.target.value})}
                              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                            />
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-5">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Salary Group
                              <span className="ml-1 text-red-600">*</span>
                              {validationErrors.salaryGroup && (
                                <span className="ml-2 text-xs text-red-600">({validationErrors.salaryGroup})</span>
                              )}
                            </label>
                            <select
                              value={formData.salaryGroup}
                              onChange={(e) => {
                                setFormData({...formData, salaryGroup: e.target.value});
                                // Clear validation error when selection is made
                                if (validationErrors.salaryGroup && e.target.value.trim()) {
                                  const newErrors = {...validationErrors};
                                  delete newErrors.salaryGroup;
                                  setValidationErrors(newErrors);
                                }
                              }}
                              className={profileSelectClass(!!validationErrors.salaryGroup, "errorBg")}
                            >
                              <option value="">-- Select Salary Group --</option>
                            {salaryGroups.map((group) => (
                              <option key={group.id || group.name} value={group.name}>
                                {group.name}
                              </option>
                            ))}
                            </select>
                            {validationErrors.salaryGroup && (
                              <p className="mt-1 text-xs text-red-600">{validationErrors.salaryGroup}</p>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Your Occupation/Position</label>
                            <input
                              type="text"
                              value={formData.occupationPosition}
                              onChange={(e) => setFormData({...formData, occupationPosition: e.target.value})}
                              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Email Address (Line Manager)
                            </label>
                            <input
                              type="email"
                              autoComplete="email"
                              value={formData.lineManagerEmail}
                              onChange={(e) => setFormData({ ...formData, lineManagerEmail: e.target.value })}
                              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Telephone Number</label>
                            <input
                              type="tel"
                              inputMode="tel"
                              value={formData.telephoneNumber}
                              onChange={(e) => handlePhoneFieldChange("telephoneNumber", e.target.value)}
                              onBlur={(e) => handlePhoneFieldBlur("telephoneNumber", e.target.value)}
                              aria-invalid={!!validationErrors.telephoneNumber}
                              className={profileInputClass(!!validationErrors.telephoneNumber)}
                            />
                            {validationErrors.telephoneNumber && (
                              <p className="mt-1 text-xs text-red-600">{validationErrors.telephoneNumber}</p>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">Address (line 2)</label>
                            <input
                              type="text"
                              value={formData.employmentAddressLine2}
                              onChange={(e) => setFormData({...formData, employmentAddressLine2: e.target.value})}
                              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Employment Note/Comment - Full Width */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Employment Note/Comment</label>
                        <textarea
                          value={formData.employmentNote}
                          onChange={(e) => setFormData({...formData, employmentNote: e.target.value})}
                          rows={4}
                          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#017f3f] focus:outline-none focus:ring-4 focus:ring-[#017f3f]/10"
                        />
                      </div>
                    </div>
                  )}

                      {/* Conditional Fields - If Not Employed (No) */}
                      {formData.employmentSelection === "Volunteering" && (
                          <div
                            className={cn(
                              "grid grid-cols-1 gap-5",
                              formData.stipend && "md:grid-cols-2",
                            )}
                          >
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-700">
                                How often were you paid your stipend during the programme?
                                <span className="ml-1 text-red-600">*</span>
                                {validationErrors.stipendPayFrequency && (
                                  <span className="ml-2 text-xs text-red-600">
                                    ({validationErrors.stipendPayFrequency})
                                  </span>
                                )}
                              </label>
                              <select
                                value={formData.stipendPayFrequency}
                                onChange={(e) => {
                                  const frequency = e.target.value;
                                  const receivesStipend = stipendReceivedFromPayFrequency(frequency);
                                  setFormData({
                                    ...formData,
                                    stipendPayFrequency: frequency,
                                    stipend: receivesStipend,
                                    ...(!receivesStipend ? { salaryGroup: "" } : {}),
                                  });
                                  if (validationErrors.stipendPayFrequency && frequency.trim()) {
                                    const newErrors = { ...validationErrors };
                                    delete newErrors.stipendPayFrequency;
                                    setValidationErrors(newErrors);
                                  }
                                  if (!receivesStipend && validationErrors.salaryGroup) {
                                    const newErrors = { ...validationErrors };
                                    delete newErrors.salaryGroup;
                                    setValidationErrors(newErrors);
                                  }
                                }}
                                className={profileSelectClass(!!validationErrors.stipendPayFrequency, "errorBg")}
                              >
                                <option value="">-- Select an option --</option>
                                {stipendFrequencies.map((frequency) => (
                                  <option key={frequency.id || frequency.name} value={frequency.name}>
                                    {frequency.name}
                                  </option>
                                ))}
                              </select>
                              {validationErrors.stipendPayFrequency && (
                                <p className="mt-1 text-xs text-red-600">{validationErrors.stipendPayFrequency}</p>
                              )}
                            </div>
                            {formData.stipend ? (
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                  Salary Group
                                  <span className="ml-1 text-red-600">*</span>
                                  {validationErrors.salaryGroup && (
                                    <span className="ml-2 text-xs text-red-600">({validationErrors.salaryGroup})</span>
                                  )}
                                </label>
                                <select
                                  value={formData.salaryGroup}
                                  onChange={(e) => {
                                    setFormData({ ...formData, salaryGroup: e.target.value });
                                    if (validationErrors.salaryGroup && e.target.value.trim()) {
                                      const newErrors = { ...validationErrors };
                                      delete newErrors.salaryGroup;
                                      setValidationErrors(newErrors);
                                    }
                                  }}
                                  className={profileSelectClass(!!validationErrors.salaryGroup, "errorBg")}
                                >
                                  <option value="">-- Select Salary Group --</option>
                                  {salaryGroups.map((group) => (
                                    <option key={group.id || group.name} value={group.name}>
                                      {group.name}
                                    </option>
                                  ))}
                                </select>
                                {validationErrors.salaryGroup && (
                                  <p className="mt-1 text-xs text-red-600">{validationErrors.salaryGroup}</p>
                                )}
                              </div>
                            ) : null}
                          </div>
                      )}

                      {/* Conditional Fields - If Not Employed */}
                      {formData.employmentSelection === "Not employed" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Employment Status
                              <span className="ml-1 text-red-600">*</span>
                              {validationErrors.employmentStatus && (
                                <span className="ml-2 text-xs text-red-600">({validationErrors.employmentStatus})</span>
                              )}
                            </label>
                            <select
                              value={formData.employmentStatus}
                              onChange={(e) => {
                                setFormData({...formData, employmentStatus: e.target.value});
                                // Clear validation error when selection is made
                                if (validationErrors.employmentStatus && e.target.value.trim()) {
                                  const newErrors = {...validationErrors};
                                  delete newErrors.employmentStatus;
                                  setValidationErrors(newErrors);
                                }
                              }}
                              className={profileSelectClass(!!validationErrors.employmentStatus, "errorBg")}
                            >
                              <option value="">Select Employment Status</option>
                            {employmentTypesUnemployed.map((type) => (
                              <option key={type.id || type.name} value={type.name}>
                                {type.name}
                              </option>
                            ))}
                            </select>
                            {validationErrors.employmentStatus && (
                              <p className="mt-1 text-xs text-red-600">{validationErrors.employmentStatus}</p>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Reason
                              <span className="ml-1 text-red-600">*</span>
                              {validationErrors.unemploymentReason && (
                                <span className="ml-2 text-xs text-red-600">({validationErrors.unemploymentReason})</span>
                              )}
                            </label>
                            <select
                              value={formData.unemploymentReason}
                              onChange={(e) => {
                                setFormData({...formData, unemploymentReason: e.target.value});
                                // Clear validation error when selection is made
                                if (validationErrors.unemploymentReason && e.target.value.trim()) {
                                  const newErrors = {...validationErrors};
                                  delete newErrors.unemploymentReason;
                                  setValidationErrors(newErrors);
                                }
                              }}
                              className={profileSelectClass(!!validationErrors.unemploymentReason, "errorBg")}
                            >
                              <option value="">-- Select Unemployment Reason --</option>
                            {unemploymentReasons.map((reason) => (
                              <option key={reason.id || reason.name} value={reason.name}>
                                {reason.name}
                              </option>
                            ))}
                            </select>
                            {validationErrors.unemploymentReason && (
                              <p className="mt-1 text-xs text-red-600">{validationErrors.unemploymentReason}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              )}

              {/* Submit Tab (Step 5) */}
              {activeTab === "submit" && (
                <div className="px-6 pb-8 pt-6 sm:px-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#017f3f]/10 text-[#017f3f]">
                        <FaFileSignature className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Submit</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Please review the declaration below, agree to the Terms and Conditions, and sign before updating your profile.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-red-50/80 p-5">
                      <h4 className="text-base font-bold text-red-900">Please sign to confirm that:</h4>
                      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-slate-700">
                        <li>You have completed this beneficiary profile yourself.</li>
                        <li>All information provided is true and correct.</li>
                        <li>You have read and understood the Terms and Conditions.</li>
                        <li>You agree to proceed with submitting your beneficiary profile details.</li>
                      </ol>
                    </div>

                    {savedSignaturePreview && (
                      <div>
                        <p className="mb-3 text-sm font-semibold text-slate-900">Saved Signature</p>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <img
                            src={savedSignaturePreview}
                            alt="Saved beneficiary signature"
                            className="h-auto max-h-48 w-full object-contain"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                      <div>
                        <label className="mb-3 block text-sm font-semibold text-slate-900">
                          Signature {renderRequiredMark("signature")}
                        </label>
                        <canvas
                          ref={signatureCanvasRef}
                          width={1400}
                          height={320}
                          className={cn(
                            "min-h-[260px] w-full rounded-xl border-2 bg-white touch-none",
                            validationErrors.signature ? "border-red-300" : "border-slate-200",
                          )}
                          onPointerDown={startSignatureDrawing}
                          onPointerMove={drawSignature}
                          onPointerUp={stopSignatureDrawing}
                          onPointerLeave={stopSignatureDrawing}
                        />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            Sign in the area above. Your signature confirms the profile details and acceptance of the Terms and Conditions.
                          </p>
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#017f3f]"
                          >
                            <FaTimes className="h-4 w-4" />
                            Clear
                          </button>
                        </div>
                        {validationErrors.signature && (
                          <p className="mt-2 text-xs font-medium text-red-600">{validationErrors.signature}</p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-semibold text-slate-900">Terms and Conditions</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Please open and read the Beneficiary Terms and Conditions before submitting.
                        </p>

                        <button
                          type="button"
                          onClick={openTermsPopup}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#017f3f]/5 px-4 py-2.5 text-sm font-semibold text-[#017f3f] transition hover:bg-[#017f3f]/10"
                        >
                          <FaExternalLinkAlt className="h-3.5 w-3.5" />
                          Review Beneficiary Terms and Conditions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Navigation */}
              <div className="mt-8 px-8 pb-8">
                <div className="border-t border-gray-200 pt-6 flex items-center justify-between gap-4">
                  {activeTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:border-[#017f3f] hover:text-[#017f3f]"
                    >
                      Back
                    </button>
                  )}
                  {activeTab === 'personal' && <div />}

                  {activeTab !== 'submit' ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-xl bg-gradient-to-r from-[#017f3f] to-[#015c2e] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
                    >
                      Next
                    </button>
                  ) : (
                    <div className="flex max-w-3xl flex-col items-end gap-2">
                      <div className="flex flex-wrap items-center justify-end gap-4">
                        <label className="flex max-w-xl cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={formData.acceptedTerms}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev) => ({ ...prev, acceptedTerms: checked }));
                              setFieldError(
                                "acceptedTerms",
                                checked ? undefined : "You must agree to the Terms and Conditions",
                              );
                            }}
                            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-[#017f3f] focus:ring-[#017f3f]"
                          />
                          <span className="text-sm leading-6 text-slate-700">
                            I have read and agree to the{" "}
                            <button
                              type="button"
                              onClick={openTermsPopup}
                              className="font-semibold text-[#017f3f] underline underline-offset-2"
                            >
                              Terms and Conditions
                            </button>
                            .
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const { combinedErrors, firstInvalidTab } = validateFullProfile();
                            if (Object.keys(combinedErrors).length > 0) {
                              setValidationErrors(combinedErrors);
                              showValidationToast(combinedErrors, "Please Complete Your Profile");
                              if (firstInvalidTab) {
                                setActiveTab(firstInvalidTab as ProfileTabId);
                              }
                              return;
                            }
                            handleSaveProfile();
                          }}
                          disabled={isSavingProfile}
                          className={cn(
                            "inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#017f3f] to-[#015c2e] px-6 py-3 text-sm font-semibold text-white transition-all duration-200",
                            isSavingProfile ? "cursor-not-allowed opacity-70" : "hover:shadow-lg hover:scale-[1.02]",
                          )}
                        >
                          {isSavingProfile ? (
                            <FaSpinner className="h-4 w-4 animate-spin" />
                          ) : (
                            <FaSave className="h-4 w-4" />
                          )}
                          <span>{isSavingProfile ? "Saving Profile..." : "Update Profile Details"}</span>
                        </button>
                      </div>
                      {validationErrors.acceptedTerms ? (
                        <p className="text-right text-xs font-medium text-red-600">{validationErrors.acceptedTerms}</p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
    </>
  );

  return (
    <>
      {shouldLoadGoogleMaps ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
            googleMapsApiKey as string
          )}&libraries=places&language=en&loading=async`}
          strategy="afterInteractive"
          onLoad={() => {
            setTimeout(() => {
              if (activeTabRef.current === "address") initAutocomplete();
            }, 200);
          }}
          onError={(e) => {
            console.error('Failed to load Google Maps script:', e);
          }}
        />
      ) : null}
      <div className="mx-auto max-w-7xl px-6 py-8">
            {/* Page Header */}
            <div className="mb-6">
              {isAdminView ? (
                <div className="grid grid-cols-1 gap-4 border-b border-slate-200/80 pb-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-4 sm:gap-y-0">
                  <div className="min-w-0 sm:col-start-1 sm:row-start-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
                      Beneficiary Profile
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 sm:text-base">
                      Review and update this beneficiary&apos;s details
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center sm:col-start-2 sm:row-start-1 sm:min-w-[10rem] sm:px-2">
                    <p className="text-lg font-semibold leading-snug text-slate-900">
                      {adminBeneficiaryDisplayName || '—'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {adminBeneficiaryAge != null ? `Age ${adminBeneficiaryAge}` : 'Age —'}
                    </p>
                  </div>
                  <div className="hidden min-h-[1px] sm:col-start-3 sm:row-start-1 sm:block" aria-hidden="true" />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
                    My Profile
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 sm:text-base">
                    Manage your personal information and preferences
                  </p>
                </div>
              )}
            </div>

            {/* Profile Status Message */}
            {!isLoadingProfile && hasProfile === false && (
              <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <FaExclamationTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900 mb-1">
                      Please complete your profile details
                    </h3>
                    <p className="text-sm text-amber-700">
                      Your profile information has been prefilled from your account. Please review and complete all required fields.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isAdminView && effectiveBeneficiaryId ? (
              <AdminBeneficiaryWorkspacePanel
                beneficiaryId={effectiveBeneficiaryId}
                smsBeneficiaryLabel={adminSmsModalLabel}
                defaultSmsPhone={formData.cellphoneNumber}
                beneficiaryEmail={formData.emailAddress}
              >
                {profileMain}
              </AdminBeneficiaryWorkspacePanel>
            ) : (
              profileMain
            )}
          </div>
      {isTermsModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="Close terms and conditions"
            onClick={() => setIsTermsModalOpen(false)}
            className="absolute inset-0"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="beneficiary-terms-title"
            className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(135deg,rgba(1,127,63,0.08)_0%,rgba(254,202,7,0.13)_100%)] px-5 py-5 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#017f3f] shadow-sm">
                  <FaFileSignature className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#017f3f]">Review before signing</p>
                  <h2 id="beneficiary-terms-title" className="mt-1 text-lg font-semibold text-slate-950 sm:text-xl">
                    Beneficiary Terms and Conditions
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Please read the summary below before accepting and submitting your beneficiary profile.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <div className="mb-5 rounded-2xl bg-[#feca07]/12 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#9a6700]">
                    <FaCheck className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-6 text-slate-700">
                    By signing your profile submission, you confirm that the information you provide is correct and that
                    you accept these Terms and Conditions for use of the HWSETA Beneficiary Portal.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {BENEFICIARY_TERMS_SECTIONS.map((section, index) => (
                  <section key={section.title} className="rounded-2xl bg-slate-50/80 p-4">
                    <div className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#017f3f]/10 text-xs font-bold text-[#017f3f]">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{section.content}</p>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs leading-5 text-slate-500">
                You can close this window and return to your profile at any time.
              </p>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, acceptedTerms: true }));
                    setFieldError("acceptedTerms");
                    setIsTermsModalOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#017f3f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#016533]"
                >
                  <FaCheck className="h-3.5 w-3.5" />
                  I agree
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}





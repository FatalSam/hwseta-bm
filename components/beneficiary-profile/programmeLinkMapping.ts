import { listBeneficiaryProgrammeLinkDocuments } from "@/api/beneficiaryProfile";
import type {
  BeneficiaryEntityId,
  BeneficiaryProgrammeLink,
  BeneficiaryProgrammeLinkDocument,
} from "@/types/beneficiaryProfile";

export type ProgrammeCompletionStatus =
  | ""
  | "Completed"
  | "In Progress"
  | "Not Completed"
  | "Withdrawn"
  | "Dropped Out";

export type ProgrammeProofUploadPreference = "" | "upload-now" | "upload-later";

export type ProgrammeEvidenceFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File | null;
  beneficiaryProgrammeLinkDocumentId?: BeneficiaryEntityId;
  fileUrl?: string;
  /** From API once saved; drafts may omit. */
  documentTitle?: string | null;
  uploadedBy?: string | null;
  dateCreated?: string | null;
  isPersisted?: boolean;
};

export type ProgrammeLinkDraft = {
  clientId: string;
  beneficiaryProgrammeLinkId?: BeneficiaryEntityId;
  programmeId: string;
  programmeName: string;
  qualificationId: string;
  qualificationName: string;
  trainingProviderId: string;
  trainingProviderName: string;
  employerId: string;
  employerName: string;
  startDate: string;
  endDate: string;
  programmeCompletionStatusId: string;
  completedProgramme: ProgrammeCompletionStatus;
  proofUploadPreference: ProgrammeProofUploadPreference;
  completionReasonId: string;
  proofFiles: ProgrammeEvidenceFile[];
  deletedDocumentIds: BeneficiaryEntityId[];
  incompleteReason: string;
  otherReasonText: string;
  notes: string;
  /** Shown alongside upload; applies to pending files uploaded in the next save. */
  proofUploadDocumentTitle: string;
};

function normalizeString(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function formatDateForInput(value: unknown): string {
  const raw = normalizeString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function mapLinkDocumentToEvidenceFile(document: BeneficiaryProgrammeLinkDocument): ProgrammeEvidenceFile {
  return {
    id: `document-${String(document.beneficiaryProgrammeLinkDocumentId ?? Math.random().toString(36).slice(2, 8))}`,
    name: normalizeString(document.originalFileName || document.storedFileName) || "Document",
    size: Number(document.fileSizeBytes ?? 0) || 0,
    type: normalizeString(document.contentType),
    file: null,
    beneficiaryProgrammeLinkDocumentId: document.beneficiaryProgrammeLinkDocumentId,
    fileUrl: normalizeString(document.fileUrl || document.storagePath),
    documentTitle: (() => {
      const t = normalizeString(document.documentTitle);
      return t.length > 0 ? t : null;
    })(),
    uploadedBy: (() => {
      const t = normalizeString(document.uploadedBy);
      return t.length > 0 ? t : null;
    })(),
    dateCreated: (() => {
      const t = normalizeString(document.dateCreated);
      return t.length > 0 ? t : null;
    })(),
    isPersisted: true,
  };
}

export function mapProgrammeLinkToDraft(link: BeneficiaryProgrammeLink): ProgrammeLinkDraft {
  const customQualificationName = normalizeString(link.customQualificationName);
  const rawDocuments = Array.isArray(link.documents) ? link.documents : [];
  const isCompleted = normalizeString(link.programmeCompletionStatus) === "Completed";
  const proofUploadPreference: ProgrammeProofUploadPreference =
    isCompleted && rawDocuments.length > 0
      ? "upload-now"
      : isCompleted && rawDocuments.length === 0
        ? "upload-later"
        : "";
  return {
    clientId: `programme-link-${String(link.beneficiaryProgrammeLinkId ?? Date.now())}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    beneficiaryProgrammeLinkId: link.beneficiaryProgrammeLinkId,
    programmeId: normalizeString(link.programmeId),
    programmeName: normalizeString(link.programmeName),
    qualificationId: normalizeString(link.qualificationId),
    qualificationName: customQualificationName || normalizeString(link.qualificationName),
    trainingProviderId: normalizeString(link.trainingProviderId),
    trainingProviderName: normalizeString(link.trainingProviderName),
    employerId: normalizeString(link.employerId),
    employerName: normalizeString(link.employerName),
    startDate: formatDateForInput(link.startDate),
    endDate: formatDateForInput(link.endDate),
    programmeCompletionStatusId: normalizeString(link.programmeCompletionStatusId),
    completedProgramme: normalizeString(link.programmeCompletionStatus) as ProgrammeCompletionStatus,
    proofUploadPreference,
    completionReasonId: normalizeString(link.completionReasonId),
    proofFiles: rawDocuments.map((document) => mapLinkDocumentToEvidenceFile(document)),
    deletedDocumentIds: [],
    incompleteReason: normalizeString(link.completionReasonDescription),
    otherReasonText: normalizeString(link.otherReasonText),
    notes: normalizeString(link.notes),
    proofUploadDocumentTitle: "",
  };
}

export async function hydrateBeneficiaryProgrammeLinks(links: BeneficiaryProgrammeLink[]): Promise<ProgrammeLinkDraft[]> {
  const rows = await Promise.all(
    links.map(async (link) => {
      let documents = Array.isArray(link.documents) ? link.documents : [];
      if (documents.length === 0 && link.beneficiaryProgrammeLinkId != null) {
        try {
          documents = await listBeneficiaryProgrammeLinkDocuments(link.beneficiaryProgrammeLinkId);
        } catch {
          documents = [];
        }
      }

      return mapProgrammeLinkToDraft({
        ...link,
        documents,
      });
    }),
  );

  return rows;
}

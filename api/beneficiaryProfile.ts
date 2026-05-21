import apiClient from '@/ultis/apiClient';
import type {
  BeneficiaryEntityId,
  BeneficiaryProfileOptions,
  BeneficiaryProfileRecord,
  BeneficiaryProgrammeLinkDocument,
  BeneficiaryProfileSavePayload,
  BeneficiaryProgrammeLink,
  BeneficiaryProgrammeQualificationLookup,
  BeneficiaryProgrammeLinkPayload,
  ProgrammeCompletionStatusOption,
  ProgrammeCompletionStatusReasonOption,
  ProgrammeLinkOption,
  StipendFrequencyOption,
} from '@/types/beneficiaryProfile';

const STIPEND_FREQUENCIES_URL = '/api/Dropdowns/stipend-frequencies';

const PROFILE_BASE = '/api/beneficiary/profile';
const COMPAT_PROFILE_SAVE = '/api/beneficiaryprofilesaveupdate';
const MAX_UPLOAD_IMAGE_WIDTH = 1600;
const MAX_UPLOAD_IMAGE_HEIGHT = 1600;
const UPLOAD_IMAGE_QUALITY = 0.82;

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.value)) return obj.value as T[];
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeOption(raw: unknown, idKeys: string[], nameKeys: string[]): ProgrammeLinkOption | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const id = idKeys.map((key) => obj[key]).find((value) => value != null && String(value).trim() !== '');
  const name = nameKeys.map((key) => obj[key]).find((value) => value != null && String(value).trim() !== '');
  if (id == null || name == null) return null;

  return {
    id: typeof id === 'number' ? id : String(id),
    name: String(name).trim(),
  };
}

function normalizeDropdownNameOption(raw: unknown): StipendFrequencyOption | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const id =
    obj.id ??
    obj.Id ??
    obj.ID ??
    obj.stipendFrequencyId ??
    obj.StipendFrequencyID ??
    obj.stipendFrequencyID;
  const name =
    obj.name ??
    obj.Name ??
    obj.stipendFrequency ??
    obj.StipendFrequency;

  if (id == null || name == null || String(name).trim() === '') return null;

  return {
    id: typeof id === 'number' ? id : String(id).trim(),
    name: String(name).trim(),
  };
}

function dedupeStipendFrequencyOptions(options: StipendFrequencyOption[]): StipendFrequencyOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** `GET /api/Dropdowns/stipend-frequencies` — `{ id, name }[]` for profile `stipendPayFrequency`. */
export async function listStipendFrequencies(): Promise<StipendFrequencyOption[]> {
  const { data } = await apiClient.get(STIPEND_FREQUENCIES_URL);
  return dedupeStipendFrequencyOptions(
    normalizeList<unknown>(data)
      .map(normalizeDropdownNameOption)
      .filter((item): item is StipendFrequencyOption => item != null),
  );
}

function dedupeOptions(options: ProgrammeLinkOption[]): ProgrammeLinkOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${String(option.id)}::${option.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeProfileOptions(data: unknown): BeneficiaryProfileOptions {
  const obj = asRecord(data) ?? {};
  const rawProgrammes = normalizeList<unknown>(obj.programmes ?? obj.programmeOptions ?? obj.programmeList);
  return {
    programmes: dedupeOptions(
      rawProgrammes.flatMap((item) => {
        const normalized = normalizeOption(item, ['programmeId', 'id', 'ID'], ['programmeName', 'name', 'Name']);
        const itemRecord = asRecord(item);
        const qualificationId =
          itemRecord == null
            ? null
            : (['qualificationId', 'QualificationId'] as const)
                .map((key) => itemRecord[key])
                .find((value) => value != null && String(value).trim() !== '') ?? null;
        const qualificationName =
          itemRecord == null
            ? null
            : (['qualificationName', 'QualificationName', 'qualification'] as const)
                .map((key) => itemRecord[key])
                .find((value) => value != null && String(value).trim() !== '') ?? null;
        return normalized
          ? [{
              ...normalized,
              qualificationId:
                qualificationId == null ? null : typeof qualificationId === 'number' ? qualificationId : String(qualificationId),
              qualificationName: qualificationName == null ? null : String(qualificationName).trim(),
            }]
          : [];
      }),
    ),
    trainingProviders: dedupeOptions(
      normalizeList<unknown>(
        obj.trainingProviders ?? obj.providers ?? obj.trainingProviderOptions ?? obj.trainingProviderList,
      ).flatMap((item) => {
        const normalized = normalizeOption(
          item,
          ['trainingProviderId', 'providerId', 'id', 'ID'],
          ['trainingProviderName', 'providerName', 'name', 'Name'],
        );
        return normalized ? [normalized] : [];
      }),
    ),
    employers: dedupeOptions(
      normalizeList<unknown>(obj.employers ?? obj.employerOptions ?? obj.employerList).flatMap((item) => {
        const normalized = normalizeOption(item, ['employerId', 'id', 'ID'], ['employerName', 'name', 'Name']);
        return normalized ? [normalized] : [];
      }),
    ),
  };
}

function idSegment(id: BeneficiaryEntityId): string {
  return encodeURIComponent(String(id));
}

function isCompressibleImage(file: File): boolean {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressFileForUpload(file: File): Promise<File> {
  if (typeof window === 'undefined' || !isCompressibleImage(file)) {
    return file;
  }

  try {
    const image = await loadImageFromFile(file);
    let width = image.width;
    let height = image.height;

    if (width <= 0 || height <= 0) {
      return file;
    }

    const scale = Math.min(
      1,
      MAX_UPLOAD_IMAGE_WIDTH / width,
      MAX_UPLOAD_IMAGE_HEIGHT / height,
    );

    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(
      canvas,
      outputType,
      outputType === 'image/png' ? undefined : UPLOAD_IMAGE_QUALITY,
    );

    if (!blob) {
      return file;
    }

    const compressedFile = new File([blob], file.name, {
      type: outputType,
      lastModified: Date.now(),
    });

    return compressedFile.size < file.size || scale < 1 ? compressedFile : file;
  } catch {
    return file;
  }
}

async function prepareFilesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressFileForUpload(file)));
}

function normalizeProgrammeCompletionStatusOption(raw: unknown): ProgrammeCompletionStatusOption | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const id =
    obj.programmeCompletionStatusId ??
    obj.ProgrammeCompletionStatusID ??
    obj.programmecompletionstatusid ??
    obj.id ??
    obj.ID;
  const name =
    obj.programmeCompletionStatus ??
    obj.ProgrammeCompletionStatus ??
    obj.programmecompletionstatus ??
    obj.name ??
    obj.Name;

  if (id == null || name == null || String(name).trim() === '') return null;

  return {
    programmeCompletionStatusId: typeof id === 'number' ? id : String(id).trim(),
    programmeCompletionStatus: String(name).trim(),
    isActive:
      typeof obj.isActive === 'boolean'
        ? obj.isActive
        : typeof obj.IsActive === 'boolean'
        ? obj.IsActive
        : undefined,
  };
}

function normalizeProgrammeCompletionStatusReasonOption(raw: unknown): ProgrammeCompletionStatusReasonOption | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const completionReasonId =
    obj.completionReasonId ??
    obj.CompletionReasonID ??
    obj.completionreasonid ??
    obj.id ??
    obj.ID;
  const programmeCompletionStatusId =
    obj.programmeCompletionStatusId ??
    obj.ProgrammeCompletionStatusID ??
    obj.programmecompletionstatusid;
  const completionReasonDescription =
    obj.completionReasonDescription ??
    obj.CompletionReasonDescription ??
    obj.completionreasondescription ??
    obj.reason ??
    obj.name ??
    obj.Name;

  if (completionReasonId == null || programmeCompletionStatusId == null || completionReasonDescription == null) {
    return null;
  }

  return {
    completionReasonId: typeof completionReasonId === 'number' ? completionReasonId : String(completionReasonId).trim(),
    programmeCompletionStatusId:
      typeof programmeCompletionStatusId === 'number'
        ? programmeCompletionStatusId
        : String(programmeCompletionStatusId).trim(),
    completionReasonDescription: String(completionReasonDescription).trim(),
    isActive:
      typeof obj.isActive === 'boolean'
        ? obj.isActive
        : typeof obj.IsActive === 'boolean'
        ? obj.IsActive
        : undefined,
  };
}

function normalizeProgrammeLinkDocument(raw: unknown): BeneficiaryProgrammeLinkDocument | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const documentId =
    obj.beneficiaryProgrammeLinkDocumentId ??
    obj.BeneficiaryProgrammeLinkDocumentID ??
    obj.documentId ??
    obj.DocumentID ??
    null;
  const originalFileName =
    obj.originalFileName ?? obj.OriginalFileName ?? obj.fileName ?? obj.FileName ?? obj.name ?? obj.Name ?? null;

  if (documentId == null && originalFileName == null) {
    return null;
  }

  const fileSizeBytesRaw = obj.fileSizeBytes ?? obj.FileSizeBytes ?? obj.size ?? obj.Size ?? null;

  return {
    beneficiaryProgrammeLinkDocumentId:
      documentId == null ? undefined : typeof documentId === 'number' ? documentId : String(documentId).trim(),
    originalFileName: originalFileName == null ? null : String(originalFileName).trim(),
    storedFileName:
      obj.storedFileName == null && obj.StoredFileName == null ? null : String(obj.storedFileName ?? obj.StoredFileName).trim(),
    contentType:
      obj.contentType == null && obj.ContentType == null ? null : String(obj.contentType ?? obj.ContentType).trim(),
    fileExtension:
      obj.fileExtension == null && obj.FileExtension == null ? null : String(obj.fileExtension ?? obj.FileExtension).trim(),
    fileSizeBytes:
      fileSizeBytesRaw == null || Number.isNaN(Number(fileSizeBytesRaw)) ? null : Number(fileSizeBytesRaw),
    storagePath:
      obj.storagePath == null && obj.StoragePath == null ? null : String(obj.storagePath ?? obj.StoragePath).trim(),
    fileUrl: obj.fileUrl == null && obj.FileUrl == null ? null : String(obj.fileUrl ?? obj.FileUrl).trim(),
    documentTitle:
      obj.documentTitle == null && obj.DocumentTitle == null
        ? null
        : String(obj.documentTitle ?? obj.DocumentTitle).trim(),
    uploadedBy:
      obj.uploadedBy == null && obj.UploadedBy == null ? null : String(obj.uploadedBy ?? obj.UploadedBy).trim(),
    isActive:
      typeof obj.isActive === 'boolean'
        ? obj.isActive
        : typeof obj.IsActive === 'boolean'
        ? obj.IsActive
        : undefined,
    dateCreated:
      obj.dateCreated != null || obj.DateCreated != null
        ? String(obj.dateCreated ?? obj.DateCreated).trim()
        : obj.dateUploaded != null || obj.DateUploaded != null || obj.uploadDate != null || obj.UploadDate != null
        ? String(obj.dateUploaded ?? obj.DateUploaded ?? obj.uploadDate ?? obj.UploadDate).trim()
        : null,
  };
}

export async function saveMyBeneficiaryProfile(
  payload: BeneficiaryProfileSavePayload,
): Promise<unknown> {
  try {
    const { data } = await apiClient.put(PROFILE_BASE, payload);
    return data;
  } catch {
    const { data } = await apiClient.post(COMPAT_PROFILE_SAVE, { request: payload });
    return data;
  }
}

export async function getMyBeneficiaryProfile(): Promise<BeneficiaryProfileRecord> {
  const { data } = await apiClient.get(PROFILE_BASE);
  return (data ?? {}) as BeneficiaryProfileRecord;
}

export async function getBeneficiaryProfileOptions(): Promise<BeneficiaryProfileOptions> {
  const { data } = await apiClient.get(`${PROFILE_BASE}/options`);
  return normalizeProfileOptions(data);
}

export async function listBeneficiaryProgrammeLinks(): Promise<BeneficiaryProgrammeLink[]> {
  const { data } = await apiClient.get(`${PROFILE_BASE}/programme-links`);
  return normalizeList<BeneficiaryProgrammeLink>(data);
}

export async function getProgrammeCompletionStatuses(): Promise<ProgrammeCompletionStatusOption[]> {
  const { data } = await apiClient.get(`${PROFILE_BASE}/programme-completion-statuses`);
  return normalizeList<unknown>(data)
    .map(normalizeProgrammeCompletionStatusOption)
    .filter((item): item is ProgrammeCompletionStatusOption => item != null);
}

export async function getProgrammeCompletionStatusReasons(
  programmeCompletionStatusId: BeneficiaryEntityId,
): Promise<ProgrammeCompletionStatusReasonOption[]> {
  const { data } = await apiClient.get(`${PROFILE_BASE}/programme-completion-status-reasons`, {
    params: { programmeCompletionStatusId: idSegment(programmeCompletionStatusId) },
  });
  return normalizeList<unknown>(data)
    .map(normalizeProgrammeCompletionStatusReasonOption)
    .filter((item): item is ProgrammeCompletionStatusReasonOption => item != null);
}

export async function getBeneficiaryProgrammeLinkQualification(params: {
  programmeId?: BeneficiaryEntityId | null;
  programmeName?: string | null;
}): Promise<BeneficiaryProgrammeQualificationLookup> {
  const query: Record<string, string | number> = {};
  if (params.programmeId != null && String(params.programmeId).trim() !== '') {
    query.programmeId =
      typeof params.programmeId === 'number' ? params.programmeId : String(params.programmeId).trim();
  }
  if (params.programmeName != null && String(params.programmeName).trim() !== '') {
    query.programmeName = String(params.programmeName).trim();
  }

  const { data } = await apiClient.get(`${PROFILE_BASE}/programme-links/qualification`, {
    params: query,
  });

  const record = asRecord(data) ?? {};
  const qualificationId =
    record.qualificationId ?? record.QualificationId ?? record.qualificationID ?? record.QualificationID ?? null;
  const qualificationName =
    record.qualificationName ?? record.QualificationName ?? record.qualification ?? record.Qualification ?? null;
  const normalizedQualificationId =
    qualificationId == null || String(qualificationId).trim() === '' || String(qualificationId).trim() === '0'
      ? null
      : typeof qualificationId === 'number'
      ? qualificationId
      : String(qualificationId).trim();
  const normalizedQualificationName =
    qualificationName == null || String(qualificationName).trim() === '' || String(qualificationName).trim().toLowerCase() === 'none'
      ? null
      : String(qualificationName).trim();

  return {
    qualificationId: normalizedQualificationId,
    qualificationName: normalizedQualificationName,
  };
}

export async function createBeneficiaryProgrammeLink(
  payload: BeneficiaryProgrammeLinkPayload,
): Promise<BeneficiaryProgrammeLink> {
  const { data } = await apiClient.post(`${PROFILE_BASE}/programme-links`, payload);
  return (data ?? {}) as BeneficiaryProgrammeLink;
}

export async function updateBeneficiaryProgrammeLink(
  programmeLinkId: BeneficiaryEntityId,
  payload: BeneficiaryProgrammeLinkPayload,
): Promise<BeneficiaryProgrammeLink> {
  const { data } = await apiClient.put(`${PROFILE_BASE}/programme-links/${idSegment(programmeLinkId)}`, payload);
  return (data ?? {}) as BeneficiaryProgrammeLink;
}

export async function deleteBeneficiaryProgrammeLink(programmeLinkId: BeneficiaryEntityId): Promise<void> {
  await apiClient.delete(`${PROFILE_BASE}/programme-links/${idSegment(programmeLinkId)}`);
}

export async function uploadBeneficiaryProgrammeLinkDocuments(
  programmeLinkId: BeneficiaryEntityId,
  files: File[],
  options?: {
    /** Single title applied when uploading multiple files together. */
    documentTitle?: string;
  },
): Promise<BeneficiaryProgrammeLinkDocument[]> {
  const preparedFiles = await prepareFilesForUpload(files);
  const formData = new FormData();
  const trimmedTitle =
    typeof options?.documentTitle === 'string'
      ? options.documentTitle.replace(/\u00a0/g, ' ').trim()
      : '';
  if (trimmedTitle !== '') {
    formData.append('documentTitle', trimmedTitle);
  }
  preparedFiles.forEach((file) => formData.append('files', file));

  const { data } = await apiClient.post(`${PROFILE_BASE}/programme-links/${idSegment(programmeLinkId)}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return normalizeList<unknown>(data)
    .map(normalizeProgrammeLinkDocument)
    .filter((item): item is BeneficiaryProgrammeLinkDocument => item != null);
}

/**
 * Replace one programme proof file via `PUT …/documents/{documentId}/replace` (multipart `file`, optional `documentTitle`).
 * Omit `documentTitle` to keep the server’s stored title unchanged.
 */
export async function replaceBeneficiaryProgrammeLinkDocumentFile(
  documentId: BeneficiaryEntityId,
  file: File,
  options?: { documentTitle?: string },
): Promise<BeneficiaryProgrammeLinkDocument | null> {
  const prepared = (await prepareFilesForUpload([file]))[0];
  if (!prepared) {
    return null;
  }

  const formData = new FormData();
  formData.append('file', prepared);

  const trimmedTitle =
    typeof options?.documentTitle === 'string'
      ? options.documentTitle.replace(/\u00a0/g, ' ').trim()
      : '';
  if (trimmedTitle !== '') {
    formData.append('documentTitle', trimmedTitle);
  }

  const { data } = await apiClient.put(
    `${PROFILE_BASE}/programme-links/documents/${idSegment(documentId)}/replace`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  const fromList = normalizeList<unknown>(data)
    .map(normalizeProgrammeLinkDocument)
    .filter((item): item is BeneficiaryProgrammeLinkDocument => item != null);

  const single = Array.isArray(data) ? null : normalizeProgrammeLinkDocument(data);
  return single ?? fromList[0] ?? null;
}

export async function listBeneficiaryProgrammeLinkDocuments(
  programmeLinkId: BeneficiaryEntityId,
): Promise<BeneficiaryProgrammeLinkDocument[]> {
  const { data } = await apiClient.get(`${PROFILE_BASE}/programme-links/${idSegment(programmeLinkId)}/documents`);
  return normalizeList<unknown>(data)
    .map(normalizeProgrammeLinkDocument)
    .filter((item): item is BeneficiaryProgrammeLinkDocument => item != null);
}

export async function downloadBeneficiaryProgrammeLinkDocument(documentId: BeneficiaryEntityId): Promise<Blob> {
  const { data } = await apiClient.get(
    `${PROFILE_BASE}/programme-links/documents/${idSegment(documentId)}/download`,
    { responseType: 'blob' },
  );
  return data as Blob;
}

export async function deleteBeneficiaryProgrammeLinkDocument(documentId: BeneficiaryEntityId): Promise<void> {
  await apiClient.delete(`${PROFILE_BASE}/programme-links/documents/${idSegment(documentId)}`);
}

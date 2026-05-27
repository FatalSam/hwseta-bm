import axios from 'axios';
import apiClient from '@/ultis/apiClient';
import { getDefaultSettings } from '@/lib/form-builder-defaults';
import {
  formatFormResponseAnswers,
  summarizeFormResponseAnswers,
} from '@/lib/formatFormResponseAnswers';
import {
  mockGetFormFeedback,
  mockListFormFeedback,
  mockListFormFeedbackAssignments,
} from '@/data/mockFormFeedback';
import type { FormSettings } from '@/types/dynamicForm';
import type {
  FeedbackCompletionStatus,
  FormFeedbackAssignmentRow,
  FormFeedbackDetail,
  FormFeedbackListParams,
  FormFeedbackListRow,
  FormFeedbackRecipientType,
} from '@/types/formFeedback';
import type { PagedResult } from '@/types/formSubmissions';

const MANAGE_RESPONSES = '/api/manage/form-builder/responses';
const MANAGE_ASSIGNMENTS = '/api/manage/form-builder/feedback-assignments';

function asObject(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function toStr(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toNullableStr(v: unknown): string | null {
  const s = toStr(v);
  return s || null;
}

function getErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  if (error != null && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) return error.code;
  if (error != null && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function shouldUseMock(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status != null) return status === 404 || status === 501 || status === 405;
  const code = getErrorCode(error);
  return code === 'ERR_NETWORK' || code === 'ECONNABORTED';
}

function parseRecipientType(v: unknown): FormFeedbackRecipientType {
  const s = toStr(v).toLowerCase();
  if (s === 'beneficiary') return 'beneficiary';
  if (s === 'external') return 'external';
  return 'unknown';
}

function parseCompletionStatus(v: unknown): FeedbackCompletionStatus {
  return toStr(v).toLowerCase() === 'completed' ? 'completed' : 'pending';
}

function normalizeAssignment(raw: unknown): FormFeedbackAssignmentRow | null {
  const o = asObject(raw);
  if (!o) return null;
  const distributionId = toStr(o.distributionId ?? o.DistributionId);
  const formId = toStr(o.formId ?? o.FormId);
  const assignmentId = toStr(o.assignmentId ?? o.AssignmentId ?? o.id ?? o.ID);
  if (!distributionId || !formId) return null;
  const completionStatus = parseCompletionStatus(o.completionStatus ?? o.CompletionStatus);
  return {
    assignmentId: assignmentId || `${distributionId}:${formId}`,
    formId,
    formTitle: toStr(o.formTitle ?? o.FormTitle) || 'Untitled form',
    distributionId,
    notificationId: toNullableStr(o.notificationId ?? o.NotificationId),
    recipientType: parseRecipientType(o.recipientType ?? o.RecipientType),
    beneficiaryId: toNullableStr(o.beneficiaryId ?? o.BeneficiaryId),
    fullName: toNullableStr(o.fullName ?? o.FullName),
    email: toNullableStr(o.email ?? o.Email),
    cellphone: toNullableStr(o.cellphone ?? o.Cellphone ?? o.cellNo ?? o.CellNo),
    completionStatus,
    responseId: toNullableStr(o.responseId ?? o.ResponseId),
    submittedAt: toNullableStr(o.submittedAt ?? o.SubmittedAt),
    sentAt: toNullableStr(o.sentAt ?? o.SentAt),
    createdAt: toStr(o.createdAt ?? o.CreatedAt ?? o.dateCreated ?? o.DateCreated),
    deliveryStatus: toNullableStr(o.deliveryStatus ?? o.DeliveryStatus ?? o.status ?? o.Status),
    formLink: toStr(o.formLink ?? o.FormLink),
    channels: Array.isArray(o.channels ?? o.Channels)
      ? (o.channels as unknown[]).map(toStr).filter(Boolean)
      : toStr(o.channels ?? o.Channels)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
    programmeName: toNullableStr(o.programmeName ?? o.ProgrammeName),
    qualificationName: toNullableStr(o.qualificationName ?? o.QualificationName),
    audienceType: toNullableStr(o.audienceType ?? o.AudienceType),
    answersSummary: toNullableStr(o.answersSummary ?? o.AnswersSummary),
  };
}

function parseSettings(raw: unknown): FormSettings {
  if (raw && typeof raw === 'object') {
    const s = raw as FormSettings;
    if (Array.isArray(s.sections)) {
      return {
        sections: s.sections,
        conditions: Array.isArray(s.conditions) ? s.conditions : [],
        uiSettings: s.uiSettings && typeof s.uiSettings === 'object' ? { ...s.uiSettings } : {},
      };
    }
  }
  return getDefaultSettings();
}

function parsePayload(raw: unknown): Record<string, string | string[]> {
  const o = asObject(raw);
  if (!o) return {};
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(o)) {
    if (Array.isArray(value)) out[key] = value.map((v) => String(v));
    else if (value != null) out[key] = String(value);
  }
  return out;
}

function unwrapPaged<T>(data: unknown, normalizer: (raw: unknown) => T | null): PagedResult<T> {
  const root = asObject(data) ?? {};
  const itemsRaw = asArray(root.items ?? root.data ?? root.results ?? root.value ?? data);
  const items = itemsRaw.map(normalizer).filter((x): x is T => x != null);
  const page = toNum(root.page ?? root.Page, 1);
  const pageSize = toNum(root.pageSize ?? root.PageSize, 25);
  const totalCount = toNum(root.totalCount ?? root.TotalCount, items.length);
  const totalPages = toNum(
    root.totalPages ?? root.TotalPages,
    Math.max(1, Math.ceil(totalCount / pageSize)),
  );
  return { items, page, pageSize, totalCount, totalPages };
}

function normalizeListRow(raw: unknown): FormFeedbackListRow | null {
  const o = asObject(raw);
  if (!o) return null;
  const responseId = toStr(o.responseId ?? o.ResponseId ?? o.id ?? o.ID);
  const formId = toStr(o.formId ?? o.FormId);
  if (!responseId || !formId) return null;
  const payload = parsePayload(o.payload ?? o.Payload);
  const settings = parseSettings(o.settings ?? o.Settings);
  const answersRaw = o.answers ?? o.Answers;
  let answersSummary = toNullableStr(o.answersSummary ?? o.AnswersSummary);
  if (!answersSummary && Array.isArray(answersRaw)) {
    answersSummary = summarizeFormResponseAnswers(
      answersRaw.map((a) => {
        const row = asObject(a);
        return {
          fieldId: toStr(row?.fieldId ?? row?.FieldId),
          label: toStr(row?.label ?? row?.Label),
          value: toStr(row?.value ?? row?.Value),
        };
      }),
    );
  }
  if (!answersSummary && Object.keys(payload).length > 0) {
    answersSummary = summarizeFormResponseAnswers(formatFormResponseAnswers(settings, payload));
  }
  return {
    responseId,
    formId,
    formTitle: toStr(o.formTitle ?? o.FormTitle) || 'Untitled form',
    distributionId: toNullableStr(o.distributionId ?? o.DistributionId),
    notificationId: toNullableStr(o.notificationId ?? o.NotificationId),
    recipientType: parseRecipientType(o.recipientType ?? o.RecipientType),
    beneficiaryId: toNullableStr(o.beneficiaryId ?? o.BeneficiaryId),
    fullName: toNullableStr(o.fullName ?? o.FullName),
    email: toNullableStr(o.email ?? o.Email),
    cellphone: toNullableStr(o.cellphone ?? o.Cellphone ?? o.cellNo ?? o.CellNo),
    submittedAt: toStr(o.submittedAt ?? o.SubmittedAt ?? o.dateCreated ?? o.DateCreated),
    answersSummary,
    completionStatus: parseCompletionStatus(o.completionStatus ?? o.CompletionStatus ?? 'completed'),
  };
}

function normalizeDetail(raw: unknown): FormFeedbackDetail | null {
  const list = normalizeListRow(raw);
  if (!list) return null;
  const o = asObject(raw)!;
  const payload = parsePayload(o.payload ?? o.Payload);
  const settings = parseSettings(o.settings ?? o.Settings);
  const answersRaw = o.answers ?? o.Answers;
  let answers = Array.isArray(answersRaw)
    ? answersRaw
        .map((a) => {
          const row = asObject(a);
          if (!row) return null;
          return {
            fieldId: toStr(row.fieldId ?? row.FieldId),
            label: toStr(row.label ?? row.Label),
            value: toStr(row.value ?? row.Value),
          };
        })
        .filter((x): x is { fieldId: string; label: string; value: string } => x != null)
    : formatFormResponseAnswers(settings, payload);
  return {
    ...list,
    payload,
    settings,
    answers,
    answersSummary: list.answersSummary ?? summarizeFormResponseAnswers(answers),
    createdByUserId: toNullableStr(o.createdByUserId ?? o.CreatedByUserId),
    completionStatus: list.completionStatus ?? 'completed',
  };
}

function buildParams(params: FormFeedbackListParams = {}): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (params.page != null) out.page = params.page;
  if (params.pageSize != null) out.pageSize = params.pageSize;
  const formId = params.formId?.trim();
  if (formId) out.formId = formId;
  const distributionId = params.distributionId?.trim();
  if (distributionId) out.distributionId = distributionId;
  const recipientType = params.recipientType?.trim();
  if (recipientType && recipientType !== 'unknown') out.recipientType = recipientType;
  const completionStatus = params.completionStatus?.trim();
  if (completionStatus === 'completed' || completionStatus === 'pending') {
    out.completionStatus = completionStatus;
  }
  const search = params.search?.trim();
  if (search) out.search = search;
  if (params.submittedFrom) out.submittedFrom = params.submittedFrom;
  if (params.submittedTo) out.submittedTo = params.submittedTo;
  return out;
}

export async function listFormFeedbackAssignments(
  params: FormFeedbackListParams = {},
): Promise<PagedResult<FormFeedbackAssignmentRow>> {
  try {
    const { data } = await apiClient.get(MANAGE_ASSIGNMENTS, { params: buildParams(params) });
    return unwrapPaged(data, normalizeAssignment);
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    return mockListFormFeedbackAssignments(params);
  }
}

export function parseFormFeedbackDetail(data: unknown): FormFeedbackDetail | null {
  return normalizeDetail(data);
}

export async function listFormFeedback(
  params: FormFeedbackListParams = {},
): Promise<PagedResult<FormFeedbackListRow>> {
  try {
    const { data } = await apiClient.get(MANAGE_RESPONSES, { params: buildParams(params) });
    return unwrapPaged(data, normalizeListRow);
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    return mockListFormFeedback(params);
  }
}

export async function getFormFeedback(responseId: string): Promise<FormFeedbackDetail> {
  try {
    const { data } = await apiClient.get(
      `${MANAGE_RESPONSES}/${encodeURIComponent(responseId)}`,
    );
    const row = normalizeDetail(data);
    if (!row) throw new Error('Response not found.');
    return row;
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    const row = mockGetFormFeedback(responseId);
    if (!row) throw new Error('Response not found.');
    return row;
  }
}

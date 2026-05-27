import axios from 'axios';
import apiClient from '@/ultis/apiClient';
import { getFormFeedback, parseFormFeedbackDetail } from '@/api/formFeedback';
import {
  mockGetMyFeedbackFormResponse,
  mockListAdminBeneficiaryFeedbackForms,
  mockListMyFeedbackForms,
} from '@/data/mockBeneficiaryFeedbackForms';
import type { FeedbackCompletionStatus } from '@/types/formFeedback';
import type {
  BeneficiaryFeedbackFormRow,
  BeneficiaryFeedbackFormsParams,
  BeneficiaryFeedbackFormsResult,
} from '@/types/beneficiaryFeedbackForms';
import type { FormFeedbackDetail } from '@/types/formFeedback';

const BENEFICIARY_BASE = '/api/beneficiary/feedback-forms';
const ADMIN_BENEFICIARY_BASE = '/api/Admin/beneficiaries';

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

function parseCompletionStatus(v: unknown): FeedbackCompletionStatus {
  return toStr(v).toLowerCase() === 'completed' ? 'completed' : 'pending';
}

function getErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) return error.code;
  return undefined;
}

function shouldUseMock(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status != null) return status === 404 || status === 501 || status === 405;
  const code = getErrorCode(error);
  return code === 'ERR_NETWORK' || code === 'ECONNABORTED';
}

function normalizeChannels(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map(toStr).filter(Boolean);
  }
  return toStr(v)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeRow(raw: unknown): BeneficiaryFeedbackFormRow | null {
  const o = asObject(raw);
  if (!o) return null;
  const distributionId = toStr(o.distributionId ?? o.DistributionId);
  const formId = toStr(o.formId ?? o.FormId);
  if (!distributionId || !formId) return null;
  const deliveryStatus = toStr(o.deliveryStatus ?? o.DeliveryStatus ?? o.status ?? o.Status) || 'pending';
  const completionStatus = parseCompletionStatus(o.completionStatus ?? o.CompletionStatus);
  return {
    distributionId,
    formId,
    formTitle: toStr(o.formTitle ?? o.FormTitle) || 'Untitled form',
    audienceType: toStr(o.audienceType ?? o.AudienceType),
    programmeId: toNum(o.programmeId ?? o.ProgrammeId, NaN) || null,
    programmeName: toNullableStr(o.programmeName ?? o.ProgrammeName),
    qualificationId: toNum(o.qualificationId ?? o.QualificationId, NaN) || null,
    qualificationName: toNullableStr(o.qualificationName ?? o.QualificationName),
    channels: normalizeChannels(o.channels ?? o.Channels),
    status: deliveryStatus,
    deliveryStatus,
    completionStatus,
    createdAt: toStr(o.createdAt ?? o.CreatedAt ?? o.dateCreated ?? o.DateCreated),
    sentAt: toNullableStr(o.sentAt ?? o.SentAt),
    submittedAt: toNullableStr(o.submittedAt ?? o.SubmittedAt),
    notificationId: toNullableStr(o.notificationId ?? o.NotificationId),
    responseId: toNullableStr(o.responseId ?? o.ResponseId),
    beneficiaryId: toNullableStr(o.beneficiaryId ?? o.BeneficiaryId),
    fullName: toNullableStr(o.fullName ?? o.FullName),
    email: toNullableStr(o.email ?? o.Email),
    cellphone: toNullableStr(o.cellphone ?? o.Cellphone ?? o.cellNo ?? o.CellNo),
    shortLink: toNullableStr(o.shortLink ?? o.ShortLink),
    formLink: toStr(o.formLink ?? o.FormLink),
    notificationCount: toNum(o.notificationCount ?? o.NotificationCount, 1),
  };
}

function buildParams(params: BeneficiaryFeedbackFormsParams = {}): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (params.page != null) out.page = params.page;
  if (params.pageSize != null) out.pageSize = params.pageSize;
  const completionStatus = params.completionStatus ?? params.status?.trim();
  if (completionStatus === 'completed' || completionStatus === 'pending') {
    out.completionStatus = completionStatus;
  }
  const search = params.search?.trim();
  if (search) out.search = search;
  return out;
}

function unwrapPaged(data: unknown): BeneficiaryFeedbackFormsResult {
  const root = asObject(data) ?? {};
  const rawItems = asArray(root.items ?? root.Items ?? root.data ?? root.Data ?? data);
  const items = rawItems.map(normalizeRow).filter((x): x is BeneficiaryFeedbackFormRow => x != null);
  const page = toNum(root.page ?? root.Page, 1);
  const pageSize = toNum(root.pageSize ?? root.PageSize, items.length || 25);
  const totalCount = toNum(root.totalCount ?? root.TotalCount, items.length);
  const totalPages = toNum(
    root.totalPages ?? root.TotalPages,
    Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize))),
  );
  return { items, page, pageSize, totalCount, totalPages };
}

export async function listMyFeedbackForms(
  params?: BeneficiaryFeedbackFormsParams,
): Promise<BeneficiaryFeedbackFormsResult> {
  try {
    const { data } = await apiClient.get(BENEFICIARY_BASE, { params: buildParams(params) });
    return unwrapPaged(data);
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    return mockListMyFeedbackForms(params);
  }
}

export async function listAdminBeneficiaryFeedbackForms(
  beneficiaryId: string,
  params?: BeneficiaryFeedbackFormsParams,
): Promise<BeneficiaryFeedbackFormsResult> {
  try {
    const { data } = await apiClient.get(
      `${ADMIN_BENEFICIARY_BASE}/${encodeURIComponent(beneficiaryId)}/feedback-forms`,
      { params: buildParams(params) },
    );
    return unwrapPaged(data);
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    return mockListAdminBeneficiaryFeedbackForms(beneficiaryId, params);
  }
}

export async function getMyFeedbackFormResponse(responseId: string): Promise<FormFeedbackDetail> {
  try {
    const { data } = await apiClient.get(
      `${BENEFICIARY_BASE}/${encodeURIComponent(responseId)}`,
    );
    const detail = parseFormFeedbackDetail(data);
    if (!detail) throw new Error('Response not found.');
    return detail;
  } catch (e) {
    if (!shouldUseMock(e)) throw e;
    const row = mockGetMyFeedbackFormResponse(responseId);
    if (!row?.responseId) throw new Error('Response not found.');
    return getFormFeedback(responseId);
  }
}

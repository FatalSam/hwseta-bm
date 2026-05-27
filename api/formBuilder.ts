import axios from 'axios';
import apiClient from '@/ultis/apiClient';
import publicApiClient from '@/ultis/publicApiClient';
import { mockRecordFormFeedback } from '@/data/mockFormFeedback';
import { getDefaultSettings } from '@/lib/form-builder-defaults';
import type { FormSettings } from '@/types/dynamicForm';

const MANAGE = '/api/manage/form-builder/forms';
const PUBLIC = '/api/form-builder/forms';

export interface ManageCreateFormPayload {
  createdByUserId: string;
  title: string;
  description?: string | null;
  settings: FormSettings;
}

export interface ManageUpdateFormPayload {
  title: string;
  description?: string | null;
  settings: FormSettings;
}

export interface FormListItem {
  id: string;
  title: string;
  updatedAt: string | null;
}

export interface FormListParams {
  page?: number;
  pageSize?: number;
  search?: string | null;
  updatedFrom?: string | null;
  updatedTo?: string | null;
}

export interface FormListPagedResult {
  items: FormListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

const unwrapArray = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'value']) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
};

const unwrapObject = (data: unknown): Record<string, unknown> | null => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const inner = record.data ?? record.Data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return record;
};

export function pickFormId(record: Record<string, unknown>): string {
  const v =
    record.formId ??
    record.FormId ??
    record.formID ??
    record.FormID ??
    record.id ??
    record.ID;
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function pickTitle(record: Record<string, unknown>): string {
  const t = record.title ?? record.Title;
  return t != null && String(t).trim() !== '' ? String(t).trim() : 'Untitled form';
}

function pickUpdatedAt(record: Record<string, unknown>): string | null {
  const v =
    record.updatedAt ??
    record.UpdatedAt ??
    record.updated_at ??
    record.dateModified ??
    record.DateModified;
  if (v == null) return null;
  return String(v);
}

export function normalizeFormDetail(data: unknown): {
  id: string;
  title: string;
  description: string | null;
  settings: FormSettings;
} {
  const obj = unwrapObject(data) ?? (data as Record<string, unknown>);
  const id = pickFormId(obj);
  const title = pickTitle(obj);
  const desc = obj.description ?? obj.Description;
  const settingsRaw = obj.settings ?? obj.Settings;
  let settings: FormSettings = getDefaultSettings();
  if (settingsRaw && typeof settingsRaw === 'object') {
    const s = settingsRaw as FormSettings;
    if (Array.isArray(s.sections)) {
      settings = {
        sections: s.sections,
        conditions: Array.isArray(s.conditions) ? s.conditions : [],
        uiSettings:
          s.uiSettings && typeof s.uiSettings === 'object' ? { ...s.uiSettings } : {},
      };
    }
  }
  return {
    id,
    title,
    description: desc != null ? String(desc) : null,
    settings,
  };
}

function mapFormListRow(row: Record<string, unknown>): FormListItem {
  return {
    id: pickFormId(row),
    title: pickTitle(row),
    updatedAt: pickUpdatedAt(row),
  };
}

function tryUnwrapPagedForms(data: unknown): FormListPagedResult | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const root = data as Record<string, unknown>;
  const itemsRaw = root.items ?? root.data ?? root.results;
  if (!Array.isArray(itemsRaw)) return null;
  const page = Number(root.page ?? root.Page ?? 1);
  const pageSize = Number(root.pageSize ?? root.PageSize ?? itemsRaw.length);
  const totalCount = Number(root.totalCount ?? root.TotalCount ?? itemsRaw.length);
  const totalPages = Number(
    root.totalPages ?? root.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize)),
  );
  return {
    items: (itemsRaw as Record<string, unknown>[]).map(mapFormListRow),
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : itemsRaw.length,
    totalCount: Number.isFinite(totalCount) ? totalCount : itemsRaw.length,
    totalPages: Number.isFinite(totalPages) ? totalPages : 1,
  };
}

/** List forms; passes optional query params when backend supports server-side filter/paging. */
export async function listManageForms(params?: FormListParams): Promise<FormListItem[]> {
  const query: Record<string, string | number> = {};
  if (params?.page != null) query.page = params.page;
  if (params?.pageSize != null) query.pageSize = params.pageSize;
  if (params?.search) query.search = params.search;
  if (params?.updatedFrom) query.updatedFrom = params.updatedFrom;
  if (params?.updatedTo) query.updatedTo = params.updatedTo;

  const response = await apiClient.get(MANAGE, {
    params: Object.keys(query).length > 0 ? query : undefined,
  });
  const paged = tryUnwrapPagedForms(response.data);
  if (paged) return paged.items;
  const rows = unwrapArray<Record<string, unknown>>(response.data);
  return rows.map(mapFormListRow);
}

export async function createManageForm(payload: ManageCreateFormPayload): Promise<string> {
  try {
    const response = await apiClient.post(MANAGE, payload);
    const data = response.data;
    if (typeof data === 'string' && data.trim()) return data.trim();
    const norm = normalizeFormDetail(data);
    if (norm.id) return norm.id;
    throw new Error('Create succeeded but no form id was returned.');
  } catch (e) {
    const msg = messageFromAxiosError(e);
    if (msg) throw new Error(msg);
    throw e;
  }
}

export async function updateManageForm(formId: string, payload: ManageUpdateFormPayload): Promise<void> {
  try {
    await apiClient.put(`${MANAGE}/${encodeURIComponent(formId)}`, payload);
  } catch (e) {
    const msg = messageFromAxiosError(e);
    if (msg) throw new Error(msg);
    throw e;
  }
}

function messageFromAxiosError(error: unknown): string | null {
  if (!axios.isAxiosError(error) || !error.response?.data) return null;
  const d = error.response.data;
  if (typeof d === 'string' && d.trim()) return d.trim();
  if (typeof d === 'object' && d !== null) {
    const r = d as Record<string, unknown>;
    const err = r.error ?? r.Error ?? r.message ?? r.Message;
    if (typeof err === 'string' && err.trim()) return err.trim();
  }
  return null;
}

function getErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  if (error != null && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function shouldUseMockSubmit(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 404 || status === 501 || status === 405 || status === 401 || status === 403) {
    return true;
  }
  const message = messageFromAxiosError(error) ?? (error instanceof Error ? error.message : '');
  if (/session\s+expired|log\s*in\s+again|unauthori[sz]ed/i.test(message)) {
    return true;
  }
  const code = axios.isAxiosError(error)
    ? error.code
    : (error as { code?: string } | null)?.code;
  return code === 'ERR_NETWORK' || code === 'ECONNABORTED';
}

function mockPublicFormDetail(formId: string): {
  id: string;
  title: string;
  description: string | null;
  settings: FormSettings;
} {
  const settings = getDefaultSettings();
  if (settings.sections.length === 0) {
    settings.sections = [
      {
        id: 'section-feedback',
        title: 'Your feedback',
        order: 0,
        fields: [
          {
            id: 'f_rating',
            type: 'radio',
            label: 'Overall satisfaction',
            order: 0,
            required: true,
            options: ['Excellent', 'Good', 'Fair', 'Poor'],
          },
          {
            id: 'f_comments',
            type: 'long_text',
            label: 'Additional comments',
            order: 1,
            required: false,
          },
        ],
      },
    ];
  }
  return {
    id: formId,
    title: 'Feedback form',
    description: null,
    settings,
  };
}

export async function getPublicForm(formId: string) {
  try {
    const response = await publicApiClient.get(`${PUBLIC}/${encodeURIComponent(formId)}`);
    return normalizeFormDetail(response.data);
  } catch (e) {
    if (!shouldUseMockSubmit(e)) {
      const msg = messageFromAxiosError(e);
      if (msg) throw new Error(msg);
      throw e;
    }
    return mockPublicFormDetail(formId);
  }
}

export type SubmitPublicFormBody = {
  payload: Record<string, unknown>;
  createdByUserId?: string | null;
  distributionId?: string | null;
  notificationId?: string | null;
  formTitle?: string;
  settings?: FormSettings;
};

export async function submitPublicForm(formId: string, body: SubmitPublicFormBody) {
  const { createdByUserId, payload, distributionId, notificationId, formTitle, settings } = body;
  const json: Record<string, unknown> = { payload };
  if (createdByUserId !== undefined) {
    json.createdByUserId = createdByUserId;
  }
  const distId = distributionId?.trim();
  const notifId = notificationId?.trim();
  if (distId) json.distributionId = distId;
  if (notifId) json.notificationId = notifId;
  try {
    const response = await publicApiClient.post(`${PUBLIC}/${encodeURIComponent(formId)}/submit`, json);
    return response.data;
  } catch (e) {
    const isFeedbackAssignment = Boolean(distId || notifId);
    if (shouldUseMockSubmit(e) || isFeedbackAssignment) {
      return mockRecordFormFeedback({
        formId,
        formTitle,
        payload,
        distributionId: distId || null,
        notificationId: notifId || null,
        createdByUserId: createdByUserId ?? null,
        settings,
      });
    }
    const msg = messageFromAxiosError(e);
    if (msg) {
      throw new Error(msg);
    }
    throw e;
  }
}

import axios from 'axios';
import apiClient from '@/ultis/apiClient';
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

export async function listManageForms(): Promise<FormListItem[]> {
  const response = await apiClient.get(MANAGE);
  const rows = unwrapArray<Record<string, unknown>>(response.data);
  return rows.map((row) => ({
    id: pickFormId(row),
    title: pickTitle(row),
    updatedAt: pickUpdatedAt(row),
  }));
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

export async function getPublicForm(formId: string) {
  const response = await apiClient.get(`${PUBLIC}/${encodeURIComponent(formId)}`);
  return normalizeFormDetail(response.data);
}

export type SubmitPublicFormBody = {
  payload: Record<string, unknown>;
  createdByUserId?: string | null;
};

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

export async function submitPublicForm(formId: string, body: SubmitPublicFormBody) {
  const { createdByUserId, payload } = body;
  const json: Record<string, unknown> = { payload };
  if (createdByUserId !== undefined) {
    json.createdByUserId = createdByUserId;
  }
  try {
    const response = await apiClient.post(`${PUBLIC}/${encodeURIComponent(formId)}/submit`, json);
    return response.data;
  } catch (e) {
    const msg = messageFromAxiosError(e);
    if (msg) {
      throw new Error(msg);
    }
    throw e;
  }
}

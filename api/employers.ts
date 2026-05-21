import apiClient from '@/ultis/apiClient';
import type {
  Employer,
  EmployerAccreditationBodiesPutPayload,
  EmployerAccreditationBodyLink,
  EmployerAction,
  EmployerActionCreatePayload,
  EmployerCreatePayload,
  EmployerId,
  EmployerUpdatePayload,
} from '@/types/employers';

const BASE = '/api/Employers';

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.employers)) return o.employers as T[];
  }
  return [];
}

function idSegment(id: EmployerId): string {
  return encodeURIComponent(String(id));
}

export async function listEmployers(): Promise<Employer[]> {
  const { data } = await apiClient.get(BASE);
  return normalizeList<Employer>(data);
}

export async function getEmployer(id: EmployerId): Promise<Employer> {
  const { data } = await apiClient.get(`${BASE}/${idSegment(id)}`);
  return data as Employer;
}

export async function createEmployer(payload: EmployerCreatePayload): Promise<Employer> {
  const { data, status } = await apiClient.post(BASE, payload);
  if (status === 201 && data != null) return data as Employer;
  return data as Employer;
}

export async function updateEmployer(id: EmployerId, payload: EmployerUpdatePayload): Promise<Employer> {
  const { data } = await apiClient.put(`${BASE}/${idSegment(id)}`, payload);
  return data as Employer;
}

export async function deleteEmployer(id: EmployerId): Promise<void> {
  await apiClient.delete(`${BASE}/${idSegment(id)}`);
}

/** `GET /api/Employers/{employerId}/accreditation-bodies` */
export async function listEmployerAccreditationBodies(
  employerId: EmployerId,
): Promise<EmployerAccreditationBodyLink[]> {
  const { data } = await apiClient.get(`${BASE}/${idSegment(employerId)}/accreditation-bodies`);
  return normalizeList<EmployerAccreditationBodyLink>(data);
}

/** `PUT /api/Employers/{employerId}/accreditation-bodies` — replaces selection (empty clears) */
export async function setEmployerAccreditationBodies(
  employerId: EmployerId,
  body: EmployerAccreditationBodiesPutPayload,
): Promise<void> {
  await apiClient.put(`${BASE}/${idSegment(employerId)}/accreditation-bodies`, body);
}

export async function listEmployerActions(employerId: EmployerId): Promise<EmployerAction[]> {
  const { data } = await apiClient.get(`${BASE}/${idSegment(employerId)}/actions`);
  return normalizeList<EmployerAction>(data);
}

export async function getEmployerAction(
  employerId: EmployerId,
  actionTrackId: EmployerId,
): Promise<EmployerAction> {
  const { data } = await apiClient.get(
    `${BASE}/${idSegment(employerId)}/actions/${idSegment(actionTrackId)}`,
  );
  return data as EmployerAction;
}

export async function createEmployerAction(
  employerId: EmployerId,
  payload: EmployerActionCreatePayload,
): Promise<EmployerAction> {
  const { data } = await apiClient.post(`${BASE}/${idSegment(employerId)}/actions`, payload);
  return data as EmployerAction;
}

export async function deleteEmployerAction(employerId: EmployerId, actionTrackId: EmployerId): Promise<void> {
  await apiClient.delete(`${BASE}/${idSegment(employerId)}/actions/${idSegment(actionTrackId)}`);
}

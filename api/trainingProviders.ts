import apiClient from '@/ultis/apiClient';
import type {
  TrainingProviderAccreditationBodiesPutPayload,
  TrainingProviderAccreditationBodyLink,
  TrainingProvider,
  TrainingProviderAction,
  TrainingProviderActionCreatePayload,
  TrainingProviderCreatePayload,
  TrainingProviderId,
  TrainingProviderUpdatePayload,
} from '@/types/trainingProviders';

const BASE = '/api/TrainingProviders';

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.trainingProviders)) return o.trainingProviders as T[];
  }
  return [];
}

function idSegment(id: TrainingProviderId): string {
  return encodeURIComponent(String(id));
}

export async function listTrainingProviders(): Promise<TrainingProvider[]> {
  const { data } = await apiClient.get(BASE);
  return normalizeList<TrainingProvider>(data);
}

export async function getTrainingProvider(id: TrainingProviderId): Promise<TrainingProvider> {
  const { data } = await apiClient.get(`${BASE}/${idSegment(id)}`);
  return data as TrainingProvider;
}

export async function createTrainingProvider(
  payload: TrainingProviderCreatePayload,
): Promise<TrainingProvider> {
  const { data, status } = await apiClient.post(BASE, payload);
  if (status === 201 && data != null) return data as TrainingProvider;
  return data as TrainingProvider;
}

export async function updateTrainingProvider(
  id: TrainingProviderId,
  payload: TrainingProviderUpdatePayload,
): Promise<TrainingProvider> {
  const { data } = await apiClient.put(`${BASE}/${idSegment(id)}`, payload);
  return data as TrainingProvider;
}

export async function deleteTrainingProvider(id: TrainingProviderId): Promise<void> {
  await apiClient.delete(`${BASE}/${idSegment(id)}`);
}

/** `GET /api/TrainingProviders/{trainingProviderId}/accreditation-bodies` */
export async function listTrainingProviderAccreditationBodies(
  trainingProviderId: TrainingProviderId,
): Promise<TrainingProviderAccreditationBodyLink[]> {
  const { data } = await apiClient.get(`${BASE}/${idSegment(trainingProviderId)}/accreditation-bodies`);
  return normalizeList<TrainingProviderAccreditationBodyLink>(data);
}

/** `PUT /api/TrainingProviders/{trainingProviderId}/accreditation-bodies` */
export async function setTrainingProviderAccreditationBodies(
  trainingProviderId: TrainingProviderId,
  body: TrainingProviderAccreditationBodiesPutPayload,
): Promise<void> {
  await apiClient.put(`${BASE}/${idSegment(trainingProviderId)}/accreditation-bodies`, body);
}

export async function listTrainingProviderActions(
  trainingProviderId: TrainingProviderId,
): Promise<TrainingProviderAction[]> {
  const { data } = await apiClient.get(`${BASE}/${idSegment(trainingProviderId)}/actions`);
  return normalizeList<TrainingProviderAction>(data);
}

export async function getTrainingProviderAction(
  trainingProviderId: TrainingProviderId,
  actionTrackId: TrainingProviderId,
): Promise<TrainingProviderAction> {
  const { data } = await apiClient.get(
    `${BASE}/${idSegment(trainingProviderId)}/actions/${idSegment(actionTrackId)}`,
  );
  return data as TrainingProviderAction;
}

export async function createTrainingProviderAction(
  trainingProviderId: TrainingProviderId,
  payload: TrainingProviderActionCreatePayload,
): Promise<TrainingProviderAction> {
  const { data } = await apiClient.post(
    `${BASE}/${idSegment(trainingProviderId)}/actions`,
    payload,
  );
  return data as TrainingProviderAction;
}

export async function deleteTrainingProviderAction(
  trainingProviderId: TrainingProviderId,
  actionTrackId: TrainingProviderId,
): Promise<void> {
  await apiClient.delete(
    `${BASE}/${idSegment(trainingProviderId)}/actions/${idSegment(actionTrackId)}`,
  );
}

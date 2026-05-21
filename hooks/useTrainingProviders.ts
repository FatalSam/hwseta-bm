import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createTrainingProvider,
  createTrainingProviderAction,
  deleteTrainingProvider,
  deleteTrainingProviderAction,
  getTrainingProvider,
  listTrainingProviderActions,
  listTrainingProviders,
  updateTrainingProvider,
} from '@/api/trainingProviders';
import type {
  TrainingProviderActionCreatePayload,
  TrainingProviderCreatePayload,
  TrainingProviderId,
  TrainingProviderUpdatePayload,
} from '@/types/trainingProviders';

export const trainingProviderKeys = {
  all: ['trainingProviders'] as const,
  lists: () => [...trainingProviderKeys.all, 'list'] as const,
  detail: (id: TrainingProviderId) => [...trainingProviderKeys.all, 'detail', String(id)] as const,
  actions: (id: TrainingProviderId) => [...trainingProviderKeys.all, 'actions', String(id)] as const,
};

export function useTrainingProvidersList() {
  return useQuery({
    queryKey: trainingProviderKeys.lists(),
    queryFn: listTrainingProviders,
    retry: false,
  });
}

export function useTrainingProviderDetail(id: TrainingProviderId | null) {
  return useQuery({
    queryKey: trainingProviderKeys.detail(id ?? ''),
    queryFn: () => getTrainingProvider(id!),
    enabled: id != null && String(id).length > 0,
    retry: false,
  });
}

export function useTrainingProviderActions(trainingProviderId: TrainingProviderId | null) {
  return useQuery({
    queryKey: trainingProviderKeys.actions(trainingProviderId ?? ''),
    queryFn: () => listTrainingProviderActions(trainingProviderId!),
    enabled: trainingProviderId != null && String(trainingProviderId).length > 0,
    retry: false,
  });
}

export function useTrainingProviderMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: TrainingProviderCreatePayload) => createTrainingProvider(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingProviderKeys.lists() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: TrainingProviderId; payload: TrainingProviderUpdatePayload }) =>
      updateTrainingProvider(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: trainingProviderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trainingProviderKeys.detail(id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: TrainingProviderId) => deleteTrainingProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingProviderKeys.lists() });
    },
  });

  const createActionMutation = useMutation({
    mutationFn: ({
      trainingProviderId,
      payload,
    }: {
      trainingProviderId: TrainingProviderId;
      payload: TrainingProviderActionCreatePayload;
    }) => createTrainingProviderAction(trainingProviderId, payload),
    onSuccess: (_data, { trainingProviderId }) => {
      queryClient.invalidateQueries({ queryKey: trainingProviderKeys.actions(trainingProviderId) });
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: ({
      trainingProviderId,
      actionTrackId,
    }: {
      trainingProviderId: TrainingProviderId;
      actionTrackId: TrainingProviderId;
    }) => deleteTrainingProviderAction(trainingProviderId, actionTrackId),
    onSuccess: (_data, { trainingProviderId }) => {
      queryClient.invalidateQueries({ queryKey: trainingProviderKeys.actions(trainingProviderId) });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    createActionMutation,
    deleteActionMutation,
  };
}

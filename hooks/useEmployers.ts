import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEmployer,
  createEmployerAction,
  deleteEmployer,
  deleteEmployerAction,
  getEmployer,
  listEmployerActions,
  listEmployers,
  updateEmployer,
} from '@/api/employers';
import type {
  EmployerActionCreatePayload,
  EmployerCreatePayload,
  EmployerId,
  EmployerUpdatePayload,
} from '@/types/employers';

export const employerKeys = {
  all: ['employers'] as const,
  lists: () => [...employerKeys.all, 'list'] as const,
  detail: (id: EmployerId) => [...employerKeys.all, 'detail', String(id)] as const,
  actions: (id: EmployerId) => [...employerKeys.all, 'actions', String(id)] as const,
};

export function useEmployersList() {
  return useQuery({
    queryKey: employerKeys.lists(),
    queryFn: listEmployers,
    retry: false,
  });
}

export function useEmployerDetail(id: EmployerId | null) {
  return useQuery({
    queryKey: employerKeys.detail(id ?? ''),
    queryFn: () => getEmployer(id!),
    enabled: id != null && String(id).length > 0,
    retry: false,
  });
}

export function useEmployerActions(employerId: EmployerId | null) {
  return useQuery({
    queryKey: employerKeys.actions(employerId ?? ''),
    queryFn: () => listEmployerActions(employerId!),
    enabled: employerId != null && String(employerId).length > 0,
    retry: false,
  });
}

export function useEmployerMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: EmployerCreatePayload) => createEmployer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.lists() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: EmployerId; payload: EmployerUpdatePayload }) =>
      updateEmployer(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: employerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employerKeys.detail(id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: EmployerId) => deleteEmployer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.lists() });
    },
  });

  const createActionMutation = useMutation({
    mutationFn: ({
      employerId,
      payload,
    }: {
      employerId: EmployerId;
      payload: EmployerActionCreatePayload;
    }) => createEmployerAction(employerId, payload),
    onSuccess: (_data, { employerId }) => {
      queryClient.invalidateQueries({ queryKey: employerKeys.actions(employerId) });
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: ({
      employerId,
      actionTrackId,
    }: {
      employerId: EmployerId;
      actionTrackId: EmployerId;
    }) => deleteEmployerAction(employerId, actionTrackId),
    onSuccess: (_data, { employerId }) => {
      queryClient.invalidateQueries({ queryKey: employerKeys.actions(employerId) });
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

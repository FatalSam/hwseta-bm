'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getFormFeedback,
  listFormFeedback,
  listFormFeedbackAssignments,
} from '@/api/formFeedback';
import type { FormFeedbackListParams } from '@/types/formFeedback';

export const formFeedbackKeys = {
  all: ['form-feedback'] as const,
  list: (params: FormFeedbackListParams) => [...formFeedbackKeys.all, 'list', params] as const,
  assignments: (params: FormFeedbackListParams) =>
    [...formFeedbackKeys.all, 'assignments', params] as const,
  detail: (responseId: string) => [...formFeedbackKeys.all, 'detail', responseId] as const,
};

export function useFormFeedbackList(params: FormFeedbackListParams) {
  return useQuery({
    queryKey: formFeedbackKeys.list(params),
    queryFn: () => listFormFeedback(params),
    retry: false,
  });
}

export function useFormFeedbackAssignmentsList(params: FormFeedbackListParams) {
  return useQuery({
    queryKey: formFeedbackKeys.assignments(params),
    queryFn: () => listFormFeedbackAssignments(params),
    retry: false,
  });
}

export function useFormFeedbackDetail(responseId: string | null) {
  return useQuery({
    queryKey: formFeedbackKeys.detail(responseId ?? ''),
    queryFn: () => getFormFeedback(responseId!),
    enabled: !!responseId?.trim(),
    retry: false,
  });
}

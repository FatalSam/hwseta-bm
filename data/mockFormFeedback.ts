import {
  formatFormResponseAnswers,
  summarizeFormResponseAnswers,
} from '@/lib/formatFormResponseAnswers';
import type { FormSettings } from '@/types/dynamicForm';
import type {
  FormFeedbackDetail,
  FormFeedbackListParams,
  FormFeedbackListRow,
  FormFeedbackRecipientType,
  FormFeedbackSubmitContext,
} from '@/types/formFeedback';
import type { PagedResult } from '@/types/formSubmissions';
import {
  buildAssignmentsFromNotifications,
  filterAssignments,
  paginateAssignments,
} from '@/lib/buildFeedbackAssignments';
import {
  mockFindNotification,
  mockGetFormDistribution,
  mockListFormDistributionNotifications,
  mockListFormDistributions,
  mockSnapshotDistributionData,
} from '@/data/mockFormSubmissions';

const MOCK_STORAGE_KEY = 'hwseta-mock-form-feedback-v1';

const DEMO_FORM_SETTINGS: FormSettings = {
  sections: [
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
  ],
  conditions: [],
  uiSettings: {},
};

let responses: FormFeedbackDetail[] = [];

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `resp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(responses));
  } catch {
    /* ignore */
  }
}

function loadPersisted() {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FormFeedbackDetail[];
      if (Array.isArray(parsed)) responses = parsed;
    }
  } catch {
    /* ignore */
  }
}

loadPersisted();

function normalizePayload(payload: Record<string, unknown>): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      out[key] = value.map((v) => String(v));
    } else if (value != null) {
      out[key] = String(value);
    }
  }
  return out;
}

function toListRow(detail: FormFeedbackDetail): FormFeedbackListRow {
  return {
    responseId: detail.responseId,
    formId: detail.formId,
    formTitle: detail.formTitle,
    distributionId: detail.distributionId,
    notificationId: detail.notificationId,
    recipientType: detail.recipientType,
    beneficiaryId: detail.beneficiaryId,
    fullName: detail.fullName,
    email: detail.email,
    cellphone: detail.cellphone,
    submittedAt: detail.submittedAt,
    answersSummary: detail.answersSummary,
    completionStatus: detail.completionStatus,
  };
}

function seedIfEmpty() {
  if (responses.length > 0) return;

  const settings = DEMO_FORM_SETTINGS;
  const beneficiaryPayload = { f_rating: 'Good', f_comments: 'Training was helpful.' };
  const beneficiaryAnswers = formatFormResponseAnswers(settings, beneficiaryPayload);

  let distId: string | null = null;
  let formId = 'demo-form-1';
  let formTitle = 'Learner satisfaction survey (demo)';
  let notificationId: string | null = null;

  const dists = mockListFormDistributions({ page: 1, pageSize: 1 });
  const firstDist = dists.items[0];
  if (firstDist) {
    distId = firstDist.distributionId;
    formId = firstDist.formId;
    formTitle = firstDist.formTitle;
    const notifs = mockListFormDistributionNotifications(distId, { page: 1, pageSize: 20 });
    const benNotif = notifs.items.find((n) => n.recipientType === 'beneficiary');
    if (benNotif) notificationId = benNotif.notificationId;
  }

  responses.push({
    responseId: newId(),
    formId,
    formTitle,
    distributionId: distId,
    notificationId,
    recipientType: 'beneficiary',
    beneficiaryId: 'b-001',
    fullName: 'Thabo Mokoena',
    email: 'thabo.mokoena@example.com',
    cellphone: '0821234567',
    submittedAt: new Date(Date.now() - 3600000).toISOString(),
    payload: beneficiaryPayload,
    settings,
    answers: beneficiaryAnswers,
    answersSummary: summarizeFormResponseAnswers(beneficiaryAnswers),
    createdByUserId: null,
    completionStatus: 'completed',
  });

  const externalPayload = { f_rating: 'Excellent', f_comments: 'Great experience.' };
  const externalAnswers = formatFormResponseAnswers(settings, externalPayload);
  responses.push({
    responseId: newId(),
    formId,
    formTitle,
    distributionId: distId,
    notificationId: null,
    recipientType: 'external',
    beneficiaryId: null,
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    cellphone: '0829998877',
    submittedAt: new Date(Date.now() - 7200000).toISOString(),
    payload: externalPayload,
    settings,
    answers: externalAnswers,
    answersSummary: summarizeFormResponseAnswers(externalAnswers),
    createdByUserId: null,
    completionStatus: 'completed',
  });

  persist();
}

seedIfEmpty();

function paginate<T>(items: T[], page: number, pageSize: number): PagedResult<T> {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
  };
}

export function mockListFormFeedback(
  params: FormFeedbackListParams = {},
): PagedResult<FormFeedbackListRow> {
  seedIfEmpty();
  let rows = responses.map(toListRow);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;

  if (params.formId) rows = rows.filter((r) => r.formId === params.formId);
  if (params.distributionId) {
    rows = rows.filter((r) => r.distributionId === params.distributionId);
  }
  if (params.recipientType && params.recipientType !== 'unknown') {
    rows = rows.filter((r) => r.recipientType === params.recipientType);
  }
  if (params.completionStatus) {
    rows = rows.filter((r) => r.completionStatus === params.completionStatus);
  }
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.fullName ?? '').toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.cellphone ?? '').includes(q) ||
        r.formTitle.toLowerCase().includes(q) ||
        (r.answersSummary ?? '').toLowerCase().includes(q),
    );
  }
  if (params.submittedFrom) {
    const from = new Date(params.submittedFrom).getTime();
    rows = rows.filter((r) => new Date(r.submittedAt).getTime() >= from);
  }
  if (params.submittedTo) {
    const to = new Date(params.submittedTo).getTime();
    rows = rows.filter((r) => new Date(r.submittedAt).getTime() <= to);
  }

  rows.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return paginate(rows, page, pageSize);
}

export function mockGetFormFeedback(responseId: string): FormFeedbackDetail | null {
  seedIfEmpty();
  return responses.find((r) => r.responseId === responseId) ?? null;
}

export function mockRecordFormFeedback(ctx: FormFeedbackSubmitContext): FormFeedbackDetail {
  seedIfEmpty();
  const notificationId = ctx.notificationId?.trim() || null;
  const distributionId = ctx.distributionId?.trim() || null;

  if (notificationId) {
    const existingIdx = responses.findIndex((r) => r.notificationId === notificationId);
    if (existingIdx >= 0) {
      responses.splice(existingIdx, 1);
    }
  }

  let recipientType: FormFeedbackRecipientType = 'unknown';
  let beneficiaryId: string | null = null;
  let fullName: string | null = null;
  let email: string | null = null;
  let cellphone: string | null = null;
  let resolvedDistributionId = distributionId;
  let formTitle = ctx.formTitle?.trim() || 'Untitled form';

  if (notificationId) {
    const match = mockFindNotification(notificationId);
    if (match) {
      const { notification, distribution } = match;
      recipientType = notification.recipientType;
      beneficiaryId = notification.beneficiaryId ?? null;
      fullName = notification.fullName;
      email = notification.email ?? null;
      cellphone = notification.cellphone ?? null;
      resolvedDistributionId = distribution.distributionId;
      formTitle = distribution.formTitle;
    }
  } else if (distributionId) {
    const dist = mockGetFormDistribution(distributionId);
    if (dist) {
      formTitle = dist.formTitle;
      resolvedDistributionId = dist.distributionId;
    }
  }

  const settings = ctx.settings ?? DEMO_FORM_SETTINGS;
  const payload = normalizePayload(ctx.payload);
  const answers = formatFormResponseAnswers(settings, payload);

  const detail: FormFeedbackDetail = {
    responseId: newId(),
    formId: ctx.formId,
    formTitle,
    distributionId: resolvedDistributionId,
    notificationId,
    recipientType,
    beneficiaryId,
    fullName,
    email,
    cellphone,
    submittedAt: new Date().toISOString(),
    payload,
    settings,
    answers,
    answersSummary: summarizeFormResponseAnswers(answers),
    createdByUserId: ctx.createdByUserId ?? null,
    completionStatus: 'completed',
  };

  responses.unshift(detail);
  persist();
  return detail;
}

export function mockGetAllResponses(): FormFeedbackDetail[] {
  seedIfEmpty();
  return [...responses];
}

export function mockListFormFeedbackAssignments(
  params: FormFeedbackListParams = {},
  options?: { beneficiaryId?: string | null },
) {
  seedIfEmpty();
  const { distributions, notificationsByDist } = mockSnapshotDistributionData();
  let rows = buildAssignmentsFromNotifications(
    distributions,
    notificationsByDist,
    responses,
    options,
  );
  rows = filterAssignments(rows, params);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  return paginateAssignments(rows, page, pageSize);
}

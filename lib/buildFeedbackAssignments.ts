import type {
  FormDistributionNotificationRow,
  FormDistributionRow,
} from '@/types/formSubmissions';
import type {
  FeedbackCompletionStatus,
  FormFeedbackAssignmentRow,
  FormFeedbackDetail,
} from '@/types/formFeedback';

export type RecipientKey = string;

export function recipientKeyFromNotification(n: FormDistributionNotificationRow): RecipientKey {
  if (n.beneficiaryId?.trim()) return `b:${n.beneficiaryId.trim()}`;
  const email = n.email?.trim().toLowerCase();
  const phone = n.cellphone?.trim();
  if (email) return `e:${email}`;
  if (phone) return `p:${phone}`;
  return `n:${n.notificationId}`;
}

function pickPreferredNotification(
  a: FormDistributionNotificationRow,
  b: FormDistributionNotificationRow,
): FormDistributionNotificationRow {
  if (a.channel === 'email' && b.channel !== 'email') return a;
  if (b.channel === 'email' && a.channel !== 'email') return b;
  return a;
}

function channelsFromNotifications(notifs: FormDistributionNotificationRow[]): string[] {
  const set = new Set(notifs.map((n) => n.channel));
  return Array.from(set);
}

function bestDeliveryStatus(notifs: FormDistributionNotificationRow[]): string {
  const order = ['delivered', 'sent', 'pending', 'failed'];
  let best = 'pending';
  for (const n of notifs) {
    const s = (n.status ?? 'pending').toLowerCase();
    if (order.indexOf(s) >= 0 && order.indexOf(s) < order.indexOf(best)) {
      best = s;
    }
  }
  return best;
}

function latestSentAt(notifs: FormDistributionNotificationRow[]): string | null {
  const dates = notifs.map((n) => n.sentAt).filter(Boolean) as string[];
  if (dates.length === 0) return null;
  return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

export function buildAssignmentsFromNotifications(
  distributions: FormDistributionRow[],
  notificationsByDist: Record<string, FormDistributionNotificationRow[]>,
  responses: FormFeedbackDetail[],
  options?: { beneficiaryId?: string | null },
): FormFeedbackAssignmentRow[] {
  const responseByNotification = new Map<string, FormFeedbackDetail>();
  for (const r of responses) {
    if (r.notificationId?.trim()) {
      responseByNotification.set(r.notificationId.trim(), r);
    }
  }

  const assignments: FormFeedbackAssignmentRow[] = [];

  for (const dist of distributions) {
    const notifs = notificationsByDist[dist.distributionId] ?? [];
    const grouped = new Map<RecipientKey, FormDistributionNotificationRow[]>();

    for (const n of notifs) {
      if (options?.beneficiaryId?.trim()) {
        if (n.recipientType !== 'beneficiary') continue;
        if (n.beneficiaryId !== options.beneficiaryId.trim()) continue;
      }
      const key = `${dist.distributionId}:${recipientKeyFromNotification(n)}`;
      const list = grouped.get(key) ?? [];
      list.push(n);
      grouped.set(key, list);
    }

    for (const [, group] of grouped) {
      const primary = group.reduce(pickPreferredNotification);
      const response =
        responseByNotification.get(primary.notificationId) ??
        group
          .map((n) => responseByNotification.get(n.notificationId))
          .find(Boolean) ??
        null;

      const completionStatus: FeedbackCompletionStatus = response ? 'completed' : 'pending';

      assignments.push({
        assignmentId: `${dist.distributionId}:${recipientKeyFromNotification(primary)}`,
        formId: dist.formId,
        formTitle: dist.formTitle,
        distributionId: dist.distributionId,
        notificationId: primary.notificationId,
        recipientType: primary.recipientType,
        beneficiaryId: primary.beneficiaryId ?? null,
        fullName: primary.fullName,
        email: primary.email ?? null,
        cellphone: primary.cellphone ?? null,
        completionStatus,
        responseId: response?.responseId ?? null,
        submittedAt: response?.submittedAt ?? null,
        sentAt: latestSentAt(group),
        createdAt: dist.createdAt,
        deliveryStatus: bestDeliveryStatus(group),
        formLink: primary.formLink,
        channels: channelsFromNotifications(group),
        programmeName: dist.programmeName ?? null,
        qualificationName: dist.qualificationName ?? null,
        audienceType: dist.audienceType,
        answersSummary: response?.answersSummary ?? null,
      });
    }
  }

  assignments.sort((a, b) => {
    const aTime = new Date(a.submittedAt ?? a.sentAt ?? a.createdAt).getTime();
    const bTime = new Date(b.submittedAt ?? b.sentAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });

  return assignments;
}

export function filterAssignments(
  rows: FormFeedbackAssignmentRow[],
  params: {
    formId?: string | null;
    distributionId?: string | null;
    recipientType?: string | null;
    completionStatus?: FeedbackCompletionStatus | null;
    search?: string | null;
    submittedFrom?: string | null;
    submittedTo?: string | null;
  },
): FormFeedbackAssignmentRow[] {
  let filtered = [...rows];
  if (params.formId) filtered = filtered.filter((r) => r.formId === params.formId);
  if (params.distributionId) {
    filtered = filtered.filter((r) => r.distributionId === params.distributionId);
  }
  if (params.recipientType && params.recipientType !== 'unknown') {
    filtered = filtered.filter((r) => r.recipientType === params.recipientType);
  }
  if (params.completionStatus) {
    filtered = filtered.filter((r) => r.completionStatus === params.completionStatus);
  }
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
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
    filtered = filtered.filter((r) => {
      const t = r.submittedAt ?? r.sentAt ?? r.createdAt;
      return new Date(t).getTime() >= from;
    });
  }
  if (params.submittedTo) {
    const to = new Date(params.submittedTo).getTime();
    filtered = filtered.filter((r) => {
      const t = r.submittedAt ?? r.sentAt ?? r.createdAt;
      return new Date(t).getTime() <= to;
    });
  }
  return filtered;
}

export function paginateAssignments<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number } {
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

export function assignmentToBeneficiaryRow(row: FormFeedbackAssignmentRow): import('@/types/beneficiaryFeedbackForms').BeneficiaryFeedbackFormRow {
  return {
    distributionId: row.distributionId,
    formId: row.formId,
    formTitle: row.formTitle,
    audienceType: row.audienceType ?? '',
    programmeName: row.programmeName,
    qualificationName: row.qualificationName,
    channels: row.channels,
    status: row.deliveryStatus ?? 'pending',
    deliveryStatus: row.deliveryStatus ?? null,
    completionStatus: row.completionStatus,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
    submittedAt: row.submittedAt,
    notificationId: row.notificationId,
    responseId: row.responseId,
    beneficiaryId: row.beneficiaryId,
    fullName: row.fullName,
    email: row.email,
    cellphone: row.cellphone,
    formLink: row.formLink,
    notificationCount: row.channels.length,
  };
}

export function enrichNotificationsWithCompletion(
  rows: FormDistributionNotificationRow[],
  responses: { notificationId?: string | null; responseId: string; submittedAt: string }[],
): FormDistributionNotificationRow[] {
  const responseByNotification = new Map<string, { responseId: string; submittedAt: string }>();
  for (const r of responses) {
    if (r.notificationId?.trim()) {
      responseByNotification.set(r.notificationId.trim(), {
        responseId: r.responseId,
        submittedAt: r.submittedAt,
      });
    }
  }
  return rows.map((n) => {
    const match = responseByNotification.get(n.notificationId);
    if (!match) {
      return { ...n, completionStatus: 'pending' as const, responseId: null, feedbackSubmittedAt: null };
    }
    return {
      ...n,
      completionStatus: 'completed' as const,
      responseId: match.responseId,
      feedbackSubmittedAt: match.submittedAt,
    };
  });
}

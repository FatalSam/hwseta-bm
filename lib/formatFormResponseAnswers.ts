import type { FormSettings } from '@/types/dynamicForm';
import type { FormFeedbackAnswerRow } from '@/types/formFeedback';

function formatValue(value: string | string[] | undefined | null): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value).trim();
}

export function formatFormResponseAnswers(
  settings: FormSettings,
  payload: Record<string, string | string[]>,
): FormFeedbackAnswerRow[] {
  const rows: FormFeedbackAnswerRow[] = [];
  const sections = [...settings.sections].sort((a, b) => a.order - b.order);
  for (const section of sections) {
    const fields = [...section.fields].sort((a, b) => a.order - b.order);
    for (const field of fields) {
      const raw = payload[field.id];
      rows.push({
        fieldId: field.id,
        label: field.label || field.id,
        value: formatValue(raw),
      });
    }
  }
  return rows;
}

export function summarizeFormResponseAnswers(answers: FormFeedbackAnswerRow[]): string {
  return answers
    .filter((a) => a.value)
    .map((a) => `${a.label}: ${a.value}`)
    .join(' · ');
}

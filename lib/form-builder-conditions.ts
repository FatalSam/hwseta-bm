import type { ConditionRule } from '@/types/dynamicForm';

export type FormValues = Record<string, string | string[]>;

function getFieldValue(values: FormValues, fieldId: string): string | string[] | undefined {
  return values[fieldId];
}

function matchesRule(values: FormValues, rule: ConditionRule): boolean {
  const sourceValue = getFieldValue(values, rule.showWhen.fieldId);
  const { operator, value } = rule.showWhen;

  if (sourceValue === undefined || sourceValue === null) return false;

  const strSource = Array.isArray(sourceValue) ? sourceValue.join(',') : String(sourceValue);
  const compareList = Array.isArray(value) ? value : [value];

  switch (operator) {
    case 'equals':
      return strSource === (typeof value === 'string' ? value : value[0]);
    case 'not_equals':
      return strSource !== (typeof value === 'string' ? value : value[0]);
    case 'one_of':
      return compareList.some((v) => strSource === v);
    default:
      return false;
  }
}

export function isFieldVisible(fieldId: string, conditions: ConditionRule[], values: FormValues): boolean {
  const rule = conditions.find((c) => c.targetFieldId === fieldId);
  if (!rule) return true;
  return matchesRule(values, rule);
}

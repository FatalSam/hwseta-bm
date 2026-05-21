/** Form builder settings JSON (HW_FormBuilderForms `settings` column) */

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'dropdown'
  | 'radio'
  | 'checkboxes'
  | 'date';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  order: number;
  options?: string[];
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
}

export interface ConditionRule {
  id: string;
  targetFieldId: string;
  showWhen: {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'one_of';
    value: string | string[];
  };
}

export interface FormSettings {
  sections: FormSection[];
  conditions: ConditionRule[];
  uiSettings?: {
    theme?: string;
    showProgress?: boolean;
  };
}

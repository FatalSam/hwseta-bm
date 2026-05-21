/** Aligned with `BeneficiaryProfilePage` contact validation. */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(value: string): boolean {
  const v = value.trim().replace(/[\s()-]+/g, '');
  if (!v) return true;
  return /^(?:\+27|27|0)\d{9}$/.test(v);
}

export function sanitizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return `+${cleaned.slice(1).replace(/\+/g, '')}`;
  }
  return cleaned.replace(/\+/g, '');
}

export type AdminContactFieldKey =
  | 'telephoneNo'
  | 'emailAddress'
  | 'contactPersonEmail'
  | 'contactMobileNo';

export function validateAdminContactFields(draft: {
  telephoneNo?: string;
  emailAddress?: string;
  contactPersonEmail?: string;
  contactMobileNo?: string;
}): Partial<Record<AdminContactFieldKey, string>> {
  const e: Partial<Record<AdminContactFieldKey, string>> = {};
  if (draft.telephoneNo?.trim() && !isValidPhone(draft.telephoneNo)) {
    e.telephoneNo = 'Enter a valid South African contact number';
  }
  if (draft.emailAddress?.trim() && !isValidEmail(draft.emailAddress)) {
    e.emailAddress = 'Enter a valid email address';
  }
  if (draft.contactPersonEmail?.trim() && !isValidEmail(draft.contactPersonEmail)) {
    e.contactPersonEmail = 'Enter a valid email address';
  }
  if (draft.contactMobileNo?.trim() && !isValidPhone(draft.contactMobileNo)) {
    e.contactMobileNo = 'Enter a valid South African contact number';
  }
  return e;
}

import { parseSmsListResponse } from '@/api/adminBeneficiaries';
import type { AdminBeneficiarySmsListResponse } from '@/types/admin-beneficiaries';
import apiClient from '@/ultis/apiClient';

/** Try canonical route first, then legacy hyphenated path (same JSON). */
const BENEFICIARY_SMS_PATHS = ['/api/beneficiary/sms', '/api/beneficiary-sms'] as const;

export async function listBeneficiarySms(): Promise<AdminBeneficiarySmsListResponse> {
  let lastError: unknown;
  for (const path of BENEFICIARY_SMS_PATHS) {
    try {
      const { data } = await apiClient.get(path);
      return parseSmsListResponse(data);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('Unable to load SMS history');
}

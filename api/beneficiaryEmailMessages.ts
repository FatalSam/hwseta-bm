/**
 * Beneficiary read-only inbox — GET `/api/beneficiary/email-messages/...`
 * (JWT resolves beneficiary; no client-supplied beneficiary id). See HWSETAAPI docs:
 * `HWSETAAPI/docs/BeneficiaryEmailInbox-Frontend.md`
 */
export {
  listBeneficiaryEmailInbox,
  getBeneficiaryEmailMessage,
  downloadBeneficiaryEmailAttachment,
} from './adminEmailMessages';

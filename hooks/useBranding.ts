import { useDocuments } from '@/hooks/useDocuments';

export const useBranding = (companyId: string) => {
    return useDocuments(companyId, 'Branding');
};
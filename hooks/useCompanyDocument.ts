import { useDocuments } from '@/hooks/useDocuments';

export const useCompanyDocument = (companyId: string) => {
    return useDocuments(companyId, 'Company');
};
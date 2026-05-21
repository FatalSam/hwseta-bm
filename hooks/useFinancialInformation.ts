import { useDocuments } from '@/hooks/useDocuments';

export const useFinancialInformation = (companyId: string) => {
    return useDocuments(companyId, 'Financial');
};
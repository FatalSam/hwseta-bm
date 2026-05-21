import { useDocuments } from '@/hooks/useDocuments';

export const useModuleDocument = (companyId: string) => {
    return useDocuments(companyId, 'Development');
};
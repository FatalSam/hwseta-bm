import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BusinessWorkshop } from '@/types/business-workshop';
import {
    getWorkshopDocumentsByCompanyId,
    saveWorkshopDocument,
    updateWorkshopDocument,
    deleteWorkshopDocument
} from '@/api/business-services';

export const useBusinessWorkshop = (companyId: string) => {
    const queryClient = useQueryClient();

    const { data: documents, isLoading, error, refetch } = useQuery({
        queryKey: ['businessWorkshop', companyId],
        queryFn: () => getWorkshopDocumentsByCompanyId(companyId)
    });

    const saveMutation = useMutation({
        mutationFn: (document: BusinessWorkshop) => saveWorkshopDocument(companyId, document),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessWorkshop', companyId] });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ documentId, document }: { documentId: string; document: BusinessWorkshop }) =>
            updateWorkshopDocument(documentId, document),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessWorkshop', companyId] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: ({ documentId, lastModifiedUserID }: { documentId: string; lastModifiedUserID: string }) =>
            deleteWorkshopDocument(documentId, lastModifiedUserID),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessWorkshop', companyId] });
        }
    });

    return {
        documents,
        isLoading,
        error,
        refetch,
        saveDocument: saveMutation.mutate,
        updateDocument: updateMutation.mutate,
        deleteDocument: deleteMutation.mutate,
        isSaving: saveMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending
    };
}; 
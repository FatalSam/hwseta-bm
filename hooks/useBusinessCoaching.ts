import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BusinessCoaching } from '@/types/business-coaching';
import {
    getCoachingDocumentsByCompanyId,
    saveCoachingDocument,
    updateCoachingDocument,
    deleteCoachingDocument,
    verifyAssignment
} from '@/api/business-services';

export const useBusinessCoaching = (companyId: string) => {
    const queryClient = useQueryClient();

    const { data: documents, isLoading, error, refetch } = useQuery({
        queryKey: ['businessCoaching', companyId],
        queryFn: () => getCoachingDocumentsByCompanyId(companyId)
    });

    const saveMutation = useMutation({
        mutationFn: (document: BusinessCoaching) => saveCoachingDocument(companyId, document),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessCoaching', companyId] });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ documentId, document }: { documentId: string; document: BusinessCoaching }) =>
            updateCoachingDocument(documentId, document),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessCoaching', companyId] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: ({ documentId, lastModifiedUserID }: { documentId: string; lastModifiedUserID: string }) =>
            deleteCoachingDocument(documentId, lastModifiedUserID),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessCoaching', companyId] });
        }
    });

    const verifyMutation = useMutation({
        mutationFn: ({ documentId, lastModifiedUserID }: { documentId: string; lastModifiedUserID: string }) =>
            verifyAssignment(documentId, lastModifiedUserID),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessCoaching', companyId] });
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
        verifyAssignment: verifyMutation.mutate,
        isSaving: saveMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isVerifying: verifyMutation.isPending
    };
}; 
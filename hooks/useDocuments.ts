import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { deleteDocument, downloadDocument, listDocuments, updateDocumentMetadata, uploadDocument } from '@/api/documents';
import { DocumentCategory, DocumentMeta, DocumentSubCategory } from '@/types/documents';

export const useDocuments = (
    companyId: string,
    category: DocumentCategory,
    options?: { take?: number; subCategory?: DocumentSubCategory; moduleNumber?: number; enabled?: boolean }
) => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const take = options?.take ?? 20;
    const safeCompanyId = companyId ?? '';
    const enabled = options?.enabled ?? (safeCompanyId.length > 0);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['documents', safeCompanyId, category, options?.subCategory, options?.moduleNumber, page, take],
        queryFn: () => listDocuments(safeCompanyId, category, options?.subCategory, options?.moduleNumber, (page - 1) * take, take),
        enabled,
        retry: (failureCount, error: any) => {
            // Don't retry on network errors or client errors (4xx)
            if (error?.code === 'ERR_NETWORK' || (error?.status && error.status >= 400 && error.status < 500)) {
                return false;
            }
            // Retry up to 2 times for server errors
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
    });

    const upload = useMutation({
        mutationFn: (params: { userId: string; file: File; subCategory: DocumentSubCategory; moduleNumber?: number }) =>
            uploadDocument({ companyId: safeCompanyId, category, subCategory: params.subCategory, userId: params.userId, file: params.file, moduleNumber: params.moduleNumber }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents', safeCompanyId, category, options?.subCategory, options?.moduleNumber] });
        }
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteDocument(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents', safeCompanyId, category, options?.subCategory, options?.moduleNumber] });
        }
    });

    const updateMeta = useMutation({
        mutationFn: (args: { id: string; fileName?: string; category?: DocumentCategory }) =>
            updateDocumentMetadata(args.id, { fileName: args.fileName, category: args.category }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents', safeCompanyId, category, options?.subCategory, options?.moduleNumber] });
        }
    });

    const download = useMutation({
        mutationFn: (id: string) => downloadDocument(id)
    });

    return {
        documents: (data ?? []) as DocumentMeta[],
        isLoading,
        error,
        isError: Boolean(error),
        isNotFound: Boolean((error as any)?.originalError?.response?.status === 404),
        errorStatus: (error as any)?.originalError?.response?.status as number | undefined,
        refetch,
        upload: upload.mutate,
        uploadAsync: upload.mutateAsync,
        isUploading: upload.isPending,
        delete: remove.mutate,
        deleteAsync: remove.mutateAsync,
        isDeleting: remove.isPending,
        updateMetadata: updateMeta.mutate,
        isUpdating: updateMeta.isPending,
        download: download.mutate,
        downloadAsync: download.mutateAsync,
        isDownloading: download.isPending,
        page,
        setPage,
        nextPage: () => setPage((p) => p + 1),
        prevPage: () => setPage((p) => Math.max(1, p - 1)),
        pageSize: take
    };
};



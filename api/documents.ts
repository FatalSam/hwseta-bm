import apiClient from "@/ultis/apiClient";
import { DocumentCategory, DocumentMeta, DocumentSubCategory, UploadResponse } from "@/types/documents";
import { environment } from "@/config/environment";

export const listDocuments = async (
    companyId: string,
    category: DocumentCategory,
    subCategory?: DocumentSubCategory,
    moduleNumber?: number,
    skip = 0,
    take = 50
) => {
    const params: Record<string, unknown> = { skip, take };
    if (subCategory) params.subCategory = subCategory;
    if (moduleNumber != null) params.moduleNumber = moduleNumber;
    const response = await apiClient.get(`/api/documents/company/${companyId}/category/${category}`, { params });
    return response.data as DocumentMeta[];
}

export const uploadDocument = async (params: {
    companyId: string;
    category: DocumentCategory;
    subCategory: DocumentSubCategory;
    userId: string;
    file: File;
    moduleNumber?: number;
}) => {
    const { companyId, category, subCategory, userId, file, moduleNumber } = params;
    const form = new FormData();
    form.append("file", file);

    const response = await apiClient.post(
        `/api/documents/company/${companyId}/category/${category}/sub/${subCategory}/upload`,
        form,
        {
            params: {
                userId,
                fileName: file.name,
                mimeType: file.type,
                moduleNumber
            },
            headers: { "Content-Type": "multipart/form-data" }
        }
    );
    return response.data as UploadResponse;
}

export const deleteDocument = async (id: string) => {
    await apiClient.delete(`/api/documents/${id}`);
}

export const updateDocumentMetadata = async (id: string, body: { fileName?: string; category?: DocumentCategory }) => {
    await apiClient.put(`/api/documents/${id}/metadata`, body);
}

export const downloadDocument = async (id: string) => {
    const response = await apiClient.get(`/api/documents/${id}`, {
        params: { content: true },
        responseType: 'blob'
    });
    return response.data as Blob;
}

// CompanyDocuments API functions using the correct endpoint
export const getCompanyDocuments = async (companyId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyDocuments/GetDocumentsByCompanyID/${companyId}`);
        return response.data;
    } catch (error) {
        // Error is already handled by apiClient interceptor with user-friendly messages
        throw error;
    }
}

export const saveCompanyDocuments = async (companyId: string, documents: any) => {
    try {
        const response = await apiClient.post(`/api/CompanyDocuments/SaveCompanyDocuments/${companyId}`, documents);
        return response.data;
    } catch (error) {
        // Error is already handled by apiClient interceptor with user-friendly messages
        throw error;
    }
}
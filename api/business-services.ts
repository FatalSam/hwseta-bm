import apiClient from "@/ultis/apiClient";
import { BusinessCoaching, BusinessCoachings } from "@/types/business-coaching";
import { BusinessDevelopment, BusinessDevelopments } from "@/types/business-development";
import { BusinessWorkshop, BusinessWorkshops } from "@/types/business-workshop";

// Business Coaching APIs
export const getCoachingDocumentsByCompanyId = async (companyId: string) => {
    const response = await apiClient.get(`/api/BusinessCoaching/GetCoachingDocumentsByCompanyID/${companyId}`);
    return response.data as BusinessCoachings;
}

// Coaching summary for grid (headers with counts) - using GetHeadersByCompanyID instead
export const getBusinessCoachingSummaryByCompanyId = async (companyId: string) => {
    const response = await apiClient.get(`/api/BusinessCoaching2/GetHeadersByCompanyID/${companyId}`);
    return response.data;
}

export const saveCoachingDocument = async (companyId: string, document: BusinessCoaching) => {
    const response = await apiClient.post(`/api/BusinessCoaching/SaveCoachingDocuments/${companyId}`, document);
    return response.data as BusinessCoaching;
}

export const updateCoachingDocument = async (documentId: string, document: BusinessCoaching) => {
    const response = await apiClient.put(`/api/BusinessCoaching/UpdateCoachingDocuments/${documentId}`, document);
    return response.data as BusinessCoaching;
}

export const deleteCoachingDocument = async (documentId: string, lastModifiedUserID: string) => {
    const response = await apiClient.delete(`/api/BusinessCoaching/DeleteCoachingDocuments/${documentId}`, {
        params: { lastModifiedUserID }
    });
    return response.data as BusinessCoaching;
}

export const verifyAssignment = async (documentId: string, lastModifiedUserID: string) => {
    const response = await apiClient.put(`/api/BusinessCoaching/VerifyAssignment/${documentId}`, null, {
        params: { lastModifiedUserID }
    });
    return response.data as BusinessCoaching;
}

export const saveCompleteBusinessCoaching = async (payload: Record<string, unknown>) => {
    const response = await apiClient.post(`/api/BusinessCoaching2/SaveCompleteBusinessCoaching`, payload);
    return response.data;
}

export const getCoachingHeadersByCompanyId = async (companyId: string) => {
    const response = await apiClient.get(`/api/BusinessCoaching2/GetHeadersByCompanyID/${companyId}`);
    return response.data;
}

export const getCoachingHeaderById = async (headerId: string) => {
    if (!headerId || headerId.trim() === '') {
        throw new Error('Header ID is required');
    }

    try {
        const response = await apiClient.get(`/api/BusinessCoaching2/GetHeaderByID/${headerId}`);
        
        // Check if response exists
        if (!response) {
            throw new Error('No response from server');
        }
        
        // Check if data exists - it might be null or undefined
        if (response.data === null || response.data === undefined) {
            throw new Error('Coaching assignment not found or has no data');
        }
        
        return response.data;
    } catch (error: unknown) {
        // Re-throw with more context
        if (error instanceof Error) {
            // Check if it's already a user-friendly message
            if (error.message && !error.message.includes('Failed to load')) {
                throw error;
            }
        }
        
        // If it's an axios error, check for specific status codes
        const axiosError = error as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
        
        if (axiosError.response && typeof axiosError.response.status === 'number') {
            const status = axiosError.response.status;
            if (status === 404) {
                throw new Error('Coaching assignment not found');
            }
            if (status === 401) {
                throw new Error('Your session has expired. Please log in again.');
            }
            if (status === 403) {
                throw new Error('You do not have permission to view this assignment');
            }
            if (status >= 500) {
                throw new Error('Server error. Please try again later.');
            }
        }
        
        // Handle network errors
        if (axiosError.code === 'ERR_NETWORK' || axiosError.message?.includes('Network Error')) {
            throw new Error('Unable to connect to the server. Please check your internet connection.');
        }
        
        // Default error message
        const errorMessage = axiosError.message || 'Failed to load coaching assignment details';
        throw new Error(errorMessage);
    }
}

export const deleteCoachingHeader = async (headerId: string, lastModifiedUserID: string) => {
    const response = await apiClient.delete(`/api/BusinessCoaching2/DeleteCompanyBusinessCoachingHeader2/${headerId}`, {
        params: { lastModifiedUserID }
    });
    return response.data;
}

export const saveCoachingHeader = async (payload: {
    companyID?: string | null;
    createdBy?: string | null;
    assignmentTitle?: string | null;
    dateSubmitted?: string | null;
}) => {
    const response = await apiClient.post(`/api/BusinessCoaching2/SaveHeader`, payload);
    return response.data;
}

export const updateCoachingHeader = async (headerId: string, payload: {
    businessCoachingCompanyHeaderID?: string | null;
    companyID?: string | null;
    dateCreated?: string | null;
    createdBy?: string | null;
    assignmentTitle?: string | null;
    dateSubmitted?: string | null;
    modifiedDate?: string | null;
    lastModifiedUserID?: string | null;
}) => {
    const response = await apiClient.put(`/api/BusinessCoaching2/UpdateCompanyBusinessCoachingHeader2/${headerId}`, payload);
    return response.data;
}

// Business Development APIs
export const getDevelopmentDocumentsByCompanyId = async (companyId: string) => {
    const response = await apiClient.get(`/api/BusinessDevelopment/GetDevelopmentDocumentsByCompanyID/${companyId}`);
    return response.data as BusinessDevelopments;
}

export const saveDevelopmentDocument = async (companyId: string, document: BusinessDevelopment) => {
    const response = await apiClient.post(`/api/BusinessDevelopment/SaveDevelopmentDocuments/${companyId}`, document);
    return response.data as BusinessDevelopment;
}

export const updateDevelopmentDocument = async (documentId: string, document: BusinessDevelopment) => {
    const response = await apiClient.put(`/api/BusinessDevelopment/UpdateDevelopmentDocuments/${documentId}`, document);
    return response.data as BusinessDevelopment;
}

export const deleteDevelopmentDocument = async (documentId: string, lastModifiedUserID: string) => {
    const response = await apiClient.delete(`/api/BusinessDevelopment/DeleteDevelopmentDocuments/${documentId}`, {
        params: { lastModifiedUserID }
    });
    return response.data as BusinessDevelopment;
}

// Business Workshop APIs
export const getWorkshopDocumentsByCompanyId = async (companyId: string) => {
    const response = await apiClient.get(`/api/BusinessWorkshops/GetWorkshopDocumentsByCompanyID/${companyId}`);
    return response.data as BusinessWorkshops;
}

export const saveWorkshopDocument = async (companyId: string, document: BusinessWorkshop) => {
    const response = await apiClient.post(`/api/BusinessWorkshops/SaveWorkshopDocuments/${companyId}`, document);
    return response.data as BusinessWorkshop;
}

export const updateWorkshopDocument = async (documentId: string, document: BusinessWorkshop) => {
    const response = await apiClient.put(`/api/BusinessWorkshops/UpdateWorkshopDocuments/${documentId}`, document);
    return response.data as BusinessWorkshop;
}

export const deleteWorkshopDocument = async (documentId: string, lastModifiedUserID: string) => {
    const response = await apiClient.delete(`/api/BusinessWorkshops/DeleteWorkshopDocuments/${documentId}`, {
        params: { lastModifiedUserID }
    });
    return response.data as BusinessWorkshop;
}

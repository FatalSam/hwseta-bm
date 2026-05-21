import apiClient from "@/ultis/apiClient";
import { Company, Companies, Owner, Owners } from "@/types/companies";

export const getAllCompanies = async () => {
    const response = await apiClient.get('/api/CompanyProfile/GetAllCompanies');
    return response.data as Companies;
}

export const getCompanyById = async (id: string) => {
    const response = await apiClient.get(`/api/CompanyProfile/GetCompanyByID/${id}`);
    return response.data as Company;
}

export const createCompany = async (company: Company) => {
    const response = await apiClient.post('/api/companies', company);
    return response.data as Company;
}

export const updateCompany = async (id: string, company: Company) => {
    const response = await apiClient.put(`/api/CompanyProfile/UpdateCompany/${id}`, company);
    return response.data as Company;
}

export const deleteCompany = async (id: string) => {
    const response = await apiClient.delete(`/api/companies/${id}`);
    return response.data as Company;
}

export const getAllOwnershipByCompanyId = async (id: string) => {
    const response = await apiClient.get(`/api/CompanyOwnership/GetAllOwnershipByCompanyID/${id}`);
    return response.data as Owners;
}

export const getOwnershipById = async (id: string) => {
    const response = await apiClient.get(`/api/CompanyOwnership/GetOwnershipByID/${id}`);
    return response.data as Owner;
}

export const createOwnership = async (id: string, ownership: Owner) => {
    const response = await apiClient.post(`/api/CompanyOwnership/SaveCompanyOwnership/${id}`, ownership);
    return response.data as Owner;
}

export const updateOwnership = async (ownershipId: string, ownership: Owner) => {
    const response = await apiClient.put(`/api/CompanyOwnership/UpdateCompanyOwnership/${ownershipId}`, ownership);
    return response.data as Owner;
}

// New Company Documents 2 API functions
export const getDocumentsByCompanyID2 = async (companyId: string) => {
    const response = await apiClient.get(`/api/CompanyDocuments2/GetDocumentsByCompanyID/${companyId}`);
    return response.data;
}

export const getDocumentByID2 = async (documentId: string) => {
    const response = await apiClient.get(`/api/CompanyDocuments2/GetDocumentByID/${documentId}`);
    return response.data;
}

export const deleteCompanyDocument2 = async (documentId: string, lastModifiedUserID: string) => {
    console.log('Attempting to delete document with ID:', documentId);
    console.log('Last Modified User ID:', lastModifiedUserID);
    
    const url = `/api/CompanyDocuments2/DeleteCompanyDocument2/${documentId}?lastModifiedUserID=${lastModifiedUserID}`;
    console.log('Full URL will be:', `${apiClient.defaults.baseURL}${url}`);
    
    try {
        const response = await apiClient.delete(url);
        console.log('Delete response:', response);
        return response.data;
    } catch (error) {
        console.error('Delete API error:', error);
        throw error;
    }
}

// Branding Documents API functions
export const getBrandingDocumentsByCompanyID2 = async (companyId: string) => {
    const response = await apiClient.get(`/api/CompanyBrandingDocuments2/GetDocumentsByCompanyID/${companyId}`);
    return response.data;
}

export const getBrandingDocumentByID2 = async (documentId: string) => {
    const response = await apiClient.get(`/api/CompanyBrandingDocuments2/GetDocumentByID/${documentId}`);
    return response.data;
}

export const deleteBrandingDocument2 = async (documentId: string, lastModifiedUserID: string) => {
    console.log('Attempting to delete branding document with ID:', documentId);
    console.log('Last Modified User ID:', lastModifiedUserID);
    
    const url = `/api/CompanyBrandingDocuments2/DeleteCompanyBrandingDocument2/${documentId}?lastModifiedUserID=${lastModifiedUserID}`;
    console.log('Full URL will be:', `${apiClient.defaults.baseURL}${url}`);
    
    try {
        const response = await apiClient.delete(url);
        console.log('Delete branding document response:', response);
        return response.data;
    } catch (error) {
        console.error('Delete branding document API error:', error);
        throw error;
    }
}

export const saveBrandingDocuments2 = async (documents: any[]) => {
    const response = await apiClient.post('/api/CompanyBrandingDocuments2/SaveMultipleCompanyBrandingDocuments2', {
        CompanyID: documents[0]?.CompanyID,
        CreatedBy: documents[0]?.CreatedBy,
        Documents: documents
    });
    return response.data;
}

// Financial Information API functions
export const getCompleteFinancialInformation = async (companyId: string) => {
    const response = await apiClient.get(`/api/CompanyFinancialInformationHeader2/GetCompleteFinancialInformation/${companyId}`);
    return response.data;
}

export const getFinancialInformationDocumentsByCompanyID2 = async (companyId: string) => {
    const response = await apiClient.get(`/api/CompanyFinancialInformationDocuments2/GetDocumentsByCompanyID/${companyId}`);
    return response.data;
}

export const getFinancialInformationDocumentByID2 = async (documentId: string) => {
    const response = await apiClient.get(`/api/CompanyFinancialInformationDocuments2/GetDocumentByID/${documentId}`);
    return response.data;
}

export const deleteFinancialInformationDocument2 = async (documentId: string, lastModifiedUserID: string) => {
    console.log('Attempting to delete financial information document with ID:', documentId);
    console.log('Last Modified User ID:', lastModifiedUserID);
    
    const url = `/api/CompanyFinancialInformationDocuments2/DeleteCompanyFinancialInformationDocument2/${documentId}?lastModifiedUserID=${lastModifiedUserID}`;
    console.log('Full URL will be:', `${apiClient.defaults.baseURL}${url}`);
    
    try {
        const response = await apiClient.delete(url);
        console.log('Delete financial information document response:', response);
        return response.data;
    } catch (error) {
        console.error('Delete financial information document API error:', error);
        throw error;
    }
}

export const saveCompleteFinancialInformation = async (header: any, documents: any[]) => {
    const payload = {
        header: header,
        documents: {
            companyID: header.companyID,
            createdBy: header.createdBy,
            documents: documents
        }
    };
    
    console.log('API Payload:', JSON.stringify(payload, null, 2));
    console.log('API URL:', `${apiClient.defaults.baseURL}/api/CompanyFinancialInformationHeader2/SaveCompleteFinancialInformation`);
    
    try {
        const response = await apiClient.post('/api/CompanyFinancialInformationHeader2/SaveCompleteFinancialInformation', payload);
        console.log('API Response:', response);
        return response.data;
    } catch (error) {
        console.error('API Error Details:', error);
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as Record<string, unknown>;
            console.error('Error Response:', axiosError.response);
        }
        throw error;
    }
}

export const getFinancialInformationHeadersByCompanyID = async (companyId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyFinancialInformationHeader2/GetHeadersByCompanyID/${companyId}`);
        return response.data;
    } catch (error: any) {
        console.error('Get financial information headers API error:', error);
        
        // If the API returns 404 (no headers found yet), treat it as "no data" instead of an error
        if (error && typeof error === 'object' && (error as any).status === 404) {
            console.warn('No financial headers found for company, returning empty list.');
            return [];
        }

        // Re-throw other errors so they can be handled upstream
        throw error;
    }
}

export interface FinancialInformationHeaderPayload {
    companyID: string;
    createdBy: string;
    financialYear: string;
    profitabilityStatus: string;
    averageMonthlyIncome: number;
    averageMonthlyExpenditure: number;
    income: number;
    costOfSales: number;
    operationalExpenses: number;
    totalCompletionScore?: number;
    lastModifiedUserID?: string;
}

export interface FinancialInformationHeaderResponse {
    financialCompanyHeaderID?: string;
    companyFinancialInformationHeader2ID?: string;
    companyID?: string;
    createdBy?: string;
    createdbyUserID?: string;
    dateCreated?: string;
    createdDate?: string;
    financialYear?: string;
    profitabilityStatus?: string;
    averageMonthlyIncome?: number;
    averageMonthlyExpenditure?: number;
    income?: number;
    costOfSales?: number;
    operationalExpenses?: number;
    totalCompletionScore?: number;
    noofDocuments?: number;
    noOfDocuments?: number;
    lastModifiedUserID?: string;
}

export const getFinancialInformationHeaderByID = async (headerId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyFinancialInformationHeader2/GetHeaderByID/${headerId}`);
        return response.data as FinancialInformationHeaderResponse;
    } catch (error) {
        console.error('Get financial information header by ID API error:', error);
        throw error;
    }
}

export const saveCompanyFinancialInformationHeader = async (payload: FinancialInformationHeaderPayload) => {
    try {
        const response = await apiClient.post('/api/CompanyFinancialInformationHeader2/SaveCompanyFinancialInformationHeader2', payload);
        return response.data as FinancialInformationHeaderResponse;
    } catch (error) {
        console.error('Save financial information header API error:', error);
        throw error;
    }
}

export const updateCompanyFinancialInformationHeader = async (headerId: string, payload: FinancialInformationHeaderPayload) => {
    try {
        const response = await apiClient.put(`/api/CompanyFinancialInformationHeader2/UpdateCompanyFinancialInformationHeader2/${headerId}`, payload);
        return response.data as FinancialInformationHeaderResponse;
    } catch (error) {
        console.error('Update financial information header API error:', error);
        throw error;
    }
}

// Monthly Financial Information API functions
export interface MonthlyFinancialInformationPayload {
    companyID: string;
    createdBy: string;
    month: string;
    year: number;
    income: number;
    costOfSales: number;
    operationalExpenses: number;
}

export interface MonthlyFinancialInformationUpdatePayload {
    id: number;
    companyID: string;
    month: string;
    year: number;
    income: number;
    costOfSales: number;
    operationalExpenses: number;
    createdBy: string;
}

export const saveMonthlyFinancialInformation = async (payload: MonthlyFinancialInformationPayload) => {
    const response = await apiClient.post('/api/CompanyMonthlyFinancialInformation/SaveMonthlyFinancialInformation', payload);
    return response.data;
};

export const updateMonthlyFinancialInformation = async (payload: MonthlyFinancialInformationUpdatePayload) => {
    const response = await apiClient.put('/api/CompanyMonthlyFinancialInformation/UpdateMonthlyFinancialInformation', payload);
    return response.data;
};

export const getMonthlyFinancialInformationByCompanyID = async (companyId: string) => {
    const response = await apiClient.get(`/api/CompanyMonthlyFinancialInformation/GetMonthlyFinancialInformationByCompanyID/${companyId}`);
    return response.data;
};

export const getMonthlyFinancialInformationByCompanyIDAndPeriod = async (
    companyId: string,
    month: string,
    year: number
) => {
    const response = await apiClient.get(
        `/api/CompanyMonthlyFinancialInformation/GetMonthlyFinancialInformationByCompanyIDAndPeriod/${companyId}`,
        {
            params: { month, year }
        }
    );
    return response.data;
};

export const deleteMonthlyFinancialInformation = async (id: number, companyId: string) => {
    const response = await apiClient.delete(
        `/api/CompanyMonthlyFinancialInformation/DeleteMonthlyFinancialInformation/${id}?companyId=${companyId}`
    );
    return response.data;
};

export const updateCompleteFinancialInformation = async (header: any, documents: any[], userId: string) => {
    const payload = {
        header: header,
        documents: {
            financialCompanyHeaderID: header.financialCompanyHeaderID,
            companyID: header.companyID,
            createdBy: userId,
            documents: documents
        }
    };
    
    console.log('Update API Payload:', JSON.stringify(payload, null, 2));
    console.log('Update API URL:', `${apiClient.defaults.baseURL}/api/CompanyFinancialInformationHeader2/UpdateCompleteFinancialInformation/${header.financialCompanyHeaderID}`);
    
    try {
        const response = await apiClient.put(`/api/CompanyFinancialInformationHeader2/UpdateCompleteFinancialInformation/${header.financialCompanyHeaderID}`, payload);
        console.log('Update API Response:', response);
        return response.data;
    } catch (error) {
        console.error('Update API Error Details:', error);
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as Record<string, unknown>;
            console.error('Update Error Response:', axiosError.response);
        }
        throw error;
    }
}

// Business Development API functions
export interface BusinessDevelopmentHeaderPayload {
    companyID: string;
    createdBy: string;
    financialYear: string;
    status: string;
    fundingPurpose: string;
    motivationforFunding: string;
    fundingAmountRequested: number;
    gapAnalysisScore: number;
    lastModifiedUserID?: string;
}

export interface BusinessDevelopmentHeaderResponse {
    businessDevelopmentCompanyHeaderID?: string;
    companyBusinessDevelopmentHeader2ID?: string;
    companyID?: string;
    createdBy?: string;
    createdbyUserID?: string;
    dateCreated?: string;
    createdDate?: string;
    financialYear?: string;
    status?: string;
    fundingPurpose?: string;
    motivationforFunding?: string;
    fundingAmountRequested?: number;
    gapAnalysisScore?: number;
    lastModifiedUserID?: string;
}

export const saveCompanyBusinessDevelopmentHeader = async (payload: BusinessDevelopmentHeaderPayload) => {
    try {
        const response = await apiClient.post('/api/CompanyBusinessDevelopmentHeader2/SaveCompanyBusinessDevelopmentHeader2', payload);
        console.log('Save business development header API response:', response);
        return response.data as BusinessDevelopmentHeaderResponse;
    } catch (error) {
        console.error('Save business development header API error:', error);
        throw error;
    }
}

export const saveCompleteBusinessDevelopment = async (header: any, documents: any[], userId: string) => {
    const payload = {
        header: header,
        documents: {
            businessDevelopmentCompanyHeaderID: header.businessDevelopmentCompanyHeaderID || `header-${Date.now()}`,
            companyID: header.companyID,
            createdBy: userId,
            documents: documents
        }
    };
    
    console.log('Business Development API Payload:', JSON.stringify(payload, null, 2));
    console.log('Business Development API URL:', `${apiClient.defaults.baseURL}/api/CompanyBusinessDevelopmentHeader2/SaveCompleteBusinessDevelopment`);
    
    try {
        // Try the original endpoint first
        const response = await apiClient.post('/api/CompanyBusinessDevelopmentHeader2/SaveCompleteBusinessDevelopment', payload);
        console.log('Business Development API Response:', response);
        return response.data;
    } catch (error) {
        console.error('Business Development API Error Details:', error);
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as Record<string, unknown>;
            console.error('Business Development Error Response:', axiosError.response);
        }
        
        // Check if it's a network error and provide more specific error message
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_NETWORK') {
            const networkError = new Error('Network error: Unable to connect to the business development API. Please check if the endpoint exists and try again.');
            networkError.name = 'NetworkError';
            throw networkError;
        }
        
        throw error;
    }
}

export const getBusinessDevelopmentHeadersByCompanyID = async (companyId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyBusinessDevelopmentHeader2/GetHeadersByCompanyID/${companyId}`);
        console.log('Get business development headers API response:', response);
        return response.data;
    } catch (error) {
        console.error('Get business development headers API error:', error);
        throw error;
    }
}

export const getBusinessDevelopmentHeaderByID = async (headerId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyBusinessDevelopmentHeader2/GetHeaderByID/${headerId}`);
        console.log('Get business development header by ID API response:', response);
        return response.data as BusinessDevelopmentHeaderResponse;
    } catch (error) {
        console.error('Get business development header by ID API error:', error);
        throw error;
    }
}

export const updateCompanyBusinessDevelopmentHeader = async (headerId: string, payload: BusinessDevelopmentHeaderPayload) => {
    try {
        const response = await apiClient.put(`/api/CompanyBusinessDevelopmentHeader2/UpdateCompanyBusinessDevelopmentHeader2/${headerId}`, payload);
        console.log('Update business development header API response:', response);
        return response.data as BusinessDevelopmentHeaderResponse;
    } catch (error) {
        console.error('Update business development header API error:', error);
        throw error;
    }
}

export const getCompleteBusinessDevelopment = async (companyId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyBusinessDevelopmentHeader2/GetCompleteBusinessDevelopment/${companyId}`);
        console.log('Get complete business development API response:', response);
        return response.data;
    } catch (error: unknown) {
        // 404 or "not found" = no business development data yet for this company — treat as empty
        const status = error && typeof error === 'object' && 'status' in error ? (error as { status?: number }).status : undefined;
        const message = error instanceof Error ? error.message : (error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : '');
        const isNotFound = status === 404 || message === 'The requested resource was not found.';
        if (isNotFound) {
            return { documents: [] };
        }
        console.error('Get complete business development API error:', error);
        throw error;
    }
}

export const updateCompleteBusinessDevelopment = async (headerId: string, header: any, documents: any[], userId: string) => {
    const payload = {
        header: header,
        documents: {
            companyID: header.companyID,
            createdBy: userId,
            documents: documents
        }
    };

    console.log('Update complete business development payload:', JSON.stringify(payload, null, 2));
    console.log('Update complete business development API URL:', `${apiClient.defaults.baseURL}/api/CompanyBusinessDevelopmentHeader2/UpdateCompleteBusinessDevelopment/${headerId}`);

    try {
        const response = await apiClient.put(`/api/CompanyBusinessDevelopmentHeader2/UpdateCompleteBusinessDevelopment/${headerId}`, payload);
        console.log('Update complete business development API response:', response);
        return response.data;
    } catch (error) {
        console.error('Update complete business development API error:', error);
        throw error;
    }
}

export const deleteBusinessDevelopmentDocument = async (documentId: string, userId: string) => {
    try {
        const response = await apiClient.delete(`/api/CompanyBusinessDevelopment2/DeleteCompanyBusinessDevelopment2/${documentId}?lastModifiedUserID=${userId}`);
        console.log('Delete business development document API response:', response);
        return response.data;
    } catch (error) {
        console.error('Delete business development document API error:', error);
        throw error;
    }
}

export const getBusinessDevelopmentDocumentByID = async (documentId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyBusinessDevelopment2/GetDocumentByID/${documentId}`);
        console.log('Get business development document by ID API response:', response);
        return response.data;
    } catch (error) {
        console.error('Get business development document by ID API error:', error);
        throw error;
    }
}

// Workshop Documents API functions
export const saveCompleteBusinessWorkshops = async (payload: {
    companyID: string;
    createdBy: string;
    title: string;
    dateAttended_Completed: string;
    documents: Array<{
        documentCategory: string;
        name_File: string;
        displayName: string;
        extension: string;
        contentType: string;
        fileData: string;
        fileSize: number;
        uploadDate: string;
        documentScore: number;
    }>;
}) => {
    try {
        console.log('=== API SAVE DEBUG ===');
        console.log('API URL:', 'https://api.hwsetabeneficiaryhub.co.za/api/CompanyBusinessWorkshopsHeader2/SaveCompleteBusinessWorkshops2');
        console.log('Payload structure:', {
            hasCompanyID: !!payload.companyID,
            hasCreatedBy: !!payload.createdBy,
            hasTitle: !!payload.title,
            hasDateAttended: !!payload.dateAttended_Completed,
            documentCount: payload.documents.length,
            documentCategories: payload.documents.map(d => d.documentCategory)
        });
        console.log('Full payload:', JSON.stringify(payload, null, 2));
        
        const response = await apiClient.post('https://api.hwsetabeneficiaryhub.co.za/api/CompanyBusinessWorkshopsHeader2/SaveCompleteBusinessWorkshops2', payload);
        
        console.log('=== API RESPONSE DEBUG ===');
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response data:', response.data);
        console.log('Response config:', response.config);
        
        return response.data;
    } catch (error: any) {
        console.error('=== API ERROR DEBUG ===');
        console.error('Error object:', error);
        console.error('Error response:', error.response);
        console.error('Error status:', error.response?.status);
        console.error('Error data:', error.response?.data);
        console.error('Error message:', error.message);
        throw error;
    }
}

export const getBusinessWorkshopsHeadersByCompanyID = async (companyId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyBusinessWorkshopsHeader2/GetHeadersByCompanyID/${companyId}`);
        console.log('Get business workshops headers by company ID API response:', response);
        return response.data;
    } catch (error) {
        console.error('Get business workshops headers by company ID API error:', error);
        throw error;
    }
}

export const getBusinessWorkshopsDocumentsByCompanyID = async (companyId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyBusinessWorkshopsDocuments2/GetDocumentsByCompanyID/${companyId}`);
        console.log('Get business workshops documents by company ID API response:', response);
        return response.data;
    } catch (error) {
        console.error('Get business workshops documents by company ID API error:', error);
        throw error;
    }
}

export const getBusinessWorkshopsDocumentsByHeaderID = async (headerId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyBusinessWorkshopsDocuments2/GetDocumentsByHeaderID/${headerId}`);
        console.log('Get business workshops documents by header ID API response:', response);
        return response.data;
    } catch (error) {
        console.error('Get business workshops documents by header ID API error:', error);
        throw error;
    }
}

export const getBusinessWorkshopsDocumentsByHeaderIDAndCategory = async (headerId: string, documentCategory: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyBusinessWorkshopsDocuments2/GetDocumentsByHeaderIDAndCategory/${headerId}?documentCategory=${encodeURIComponent(documentCategory)}`);
        console.log('Get business workshops documents by header ID and category API response:', response);
        return response.data;
    } catch (error) {
        console.error('Get business workshops documents by header ID and category API error:', error);
        throw error;
    }
}

export const getBusinessWorkshopsDocumentByID = async (documentId: string) => {
    try {
        const response = await apiClient.get(`/api/CompanyBusinessWorkshopsDocuments2/GetDocumentByID/${documentId}`);
        console.log('Get business workshops document by ID API response:', response);
        return response.data;
    } catch (error) {
        console.error('Get business workshops document by ID API error:', error);
        throw error;
    }
}

export const deleteBusinessWorkshopsDocument = async (documentId: string, userId: string) => {
    try {
        const response = await apiClient.delete(`/api/CompanyBusinessWorkshopsDocuments2/DeleteCompanyBusinessWorkshopsDocument2/${documentId}?lastModifiedUserID=${userId}`);
        console.log('Delete business workshops document API response:', response);
        return response.data;
    } catch (error) {
        console.error('Delete business workshops document API error:', error);
        throw error;
    }
}

// Workshops Summary endpoint (new)
export const getBusinessWorkshopsSummaryByCompanyID = async (companyId: string) => {
    try {
        const url = `https://api.hwsetabeneficiaryhub.co.za/api/CompanyBusinessWorkshopsHeader2/GetBusinessWorkshopsSummary/${companyId}`;
        const response = await apiClient.get(url);
        console.log('Get business workshops summary by company ID API response:', response);
        return response.data;
    } catch (error) {
        console.error('Get business workshops summary by company ID API error:', error);
        throw error;
    }
}
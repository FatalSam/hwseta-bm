export interface BrandingDocument {
    documentID: string;
    companyID: string;
    brandGuidebook: string;
    brandGuidebookFileData: string;
    logo: string;
    logoFileData: string;
    businessCard: string;
    businessCardFileData: string;
    letterhead: string;
    letterheadFileData: string;
    emailSignature: string;
    emailSignatureFileData: string;
    companyProfile: string;
    companyProfileFileData: string;
    totalCompletionScore: number;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

export type BrandingDocuments = BrandingDocument[]; 
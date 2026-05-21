export type DocumentCategory =
    | "Branding"
    | "Company"
    | "Financial"
    | "Workshops"
    | "Coaching"
    | "Development"
    | "Other";

export type DocumentMeta = {
    documentId: string;
    companyId: string;
    createdByUserId: number;
    category: DocumentCategory;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
    createdAtUtc: string;
    updatedAtUtc?: string | null;
    isDeleted: boolean;
};

export type UploadResponse = {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    category: string;
    companyId: string;
};

export type DocumentSubCategory =
    // Company
    | "CIPCCertificate"
    | "OwnersIDs"
    | "TaxClearanceCertificate"
    | "BBBEECertificate"
    | "COIDRegistration"
    | "SectorSpecificLicenses"
    | "BankAccountConfirmation"
    // Financial
    | "FinancialStatements"
    | "ManagementAccounts"
    | "BankStatement"
    // Branding
    | "BrandGuidebook"
    | "Logo"
    | "BusinessCard"
    | "Letterhead"
    | "EmailSignature"
    | "CompanyProfile"
    // Development / Skills Programme
    | "ModuleVideo"
    | "ModuleAssignment"
    | "BusinessPlan"
    | "ComparativeQuotes"
    // Coaching
    | "CoachingVideo"
    | "CoachingAssignment"
    // Workshops
    | "WorkshopVideo"
    | "WorkshopAssignment"
    // Other
    | "Misc";



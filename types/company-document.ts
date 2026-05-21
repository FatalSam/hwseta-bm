export interface CompanyDocument {
    documentID: string;
    companyID: string;
    cipcRegistrationCertificate: string;
    cipcRegistrationCertificateFileData: string;
    ownersIDs: string;
    ownersIDsFileData: string;
    taxClearanceCertificate: string;
    taxClearanceCertificateFileData: string;
    bbeeCertificate: string;
    bbeeCertificateFileData: string;
    coidStatus: string;
    coidRegistration: string;
    coidRegistrationFileData: string;
    sectorSpecificStatus: string;
    sectorSpecificLicenses: string;
    sectorSpecificLicensesFileData: string;
    bankAccountConfirmation: string;
    bankAccountConfirmationFileData: string;
    totalCompletionScore: number;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

export type CompanyDocuments = CompanyDocument[]; 
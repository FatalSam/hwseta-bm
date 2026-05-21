export interface ModuleDocument {
    documentID: string;
    companyID: string;
    moduleNumber: number;
    video: string;
    videoFileData: string;
    assignment: string;
    assignmentFileData: string;
    verifyAssignment: boolean;
    totalCompletionScore: number;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

export type ModuleDocuments = ModuleDocument[]; 
export interface BusinessCoaching {
    documentID: string;
    companyID: string;
    fullName: string;
    coachingVideo: string;
    coachingVideoFileData: string;
    assignmentTitle: string;
    assignment: string;
    assignmentFileData: string;
    isVerified: boolean;
    totalCompletionScore: number;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

export type BusinessCoachings = BusinessCoaching[];

export interface CoachingDocument {
    name_File?: string | null;
    displayName?: string | null;
    extension?: string | null;
    contentType?: string | null;
    fileData?: string | null;
    fileSize?: number | null;
    uploadDate?: string | null;
}

export interface CompanyBusinessCoachingHeader2 {
    businessCoachingCompanyHeaderID?: string | null;
    companyID?: string | null;
    dateCreated?: string | null;
    createdBy?: string | null;
    assignmentTitle?: string | null;
    dateSubmitted?: string | null;
    modifiedDate?: string | null;
    lastModifiedUserID?: string | null;
    coachingVideos?: CoachingDocument[] | null;
    coachingAssignments?: CoachingDocument[] | null;
    isVerified?: boolean;
    verifiedDate?: string | null;
    verifiedBy?: string | null;
} 
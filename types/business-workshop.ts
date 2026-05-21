export interface BusinessWorkshop {
    documentID: string;
    companyID: string;
    workshopVideos: string;
    workshopVideosFileData: string;
    workshopAssignments: string;
    workshopAssignmentsFileData: string;
    verifyAssignments: boolean;
    totalCompletionScore: number;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

export type BusinessWorkshops = BusinessWorkshop[]; 
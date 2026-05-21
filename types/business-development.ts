export interface BusinessDevelopment {
    documentID: string;
    companyID: string;
    gapAnalysisScore: number;
    businessPlan: string;
    businessPlanFileData: string;
    foundationalNeeds: string;
    fundingPurpose: string;
    fundingAmount: number;
    fundingMotivation: string;
    comparativeQuotes: string;
    comparativeQuotesFileData: string;
    totalCompletionScore: number;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

export type BusinessDevelopments = BusinessDevelopment[]; 
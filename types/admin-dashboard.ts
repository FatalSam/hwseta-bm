export interface CompanyStats {
    total: number;
    active: number;
    newThisMonth: number;
    averageCompletion: number;
    byStatus: { [status: string]: number };
}

export interface UserStats {
    total: number;
    active: number;
    newThisMonth: number;
}

export interface QuestionnaireStats {
    total: number;
    averageCompletion: number;
    byStatus: { [status: string]: number };
    averageScore: number;
}

export interface FinancialStats {
    totalCostOfFormalisation: number;
    totalFundingRequested: number;
    averageCostPerCompany: number;
}

export interface DocumentStats {
    total: number;
    byCategory: { [category: string]: number };
    averagePerCompany: number;
}

export interface WorkshopStats {
    total: number;
    participationRate: number;
    averagePerCompany: number;
}

export interface CoachingStats {
    total: number;
    verified: number;
    pending: number;
    averagePerCompany: number;
}

export interface TrendDataPoint {
    date: string;
    count?: number;
    value?: number;
}

export interface Trends {
    companyRegistrations: TrendDataPoint[];
    gapAnalysisSubmissions: TrendDataPoint[];
    costTrends: TrendDataPoint[];
    profileCompletionTrends?: TrendDataPoint[];
}

export interface AdminDashboardStats {
    companies: CompanyStats;
    users: UserStats;
    questionnaires: QuestionnaireStats;
    financial: FinancialStats;
    documents: DocumentStats;
    workshops: WorkshopStats;
    coaching: CoachingStats;
    trends: Trends;
}


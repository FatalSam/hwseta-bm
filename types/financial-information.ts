export interface FinancialInformation {
    documentID: string;
    companyID: string;
    profitabilityStatus: string;
    averageMonthlyTurnover: number;
    averageAnnualTurnover: number;
    financialStatements: string;
    financialStatementsFileData: string;
    managementAccounts: string;
    managementAccountsFileData: string;
    bankStatement: string;
    bankStatementFileData: string;
    totalCompletionScore: number;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

export type FinancialInformations = FinancialInformation[]; 
export interface QuestionnaireQuestion {
    categoryQuestionID: number;
    sectionID: number;
    subsectionID: number;
    questionCode: string;
    questionText: string;
    sectionName: string;
    subsectionName: string;
    costItemID: number;
    costItem: string | null;
    costPrice: number;
    importance: string | null;
    resources: string | null;
    sectionDescription: string;
}

export interface QuestionnaireResponse {
    questionID: number;
    answer: string; // "Yes" or "No"
    questionCode: string;
    questionText: string;
}

export interface SaveQuestionnaireRequest {
    companyID: string;
    userID: string;
    surveyHeaderID: number;
    answers: Array<{
        categoryQuestionID: number;
        answer: boolean;
        selectedCostItemID?: number;
    }>;
}

export interface Questionnaire {
    questionnaireID: string;
    companyID: string;
    question1: string;
    question2: string;
    question3: string;
    question4: string;
    question5: string;
    question6: string;
    question7: string;
    question8: string;
    question9: string;
    question10: string;
    totalCompletionScore: number;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

export interface CostItem {
    costItemID: string;
    questionnaireID: string;
    itemName: string;
    itemDescription: string;
    estimatedCost: number;
    priority: string;
    isRequired: boolean;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

export interface QuestionnaireWithCostItems {
    questionnaire: Questionnaire;
    costItems: CostItem[];
}

export interface Questionnaires extends Array<QuestionnaireQuestion> {}

export interface SaveQuestionnaireSummaryResponse {
    surveyHeaderId: number;
    referenceNumber: string;
    status: string;
    dateSubmitted: string;
    createdBy: string;
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
    costItems: number;
    totalCost: number;
}

export interface CostOption {
    costItem: string;
    costPrice: number;
    categoryQuestionID: number;
    costItemID: number;
}

export interface SurveyQuestion {
    categoryQuestionID: number;
    questionCode: string;
    questionText: string;
    sectionName: string;
    subsectionName: string;
    costItem: string;
    costPrice: number;
    costItemID: number;
    importance: string;
    resources: string;
    sectionDescription: string;
    costOptions?: CostOption[];
}

export interface SurveyResponse {
    questions: SurveyQuestion[];
}

export interface SubmittedQuestionnaireSummary {
    surveyHeaderId: number;
    referenceNumber: string;
    status: string;
    dateSubmitted: string;
    createdBy: string;
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
    costItems: number;
    totalCost: number;
    totalUnansweredQuestions: number;
} 
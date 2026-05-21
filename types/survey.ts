export interface SubmitSurveyFeedbackRequest {
    companyID: string;
    userID: string;
    surveyHeaderID: number;
    answers: Array<{
        categoryQuestionID: number;
        answer: boolean;
    }>;
}

export interface SubmitSurveyFeedbackResponse {
    message: string;
} 
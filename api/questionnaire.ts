import apiClient from "@/ultis/apiClient";
import { Questionnaire, SurveyResponse, QuestionnaireQuestion, SaveQuestionnaireRequest, SaveQuestionnaireSummaryResponse } from "@/types/questionnaire";
import { SubmittedQuestionnaireSummary } from "@/types/questionnaire";
import { SubmitSurveyFeedbackRequest, SubmitSurveyFeedbackResponse } from "@/types/survey";

// Get all questionnaires
export const getAllQuestionnaires = async () => {
    const response = await apiClient.get('/api/Questionnaire/GetAllQuestionnaires');
    return response.data as QuestionnaireQuestion[];
}

// Get questionnaire by company ID
export const getQuestionnaireByCompanyId = async (companyId: string) => {
    const response = await apiClient.get(`/api/Questionnaire/GetQuestionnaireByCompanyID/${companyId}`);
    return response.data as Questionnaire;
}

// Save questionnaire and get summary
export const saveQuestionnaireAndGetSummaryCosts = async (data: SaveQuestionnaireRequest) => {
    const response = await apiClient.post('/api/Questionnaire/SaveQuestionnaireGetSummaryCosts', data);
    return response.data as SaveQuestionnaireSummaryResponse;
}

// Update questionnaire
export const updateQuestionnaire = async (questionnaireId: string, questionnaire: Questionnaire) => {
    const response = await apiClient.put(`/api/Questionnaire/UpdateQuestionnaire/${questionnaireId}`, questionnaire);
    return response.data as Questionnaire;
}

// Delete questionnaire
export const deleteQuestionnaire = async (questionnaireId: string, lastModifiedUserID: string) => {
    const response = await apiClient.delete(`/api/Questionnaire/DeleteQuestionnaire/${questionnaireId}`, {
        params: { lastModifiedUserID }
    });
    return response.data as Questionnaire;
}

// Get survey by ID
export const getSurveyById = async (id: string) => {
    const response = await apiClient.get(`/api/Questionnaire/GetSurveyById/${id}`);
    return response.data as SurveyResponse;
}

// Get submitted questionnaire summaries by company ID
export const getSubmittedQuestionnaireSummariesByCompanyId = async (companyId: string) => {
    const response = await apiClient.get(`/api/Questionnaire/GetSummaryListByCompanyID/${companyId}`);
    return response.data as SubmittedQuestionnaireSummary[];
}

// Submit survey feedback by ID
export const submitSurveyFeedbackById = async (surveyHeaderId: number, data: SubmitSurveyFeedbackRequest) => {
    const response = await apiClient.post(`/api/Questionnaire/SubmitSurveyFeedbackByID/${surveyHeaderId}`, data);
    return response.data as SubmitSurveyFeedbackResponse;
};

// Get survey header totals (totals per survey header)
export const getSurveyHeaderTotals = async (companyId: string, surveyHeaderId: number) => {
    // Use absolute URL to match provided endpoint
    const url = `https://api.hwsetabeneficiaryhub.co.za/api/Questionnaire/GetSurveyHeaderTotals/${companyId}/${surveyHeaderId}`;
    const response = await apiClient.get(url);
    return response.data as {
        surveyHeaderID: number;
        companyID: string;
        referenceNumber: string;
        status: string;
        createdBy: string;
        dateCaptured: string;
        totalQuestions: number;
        totalYes: number;
        totalNo: number;
        totalSurveyScore: number;
        totalHelpAmount: number;
    };
}
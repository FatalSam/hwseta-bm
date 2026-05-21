import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getAllQuestionnaires, 
    getQuestionnaireByCompanyId, 
    saveQuestionnaireAndGetSummaryCosts, 
    updateQuestionnaire, 
    deleteQuestionnaire,
    getSurveyById,
    getSubmittedQuestionnaireSummariesByCompanyId,
    getSurveyHeaderTotals,
    submitSurveyFeedbackById
} from '@/api/questionnaire';
import { Questionnaire, QuestionnaireWithCostItems, QuestionnaireQuestion, SaveQuestionnaireRequest, SaveQuestionnaireSummaryResponse, SurveyResponse, SubmittedQuestionnaireSummary } from '@/types/questionnaire';
import { SubmitSurveyFeedbackRequest, SubmitSurveyFeedbackResponse } from '@/types/survey';

// Get all questionnaires
export const useGetAllQuestionnaires = () => {
    return useQuery<QuestionnaireQuestion[]>({
        queryKey: ['questionnaires'],
        queryFn: getAllQuestionnaires,
    });
};

// Get questionnaire by company ID
export const useGetQuestionnaireByCompanyId = (companyId: string) => {
    return useQuery<Questionnaire>({
        queryKey: ['questionnaire', companyId],
        queryFn: () => getQuestionnaireByCompanyId(companyId),
        enabled: !!companyId,
    });
};

// Save questionnaire and get cost items
export const useSaveQuestionnaireAndGetSummaryCosts = () => {
    const queryClient = useQueryClient();
    
    return useMutation<SaveQuestionnaireSummaryResponse, Error, SaveQuestionnaireRequest>({
        mutationFn: saveQuestionnaireAndGetSummaryCosts,
        onSuccess: (data, variables) => {
            // Invalidate and refetch questionnaire data
            queryClient.invalidateQueries({ queryKey: ['questionnaire', variables.companyID] });
            queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
        },
    });
};

// Update questionnaire
export const useUpdateQuestionnaire = () => {
    const queryClient = useQueryClient();
    
    return useMutation<Questionnaire, Error, { questionnaireId: string; questionnaire: Questionnaire }>({
        mutationFn: ({ questionnaireId, questionnaire }) => updateQuestionnaire(questionnaireId, questionnaire),
        onSuccess: (data, variables) => {
            // Invalidate and refetch questionnaire data
            queryClient.invalidateQueries({ queryKey: ['questionnaire', data.companyID] });
            queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
        },
    });
};

// Delete questionnaire
export const useDeleteQuestionnaire = () => {
    const queryClient = useQueryClient();
    
    return useMutation<Questionnaire, Error, { questionnaireId: string; lastModifiedUserID: string }>({
        mutationFn: ({ questionnaireId, lastModifiedUserID }) => deleteQuestionnaire(questionnaireId, lastModifiedUserID),
        onSuccess: (data, variables) => {
            // Invalidate and refetch questionnaire data
            queryClient.invalidateQueries({ queryKey: ['questionnaire', data.companyID] });
            queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
        },
    });
};

// Get survey by ID
export const useGetSurveyById = (id: string) => {
    return useQuery<SurveyResponse>({
        queryKey: ['survey', id],
        queryFn: () => getSurveyById(id),
        enabled: !!id,
    });
};

// Get submitted questionnaire summaries by company ID
export const useGetSubmittedQuestionnaireSummariesByCompanyId = (companyId: string) => {
    return useQuery<SubmittedQuestionnaireSummary[]>({
        queryKey: ['submitted-questionnaire-summaries', companyId],
        queryFn: () => getSubmittedQuestionnaireSummariesByCompanyId(companyId),
        enabled: !!companyId,
    });
};

// Submit survey feedback by ID
export const useSubmitSurveyFeedback = (surveyHeaderId: number) => {
    return useMutation<SubmitSurveyFeedbackResponse, Error, SubmitSurveyFeedbackRequest>({
        mutationFn: (data) => submitSurveyFeedbackById(surveyHeaderId, data),
    });
};

// Combined hook for questionnaire operations
export const useQuestionnaire = (companyId?: string) => {
    const questionnaireQuery = useGetQuestionnaireByCompanyId(companyId || '');
    const saveMutation = useSaveQuestionnaireAndGetSummaryCosts();
    const updateMutation = useUpdateQuestionnaire();
    const deleteMutation = useDeleteQuestionnaire();

    return {
        // Query data
        questionnaire: questionnaireQuery.data,
        isLoading: questionnaireQuery.isLoading,
        error: questionnaireQuery.error,
        refetch: questionnaireQuery.refetch,
        
        // Mutations
        saveQuestionnaire: saveMutation.mutate,
        updateQuestionnaire: updateMutation.mutate,
        deleteQuestionnaire: deleteMutation.mutate,
        
        // Mutation states
        isSaving: saveMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        
        // Mutation errors
        saveError: saveMutation.error,
        updateError: updateMutation.error,
        deleteError: deleteMutation.error,
    };
}; 

// Survey header totals (totals per survey header ID)
export const useGetSurveyHeaderTotals = (companyId: string, surveyHeaderId: number) => {
    return useQuery({
        queryKey: ['survey-header-totals', companyId, surveyHeaderId],
        queryFn: () => getSurveyHeaderTotals(companyId, surveyHeaderId),
        enabled: !!companyId && !!surveyHeaderId,
    });
};
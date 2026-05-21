import apiClient from "@/ultis/apiClient";
import {
    AdminQuestionnaireGridResponse,
    Section,
    CreateSectionRequest,
    UpdateSectionRequest,
    Subsection,
    CreateSubsectionRequest,
    UpdateSubsectionRequest,
    Question,
    CreateQuestionRequest,
    UpdateQuestionRequest,
    CostItem,
    CreateCostItemRequest,
    UpdateCostItemRequest
} from "@/types/admin-questionnaire";

// ==================== GRID ====================
// Get admin questionnaire grid data
export const getAdminQuestionnaireGrid = async () => {
    const response = await apiClient.get('/api/AdminQuestionnaire/grid');
    return response.data as AdminQuestionnaireGridResponse;
}

// ==================== SECTIONS ====================
// Get all sections
export const getAllSections = async () => {
    const response = await apiClient.get('/api/AdminQuestionnaire/sections');
    return response.data as Section[];
}

// Get section by ID
export const getSectionById = async (sectionId: number) => {
    const response = await apiClient.get(`/api/AdminQuestionnaire/sections/${sectionId}`);
    return response.data as Section;
}

// Create a new section
export const createSection = async (data: CreateSectionRequest) => {
    const response = await apiClient.post('/api/AdminQuestionnaire/sections', data);
    return response.data as Section;
}

// Update an existing section
export const updateSection = async (sectionId: number, data: UpdateSectionRequest) => {
    const response = await apiClient.put(`/api/AdminQuestionnaire/sections/${sectionId}`, data);
    return response.data as Section;
}

// Delete a section
export const deleteSection = async (sectionId: number) => {
    const response = await apiClient.delete(`/api/AdminQuestionnaire/sections/${sectionId}`);
    return response.data;
}

// ==================== SUBSECTIONS ====================
// Get all subsections
export const getAllSubsections = async () => {
    const response = await apiClient.get('/api/AdminQuestionnaire/subsections');
    return response.data as Subsection[];
}

// Get subsections by section
export const getSubsectionsBySection = async (sectionId: number) => {
    const response = await apiClient.get(`/api/AdminQuestionnaire/subsections/section/${sectionId}`);
    return response.data as Subsection[];
}

// Get subsection by ID
export const getSubsectionById = async (subsectionId: number) => {
    const response = await apiClient.get(`/api/AdminQuestionnaire/subsections/${subsectionId}`);
    return response.data as Subsection;
}

// Create a new subsection
export const createSubsection = async (data: CreateSubsectionRequest) => {
    const response = await apiClient.post('/api/AdminQuestionnaire/subsections', data);
    return response.data as Subsection;
}

// Update an existing subsection
export const updateSubsection = async (subsectionId: number, data: UpdateSubsectionRequest) => {
    const response = await apiClient.put(`/api/AdminQuestionnaire/subsections/${subsectionId}`, data);
    return response.data as Subsection;
}

// Delete a subsection
export const deleteSubsection = async (subsectionId: number) => {
    const response = await apiClient.delete(`/api/AdminQuestionnaire/subsections/${subsectionId}`);
    return response.data;
}

// ==================== QUESTIONS ====================
// Get all questions
export const getAllQuestions = async () => {
    const response = await apiClient.get('/api/AdminQuestionnaire/questions');
    return response.data as Question[];
}

// Get questions by subsection
export const getQuestionsBySubsection = async (subsectionId: number) => {
    const response = await apiClient.get(`/api/AdminQuestionnaire/questions/subsection/${subsectionId}`);
    return response.data as Question[];
}

// Get question by ID
export const getQuestionById = async (categoryQuestionId: number) => {
    const response = await apiClient.get(`/api/AdminQuestionnaire/questions/${categoryQuestionId}`);
    return response.data as Question;
}

// Create a new question
export const createQuestion = async (data: CreateQuestionRequest) => {
    const response = await apiClient.post('/api/AdminQuestionnaire/questions', data);
    return response.data as Question;
}

// Update an existing question
export const updateQuestion = async (categoryQuestionId: number, data: UpdateQuestionRequest) => {
    const response = await apiClient.put(`/api/AdminQuestionnaire/questions/${categoryQuestionId}`, data);
    return response.data as Question;
}

// Delete a question
export const deleteQuestion = async (categoryQuestionId: number) => {
    const response = await apiClient.delete(`/api/AdminQuestionnaire/questions/${categoryQuestionId}`);
    return response.data;
}

// ==================== COST ITEMS ====================
// Get all cost items
export const getAllCostItems = async () => {
    const response = await apiClient.get('/api/AdminQuestionnaire/costitems');
    return response.data as CostItem[];
}

// Get cost items by subsection
export const getCostItemsBySubsection = async (subsectionId: number) => {
    const response = await apiClient.get(`/api/AdminQuestionnaire/costitems/subsection/${subsectionId}`);
    return response.data as CostItem[];
}

// Get cost items by question
export const getCostItemsByQuestion = async (categoryQuestionId: number) => {
    const response = await apiClient.get(`/api/AdminQuestionnaire/costitems/question/${categoryQuestionId}`);
    return response.data as CostItem[];
}

// Get cost item by ID
export const getCostItemById = async (costItemId: number) => {
    const response = await apiClient.get(`/api/AdminQuestionnaire/costitems/${costItemId}`);
    return response.data as CostItem;
}

// Create a new cost item
export const createCostItem = async (data: CreateCostItemRequest) => {
    const response = await apiClient.post('/api/AdminQuestionnaire/costitems', data);
    return response.data as CostItem;
}

// Update an existing cost item
export const updateCostItem = async (costItemId: number, data: UpdateCostItemRequest) => {
    const response = await apiClient.put(`/api/AdminQuestionnaire/costitems/${costItemId}`, data);
    return response.data as CostItem;
}

// Delete a cost item
export const deleteCostItem = async (costItemId: number) => {
    const response = await apiClient.delete(`/api/AdminQuestionnaire/costitems/${costItemId}`);
    return response.data;
}

// ==================== LEGACY/COMPATIBILITY ====================
// Keep old function names for backward compatibility
export const createAdminSection = createSection;
export const createAdminSubsection = createSubsection;
export const createAdminQuestion = createQuestion;
export const updateAdminQuestion = updateQuestion;
export const deleteAdminQuestion = deleteQuestion;
export const deleteAdminSection = deleteSection;
export const deleteAdminSubsection = deleteSubsection;
export const deleteAdminCostItem = deleteCostItem;

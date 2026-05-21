import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAdminQuestionnaireGrid,
    getAllSections,
    getSectionById,
    createSection,
    updateSection,
    deleteSection,
    getAllSubsections,
    getSubsectionsBySection,
    getSubsectionById,
    createSubsection,
    updateSubsection,
    deleteSubsection,
    getAllQuestions,
    getQuestionsBySubsection,
    getQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    getAllCostItems,
    getCostItemsBySubsection,
    getCostItemsByQuestion,
    getCostItemById,
    createCostItem,
    updateCostItem,
    deleteCostItem,
    // Legacy compatibility
    createAdminSection,
    createAdminSubsection,
    createAdminQuestion,
    updateAdminQuestion,
    deleteAdminQuestion,
    deleteAdminSection,
    deleteAdminSubsection,
    deleteAdminCostItem
} from '@/api/admin-questionnaire';
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
} from '@/types/admin-questionnaire';

// ==================== GRID ====================
// Get admin questionnaire grid data
export const useAdminQuestionnaireGrid = () => {
    return useQuery<AdminQuestionnaireGridResponse>({
        queryKey: ['admin-questionnaire-grid'],
        queryFn: getAdminQuestionnaireGrid,
    });
};

// ==================== SECTIONS ====================
// Get all sections
export const useGetAllSections = () => {
    return useQuery<Section[]>({
        queryKey: ['admin-sections'],
        queryFn: getAllSections,
    });
};

// Get section by ID
export const useGetSectionById = (sectionId: number) => {
    return useQuery<Section>({
        queryKey: ['admin-section', sectionId],
        queryFn: () => getSectionById(sectionId),
        enabled: !!sectionId,
    });
};

// Create a new section
export const useCreateSection = () => {
    const queryClient = useQueryClient();
    
    return useMutation<Section, Error, CreateSectionRequest>({
        mutationFn: createSection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
        },
    });
};

// Update an existing section
export const useUpdateSection = () => {
    const queryClient = useQueryClient();
    
    return useMutation<Section, Error, { sectionId: number; data: UpdateSectionRequest }>({
        mutationFn: ({ sectionId, data }) => updateSection(sectionId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
            queryClient.invalidateQueries({ queryKey: ['admin-section', variables.sectionId] });
        },
    });
};

// Delete a section
export const useDeleteSection = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: deleteSection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
        },
    });
};

// ==================== SUBSECTIONS ====================
// Get all subsections
export const useGetAllSubsections = () => {
    return useQuery<Subsection[]>({
        queryKey: ['admin-subsections'],
        queryFn: getAllSubsections,
    });
};

// Get subsections by section
export const useGetSubsectionsBySection = (sectionId: number) => {
    return useQuery<Subsection[]>({
        queryKey: ['admin-subsections', 'section', sectionId],
        queryFn: () => getSubsectionsBySection(sectionId),
        enabled: !!sectionId,
    });
};

// Get subsection by ID
export const useGetSubsectionById = (subsectionId: number) => {
    return useQuery<Subsection>({
        queryKey: ['admin-subsection', subsectionId],
        queryFn: () => getSubsectionById(subsectionId),
        enabled: !!subsectionId,
    });
};

// Create a new subsection
export const useCreateSubsection = () => {
    const queryClient = useQueryClient();
    
    return useMutation<Subsection, Error, CreateSubsectionRequest>({
        mutationFn: createSubsection,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-subsections'] });
            queryClient.invalidateQueries({ queryKey: ['admin-subsections', 'section', data.sectionID] });
        },
    });
};

// Update an existing subsection
export const useUpdateSubsection = () => {
    const queryClient = useQueryClient();
    
    return useMutation<Subsection, Error, { subsectionId: number; data: UpdateSubsectionRequest }>({
        mutationFn: ({ subsectionId, data }) => updateSubsection(subsectionId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-subsections'] });
            queryClient.invalidateQueries({ queryKey: ['admin-subsection', variables.subsectionId] });
            queryClient.invalidateQueries({ queryKey: ['admin-subsections', 'section', data.sectionID] });
        },
    });
};

// Delete a subsection
export const useDeleteSubsection = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: deleteSubsection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-subsections'] });
        },
    });
};

// ==================== QUESTIONS ====================
// Get all questions
export const useGetAllQuestions = () => {
    return useQuery<Question[]>({
        queryKey: ['admin-questions'],
        queryFn: getAllQuestions,
    });
};

// Get questions by subsection
export const useGetQuestionsBySubsection = (subsectionId: number) => {
    return useQuery<Question[]>({
        queryKey: ['admin-questions', 'subsection', subsectionId],
        queryFn: () => getQuestionsBySubsection(subsectionId),
        enabled: !!subsectionId,
    });
};

// Get question by ID
export const useGetQuestionById = (categoryQuestionId: number) => {
    return useQuery<Question>({
        queryKey: ['admin-question', categoryQuestionId],
        queryFn: () => getQuestionById(categoryQuestionId),
        enabled: !!categoryQuestionId,
    });
};

// Create a new question
export const useCreateQuestion = () => {
    const queryClient = useQueryClient();
    
    return useMutation<Question, Error, CreateQuestionRequest>({
        mutationFn: createQuestion,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
            queryClient.invalidateQueries({ queryKey: ['admin-questions', 'subsection', data.subsectionID] });
        },
    });
};

// Update an existing question
export const useUpdateQuestion = () => {
    const queryClient = useQueryClient();
    
    return useMutation<Question, Error, { categoryQuestionId: number; data: UpdateQuestionRequest }>({
        mutationFn: ({ categoryQuestionId, data }) => updateQuestion(categoryQuestionId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
            queryClient.invalidateQueries({ queryKey: ['admin-question', variables.categoryQuestionId] });
            queryClient.invalidateQueries({ queryKey: ['admin-questions', 'subsection', data.subsectionID] });
        },
    });
};

// Delete a question
export const useDeleteQuestion = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: deleteQuestion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
        },
    });
};

// ==================== COST ITEMS ====================
// Get all cost items
export const useGetAllCostItems = () => {
    return useQuery<CostItem[]>({
        queryKey: ['admin-costitems'],
        queryFn: getAllCostItems,
    });
};

// Get cost items by subsection
export const useGetCostItemsBySubsection = (subsectionId: number) => {
    return useQuery<CostItem[]>({
        queryKey: ['admin-costitems', 'subsection', subsectionId],
        queryFn: () => getCostItemsBySubsection(subsectionId),
        enabled: !!subsectionId,
    });
};

// Get cost items by question
export const useGetCostItemsByQuestion = (categoryQuestionId: number) => {
    return useQuery<CostItem[]>({
        queryKey: ['admin-costitems', 'question', categoryQuestionId],
        queryFn: () => getCostItemsByQuestion(categoryQuestionId),
        enabled: !!categoryQuestionId,
    });
};

// Get cost item by ID
export const useGetCostItemById = (costItemId: number) => {
    return useQuery<CostItem>({
        queryKey: ['admin-costitem', costItemId],
        queryFn: () => getCostItemById(costItemId),
        enabled: !!costItemId,
    });
};

// Create a new cost item
export const useCreateCostItem = () => {
    const queryClient = useQueryClient();
    
    return useMutation<CostItem, Error, CreateCostItemRequest>({
        mutationFn: createCostItem,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-costitems'] });
            queryClient.invalidateQueries({ queryKey: ['admin-costitems', 'subsection', data.subsectionID] });
            if (data.categoryQuestionID) {
                queryClient.invalidateQueries({ queryKey: ['admin-costitems', 'question', data.categoryQuestionID] });
            }
        },
    });
};

// Update an existing cost item
export const useUpdateCostItem = () => {
    const queryClient = useQueryClient();
    
    return useMutation<CostItem, Error, { costItemId: number; data: UpdateCostItemRequest }>({
        mutationFn: ({ costItemId, data }) => updateCostItem(costItemId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-costitems'] });
            queryClient.invalidateQueries({ queryKey: ['admin-costitem', variables.costItemId] });
            queryClient.invalidateQueries({ queryKey: ['admin-costitems', 'subsection', data.subsectionID] });
            if (data.categoryQuestionID) {
                queryClient.invalidateQueries({ queryKey: ['admin-costitems', 'question', data.categoryQuestionID] });
            }
        },
    });
};

// Delete a cost item
export const useDeleteCostItem = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: deleteCostItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-questionnaire-grid'] });
            queryClient.invalidateQueries({ queryKey: ['admin-costitems'] });
        },
    });
};

// ==================== LEGACY/COMPATIBILITY ====================
// Keep old hook names for backward compatibility
export const useCreateAdminSection = useCreateSection;
export const useCreateAdminSubsection = useCreateSubsection;
export const useCreateAdminQuestion = useCreateQuestion;
export const useUpdateAdminQuestion = useUpdateQuestion;
export const useDeleteAdminQuestion = useDeleteQuestion;
export const useDeleteAdminSection = useDeleteSection;
export const useDeleteAdminSubsection = useDeleteSubsection;
export const useDeleteAdminCostItem = useDeleteCostItem;

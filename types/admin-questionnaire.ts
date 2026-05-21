export interface AdminQuestionnaireGridRow {
    level: number;
    sectionID: number | null;
    sectionName: string | null;
    sectionDescription: string | null;
    subsectionID: number | null;
    subsectionSectionID: number | null;
    subsectionCode: string | null;
    subsectionName: string | null;
    categoryQuestionID: number | null;
    questionSubsectionID: number | null;
    questionCode: string | null;
    questionText: string | null;
    importance: string | null;
    resources: string | null;
    costItemID: number | null;
    costItemSubsectionID: number | null;
    costItemCategoryQuestionID: number | null;
    item: string | null;
    estimatedAverage: number | null;
    displayName: string;
    displayCode: string;
    hasChildren: boolean;
}

export interface AdminQuestionnaireGridResponse {
    rows: AdminQuestionnaireGridRow[];
}

// Transformed hierarchical structure for UI display
export interface AdminQuestionnaireSection {
    sectionID: number;
    sectionName: string;
    sectionDescription: string | null;
    subsections: AdminQuestionnaireSubsection[];
}

export interface AdminQuestionnaireSubsection {
    subsectionID: number;
    subsectionCode: string;
    subsectionName: string;
    questions: AdminQuestionnaireQuestion[];
}

export interface AdminQuestionnaireQuestion {
    categoryQuestionID: number;
    questionCode: string;
    questionText: string;
    importance: string | null;
    resources: string | null;
    costItems: AdminQuestionnaireCostItem[];
}

export interface AdminQuestionnaireCostItem {
    costItemID: number;
    item: string;
    estimatedAverage: number | null;
}

// Section types
export interface Section {
    sectionID?: number;
    sectionName: string;
    description: string | null;
}

export interface CreateSectionRequest {
    sectionName: string;
    description?: string | null;
}

export interface UpdateSectionRequest {
    sectionName: string;
    description?: string | null;
}

// Subsection types
export interface Subsection {
    subsectionID?: number;
    sectionID: number;
    subsectionCode: string;
    subsectionName: string;
}

export interface CreateSubsectionRequest {
    sectionID: number;
    subsectionCode: string;
    subsectionName: string;
}

export interface UpdateSubsectionRequest {
    sectionID: number;
    subsectionCode: string;
    subsectionName: string;
}

// Question types
export interface Question {
    categoryQuestionID?: number;
    subsectionID: number;
    questionCode?: string | null;
    questionText: string;
    importance?: string | null;
    resources?: string | null;
}

export interface CreateQuestionRequest {
    subsectionID: number;
    questionCode?: string | null;
    questionText: string;
    importance?: string | null;
    resources?: string | null;
}

export interface UpdateQuestionRequest {
    subsectionID: number;
    questionCode?: string | null;
    questionText: string;
    importance?: string | null;
    resources?: string | null;
}

// Cost Item types
export interface CostItem {
    costItemID?: number;
    subsectionID: number;
    categoryQuestionID?: number | null;
    item: string;
    estimatedAverage?: number | null;
}

export interface CreateCostItemRequest {
    subsectionID: number;
    categoryQuestionID?: number | null;
    item: string;
    estimatedAverage?: number | null;
}

export interface UpdateCostItemRequest {
    subsectionID: number;
    categoryQuestionID?: number | null;
    item: string;
    estimatedAverage?: number | null;
}


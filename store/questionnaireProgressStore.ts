import { create } from 'zustand';
import { QuestionnaireQuestion, QuestionnaireResponse } from '@/types/questionnaire';

export interface QuestionnaireProgress {
    answers: { [questionId: number]: string };
    currentSection: string;
    currentSubsection: string;
    lastModified: Date;
    isCompleted: boolean;
}

interface QuestionnaireProgressState {
    progress: QuestionnaireProgress | null;
    questions: QuestionnaireQuestion[] | null;
    hasDraft: boolean;
    saveProgress: (answers: { [questionId: number]: string }, currentSection: string, currentSubsection: string) => void;
    loadProgress: () => QuestionnaireProgress | null;
    clearProgress: () => void;
    deleteDraft: () => void;
    setQuestions: (questions: QuestionnaireQuestion[]) => void;
    getProgressPercentage: () => number;
    getAnsweredQuestions: () => QuestionnaireResponse[];
}

// Initialize state from localStorage if available (client-side only)
const getStoredProgress = () => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem('questionnaireProgress');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...parsed,
                lastModified: new Date(parsed.lastModified)
            };
        }
        return null;
    } catch (error) {
        console.error('Error reading questionnaire progress from localStorage:', error);
        return null;
    }
};

export const useQuestionnaireProgressStore = create<QuestionnaireProgressState>((set, get) => ({
    progress: null,
    questions: null,
    hasDraft: false,
    
    saveProgress: (answers: { [questionId: number]: string }, currentSection: string, currentSubsection: string) => {
        const progress: QuestionnaireProgress = {
            answers,
            currentSection,
            currentSubsection,
            lastModified: new Date(),
            isCompleted: false
        };
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('questionnaireProgress', JSON.stringify(progress));
        }
        
        set({ progress, hasDraft: true });
    },
    
    loadProgress: () => {
        const storedProgress = getStoredProgress();
        if (storedProgress) {
            set({ progress: storedProgress, hasDraft: true });
            return storedProgress;
        }
        return null;
    },
    
    clearProgress: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('questionnaireProgress');
        }
        set({ progress: null, hasDraft: false });
    },
    
    // Explicit alias for deleting the draft from UI actions
    deleteDraft: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('questionnaireProgress');
        }
        set({ progress: null, hasDraft: false });
    },
    
    setQuestions: (questions: QuestionnaireQuestion[]) => {
        set({ questions });
    },
    
    getProgressPercentage: () => {
        const { progress, questions } = get();
        if (!progress || !questions) return 0;
        
        // Remove duplicates based on categoryQuestionID to match the actual questions being displayed
        const uniqueQuestions = questions.filter((question, index, self) => 
            index === self.findIndex(q => q.categoryQuestionID === question.categoryQuestionID)
        );
        const totalQuestions = uniqueQuestions.length;
        const answeredQuestions = Object.keys(progress.answers).length;
        return Math.round((answeredQuestions / totalQuestions) * 100);
    },
    
    getAnsweredQuestions: () => {
        const { progress, questions } = get();
        if (!progress || !questions) return [];
        
        return questions
            .filter(question => progress.answers[question.categoryQuestionID])
            .map(question => ({
                questionID: question.categoryQuestionID,
                answer: progress.answers[question.categoryQuestionID],
                questionCode: question.questionCode,
                questionText: question.questionText
            }));
    }
})); 
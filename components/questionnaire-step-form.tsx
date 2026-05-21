'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChangeEventArgs } from '@syncfusion/ej2-react-inputs';
import { RadioButtonComponent } from '@syncfusion/ej2-react-buttons';
import Button from '@/components/ui/button';
import { useGetAllQuestionnaires, useSaveQuestionnaireAndGetSummaryCosts } from '@/hooks/useQuestionnaire';
import { SaveQuestionnaireRequest, SaveQuestionnaireSummaryResponse, QuestionnaireQuestion } from '@/types/questionnaire';
import { useAuthStore } from '@/store/authStore';

import { useQuestionnaireProgressStore } from '@/store/questionnaireProgressStore';
import { Spinner } from '@/components/ui/spinner';

interface GroupedQuestions {
    [sectionName: string]: {
        [subsectionName: string]: QuestionnaireQuestion[];
    };
}

interface QuestionnaireStepFormProps {
    onSave?: (data: SaveQuestionnaireSummaryResponse) => void;
    onClose?: () => void;
    initialAnswers?: { [questionId: number]: string };
    initialSection?: string;
    initialSubsection?: string;
}



interface StepData {
    currentStep: number;
    currentSection: string;
    currentSubsection: string;
    answers: { [questionId: number]: string };
}

const QuestionnaireStepForm: React.FC<QuestionnaireStepFormProps> = ({
    onSave,
    onClose,
    initialAnswers = {},
    initialSection = '',
    initialSubsection = ''
}) => {
    const { user } = useAuthStore();

    const { saveProgress, clearProgress, setQuestions } = useQuestionnaireProgressStore();
    const companyId = user?.companyID;
    const userId = user?.userID;
    
    const {
        data: questions,
        isLoading,
        error
    } = useGetAllQuestionnaires();

    const {
        mutate: saveQuestionnaire,
        isPending: isSaving,
        error: saveError
    } = useSaveQuestionnaireAndGetSummaryCosts();

    const [stepData, setStepData] = useState<StepData>({
        currentStep: 1,
        currentSection: initialSection,
        currentSubsection: initialSubsection,
        answers: initialAnswers
    });

    const [groupedQuestions, setGroupedQuestions] = useState<GroupedQuestions>({});
    const [sectionNames, setSectionNames] = useState<string[]>([]);
    const [unansweredQuestionIdsInCurrentStep, setUnansweredQuestionIdsInCurrentStep] = useState<Set<number>>(new Set());
    const questionContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const initialAnswersAppliedRef = useRef(false);
    const questionsProcessedRef = useRef(false);


    // Group questions by section and subsection
    useEffect(() => {
        if (questions && !questionsProcessedRef.current) {
            questionsProcessedRef.current = true;
            
            // Set questions in the progress store (only once)
            setQuestions(questions);
            
            // Remove duplicates based on categoryQuestionID
            const uniqueQuestions = questions.filter((question, index, self) => 
                index === self.findIndex(q => q.categoryQuestionID === question.categoryQuestionID)
            );
            
            console.log('Original questions count:', questions.length);
            console.log('Unique questions count:', uniqueQuestions.length);
            
            const grouped: GroupedQuestions = {};
            const sections: string[] = [];
            const subsections: string[] = [];
            
            uniqueQuestions.forEach(question => {
                if (!grouped[question.sectionName]) {
                    grouped[question.sectionName] = {};
                    sections.push(question.sectionName);
                }
                if (!grouped[question.sectionName][question.subsectionName]) {
                    grouped[question.sectionName][question.subsectionName] = [];
                    subsections.push(question.subsectionName);
                }
                grouped[question.sectionName][question.subsectionName].push(question);
            });
            
            setGroupedQuestions(grouped);
            setSectionNames(sections);

            // Set initial section and subsection - respect initialSection and initialSubsection if valid
            if (sections.length > 0) {
                let targetSection = '';
                let targetSubsection = '';
                
                // Check if initialSection and initialSubsection are valid
                if (initialSection && initialSubsection && 
                    grouped[initialSection] && 
                    grouped[initialSection][initialSubsection]) {
                    // Use the provided initial section/subsection
                    targetSection = initialSection;
                    targetSubsection = initialSubsection;
                } else {
                    // Default to first section/subsection
                    targetSection = sections[0];
                    targetSubsection = Object.keys(grouped[targetSection])[0];
                }
                
                setStepData(prev => {
                    // Only merge initialAnswers once when questions first load
                    const mergedAnswers = initialAnswersAppliedRef.current 
                        ? prev.answers 
                        : { ...prev.answers, ...initialAnswers };
                    
                    if (!initialAnswersAppliedRef.current && initialAnswers && Object.keys(initialAnswers).length > 0) {
                        initialAnswersAppliedRef.current = true;
                    }
                    
                    return {
                        ...prev,
                        currentSection: targetSection,
                        currentSubsection: targetSubsection,
                        answers: mergedAnswers
                    };
                });
            }
        }
    }, [questions, setQuestions, initialSection, initialSubsection, initialAnswers]);


    // Save progress when step data changes
    useEffect(() => {
        if (stepData.currentSection && stepData.currentSubsection) {
            saveProgress(stepData.answers, stepData.currentSection, stepData.currentSubsection);
        }
    }, [stepData.currentSection, stepData.currentSubsection, stepData.answers, saveProgress]);

    const handleAnswerChange = (questionId: number, value: string) => {
        setStepData(prev => ({
            ...prev,
            answers: {
                ...prev.answers,
                [questionId]: value
            }
        }));

        // If this question was marked as unanswered for validation, remove highlight when answered
        if (unansweredQuestionIdsInCurrentStep.has(questionId) && value) {
            const updated = new Set(unansweredQuestionIdsInCurrentStep);
            updated.delete(questionId);
            setUnansweredQuestionIdsInCurrentStep(updated);
        }
    };

    const getCurrentQuestions = () => {
        if (!stepData.currentSection || !stepData.currentSubsection) return [];
        return groupedQuestions[stepData.currentSection]?.[stepData.currentSubsection] || [];
    };

    const getProgressPercentage = () => {
        if (!questions) return 0;
        // Remove duplicates based on categoryQuestionID to match the actual questions being displayed
        const uniqueQuestions = questions.filter((question, index, self) => 
            index === self.findIndex(q => q.categoryQuestionID === question.categoryQuestionID)
        );
        const totalQuestions = uniqueQuestions.length;
        const answeredQuestions = Object.keys(stepData.answers).length;
        const percentage = Math.round((answeredQuestions / totalQuestions) * 100);
        
        // Debug logging
        console.log('Progress Debug:', {
            originalQuestionsCount: questions.length,
            uniqueQuestionsCount: totalQuestions,
            answeredQuestionsCount: answeredQuestions,
            percentage: percentage
        });
        
        return percentage;
    };

    const getCurrentStepInfo = () => {
        const currentQuestions = getCurrentQuestions();
        const answeredInCurrentStep = currentQuestions.filter(q => 
            stepData.answers[q.categoryQuestionID]
        ).length;
        
        return {
            total: currentQuestions.length,
            answered: answeredInCurrentStep,
            percentage: currentQuestions.length > 0 ? Math.round((answeredInCurrentStep / currentQuestions.length) * 100) : 0
        };
    };

    const handleNext = () => {
        const currentStepQuestions = getCurrentQuestions();
        const unansweredIds = currentStepQuestions
            .filter(q => !stepData.answers[q.categoryQuestionID])
            .map(q => q.categoryQuestionID);

        if (unansweredIds.length > 0) {
            // Highlight all unanswered questions in this step and scroll to the first
            setUnansweredQuestionIdsInCurrentStep(new Set(unansweredIds));
            const firstUnansweredId = unansweredIds[0];
            const container = questionContainerRefs.current[firstUnansweredId];
            if (container) {
                container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Try to focus first input for accessibility
                const firstInput = container.querySelector('input') as HTMLInputElement | null;
                firstInput?.focus();
            }
            return;
        }

        // Clear any previous validation highlights before moving on
        if (unansweredQuestionIdsInCurrentStep.size > 0) {
            setUnansweredQuestionIdsInCurrentStep(new Set());
        }

        // Find next subsection
        const currentSectionSubsections = Object.keys(groupedQuestions[stepData.currentSection] || {});
        const currentSubsectionIndex = currentSectionSubsections.indexOf(stepData.currentSubsection);
        
        if (currentSubsectionIndex < currentSectionSubsections.length - 1) {
            // Move to next subsection in same section
            const nextSubsection = currentSectionSubsections[currentSubsectionIndex + 1];
            setStepData(prev => ({
                ...prev,
                currentSubsection: nextSubsection
            }));
            setUnansweredQuestionIdsInCurrentStep(new Set());
        } else {
            // Move to next section
            const currentSectionIndex = sectionNames.indexOf(stepData.currentSection);
            if (currentSectionIndex < sectionNames.length - 1) {
                const nextSection = sectionNames[currentSectionIndex + 1];
                const nextSectionSubsections = Object.keys(groupedQuestions[nextSection] || {});
                const nextSubsection = nextSectionSubsections[0];
                
                setStepData(prev => ({
                    ...prev,
                    currentSection: nextSection,
                    currentSubsection: nextSubsection
                }));
                setUnansweredQuestionIdsInCurrentStep(new Set());
            }
        }
    };

    const handlePrevious = () => {
        const currentSectionSubsections = Object.keys(groupedQuestions[stepData.currentSection] || {});
        const currentSubsectionIndex = currentSectionSubsections.indexOf(stepData.currentSubsection);
        
        if (currentSubsectionIndex > 0) {
            // Move to previous subsection in same section
            const prevSubsection = currentSectionSubsections[currentSubsectionIndex - 1];
            setStepData(prev => ({
                ...prev,
                currentSubsection: prevSubsection
            }));
        } else {
            // Move to previous section
            const currentSectionIndex = sectionNames.indexOf(stepData.currentSection);
            if (currentSectionIndex > 0) {
                const prevSection = sectionNames[currentSectionIndex - 1];
                const prevSectionSubsections = Object.keys(groupedQuestions[prevSection] || {});
                const prevSubsection = prevSectionSubsections[prevSectionSubsections.length - 1];
                
                setStepData(prev => ({
                    ...prev,
                    currentSection: prevSection,
                    currentSubsection: prevSubsection
                }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!companyId || !userId) {
            console.error('Company ID or User ID not found');
            return;
        }

        // Convert answers to the API format
        const apiAnswers = Object.entries(stepData.answers)
            .filter(([, answer]) => answer === 'Yes' || answer === 'No')
            .map(([questionId, answer]) => {
                return {
                    categoryQuestionID: parseInt(questionId),
                    answer: answer === 'Yes'
                };
            });



        // Prepare the API request
        const requestData: SaveQuestionnaireRequest = {
            companyID: companyId,
            userID: userId,
            surveyHeaderID: 0, // New questionnaire submission
            answers: apiAnswers
        };

        console.log('Sending questionnaire data:', requestData);
        
        // Call the API
        saveQuestionnaire(requestData, {
            onSuccess: (data) => {
                console.log('Questionnaire saved successfully:', data);
                
                // Clear progress from store after successful submission
                clearProgress();
                
                if (onSave) {
                    onSave(data);
                }
            },
            onError: (error) => {
                console.error('Error saving questionnaire:', error);
            }
        });
    };

    const isLastStep = () => {
        const currentSectionIndex = sectionNames.indexOf(stepData.currentSection);
        const currentSectionSubsections = Object.keys(groupedQuestions[stepData.currentSection] || {});
        const currentSubsectionIndex = currentSectionSubsections.indexOf(stepData.currentSubsection);
        
        const isLast = currentSectionIndex === sectionNames.length - 1 && 
               currentSubsectionIndex === currentSectionSubsections.length - 1;
        
        // Debug logging
        console.log('isLastStep Debug:', {
            currentSection: stepData.currentSection,
            currentSubsection: stepData.currentSubsection,
            currentSectionIndex,
            totalSections: sectionNames.length,
            currentSubsectionIndex,
            totalSubsections: currentSectionSubsections.length,
            isLast
        });
        
        return isLast;
    };

    const isFirstStep = () => {
        const currentSectionIndex = sectionNames.indexOf(stepData.currentSection);
        const currentSectionSubsections = Object.keys(groupedQuestions[stepData.currentSection] || {});
        const currentSubsectionIndex = currentSectionSubsections.indexOf(stepData.currentSubsection);
        
        return currentSectionIndex === 0 && currentSubsectionIndex === 0;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Questionnaire</h2>
                    <p className="text-gray-600">Unable to load questionnaire data. Please try again later.</p>
                </div>
            </div>
        );
    }


    const currentStepInfo = getCurrentStepInfo();
    const progressPercentage = getProgressPercentage();

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center lg:justify-start lg:pl-72 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full lg:ml-6 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-teal-400 mb-4">Gap Analysis Questionnaire</h3>
                        <button
                            onClick={() => {
                                if (onClose) onClose();
                            }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Overall Progress: {progressPercentage}%</span>
                            <span>Step Progress: {currentStepInfo.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* Section and Subsection Header */}
                    <div className="mb-6">
                        <h4 className="text-lg font-medium text-gray-800 mb-2 text-center">
                            {stepData.currentSection}
                        </h4>
                        <h5 className="text-md font-medium text-gray-600 mb-4">
                            {stepData.currentSubsection}
                        </h5>
                        <div className="text-sm text-gray-500">
                            {currentStepInfo.answered} of {currentStepInfo.total} questions answered
                        </div>
                    </div>

                    {/* Questions */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {getCurrentQuestions().map((question) => (
                            <div
                                key={question.categoryQuestionID}
                                ref={(el) => {
                                    questionContainerRefs.current[question.categoryQuestionID] = el;
                                }}
                                className={`rounded-lg p-4 ${
                                    unansweredQuestionIdsInCurrentStep.has(question.categoryQuestionID)
                                        ? 'border-2 border-red-300 bg-red-50'
                                        : 'border border-gray-100 bg-gray-50'
                                }`}
                                tabIndex={-1}
                                aria-invalid={unansweredQuestionIdsInCurrentStep.has(question.categoryQuestionID)}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                        {question.questionCode}
                                    </span>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {question.questionText}
                                        </label>
                                        
                                        {question.costItem && question.costPrice > 0 && (
                                            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-yellow-800">
                                                        {question.costItem}
                                                    </span>
                                                    <span className="text-sm font-semibold text-yellow-800">
                                                        R{question.costPrice.toLocaleString()}
                                                    </span>
                                                </div>
                                                {question.importance && (
                                                    <p className="text-xs text-yellow-700 mt-1">
                                                        Importance: {question.importance}
                                                    </p>
                                                )}
                                                {question.resources && (
                                                    <p className="text-xs text-yellow-700 mt-1">
                                                        Resources: {question.resources}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="flex gap-4">
                                            <RadioButtonComponent
                                                label="Yes"
                                                value="Yes"
                                                checked={stepData.answers[question.categoryQuestionID] === 'Yes'}
                                                change={(e: ChangeEventArgs) => 
                                                    handleAnswerChange(question.categoryQuestionID, String(e.value || ''))
                                                }
                                                cssClass="e-outline"
                                            />
                                            <RadioButtonComponent
                                                label="No"
                                                value="No"
                                                checked={stepData.answers[question.categoryQuestionID] === 'No'}
                                                change={(e: ChangeEventArgs) => 
                                                    handleAnswerChange(question.categoryQuestionID, String(e.value || ''))
                                                }
                                                cssClass="e-outline"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </form>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <Button
                            onClick={handlePrevious}
                            disabled={isFirstStep()}
                            variant="secondary"
                        >
                            Previous
                        </Button>
                        
                        <div className="flex gap-2">
                            {!isLastStep() ? (
                                <Button onClick={handleNext} variant="primary">
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSaving || currentStepInfo.answered < currentStepInfo.total}
                                    variant="primary"
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Messages */}
                {saveError && (
                    <div className="px-6 pb-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">
                                {saveError.message || 'An error occurred while saving the questionnaire.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionnaireStepForm; 
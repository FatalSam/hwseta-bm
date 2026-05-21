'use client';

import React, { useState, useMemo } from 'react';
import Button from '@/components/ui/button';
import { RadioButtonComponent } from '@syncfusion/ej2-react-buttons';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { useGetSurveyById, useSubmitSurveyFeedback } from '@/hooks/useQuestionnaire';
import { SurveyQuestion, QuestionnaireResponse, CostItem } from '@/types/questionnaire';
import { useAuthStore } from '@/store/authStore';

import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'next/navigation';

interface QuestionnaireProps {
    onSave?: (data: { 
        questions: SurveyQuestion[]; 
        responses: QuestionnaireResponse[];
        costItems: CostItem[] 
    }) => void;
    isEditMode?: boolean;
    surveyHeaderId: number;
}



const QuestionnaireComponent: React.FC<QuestionnaireProps> = ({
    onSave,
    isEditMode = false,
    surveyHeaderId
}) => {
    const { user } = useAuthStore();

    const companyId = user?.companyID;
    const userId = user?.userID;
    
    const {
        data: surveyData,
        isLoading,
        error
    } = useGetSurveyById(String(surveyHeaderId));
    const questions = useMemo(() => surveyData?.questions || [], [surveyData?.questions]);

    const {
        mutate: submitSurveyFeedback,
        isPending: isSubmitting,
        error: submitError
    } = useSubmitSurveyFeedback(surveyHeaderId);

    const router = useRouter();
    const toastRef = React.useRef<ToastComponent>(null);

    interface Answers {
        [key: string]: {
            answer?: string;  // "Yes" or "No"
            selectedCostItem?: string;  // categoryQuestionID of the selected cost item
        };
    }
    
    const [answers, setAnswers] = useState<Answers>({});

    // Group questions by section and subsection using useMemo
    const groupedQuestions = useMemo(() => {
        if (!questions || questions.length === 0) {
            return {};
        }

        const grouped: { [sectionName: string]: { [subsectionName: string]: SurveyQuestion[] } } = {};
        
        // Group questions by questionCode first
        const questionsByCode: { [code: string]: SurveyQuestion[] } = {};
        questions.forEach(question => {
            if (!questionsByCode[question.questionCode]) {
                questionsByCode[question.questionCode] = [];
            }
            questionsByCode[question.questionCode].push(question);
        });
        
        // For each unique questionCode, take the first question as the base
        // and attach all cost items to it
        Object.values(questionsByCode).forEach(codeQuestions => {
            const baseQuestion = { ...codeQuestions[0] };
            baseQuestion.costOptions = codeQuestions.map(q => ({
                costItem: q.costItem,
                costPrice: q.costPrice,
                categoryQuestionID: q.categoryQuestionID,
                costItemID: q.costItemID
            }));
            
            if (!grouped[baseQuestion.sectionName]) {
                grouped[baseQuestion.sectionName] = {};
            }
            if (!grouped[baseQuestion.sectionName][baseQuestion.subsectionName]) {
                grouped[baseQuestion.sectionName][baseQuestion.subsectionName] = [];
            }
            grouped[baseQuestion.sectionName][baseQuestion.subsectionName].push(baseQuestion);
        });
        
        return grouped;
    }, [questions]);

    const handleAnswerChange = (questionId: string | number, value: string, type: 'answer' | 'costItem' = 'answer') => {
        setAnswers(prev => {
            const key = String(questionId);
            const currentAnswer = prev[key] || {};
            
            if (type === 'answer') {
                return {
                    ...prev,
                    [key]: {
                        ...currentAnswer,
                        answer: value
                    }
                };
            } else {
                return {
                    ...prev,
                    [key]: {
                        ...currentAnswer,
                        selectedCostItem: value
                    }
                };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!companyId || !userId) {
            console.error('Company ID or User ID not found');
            return;
        }

        // Convert answers to the API format
        const apiAnswers = Object.entries(answers)
            .filter(([, answerData]) => {
                // Include questions with Yes/No answers
                if (answerData.answer === 'Yes' || answerData.answer === 'No') {
                    return true;
                }
                // Include questions with cost item selections
                if (answerData.selectedCostItem) {
                    return true;
                }
                return false;
            })
            .map(([questionCode, answerData]) => {
                const question = questions?.find(q => q.questionCode === questionCode);
                
                // Handle Yes/No answers
                if (answerData.answer === 'Yes' || answerData.answer === 'No') {
                    return {
                        categoryQuestionID: question?.categoryQuestionID || 0,
                        answer: answerData.answer === 'Yes'
                    };
                }
                
                // Handle cost item selections
                if (answerData.selectedCostItem) {
                    const selectedCostItem = question?.costOptions?.find(opt => 
                        String(opt.costItemID) === answerData.selectedCostItem
                    );
                    
                    if (answerData.selectedCostItem === 'none') {
                        return {
                            categoryQuestionID: question?.categoryQuestionID || 0,
                            answer: false
                        };
                    }
                    
                    return {
                        categoryQuestionID: question?.categoryQuestionID || 0,
                        selectedCostItemID: selectedCostItem?.costItemID || 0,
                        answer: true
                    };
                }
                
                return {
                    categoryQuestionID: question?.categoryQuestionID || 0,
                    answer: false
                };
            });



        // Prepare the API request
        const requestData = {
            companyID: companyId,
            userID: userId,
            surveyHeaderID: surveyHeaderId,
            answers: apiAnswers
        };

        console.log('Submitting survey feedback:', requestData);
        
        // Call the API
        submitSurveyFeedback(requestData, {
            onSuccess: (data) => {
                if (toastRef.current) {
                    toastRef.current.show({
                        title: 'Success',
                        content: data.message || 'Survey feedback submitted successfully!',
                        cssClass: 'e-success',
                        timeOut: 2000
                    });
                }
                setTimeout(() => {
                    router.push('/dashboard/gap-analysis/');
                }, 2000);
                if (onSave) {
                    // Convert answers to responses format
                    const responses: QuestionnaireResponse[] = Object.entries(answers).map(([questionCode, answerData]) => {
                        const question = questions.find(q => q.questionCode === questionCode);
                        return {
                            questionID: question?.categoryQuestionID || 0,
                            answer: answerData.answer || '',
                            questionCode: questionCode,
                            questionText: question?.questionText || ''
                        };
                    });
                    
                    onSave({ 
                        questions: questions || [], 
                        responses,
                        costItems: [] // No costItems in feedback response
                    });
                }
            },
            onError: (error) => {
                console.error('Error submitting survey feedback:', error);
            }
        });
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
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

    if (!questions || questions.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-500 mb-2">No Gap Analysis Feedback Available</h2>
                    <p className="text-gray-600">There are no feedback to display for this Gap Analysis, please try again later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h3 className="text-lg font-medium text-teal-400 mb-4">Gap Analysis Feedback</h3>

            <form onSubmit={handleSubmit} className="space-y-8">
                {Object.entries(groupedQuestions).map(([sectionName, subsections]) => (
                    <div key={sectionName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h4 className="text-xl font-semibold text-gray-800">{sectionName}</h4>
                            <p className="text-gray-600 text-sm mt-1">
                                {questions?.find(q => q.sectionName === sectionName)?.sectionDescription}
                            </p>
                        </div>
                        
                        <div className="p-6">
                            {Object.entries(subsections).map(([subsectionName, sectionQuestions]) => (
                                <div key={subsectionName} className="mb-8 last:mb-0">
                                    <h5 className="text-lg font-medium text-gray-700 mb-4 border-b border-gray-200 pb-2">
                                        {subsectionName}
                                    </h5>
                                    
                                    <div className="space-y-6">
                                        {sectionQuestions.map((question) => (
                                            <div key={question.categoryQuestionID} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                                        {question.questionCode}
                                                    </span>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            {question.questionText}
                                                        </label>
                                                        
                                                        {question.costOptions && question.costOptions.length > 0 && (
                                                            <div className="mb-3 space-y-2">
                                                                {question.costOptions.map((option, index) => (
                                                                    <div key={`${option.categoryQuestionID}-${option.costItemID || index}`} className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                                                                                                                                                <div className="flex items-start px-3">
                                                                            {question.costOptions && question.costOptions.length > 1 && (
                                                                                <div className="flex-shrink-0 pr-6 pt-3">
                                                                                    <RadioButtonComponent
                                                                                        name={`costItem_${question.questionCode}`}
                                                                                        label=""
                                                                                        value={String(option.costItemID)}
                                                                                        checked={answers[question.questionCode]?.selectedCostItem === String(option.costItemID)}
                                                                                        change={(e: Record<string, unknown>) => {
                                                                                            if (e.value) {
                                                                                                handleAnswerChange(question.questionCode, String(option.costItemID), 'costItem');
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                            <div className="flex-1 pl-1">
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-sm font-medium text-gray-700">
                                                                                        {option.costItem}
                                                                                    </span>
                                                                                    <span className="text-sm font-semibold text-gray-700">
                                                                                        R{option.costPrice.toLocaleString()}
                                                                                    </span>
                                                                                </div>
                                                                                {question.importance && (
                                                                                    <p className="text-xs text-gray-700 mt-1">
                                                                                        Importance: {question.importance}
                                                                                    </p>
                                                                                )}
                                                                                {question.resources && (
                                                                                    <p className="text-xs text-gray-700 mt-1">
                                                                                        Resources: {question.resources}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                
                                                                {/* None option for multiple cost items */}
                                                                {question.costOptions && question.costOptions.length > 1 && (
                                                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                                        <div className="flex items-center px-3">
                                                                            <div className="flex-shrink-0 pr-6">
                                                                                <RadioButtonComponent
                                                                                    name={`costItem_${question.questionCode}`}
                                                                                    label=""
                                                                                    value="none"
                                                                                    checked={answers[question.questionCode]?.selectedCostItem === 'none'}
                                                                                    change={(e: Record<string, unknown>) => {
                                                                                        if (e.value) {
                                                                                            handleAnswerChange(question.questionCode, 'none', 'costItem');
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div className="flex-1 pl-1">
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-sm font-medium text-gray-800">
                                                                                        None
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {/* Only show Yes/No radio buttons if there are no cost options or only one cost option */}
                                                        {(!question.costOptions || question.costOptions.length <= 1) && (
                                                            <div className="flex gap-4">
                                                                <RadioButtonComponent
                                                                    label="Yes"
                                                                    value="Yes"
                                                                    checked={answers[question.questionCode]?.answer === 'Yes'}
                                                                    change={(e: Record<string, unknown>) => handleAnswerChange(question.questionCode, String(e.value || ''))}
                                                                />
                                                                <RadioButtonComponent
                                                                    label="No"
                                                                    value="No"
                                                                    checked={answers[question.questionCode]?.answer === 'No'}
                                                                    change={(e: Record<string, unknown>) => handleAnswerChange(question.questionCode, String(e.value || ''))}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {isEditMode && (
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                    </div>
                )}
            </form>

            {/* Error Messages */}
            {submitError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">
                        {submitError.message || 'An error occurred while submitting the feedback.'}
                    </p>
                </div>
            )}
            <ToastComponent
                ref={toastRef}
                position={{ X: 'Right', Y: 'Top' }}
                width={300}
            />
        </div>
    );
};

export default QuestionnaireComponent; 
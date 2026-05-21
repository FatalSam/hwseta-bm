'use client';

import React, { useRef, useEffect } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, PageSettingsModel, Inject, Page } from '@syncfusion/ej2-react-grids';
import Button from '@/components/ui/button';
import { useQuestionnaireProgressStore } from '@/store/questionnaireProgressStore';
import { useGetSubmittedQuestionnaireSummariesByCompanyId } from '@/hooks/useQuestionnaire';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface QuestionnaireGridProps {
    onCreateNew?: () => void;
    onContinueDraft?: () => void;
    companyId?: string; // Optional companyId prop for admin view
}

const QuestionnaireGrid: React.FC<QuestionnaireGridProps> = ({
    onCreateNew,
    onContinueDraft,
    companyId
}) => {
    const { hasDraft, progress, getProgressPercentage, deleteDraft } = useQuestionnaireProgressStore();
    const { user } = useAuthStore();
    // Use provided companyId (for admin view) or fall back to user's companyID
    const companyID = companyId || user?.companyID;
    const { data: questionnaireList, isLoading, error } = useGetSubmittedQuestionnaireSummariesByCompanyId(companyID || '');
    const gridRef = useRef<GridComponent>(null);
    const router = useRouter();

    // Note: Avoid manually destroying the grid instance here.
    // React unmount will clean up the Syncfusion instance. Calling destroy()
    // explicitly during StrictMode's effect re-run can cause internal null refs.
    useEffect(() => {
        return () => {
            // No-op cleanup to avoid double-destroy issues in StrictMode
        };
    }, []);

    // Hide draft functionality when viewing as admin (companyId prop provided)
    const isAdminView = !!companyId;
    
    // Create draft item if available (only for non-admin views)
    const draftCreatedBy = user && user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : 'Current User';
    const draftItem = !isAdminView && hasDraft && progress ? {
        id: 'DRAFT',
        referenceNumber: 'DRAFT',
        status: 'Draft',
        createdBy: draftCreatedBy,
        totalQuestions: 45,
        answeredQuestions: Object.keys(progress.answers).length,
        completionPercentage: getProgressPercentage(),
        costItems: 0,
        totalCost: 0
    } : null;

    // Map API data to grid format
    const mappedQuestionnaireList = (questionnaireList || []).map((item) => ({
        id: item.surveyHeaderId.toString(),
        referenceNumber: item.referenceNumber,
        status: item.status && item.status.trim() !== '' ? item.status : 'Submitted',
        dateSubmitted: item.dateSubmitted,
        createdBy: item.createdBy,
        totalQuestions: item.totalQuestions,
        answeredQuestions: item.answeredQuestions,
        completionPercentage: item.completionPercentage,
        costItems: item.costItems,
        totalCost: item.totalCost
    }));

    // Sort by dateSubmitted descending (latest first)
    const sortedQuestionnaireList = mappedQuestionnaireList.sort((a, b) => {
        if (!a.dateSubmitted) return 1;
        if (!b.dateSubmitted) return -1;
        return new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime();
    });

    // Combine draft with other questionnaires, putting draft first (only if not admin view)
    const combinedQuestionnaireList = draftItem
        ? [draftItem, ...sortedQuestionnaireList]
        : sortedQuestionnaireList;

    const pageSettings: PageSettingsModel = { pageSize: 10, pageSizes: true };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed':
                return 'text-green-600 bg-green-100';
            case 'Under Review':
                return 'text-blue-600 bg-blue-100';
            case 'Submitted':
                return 'text-purple-600 bg-purple-100';
            case 'Draft':
                return 'text-gray-600 bg-gray-100';
            case 'Rejected':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const formatDateTime = (value?: string | Date | null) => {
        if (!value) return '-';
        const date = value instanceof Date ? value : new Date(value);
        if (isNaN(date.getTime())) return '-';
        const pad = (num: number) => num.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const handleViewDetails = (questionnaireId: string) => {
        if (questionnaireId === 'DRAFT' && onContinueDraft) {
            onContinueDraft();
        } else {
            // Navigate to roadmap page with id as slug
            router.push(`/dashboard/gap-analysis/roadmap/${questionnaireId}`);
        }
    };

    const handleDeleteDraft = () => {
        deleteDraft();
    };

    const gridMinHeight = 560;

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header with Create New Button */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-teal-600">Gap Analysis</h1>
                    <p className="text-gray-600 mt-2">
                        Complete gap analysis questionnaires and view feedback on your business development needs.
                    </p>
                </div>
                {!isAdminView && onCreateNew && (
                    <Button
                        onClick={onCreateNew}
                        variant="primary"
                    >
                        Start Gap Analysis
                    </Button>
                )}
            </div>

            {/* Loading and Error States */}
            {isLoading && (
                <div className="text-center py-8 flex items-center justify-center bg-white p-6 rounded-lg shadow-sm border border-gray-200" style={{ minHeight: gridMinHeight }}>
                    Loading questionnaires...
                </div>
            )}
            {error && (
                <div className="text-center text-red-500 py-8 flex items-center justify-center bg-white p-6 rounded-lg shadow-sm border border-gray-200" style={{ minHeight: gridMinHeight }}>
                    Failed to load questionnaires.
                </div>
            )}

            {/* Grid */}
            {!isLoading && !error && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" style={{ minHeight: gridMinHeight }}>
                <GridComponent
                    ref={gridRef}
                    dataSource={combinedQuestionnaireList}
                    allowPaging={true}
                    pageSettings={pageSettings}
                    id="questionnaireGrid"
                    height={500}
                    cssClass="e-grid-custom"
                    enableHover={true}
                    allowSorting={true}
                    allowFiltering={true}
                >
                    <ColumnsDirective>
                        <ColumnDirective 
                            field="referenceNumber" 
                            headerText="Reference Number" 
                            width="200" 
                            headerTextAlign="Left" 
                            textAlign="Left"
                        />
                        <ColumnDirective 
                            field="status" 
                            headerText="Status" 
                            width="120" 
                            headerTextAlign="Left" 
                            textAlign="Left"
                            template={(props: Record<string, unknown>) => (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(props.status as string)}`}>
                                    {props.status as string}
                                </span>
                            )}
                        />
                        <ColumnDirective 
                            field="completionPercentage" 
                            headerText="Gap Analysis Score" 
                            width="150" 
                            headerTextAlign="Center" 
                            textAlign="Center"
                            template={(props: Record<string, unknown>) => {
                                const isDraft = props.status === 'Draft';
                                return (
                                    <div style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
                                        {isDraft ? '-' : `${props.completionPercentage}%`}
                                    </div>
                                );
                            }}
                        />
                        <ColumnDirective 
                            field="dateSubmitted" 
                            headerText="Date Completed" 
                            width="180" 
                            headerTextAlign="Left" 
                            textAlign="Left"
                            template={(props: Record<string, unknown>) => formatDateTime(props.dateSubmitted as string | undefined)}
                        />
                        <ColumnDirective 
                            field="createdBy" 
                            headerText="Completed by" 
                            width="120" 
                            headerTextAlign="Left" 
                            textAlign="Left"
                        />
                        <ColumnDirective 
                            field="id" 
                            headerText="Actions" 
                            width="180" 
                            headerTextAlign="Left" 
                            textAlign="Left"
                            template={(props: Record<string, unknown>) => {
                                const isUnderReview = props.status === 'Under Review and Assessment';
                                const isDraft = props.id === 'DRAFT';
                                
                                return (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => handleViewDetails(props.id as string)}
                                            variant={isDraft || isUnderReview ? "secondary" : "primary"}
                                            size="sm"
                                            disabled={isUnderReview}
                                            title={isDraft ? 'Continue Draft' : (isUnderReview ? 'Submitted' : 'View Feedback')}
                                            className="cursor-pointer"
                                        >
                                            {isDraft ? (
                                                <span className="e-icons e-edit"></span>
                                            ) : isUnderReview ? (
                                                <span className="e-icons e-check"></span>
                                            ) : (
                                                <span className="e-icons e-eye"></span>
                                            )}
                                        </Button>
                                        {isDraft && (
                                            <Button
                                                onClick={handleDeleteDraft}
                                                variant="secondary"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                                title="Delete Draft"
                                            >
                                                <span className="e-icons e-trash"></span>
                                            </Button>
                                        )}
                                    </div>
                                );
                            }}
                        />
                    </ColumnsDirective>
                    <Inject services={[Page]} />
                </GridComponent>
            </div>
            )}
        </div>
    );
};

export default QuestionnaireGrid;

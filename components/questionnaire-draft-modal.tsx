'use client';

import React from 'react';
import Button from '@/components/ui/button';

interface QuestionnaireDraftModalProps {
    isOpen: boolean;
    onContinue: () => void;
    onStartNew: () => void;
    onDelete: () => void;
    onClose: () => void;
    progressPercentage: number;
    lastModified: Date;
}

const QuestionnaireDraftModal: React.FC<QuestionnaireDraftModalProps> = ({
    isOpen,
    onContinue,
    onStartNew,
    onDelete,
    onClose,
    progressPercentage,
    lastModified
}) => {
    if (!isOpen) return null;

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center lg:justify-start lg:pl-72 z-50" onClick={handleBackdropClick}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 lg:ml-6">
                {/* Header */}
                <div className="bg-teal-50 px-6 py-4 border-b border-teal-200 rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-teal-800">Continue Draft Questionnaire?</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            aria-label="Close modal"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-700 mb-4">
                        We found an incomplete questionnaire draft from your previous session. Would you like to continue where you left off?
                    </p>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <span className="text-sm font-semibold text-teal-600">{progressPercentage}% Complete</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Last modified: {formatDate(lastModified)}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={onContinue}
                            variant="primary"
                            className="w-full"
                        >
                            Continue Draft
                        </Button>
                        
                        <Button
                            onClick={onStartNew}
                            variant="secondary"
                            className="w-full"
                        >
                            Start New Gap Analysis
                        </Button>

                        <Button
                            onClick={onDelete}
                            variant="secondary"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            Delete Draft
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionnaireDraftModal; 
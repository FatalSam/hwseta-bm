'use client';

import React from 'react';
import Button from '@/components/ui/button';

interface QuestionnaireSubmittedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewFeedback: () => void;
  referenceNumber: string;
  message?: string;
}

const QuestionnaireSubmittedModal: React.FC<QuestionnaireSubmittedModalProps> = ({
  isOpen,
  onClose,
  onViewFeedback,
  referenceNumber,
  message,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Submission Successful</h3>
              <p className="text-xs text-gray-500">Your gap analysis has been submitted</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            {message || 'Thank you for completing the Gap Analysis. You can review the feedback summary now.'}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Reference Number</span>
              <span className="text-sm font-semibold text-teal-600">{referenceNumber}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onViewFeedback}
              variant="primary"
              className="w-full"
            >
              View Feedback
            </Button>

            <Button onClick={onClose} variant="secondary" className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireSubmittedModal;


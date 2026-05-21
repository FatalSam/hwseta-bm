'use client';

import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from './button';

export interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void | Promise<void>;
    title?: string;
    message: string;
    type?: 'confirm' | 'alert';
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: 'primary' | 'secondary';
    cancelVariant?: 'primary' | 'secondary';
    allowBackdropClose?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'confirm',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmVariant = 'primary',
    cancelVariant = 'secondary',
    allowBackdropClose = true
}) => {
    // Handle escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && allowBackdropClose) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, allowBackdropClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && allowBackdropClose) {
            onClose();
        }
    };

    const handleConfirm = async () => {
        if (onConfirm) {
            await onConfirm();
        }
        onClose();
    };

    const isAlert = type === 'alert';

    return (
        <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
        >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3
                        id="modal-title"
                        className="text-lg font-semibold text-gray-900"
                    >
                        {title || (isAlert ? 'Alert' : 'Confirm Action')}
                    </h3>
                    {allowBackdropClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close modal"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    <p
                        id="modal-description"
                        className="text-gray-700 whitespace-pre-wrap"
                    >
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                    {!isAlert && (
                        <Button
                            variant={cancelVariant}
                            onClick={onClose}
                        >
                            {cancelLabel}
                        </Button>
                    )}
                    <Button
                        variant={confirmVariant}
                        onClick={handleConfirm}
                    >
                        {isAlert ? 'OK' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;


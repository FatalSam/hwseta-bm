'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';

interface Document {
    documentID: string;
    companyID: string;
    name_File: string;
    displayName: string;
    extension: string;
    contentType: string;
    fileData: string;
    fileSize: number;
    documentCategory: string;
    documentScore: number;
    uploadDate?: string;
    createdDate?: string;
    createdBy?: string;
    TaxClearanceExpiry?: string;
    BeeCertificateExpiry?: string;
    expiryDate?: string;
    ExpiryDate?: string;
    expiry_date?: string;
    // Handle case variations from API
    taxClearanceExpiry?: string;
    beeCertificateExpiry?: string;
    [key: string]: unknown; // Allow additional properties
}

interface CompanyDocumentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: Document | null;
    onSave: (documentId: string, updatedData: {
        displayName: string;
        TaxClearanceExpiry?: string | null;
        BeeCertificateExpiry?: string | null;
        expiryDate?: string | null;
    }) => Promise<void>;
}

const CompanyDocumentEditModal: React.FC<CompanyDocumentEditModalProps> = ({
    isOpen,
    onClose,
    document,
    onSave
}) => {
    const [formData, setFormData] = useState<{
        displayName: string;
        TaxClearanceExpiry: Date | null;
        BeeCertificateExpiry: Date | null;
        expiryDate: Date | null;
    }>({
        displayName: '',
        TaxClearanceExpiry: null,
        BeeCertificateExpiry: null,
        expiryDate: null
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && document) {
            // Debug: Log the document to see what fields are available
            console.log('Edit Modal - Full document object:', JSON.stringify(document, null, 2));
            console.log('Edit Modal - Document keys:', Object.keys(document));
            
            // Determine which expiry date field to use based on document category
            const documentCategory = (document.documentCategory || (document as Record<string, unknown>).DocumentCategory) as string;
            console.log('Edit Modal - Document category:', documentCategory);
            
            // Helper function to safely parse date strings
            const parseDate = (dateValue: string | Date | null | undefined): Date | null => {
                if (!dateValue) return null;
                
                // If it's already a Date object, return it
                if (dateValue instanceof Date) {
                    return isNaN(dateValue.getTime()) ? null : dateValue;
                }
                
                // If it's a string, parse it
                if (typeof dateValue === 'string') {
                    try {
                        // Try parsing the date string
                        const date = new Date(dateValue);
                        // Check if the date is valid
                        if (isNaN(date.getTime())) {
                            console.warn('Invalid date string:', dateValue);
                            return null;
                        }
                        console.log('Successfully parsed date:', dateValue, '->', date);
                        return date;
                    } catch (error) {
                        console.warn('Error parsing date:', dateValue, error);
                        return null;
                    }
                }
                
                return null;
            };

            // Get expiry dates directly from database fields (no fallback for specific fields)
            // Handle both camelCase and PascalCase variations from API - match the grid's approach
            const doc = document as Record<string, unknown>;
            const taxClearanceExpiry = (doc.TaxClearanceExpiry || doc.taxClearanceExpiry) as string | Date | null | undefined;
            const beeCertificateExpiry = (doc.BeeCertificateExpiry || doc.beeCertificateExpiry) as string | Date | null | undefined;
            
            console.log('Edit Modal - Raw expiry values:', {
                TaxClearanceExpiry: doc.TaxClearanceExpiry,
                taxClearanceExpiry: doc.taxClearanceExpiry,
                BeeCertificateExpiry: doc.BeeCertificateExpiry,
                beeCertificateExpiry: doc.beeCertificateExpiry,
                resolvedTaxClearance: taxClearanceExpiry,
                resolvedBeeCertificate: beeCertificateExpiry
            });
            
            const taxClearanceDate = parseDate(taxClearanceExpiry);
            const beeCertificateDate = parseDate(beeCertificateExpiry);
            
            // For generic expiry (other document types), try all possible fields
            const genericExpiry = (doc.expiryDate || doc.ExpiryDate || doc.expiry_date || null) as string | Date | null | undefined;
            const genericExpiryDate = parseDate(genericExpiry);

            console.log('Edit Modal - Final parsed dates:', {
                taxClearanceDate,
                beeCertificateDate,
                genericExpiryDate
            });

            setFormData({
                displayName: document.displayName || '',
                TaxClearanceExpiry: taxClearanceDate,
                BeeCertificateExpiry: beeCertificateDate,
                expiryDate: genericExpiryDate
            });
            setErrors({});
        }
    }, [isOpen, document]);

    const handleInputChange = (field: string, value: string | Date | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validate() || !document) {
            return;
        }

        setIsSaving(true);
        try {
            const updatedData = {
                displayName: formData.displayName.trim(),
                TaxClearanceExpiry: formData.TaxClearanceExpiry ? formData.TaxClearanceExpiry.toISOString() : null,
                BeeCertificateExpiry: formData.BeeCertificateExpiry ? formData.BeeCertificateExpiry.toISOString() : null,
                expiryDate: formData.expiryDate ? formData.expiryDate.toISOString() : null
            };
            
            await onSave(document.documentID, updatedData);
            onClose();
        } catch (error) {
            console.error('Error updating document:', error);
            setErrors({ submit: 'Failed to update document. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const documentCategory = document?.documentCategory || '';

    return (
        <div 
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" 
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 sticky top-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                            Edit Document
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close modal"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Display Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Name <span className="text-red-500">*</span>
                        </label>
                        <TextBoxComponent
                            value={formData.displayName}
                            placeholder="Enter display name"
                            floatLabelType="Never"
                            onChange={(e: { value?: string }) => handleInputChange('displayName', e.value || '')}
                            cssClass={`e-outline w-full ${errors.displayName ? 'e-error' : ''}`}
                        />
                        {errors.displayName && (
                            <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
                        )}
                    </div>

                    {/* Document Category (Read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document Category
                        </label>
                        <TextBoxComponent
                            value={documentCategory}
                            enabled={false}
                            cssClass="e-outline w-full"
                        />
                        <p className="mt-1 text-xs text-gray-500">This field cannot be edited</p>
                    </div>

                    {/* Tax Clearance Expiry Date */}
                    {documentCategory === 'Tax Clearance' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tax Clearance Expiry Date
                            </label>
                            <DatePickerComponent
                                value={formData.TaxClearanceExpiry ?? undefined}
                                placeholder="Select expiry date"
                                floatLabelType="Never"
                                onChange={(e: { value?: Date | null }) => handleInputChange('TaxClearanceExpiry', e.value || null)}
                                cssClass="e-outline w-full"
                                format="dd MMMM yyyy"
                            />
                        </div>
                    )}

                    {/* B-BBEE Certificate Expiry Date */}
                    {(documentCategory === 'B-BBEE Certificate-Affidavit' || documentCategory === 'B-BBEE Certificate') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                B-BBEE Certificate Expiry Date
                            </label>
                            <DatePickerComponent
                                value={formData.BeeCertificateExpiry ?? undefined}
                                placeholder="Select expiry date"
                                floatLabelType="Never"
                                onChange={(e: { value?: Date | null }) => handleInputChange('BeeCertificateExpiry', e.value || null)}
                                cssClass="e-outline w-full"
                                format="dd MMMM yyyy"
                            />
                        </div>
                    )}

                    {/* Generic Expiry Date (for other document types) */}
                    {documentCategory !== 'Tax Clearance' && 
                     documentCategory !== 'B-BBEE Certificate-Affidavit' && 
                     documentCategory !== 'B-BBEE Certificate' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expiry Date
                            </label>
                            <DatePickerComponent
                                value={formData.expiryDate ?? undefined}
                                placeholder="Select expiry date"
                                floatLabelType="Never"
                                onChange={(e: { value?: Date | null }) => handleInputChange('expiryDate', e.value || null)}
                                cssClass="e-outline w-full"
                                format="dd MMMM yyyy"
                            />
                        </div>
                    )}

                    {errors.submit && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{errors.submit}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyDocumentEditModal;


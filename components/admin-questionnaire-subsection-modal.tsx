'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { CreateSubsectionRequest, UpdateSubsectionRequest, Subsection } from '@/types/admin-questionnaire';
import { useCreateSubsection, useUpdateSubsection, useGetAllSections } from '@/hooks/useAdminQuestionnaire';
import { cn } from '@/lib/utils';

interface AdminQuestionnaireSubsectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    sectionId: number;
    subsection?: Subsection | null;
}

const AdminQuestionnaireSubsectionModal: React.FC<AdminQuestionnaireSubsectionModalProps> = ({
    isOpen,
    onClose,
    sectionId,
    subsection
}) => {
    const createSubsection = useCreateSubsection();
    const updateSubsection = useUpdateSubsection();
    const { data: sections } = useGetAllSections();
    const isEditMode = !!subsection;

    const [formData, setFormData] = useState({
        subsectionCode: '',
        subsectionName: '',
        sectionId: sectionId
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && subsection) {
                setFormData({
                    subsectionCode: subsection.subsectionCode,
                    subsectionName: subsection.subsectionName,
                    sectionId: subsection.sectionID
                });
            } else {
                setFormData({
                    subsectionCode: '',
                    subsectionName: '',
                    sectionId: sectionId
                });
            }
            setErrors({});
        }
    }, [isOpen, isEditMode, subsection, sectionId]);

    const handleInputChange = (field: string, value: string | number) => {
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
        
        if (!formData.subsectionCode.trim()) {
            newErrors.subsectionCode = 'Subsection code is required';
        }
        if (!formData.subsectionName.trim()) {
            newErrors.subsectionName = 'Subsection name is required';
        }
        if (!formData.sectionId || formData.sectionId === 0) {
            newErrors.sectionId = 'Section is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validate()) {
            return;
        }

        try {
            if (isEditMode && subsection && subsection.subsectionID) {
                const updateData: UpdateSubsectionRequest = {
                    sectionID: formData.sectionId,
                    subsectionCode: formData.subsectionCode.trim(),
                    subsectionName: formData.subsectionName.trim()
                };
                await updateSubsection.mutateAsync({
                    subsectionId: subsection.subsectionID,
                    data: updateData
                });
            } else {
                const createData: CreateSubsectionRequest = {
                    sectionID: formData.sectionId,
                    subsectionCode: formData.subsectionCode.trim(),
                    subsectionName: formData.subsectionName.trim()
                };
                await createSubsection.mutateAsync(createData);
            }
            onClose();
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} subsection:`, error);
        }
    };

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const isLoading = createSubsection.isPending || updateSubsection.isPending;

    return (
        <div 
            className="fixed inset-0 bg-black/30 flex items-center justify-center lg:justify-start lg:pl-72 z-50" 
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 lg:ml-6">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                            {isEditMode ? 'Edit Subsection' : 'Add New Subsection'}
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
                    {/* Section Selection */}
                    {sections && sections.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Section <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.sectionId}
                                onChange={(e) => handleInputChange('sectionId', parseInt(e.target.value))}
                                disabled={isEditMode}
                                className={cn(
                                    adminFormTheme.select,
                                    errors.sectionId && 'border-red-500 focus:border-red-500 focus:ring-red-500/15',
                                )}
                            >
                                <option value={0}>Select a section</option>
                                {sections.map(section => (
                                    <option key={section.sectionID} value={section.sectionID}>
                                        {section.sectionName}
                                    </option>
                                ))}
                            </select>
                            {errors.sectionId && (
                                <p className="mt-1 text-sm text-red-600">{errors.sectionId}</p>
                            )}
                        </div>
                    )}

                    {/* Subsection Code */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subsection Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.subsectionCode}
                            onChange={(e) => handleInputChange('subsectionCode', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                errors.subsectionCode ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., 1.1"
                        />
                        {errors.subsectionCode && (
                            <p className="mt-1 text-sm text-red-600">{errors.subsectionCode}</p>
                        )}
                    </div>

                    {/* Subsection Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subsection Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.subsectionName}
                            onChange={(e) => handleInputChange('subsectionName', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                errors.subsectionName ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., Business Plan"
                        />
                        {errors.subsectionName && (
                            <p className="mt-1 text-sm text-red-600">{errors.subsectionName}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Subsection' : 'Create Subsection')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminQuestionnaireSubsectionModal;


'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CreateSectionRequest, UpdateSectionRequest, Section } from '@/types/admin-questionnaire';
import { useCreateSection, useUpdateSection } from '@/hooks/useAdminQuestionnaire';

interface AdminQuestionnaireSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    section?: Section | null;
}

const AdminQuestionnaireSectionModal: React.FC<AdminQuestionnaireSectionModalProps> = ({
    isOpen,
    onClose,
    section
}) => {
    const createSection = useCreateSection();
    const updateSection = useUpdateSection();
    const isEditMode = !!section;
    
    const [formData, setFormData] = useState({
        sectionName: '',
        description: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && section) {
                setFormData({
                    sectionName: section.sectionName,
                    description: section.description || ''
                });
            } else {
                setFormData({
                    sectionName: '',
                    description: ''
                });
            }
            setErrors({});
        }
    }, [isOpen, isEditMode, section]);

    const handleInputChange = (field: string, value: string) => {
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
        
        if (!formData.sectionName.trim()) {
            newErrors.sectionName = 'Section name is required';
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
            if (isEditMode && section) {
                const updateData: UpdateSectionRequest = {
                    sectionName: formData.sectionName.trim(),
                    description: formData.description.trim() || null
                };
                await updateSection.mutateAsync({
                    sectionId: section.sectionID!,
                    data: updateData
                });
            } else {
                const createData: CreateSectionRequest = {
                    sectionName: formData.sectionName.trim(),
                    description: formData.description.trim() || null
                };
                await createSection.mutateAsync(createData);
            }
            onClose();
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} section:`, error);
        }
    };

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

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
                            {isEditMode ? 'Edit Section' : 'Add New Section'}
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
                    {/* Section Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Section Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.sectionName}
                            onChange={(e) => handleInputChange('sectionName', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                errors.sectionName ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., Funding Ready"
                        />
                        {errors.sectionName && (
                            <p className="mt-1 text-sm text-red-600">{errors.sectionName}</p>
                        )}
                    </div>

                    {/* Section Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Section Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Enter a description for this section"
                        />
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
                            disabled={createSection.isPending || updateSection.isPending}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {(createSection.isPending || updateSection.isPending) 
                                ? (isEditMode ? 'Updating...' : 'Creating...') 
                                : (isEditMode ? 'Update Section' : 'Create Section')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminQuestionnaireSectionModal;


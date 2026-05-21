'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { CreateQuestionRequest, CreateCostItemRequest } from '@/types/admin-questionnaire';
import { useCreateQuestion, useCreateCostItem, useAdminQuestionnaireGrid } from '@/hooks/useAdminQuestionnaire';
import { cn } from '@/lib/utils';

interface AdminQuestionnaireAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    sectionId: number;
    subsectionId?: number;
}

const AdminQuestionnaireAddModal: React.FC<AdminQuestionnaireAddModalProps> = ({
    isOpen,
    onClose,
    sectionId,
    subsectionId
}) => {
    const createQuestion = useCreateQuestion();
    const createCostItem = useCreateCostItem();
    const { data } = useAdminQuestionnaireGrid();
    const [formData, setFormData] = useState({
        questionCode: '',
        questionText: '',
        importance: '',
        resources: '',
        subsectionId: subsectionId || 0
    });
    const [costItems, setCostItems] = useState<CreateCostItemRequest[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [availableSubsections, setAvailableSubsections] = useState<Array<{ id: number; code: string; name: string }>>([]);

    // Get available subsections for the selected section
    useEffect(() => {
        if (data?.rows && sectionId) {
            const subsections = new Map<number, { id: number; code: string; name: string }>();
            data.rows.forEach(row => {
                if (row.level === 2 && row.subsectionID && row.sectionID === sectionId) {
                    if (!subsections.has(row.subsectionID)) {
                        subsections.set(row.subsectionID, {
                            id: row.subsectionID,
                            code: row.subsectionCode || '',
                            name: row.subsectionName || ''
                        });
                    }
                }
            });
            const subsectionsArray = Array.from(subsections.values());
            setAvailableSubsections(subsectionsArray);
            
            // Set default subsection if only one available
            if (subsectionsArray.length === 1 && !subsectionId) {
                setFormData(prev => ({ ...prev, subsectionId: subsectionsArray[0].id }));
            } else if (subsectionId) {
                setFormData(prev => ({ ...prev, subsectionId }));
            }
        }
    }, [data, sectionId, subsectionId]);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                questionCode: '',
                questionText: '',
                importance: '',
                resources: '',
                subsectionId: subsectionId || (availableSubsections.length > 0 ? availableSubsections[0].id : 0)
            });
            setCostItems([]);
            setErrors({});
        }
    }, [isOpen, subsectionId, availableSubsections]);

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

    const handleCostItemChange = (index: number, field: string, value: string | number | null) => {
        setCostItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleAddCostItem = () => {
        setCostItems(prev => [...prev, {
            item: '',
            estimatedAverage: null,
            subsectionID: formData.subsectionId
        }]);
    };

    const handleRemoveCostItem = (index: number) => {
        setCostItems(prev => prev.filter((_, i) => i !== index));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        // questionCode is optional per Swagger schema
        if (!formData.questionText.trim()) {
            newErrors.questionText = 'Question text is required';
        }
        if (!formData.subsectionId || formData.subsectionId === 0) {
            newErrors.subsectionId = 'Subsection is required';
        }

        costItems.forEach((item, index) => {
            if (!item.item.trim()) {
                newErrors[`costItem_${index}`] = 'Cost item name is required';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validate()) {
            return;
        }

        try {
            // Create the question first
            const createData: CreateQuestionRequest = {
                subsectionID: formData.subsectionId,
                questionCode: formData.questionCode.trim() || null,
                questionText: formData.questionText.trim(),
                importance: formData.importance.trim() || null,
                resources: formData.resources.trim() || null
            };
            const createdQuestion = await createQuestion.mutateAsync(createData);

            // Create cost items if any
            if (costItems.length > 0 && createdQuestion) {
                for (const costItem of costItems) {
                    if (costItem.item.trim()) {
                        await createCostItem.mutateAsync({
                            subsectionID: formData.subsectionId,
                            categoryQuestionID: createdQuestion.categoryQuestionID || null,
                            item: costItem.item.trim(),
                            estimatedAverage: costItem.estimatedAverage || null
                        });
                    }
                }
            }

            onClose();
        } catch (error) {
            console.error('Error creating question:', error);
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
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 lg:ml-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Add New Question</h3>
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
                    {/* Subsection Selection */}
                    {availableSubsections.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subsection <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.subsectionId}
                                onChange={(e) => handleInputChange('subsectionId', parseInt(e.target.value))}
                                className={cn(
                                    adminFormTheme.select,
                                    errors.subsectionId && 'border-red-500 focus:border-red-500 focus:ring-red-500/15',
                                )}
                            >
                                <option value={0}>Select a subsection</option>
                                {availableSubsections.map(subsection => (
                                    <option key={subsection.id} value={subsection.id}>
                                        {subsection.code} - {subsection.name}
                                    </option>
                                ))}
                            </select>
                            {errors.subsectionId && (
                                <p className="mt-1 text-sm text-red-600">{errors.subsectionId}</p>
                            )}
                        </div>
                    )}

                    {/* Question Code */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Question Code
                        </label>
                        <input
                            type="text"
                            value={formData.questionCode}
                            onChange={(e) => handleInputChange('questionCode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="e.g., 1.1.1 (optional)"
                        />
                    </div>

                    {/* Question Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Question Text <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.questionText}
                            onChange={(e) => handleInputChange('questionText', e.target.value)}
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                errors.questionText ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter the question text"
                        />
                        {errors.questionText && (
                            <p className="mt-1 text-sm text-red-600">{errors.questionText}</p>
                        )}
                    </div>

                    {/* Importance */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Importance
                        </label>
                        <textarea
                            value={formData.importance}
                            onChange={(e) => handleInputChange('importance', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Enter the importance description"
                        />
                    </div>

                    {/* Resources */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Resources
                        </label>
                        <textarea
                            value={formData.resources}
                            onChange={(e) => handleInputChange('resources', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Enter resources or links"
                        />
                    </div>

                    {/* Cost Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Cost Items (Optional)
                            </label>
                            <button
                                type="button"
                                onClick={handleAddCostItem}
                                className="flex items-center px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                            >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add Cost Item
                            </button>
                        </div>
                        <div className="space-y-3">
                            {costItems.map((costItem, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-sm font-medium text-gray-700">Cost Item {index + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCostItem(index)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Item Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={costItem.item}
                                                onChange={(e) => handleCostItemChange(index, 'item', e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                                    errors[`costItem_${index}`] ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                                placeholder="Enter cost item name"
                                            />
                                            {errors[`costItem_${index}`] && (
                                                <p className="mt-1 text-xs text-red-600">{errors[`costItem_${index}`]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Estimated Average (R)
                                            </label>
                                            <input
                                                type="number"
                                                value={costItem.estimatedAverage ?? ''}
                                                onChange={(e) => handleCostItemChange(index, 'estimatedAverage', e.target.value ? parseFloat(e.target.value) : null)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {costItems.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    No cost items. Click &quot;Add Cost Item&quot; to add one.
                                </p>
                            )}
                        </div>
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
                            disabled={createQuestion.isPending || createCostItem.isPending}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {(createQuestion.isPending || createCostItem.isPending) ? 'Creating...' : 'Create Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminQuestionnaireAddModal;


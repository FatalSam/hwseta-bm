'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { TextAreaComponent } from '@syncfusion/ej2-react-inputs';
import { Role, CreateRoleRequest, UpdateRoleRequest } from '@/types/users';
import { useUsers } from '@/hooks/useUsers';

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    role?: Role | null;
    onSuccess?: () => void;
}

const RoleModal: React.FC<RoleModalProps> = ({
    isOpen,
    onClose,
    role,
    onSuccess
}) => {
    const { createRoleMutation, updateRoleMutation } = useUsers();
    const isEditMode = !!role;
    
    const [formData, setFormData] = useState({
        roleName: '',
        description: '',
        permissions: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && role) {
                setFormData({
                    roleName: role.roleName || '',
                    description: role.description || '',
                    permissions: (role.permissions || []).join(', ')
                });
            } else {
                setFormData({
                    roleName: '',
                    description: '',
                    permissions: ''
                });
            }
            setErrors({});
        }
    }, [isOpen, isEditMode, role]);

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
        
        if (!formData.roleName.trim()) {
            newErrors.roleName = 'Role name is required';
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
            // Parse permissions from comma-separated string
            const permissions = formData.permissions
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            if (isEditMode && role) {
                const updateData: UpdateRoleRequest = {
                    roleName: formData.roleName.trim(),
                    description: formData.description.trim() || undefined,
                    permissions: permissions.length > 0 ? permissions : undefined,
                };
                await updateRoleMutation.mutateAsync({ id: role.roleID, role: updateData });
            } else {
                const createData: CreateRoleRequest = {
                    roleName: formData.roleName.trim(),
                    description: formData.description.trim() || undefined,
                    permissions: permissions.length > 0 ? permissions : undefined,
                    isActive: true
                };
                await createRoleMutation.mutateAsync(createData);
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} role:`, error);
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
                            {isEditMode ? 'Edit Role' : 'Create New Role'}
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
                    {/* Role Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role Name <span className="text-red-500">*</span>
                        </label>
                        <TextBoxComponent
                            value={formData.roleName}
                            placeholder="Enter role name (e.g., Admin, Manager)"
                            floatLabelType="Never"
                            onChange={(e: { value?: string }) => handleInputChange('roleName', e.value || '')}
                            cssClass={`e-outline w-full ${errors.roleName ? 'e-error' : ''}`}
                        />
                        {errors.roleName && (
                            <p className="mt-1 text-sm text-red-600">{errors.roleName}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <TextAreaComponent
                            value={formData.description}
                            placeholder="Enter role description"
                            floatLabelType="Never"
                            onChange={(e: { value?: string }) => handleInputChange('description', e.value || '')}
                            cssClass="e-outline w-full"
                            width="100%"
                            rows={3}
                        />
                    </div>

                    {/* Permissions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Permissions
                        </label>
                        <TextBoxComponent
                            value={formData.permissions}
                            placeholder="Enter permissions separated by commas (e.g., read, write, delete)"
                            floatLabelType="Never"
                            onChange={(e: { value?: string }) => handleInputChange('permissions', e.value || '')}
                            cssClass="e-outline w-full"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Separate multiple permissions with commas
                        </p>
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
                            disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {(createRoleMutation.isPending || updateRoleMutation.isPending) 
                                ? (isEditMode ? 'Updating...' : 'Creating...') 
                                : (isEditMode ? 'Update Role' : 'Create Role')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleModal;


'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { User, CreateUserRequest, UpdateUserRequest } from '@/types/users';
import { useUsers } from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
    onSuccess?: () => void;
}

const UserModal: React.FC<UserModalProps> = ({
    isOpen,
    onClose,
    user,
    onSuccess
}) => {
    const { createUserMutation, updateUserMutation } = useUsers();
    const { companies } = useCompanies();
    const isEditMode = !!user;
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        userName: '',
        password: '',
        companyID: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && user) {
                setFormData({
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email || '',
                    userName: user.userName || '',
                    password: '', // Don't pre-fill password
                    companyID: user.companyID || ''
                });
            } else {
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    userName: '',
                    password: '',
                    companyID: ''
                });
            }
            setErrors({});
        }
    }, [isOpen, isEditMode, user]);

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
        
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }
        
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        
        if (!formData.userName.trim()) {
            newErrors.userName = 'Username is required';
        }
        
        if (!isEditMode && !formData.password.trim()) {
            newErrors.password = 'Password is required for new users';
        } else if (formData.password.trim() && formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
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
            if (isEditMode && user) {
                const updateData: UpdateUserRequest = {
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    email: formData.email.trim(),
                    userName: formData.userName.trim(),
                    companyID: formData.companyID || undefined,
                    ...(formData.password.trim() && { password: formData.password })
                };
                await updateUserMutation.mutateAsync({ id: user.userID, user: updateData });
            } else {
                const createData: CreateUserRequest = {
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    email: formData.email.trim(),
                    userName: formData.userName.trim(),
                    password: formData.password.trim(),
                    companyID: formData.companyID || undefined,
                    isActive: true
                };
                await createUserMutation.mutateAsync(createData);
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} user:`, error);
        }
    };

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Prepare company options for dropdown
    const companyOptions = (companies || []).map(company => ({
        text: company.businessName || company.companyID,
        value: company.companyID
    }));

    return (
        <div 
            className="fixed inset-0 bg-black/30 flex items-center justify-center lg:justify-start lg:pl-72 z-50" 
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 lg:ml-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 sticky top-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                            {isEditMode ? 'Edit User' : 'Create New User'}
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
                    {/* First Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <TextBoxComponent
                            value={formData.firstName}
                            placeholder="Enter first name"
                            floatLabelType="Never"
                            onChange={(e: { value?: string }) => handleInputChange('firstName', e.value || '')}
                            cssClass={`e-outline w-full ${errors.firstName ? 'e-error' : ''}`}
                        />
                        {errors.firstName && (
                            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <TextBoxComponent
                            value={formData.lastName}
                            placeholder="Enter last name"
                            floatLabelType="Never"
                            onChange={(e: { value?: string }) => handleInputChange('lastName', e.value || '')}
                            cssClass={`e-outline w-full ${errors.lastName ? 'e-error' : ''}`}
                        />
                        {errors.lastName && (
                            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <TextBoxComponent
                            type="email"
                            value={formData.email}
                            placeholder="Enter email address"
                            floatLabelType="Never"
                            onChange={(e: { value?: string }) => handleInputChange('email', e.value || '')}
                            cssClass={`e-outline w-full ${errors.email ? 'e-error' : ''}`}
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <TextBoxComponent
                            value={formData.userName}
                            placeholder="Enter username"
                            floatLabelType="Never"
                            onChange={(e: { value?: string }) => handleInputChange('userName', e.value || '')}
                            cssClass={`e-outline w-full ${errors.userName ? 'e-error' : ''}`}
                        />
                        {errors.userName && (
                            <p className="mt-1 text-sm text-red-600">{errors.userName}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password {!isEditMode && <span className="text-red-500">*</span>}
                            {isEditMode && <span className="text-gray-500 text-xs ml-2">(Leave blank to keep current password)</span>}
                        </label>
                        <TextBoxComponent
                            type="password"
                            value={formData.password}
                            placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                            floatLabelType="Never"
                            onChange={(e: { value?: string }) => handleInputChange('password', e.value || '')}
                            cssClass={`e-outline w-full ${errors.password ? 'e-error' : ''}`}
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                        )}
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Company
                        </label>
                        <DropDownListComponent
                            dataSource={companyOptions}
                            fields={{ text: 'text', value: 'value' }}
                            placeholder="Select company (optional)"
                            value={formData.companyID}
                            change={(e: { value?: string }) => handleInputChange('companyID', e.value || '')}
                            cssClass="e-outline w-full"
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
                            disabled={createUserMutation.isPending || updateUserMutation.isPending}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {(createUserMutation.isPending || updateUserMutation.isPending) 
                                ? (isEditMode ? 'Updating...' : 'Creating...') 
                                : (isEditMode ? 'Update User' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;


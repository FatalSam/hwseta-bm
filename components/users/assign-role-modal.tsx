'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { User } from '@/types/users';
import { useUsers } from '@/hooks/useUsers';
import ConfirmationModal from '@/components/ui/confirmation-modal';

interface AssignRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSuccess?: () => void;
}

const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
    isOpen,
    onClose,
    user,
    onSuccess
}) => {
    const { roles, rolesError, useUserRoles, assignRoleMutation, removeRoleMutation } = useUsers();
    const { data: userRoles, refetch: refetchUserRoles } = useUserRoles(user?.userID || '');
    
    const [selectedRoleId, setSelectedRoleId] = useState<string>('');
    const [removeConfirmModal, setRemoveConfirmModal] = useState<{ isOpen: boolean; roleId: string | null }>({ isOpen: false, roleId: null });

    useEffect(() => {
        if (isOpen && user) {
            refetchUserRoles();
            setSelectedRoleId('');
        }
    }, [isOpen, user, refetchUserRoles]);

    if (!isOpen || !user) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Prepare role options (exclude already assigned roles)
    const userRolesArray = Array.isArray(userRoles) ? userRoles : [];
    const assignedRoleIds = userRolesArray.map(ur => ur.roleID);
    const rolesArray = Array.isArray(roles) ? roles : [];
    const availableRoles = rolesArray.filter(role => !assignedRoleIds.includes(role.roleID));
    const roleOptions = availableRoles.map(role => ({
        text: role.roleName,
        value: role.roleID
    }));

    const handleAssignRole = async () => {
        if (!selectedRoleId) return;

        try {
            await assignRoleMutation.mutateAsync({
                userID: user.userID,
                roleID: selectedRoleId
            });
            setSelectedRoleId('');
            refetchUserRoles();
            onSuccess?.();
        } catch (error) {
            console.error('Error assigning role:', error);
        }
    };

    const handleRemoveRole = (roleId: string) => {
        setRemoveConfirmModal({ isOpen: true, roleId });
    };

    const confirmRemove = async () => {
        if (!removeConfirmModal.roleId || !user) return;

        try {
            await removeRoleMutation.mutateAsync({
                userId: user.userID,
                roleId: removeConfirmModal.roleId
            });
            refetchUserRoles();
            onSuccess?.();
        } catch (error) {
            console.error('Error removing role:', error);
        } finally {
            setRemoveConfirmModal({ isOpen: false, roleId: null });
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/30 flex items-center justify-center lg:justify-start lg:pl-72 z-50" 
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 lg:ml-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 sticky top-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Assign Roles
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {user.firstName} {user.lastName} ({user.userName})
                            </p>
                        </div>
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
                <div className="p-6 space-y-6">
                    {/* Error message if roles can't be loaded */}
                    {rolesError && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                                Unable to load roles. Role management features may be limited. Please ensure the roles API endpoint is available.
                            </p>
                        </div>
                    )}

                    {/* Assign New Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assign New Role
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <DropDownListComponent
                                    dataSource={roleOptions}
                                    fields={{ text: 'text', value: 'value' }}
                                    placeholder={rolesError ? "Roles unavailable" : "Select a role to assign"}
                                    value={selectedRoleId}
                                    change={(e: { value?: string }) => setSelectedRoleId(e.value || '')}
                                    cssClass="e-outline w-full"
                                    enabled={!rolesError && roleOptions.length > 0}
                                />
                            </div>
                            <button
                                onClick={handleAssignRole}
                                disabled={!selectedRoleId || assignRoleMutation.isPending || !!rolesError}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {assignRoleMutation.isPending ? 'Assigning...' : 'Assign'}
                            </button>
                        </div>
                        {!rolesError && roleOptions.length === 0 && (
                            <p className="mt-2 text-sm text-gray-500">
                                All available roles have been assigned to this user.
                            </p>
                        )}
                    </div>

                    {/* Current Roles */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Roles
                        </label>
                        {!userRoles || userRoles.length === 0 ? (
                            <p className="text-sm text-gray-500 py-4">
                                No roles assigned to this user.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {userRolesArray.map((userRole) => {
                                    const role = rolesArray.find(r => r.roleID === userRole.roleID);
                                    return (
                                        <div
                                            key={userRole.userRoleID}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {role?.roleName || userRole.roleName || 'Unknown Role'}
                                                </p>
                                                {role?.description && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {role.description}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleRemoveRole(userRole.roleID)}
                                                disabled={removeRoleMutation.isPending}
                                                className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label="Remove role"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Remove Role Confirmation Modal */}
            <ConfirmationModal
                isOpen={removeConfirmModal.isOpen}
                onClose={() => setRemoveConfirmModal({ isOpen: false, roleId: null })}
                onConfirm={confirmRemove}
                title="Remove Role"
                message="Are you sure you want to remove this role from the user?"
                type="confirm"
                confirmLabel="Remove"
                confirmVariant="primary"
            />
        </div>
    );
};

export default AssignRoleModal;


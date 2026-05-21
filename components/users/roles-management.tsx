'use client';

import React, { useState } from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { GridComponent, ColumnsDirective, ColumnDirective, PageSettingsModel, Inject, Page } from '@syncfusion/ej2-react-grids';
import { Role } from '@/types/users';
import { useUsers } from '@/hooks/useUsers';
import RoleModal from './role-modal';
import { Spinner } from '@/components/ui/spinner';
import ConfirmationModal from '@/components/ui/confirmation-modal';

interface RolesManagementProps {
    onClose?: () => void;
}

const RolesManagement: React.FC<RolesManagementProps> = ({ onClose }) => {
    const { roles, rolesLoading, rolesError, deleteRoleMutation } = useUsers();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; role: Role | null }>({ isOpen: false, role: null });

    const pageSettings: PageSettingsModel = { pageSize: 10, pageSizes: true };

    const handleEditRole = (role: Role) => {
        setSelectedRole(role);
        setIsRoleModalOpen(true);
    };

    const handleDeleteRole = (role: Role) => {
        setDeleteConfirmModal({ isOpen: true, role });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmModal.role) return;

        try {
            await deleteRoleMutation.mutateAsync(deleteConfirmModal.role.roleID);
        } catch (error) {
            console.error('Error deleting role:', error);
        } finally {
            setDeleteConfirmModal({ isOpen: false, role: null });
        }
    };

    const handleCreateRole = () => {
        setSelectedRole(null);
        setIsRoleModalOpen(true);
    };

    const handleRoleModalClose = () => {
        setIsRoleModalOpen(false);
        setSelectedRole(null);
    };

    // Map roles data for grid
    const rolesArray = Array.isArray(roles) ? roles : [];
    const gridData = rolesArray.map((role) => ({
        roleID: role.roleID,
        roleName: role.roleName || '-',
        description: role.description || '-',
        permissions: (role.permissions || []).join(', ') || '-',
        isActive: role.isActive !== false ? 'Active' : 'Inactive'
    }));

    const gridMinHeight = 560;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Roles Management</h2>
                    <p className="text-gray-600 mt-1">
                        Create, edit, and delete user roles
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCreateRole}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        Create Role
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {rolesLoading && (
                <div className="flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ minHeight: gridMinHeight }}>
                    <Spinner size="large" />
                </div>
            )}

            {/* Error State */}
            {rolesError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center" style={{ minHeight: gridMinHeight }}>
                    <p className="text-yellow-800">
                        Unable to load roles. The roles API endpoint may not be available. 
                        Please ensure the backend API endpoint <code className="bg-yellow-100 px-1 rounded">/api/Roles/GetAllRoles</code> is implemented.
                    </p>
                </div>
            )}

            {/* Grid */}
            {!rolesLoading && !rolesError && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ minHeight: gridMinHeight }}>
                    {gridData.length === 0 ? (
                        <div className="text-center py-8 flex items-center justify-center" style={{ minHeight: gridMinHeight }}>
                            <p className="text-gray-500">No roles found. Create your first role to get started.</p>
                        </div>
                    ) : (
                        <GridComponent
                            dataSource={gridData}
                            allowPaging={true}
                            pageSettings={pageSettings}
                            id="rolesGrid"
                            height={500}
                            cssClass="e-grid-custom"
                            enableHover={true}
                            allowSorting={true}
                            allowFiltering={true}
                        >
                        <ColumnsDirective>
                            <ColumnDirective 
                                field="roleName" 
                                headerText="Role Name" 
                                width="200" 
                                headerTextAlign="Left" 
                                textAlign="Left"
                            />
                            <ColumnDirective 
                                field="description" 
                                headerText="Description" 
                                width="300" 
                                headerTextAlign="Left" 
                                textAlign="Left"
                            />
                            <ColumnDirective 
                                field="permissions" 
                                headerText="Permissions" 
                                width="250" 
                                headerTextAlign="Left" 
                                textAlign="Left"
                            />
                            <ColumnDirective 
                                field="isActive" 
                                headerText="Status" 
                                width="120" 
                                headerTextAlign="Center" 
                                textAlign="Center"
                                template={(props: Record<string, unknown>) => (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        props.isActive === 'Active' 
                                            ? 'text-green-600 bg-green-100' 
                                            : 'text-gray-600 bg-gray-100'
                                    }`}>
                                        {props.isActive as string}
                                    </span>
                                )}
                            />
                            <ColumnDirective 
                                field="roleID" 
                                headerText="Actions" 
                                width="150" 
                                headerTextAlign="Center" 
                                textAlign="Center"
                                template={(props: Record<string, unknown>) => {
                                    const role = rolesArray.find(r => r.roleID === props.roleID);
                                    if (!role) return null;
                                    
                                    return (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEditRole(role)}
                                                className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                                aria-label="Edit role"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRole(role)}
                                                disabled={deleteRoleMutation.isPending}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label="Delete role"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    );
                                }}
                            />
                        </ColumnsDirective>
                        <Inject services={[Page]} />
                    </GridComponent>
                    )}
                </div>
            )}

            {/* Role Modal */}
            {isRoleModalOpen && (
                <RoleModal
                    isOpen={isRoleModalOpen}
                    onClose={handleRoleModalClose}
                    role={selectedRole}
                    onSuccess={handleRoleModalClose}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmModal.isOpen}
                onClose={() => setDeleteConfirmModal({ isOpen: false, role: null })}
                onConfirm={confirmDelete}
                title="Delete Role"
                message={deleteConfirmModal.role ? `Are you sure you want to delete the role "${deleteConfirmModal.role.roleName}"? This action cannot be undone.` : ''}
                type="confirm"
                confirmLabel="Delete"
                confirmVariant="primary"
            />
        </div>
    );
};

export default RolesManagement;


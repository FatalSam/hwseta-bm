import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getAllUsers, 
    getUserById, 
    createUser, 
    updateUser, 
    deleteUser,
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
    removeRoleFromUser,
    getUserRoles
} from '@/api/users';
import { 
    User, 
    Role, 
    UserRole,
    CreateUserRequest,
    UpdateUserRequest,
    CreateRoleRequest,
    UpdateRoleRequest,
    AssignRoleRequest
} from '@/types/users';
import { adminDashboardKeys } from '@/hooks/useAdminDashboard';

// Query keys
export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    list: (filters: string) => [...userKeys.lists(), { filters }] as const,
    details: () => [...userKeys.all, 'detail'] as const,
    detail: (id: string) => [...userKeys.details(), id] as const,
    roles: () => [...userKeys.all, 'roles'] as const,
    rolesList: () => [...userKeys.roles(), 'list'] as const,
    roleDetail: (id: string) => [...userKeys.roles(), 'detail', id] as const,
    userRoles: () => [...userKeys.all, 'userRoles'] as const,
    userRolesList: (userId: string) => [...userKeys.userRoles(), 'list', userId] as const,
};

export const useUsers = () => {
    const queryClient = useQueryClient();

    // Get all users - with error handling
    const { data: users, isLoading, error } = useQuery({
        queryKey: userKeys.lists(),
        queryFn: getAllUsers,
        retry: false,
    });

    // Get user by ID
    const useUser = (id: string) => {
        return useQuery({
            queryKey: userKeys.detail(id),
            queryFn: () => getUserById(id),
            enabled: !!id,
        });
    };

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            queryClient.invalidateQueries({ queryKey: adminDashboardKeys.stats() });
        },
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: ({ id, user }: { id: string; user: UpdateUserRequest }) => 
            updateUser(id, user),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            queryClient.invalidateQueries({ queryKey: userKeys.detail(data.userID) });
            queryClient.invalidateQueries({ queryKey: adminDashboardKeys.stats() });
        },
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            queryClient.invalidateQueries({ queryKey: adminDashboardKeys.stats() });
        },
    });

    // Get all roles - with error handling to prevent page crash if endpoint doesn't exist
    const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery({
        queryKey: userKeys.rolesList(),
        queryFn: getAllRoles,
        retry: false,
    });

    // Get role by ID
    const useRole = (id: string) => {
        return useQuery({
            queryKey: userKeys.roleDetail(id),
            queryFn: () => getRoleById(id),
            enabled: !!id,
        });
    };

    // Create role mutation
    const createRoleMutation = useMutation({
        mutationFn: createRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.rolesList() });
        },
    });

    // Update role mutation
    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role }: { id: string; role: UpdateRoleRequest }) => 
            updateRole(id, role),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: userKeys.rolesList() });
            queryClient.invalidateQueries({ queryKey: userKeys.roleDetail(data.roleID) });
        },
    });

    // Delete role mutation
    const deleteRoleMutation = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.rolesList() });
        },
    });

    // Get user roles
    const useUserRoles = (userId: string) => {
        return useQuery({
            queryKey: userKeys.userRolesList(userId),
            queryFn: () => getUserRoles(userId),
            enabled: !!userId,
        });
    };

    // Assign role to user mutation
    const assignRoleMutation = useMutation({
        mutationFn: assignRoleToUser,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: userKeys.userRolesList(data.userID) });
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        },
    });

    // Remove role from user mutation
    const removeRoleMutation = useMutation({
        mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => 
            removeRoleFromUser(userId, roleId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: userKeys.userRolesList(variables.userId) });
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        },
    });

    return {
        // Users
        users,
        isLoading,
        error,
        useUser,
        createUser: createUserMutation.mutate,
        createUserMutation,
        updateUser: updateUserMutation.mutate,
        updateUserMutation,
        deleteUser: deleteUserMutation.mutate,
        deleteUserMutation,
        isCreating: createUserMutation.isPending,
        isUpdating: updateUserMutation.isPending,
        isDeleting: deleteUserMutation.isPending,
        
        // Roles
        roles,
        rolesLoading,
        rolesError,
        useRole,
        createRole: createRoleMutation.mutate,
        createRoleMutation,
        updateRole: updateRoleMutation.mutate,
        updateRoleMutation,
        deleteRole: deleteRoleMutation.mutate,
        deleteRoleMutation,
        isCreatingRole: createRoleMutation.isPending,
        isUpdatingRole: updateRoleMutation.isPending,
        isDeletingRole: deleteRoleMutation.isPending,
        
        // User Roles
        useUserRoles,
        assignRole: assignRoleMutation.mutate,
        assignRoleMutation,
        removeRole: removeRoleMutation.mutate,
        removeRoleMutation,
        isAssigningRole: assignRoleMutation.isPending,
        isRemovingRole: removeRoleMutation.isPending,
    };
};


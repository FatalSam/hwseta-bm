import apiClient from "@/ultis/apiClient";
import { 
    User, 
    Users, 
    Role, 
    Roles, 
    UserRole, 
    UserRoles,
    CreateUserRequest,
    UpdateUserRequest,
    CreateRoleRequest,
    UpdateRoleRequest,
    AssignRoleRequest
} from "@/types/users";

// User API functions
export const getAllUsers = async () => {
    const response = await apiClient.get('/api/Users/GetAllUsers');
    return response.data as Users;
}

export const getUserById = async (id: string) => {
    const response = await apiClient.get(`/api/Users/GetUserByID/${id}`);
    return response.data as User;
}

export const createUser = async (user: CreateUserRequest) => {
    const response = await apiClient.post('/api/Users/CreateUser', user);
    return response.data as User;
}

export const updateUser = async (id: string, user: UpdateUserRequest) => {
    const response = await apiClient.put(`/api/Users/UpdateUser/${id}`, user);
    return response.data as User;
}

export const deleteUser = async (id: string) => {
    const response = await apiClient.delete(`/api/Users/DeleteUser/${id}`);
    return response.data;
}

// Role API functions
export const getAllRoles = async () => {
    const response = await apiClient.get('/api/Roles/GetAllRoles');
    return response.data as Roles;
}

export const getRoleById = async (id: string) => {
    const response = await apiClient.get(`/api/Roles/GetRoleByID/${id}`);
    return response.data as Role;
}

export const createRole = async (role: CreateRoleRequest) => {
    const response = await apiClient.post('/api/Roles/CreateRole', role);
    return response.data as Role;
}

export const updateRole = async (id: string, role: UpdateRoleRequest) => {
    const response = await apiClient.put(`/api/Roles/UpdateRole/${id}`, role);
    return response.data as Role;
}

export const deleteRole = async (id: string) => {
    const response = await apiClient.delete(`/api/Roles/DeleteRole/${id}`);
    return response.data;
}

// User-Role assignment API functions
export const assignRoleToUser = async (request: AssignRoleRequest) => {
    const response = await apiClient.post('/api/Users/AssignRole', request);
    return response.data as UserRole;
}

export const removeRoleFromUser = async (userId: string, roleId: string) => {
    const response = await apiClient.delete(`/api/Users/RemoveRole/${userId}/${roleId}`);
    return response.data;
}

export const getUserRoles = async (userId: string) => {
    const response = await apiClient.get(`/api/Users/GetUserRoles/${userId}`);
    return response.data as UserRoles;
}


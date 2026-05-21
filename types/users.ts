import { User as AuthUser } from './auth';

// Extended User interface for user management
export interface User extends AuthUser {
    isActive?: boolean;
    createdDate?: string;
    modifiedDate?: string;
    roles?: Role[];
}

export type Users = User[];

// Role interface
export interface Role {
    roleID: string;
    roleName: string;
    description?: string;
    permissions?: string[];
    isActive?: boolean;
    createdDate?: string;
    modifiedDate?: string;
}

export type Roles = Role[];

// User-Role assignment interface
export interface UserRole {
    userRoleID: string;
    userID: string;
    roleID: string;
    roleName?: string;
    assignedDate?: string;
    assignedBy?: string;
}

export type UserRoles = UserRole[];

// Request types for API calls
export interface CreateUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    userName: string;
    password: string;
    companyID?: string;
    isActive?: boolean;
}

export interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    userName?: string;
    password?: string;
    companyID?: string;
    isActive?: boolean;
}

export interface CreateRoleRequest {
    roleName: string;
    description?: string;
    permissions?: string[];
    isActive?: boolean;
}

export interface UpdateRoleRequest {
    roleName?: string;
    description?: string;
    permissions?: string[];
    isActive?: boolean;
}

export interface AssignRoleRequest {
    userID: string;
    roleID: string;
}


import { create } from 'zustand';
import { User } from '@/types/auth';
import { useDropdownStore } from './dropdownStore';
import { getUserRoleFromToken, isAdminRole, isBeneficiaryRole, isTokenExpired } from '@/lib/jwt-utils';

const AUTH_STORAGE_KEY = 'auth';
const BUSINESS_TYPE_STORAGE_KEY = 'businessTypeName';

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    businessTypeName: string | null;
    login: (user: User, token: string, refreshToken?: string | null) => void;
    logout: () => void;
    initialize: () => void;
    getUserRole: () => string | null;
    isAdmin: () => boolean;
    isBeneficiary: () => boolean;
    setBusinessTypeName: (businessTypeName: string | null) => void;
}

// Initialize state from localStorage if available (client-side only)
const getStoredAuth = () => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error reading auth from storage:', error);
        return null;
    }
};

// Get stored business type name
const getStoredBusinessTypeName = () => {
    if (typeof window === 'undefined') return null;
    try {
        return sessionStorage.getItem(BUSINESS_TYPE_STORAGE_KEY) || localStorage.getItem(BUSINESS_TYPE_STORAGE_KEY);
    } catch (error) {
        console.error('Error reading businessTypeName from storage:', error);
        return null;
    }
};

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    businessTypeName: null,
    login: (user: User, token: string, refreshToken?: string | null) => {
        const rt = refreshToken ?? null;
        const authData = { user, token, refreshToken: rt };
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
        set({ user, token, refreshToken: rt, isAuthenticated: true });
    },
    logout: () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
            sessionStorage.removeItem(BUSINESS_TYPE_STORAGE_KEY);
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(BUSINESS_TYPE_STORAGE_KEY);
        }
        // Clear dropdown options on logout
        useDropdownStore.getState().clearOptions();
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, businessTypeName: null });
    },
    initialize: () => {
        const storedAuth = getStoredAuth();
        const storedBusinessTypeName = getStoredBusinessTypeName();
        if (storedAuth?.token && isTokenExpired(storedAuth.token)) {
            // Token expired: clear storage and set unauthenticated (same as logout)
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem(AUTH_STORAGE_KEY);
                sessionStorage.removeItem(BUSINESS_TYPE_STORAGE_KEY);
                localStorage.removeItem(AUTH_STORAGE_KEY);
                localStorage.removeItem(BUSINESS_TYPE_STORAGE_KEY);
            }
            useDropdownStore.getState().clearOptions();
            set({ user: null, token: null, refreshToken: null, isAuthenticated: false, businessTypeName: null });
            return;
        }
        if (storedAuth) {
            set({
                user: storedAuth.user,
                token: storedAuth.token,
                refreshToken: storedAuth.refreshToken,
                isAuthenticated: !!storedAuth.token,
                businessTypeName: storedBusinessTypeName
            });
        }
    },
    getUserRole: () => {
        const { token } = get();
        return getUserRoleFromToken(token);
    },
    isAdmin: () => {
        const { token } = get();
        const role = getUserRoleFromToken(token);
        return isAdminRole(role);
    },
    isBeneficiary: () => {
        const { token } = get();
        return isBeneficiaryRole(getUserRoleFromToken(token));
    },
    setBusinessTypeName: (businessTypeName: string | null) => {
        if (typeof window !== 'undefined') {
            if (businessTypeName) {
                sessionStorage.setItem(BUSINESS_TYPE_STORAGE_KEY, businessTypeName);
                localStorage.removeItem(BUSINESS_TYPE_STORAGE_KEY);
            } else {
                sessionStorage.removeItem(BUSINESS_TYPE_STORAGE_KEY);
                localStorage.removeItem(BUSINESS_TYPE_STORAGE_KEY);
            }
        }
        set({ businessTypeName });
    },
}));
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login as loginApi, register as registerApi } from '@/api/auth';
import type { LoginResponse, Login, RegisterBeneficiary } from '@/types/auth';
import { useAuthStore } from '@/store/authStore';

export const authKeys = {
    all: ['auth'] as const,
    user: () => [...authKeys.all, 'user'] as const,
};

export const useAuth = () => {
    const queryClient = useQueryClient();
    const { login: loginStore, logout: logoutStore } = useAuthStore();

    const loginMutation = useMutation({
        mutationFn: loginApi,
        onSuccess: (data: LoginResponse) => {
            loginStore(data.user, data.token, data.refreshToken ?? null);
            queryClient.setQueryData(authKeys.user(), data.user);
        },
    });

    const registerMutation = useMutation({
        mutationFn: registerApi,
        onSuccess: (data: LoginResponse) => {
            loginStore(data.user, data.token, data.refreshToken ?? null);
            queryClient.setQueryData(authKeys.user(), data.user);
        },
    });

    const login = async (credentials: Login): Promise<LoginResponse> => {
        return new Promise((resolve, reject) => {
            loginMutation.mutate(credentials, {
                onSuccess: (data) => resolve(data),
                onError: (error) => reject(error),
            });
        });
    };

    const register = async (
        payload: RegisterBeneficiary
    ): Promise<LoginResponse> => {
        return new Promise((resolve, reject) => {
            registerMutation.mutate(payload, {
                onSuccess: (data) => resolve(data),
                onError: (error) => reject(error),
            });
        });
    };

    const logout = () => {
        logoutStore();
        queryClient.setQueryData(authKeys.user(), null);
    };

    return {
        login,
        register,
        logout,
        isLoggingIn: loginMutation.isPending,
        isRegistering: registerMutation.isPending,
    };
};

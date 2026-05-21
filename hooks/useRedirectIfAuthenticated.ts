'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export const useRedirectIfAuthenticated = () => {
    const { isAuthenticated, token, isBeneficiary, isAdmin, logout } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated || !token) return;

        if (isBeneficiary()) {
            router.replace('/dashboard/beneficiary');
            return;
        }

        if (isAdmin()) {
            router.replace('/dashboard/admin');
            return;
        }

        logout();
        router.replace('/login?reason=portal-access');
    }, [isAuthenticated, token, router, isBeneficiary, isAdmin, logout]);

    return { isAuthenticated, token };
};

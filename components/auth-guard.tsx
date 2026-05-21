'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { isTokenExpired } from '@/lib/jwt-utils';

interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated, token, initialize } = useAuthStore();
    const router = useRouter();
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        initialize();
        setIsInitialized(true);
    }, [initialize]);

    useEffect(() => {
        if (isInitialized && (!isAuthenticated || !token || isTokenExpired(token))) {
            if (token && isTokenExpired(token)) {
                useAuthStore.getState().logout();
            }
            router.push('/login');
        }
    }, [isInitialized, isAuthenticated, token, router]);

    if (!isInitialized) {
        return null;
    }

    return <>{children}</>;
}

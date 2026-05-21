'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/ui/spinner';

interface AdminGuardProps {
    children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
    const { isAuthenticated, token, initialize, isAdmin } = useAuthStore();
    const router = useRouter();
    const [isInitialized, setIsInitialized] = useState(false);
    const [isCheckingRole, setIsCheckingRole] = useState(true);

    useEffect(() => {
        // Initialize auth store on client side
        initialize();
        setIsInitialized(true);
    }, [initialize]);

    useEffect(() => {
        // Only check authentication and role after initialization
        if (isInitialized) {
            if (!isAuthenticated || !token) {
                router.push('/login');
                return;
            }

            // Check if user is admin
            const userIsAdmin = isAdmin();
            setIsCheckingRole(false);

            if (!userIsAdmin) {
                // Redirect non-admin users to dashboard
                router.push('/dashboard');
            }
        }
    }, [isAuthenticated, token, router, isInitialized, isAdmin]);

    // Don't render children until auth and role are checked
    if (!isInitialized || isCheckingRole) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                <Spinner size="large" />
            </div>
        );
    }

    // Only render children if user is admin (this check is redundant but provides safety)
    const userIsAdmin = isAdmin();
    if (!userIsAdmin) {
        return null;
    }

    return <>{children}</>;
}


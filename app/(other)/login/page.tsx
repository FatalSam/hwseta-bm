'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from "@/components/breadcrumb";
import Login from "@/components/login";
import { useAuth } from '@/hooks/useAuth';
import { useRedirectIfAuthenticated } from '@/hooks/useRedirectIfAuthenticated';
import { useAuthStore } from '@/store/authStore';

function LoginPageContent() {
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        userName: '',
        password: ''
    });

    const { login, isLoggingIn } = useAuth();
    const { isAuthenticated } = useRedirectIfAuthenticated();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const reason = searchParams.get('reason');
        if (reason === 'inactive') {
            setError('You were logged out for security reasons after being inactive. Please sign in again.');
        }
        if (reason === 'beneficiary-only') {
            setError('This portal is only for beneficiary accounts. Please sign in with a beneficiary profile.');
        }
        if (reason === 'portal-access') {
            setError('Sign in with a beneficiary or admin account to use this portal.');
        }
    }, [searchParams]);

    const extractErrorMessage = (err: unknown): string => {
        if (typeof err === 'string') return err;
        if (err && typeof err === 'object') {
            const obj = err as Record<string, unknown> & { message?: unknown; response?: { data?: { message?: unknown }; message?: unknown }; data?: { message?: unknown } };
            if (typeof obj.message === 'string' && obj.message.trim()) {
                return obj.message;
            }
            const axiosMsg = obj?.response?.data?.message ?? obj?.response?.message ?? obj?.data?.message;
            if (typeof axiosMsg === 'string' && axiosMsg.trim()) {
                return axiosMsg;
            }
        }
        return 'Login failed. Please check your credentials and try again.';
    };

    const validateInput = (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    };

    const handleFormDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError(null);
    };

    const handleShowPasswordToggle = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.userName.trim()) {
            setError('Please enter your email address.');
            return;
        }

        if (!formData.password.trim()) {
            setError('Please enter your password.');
            return;
        }

        const looksLikeEmail = validateInput(formData.userName);
        if (looksLikeEmail && formData.userName.length < 5) {
            setError('Please enter a valid email address.');
            return;
        }

        if (!looksLikeEmail && formData.userName.trim().length < 3) {
            setError('Please enter a valid email or username (at least 3 characters).');
            return;
        }

        try {
            await login(formData);
            const { isBeneficiary, isAdmin, logout } = useAuthStore.getState();
            if (isBeneficiary()) {
                router.replace('/dashboard/beneficiary');
                return;
            }
            if (isAdmin()) {
                router.replace('/dashboard/admin');
                return;
            }
            logout();
            setError('Sign in with a beneficiary or admin account.');
        } catch (err: unknown) {
            const message = extractErrorMessage(err);
            if (process.env.NODE_ENV === 'development') {
                console.error('Login failed:', message);
            }
            setError(message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-hwseta-green-muted/40">
            <Breadcrumb breadcrumbTitle="Login" />
            <Login
                formData={formData}
                showPassword={showPassword}
                error={error}
                isLoggingIn={isLoggingIn}
                isAuthenticated={isAuthenticated}
                onFormDataChange={handleFormDataChange}
                onShowPasswordToggle={handleShowPasswordToggle}
                onSubmit={handleSubmit}
            />
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginPageContent />
        </Suspense>
    );
}

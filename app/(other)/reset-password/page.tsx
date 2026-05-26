'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/breadcrumb';
import { completePasswordReset } from '@/api/auth';

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
        const obj = error as { response?: { data?: { message?: unknown } }; message?: unknown };
        const apiMessage = obj.response?.data?.message ?? obj.message;
        if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
    }
    return 'Something went wrong. Please try again.';
}

function isStrongPassword(password: string): boolean {
    return password.length >= 8 &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password) &&
        /\d/.test(password) &&
        /[\p{P}\p{S}]/u.test(password);
}

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

    const inputClass = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-hwseta-green focus:outline-none focus:ring-2 focus:ring-hwseta-green/25';

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setStatus({ type: null, message: '' });

        if (!token) {
            setStatus({ type: 'error', message: 'This reset link is missing or invalid. Please request a new password reset link.' });
            return;
        }
        if (!isStrongPassword(newPassword)) {
            setStatus({ type: 'error', message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', message: 'Passwords do not match.' });
            return;
        }

        try {
            setIsSubmitting(true);
            const result = await completePasswordReset({ token, newPassword });
            setStatus({ type: 'success', message: result.message || 'Password reset successfully. You can now sign in.' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setStatus({ type: 'error', message: getErrorMessage(error) });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-hwseta-green-muted/40">
            <Breadcrumb breadcrumbTitle="Reset Password" />
            <section className="py-12 sm:py-16 md:py-20">
                <div className="mx-auto max-w-2xl px-4 sm:px-6">
                    <div className="rounded-2xl border border-hwseta-green-muted bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
                        <p className="mb-1 text-center text-xs font-semibold uppercase tracking-[0.18em] text-hwseta-green">
                            Account recovery
                        </p>
                        <h1 className="text-center text-2xl font-bold text-slate-900">Reset your password</h1>
                        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
                            Enter a new password for your HWSETA Beneficiary Hub account.
                        </p>

                        {!token && (
                            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                This reset link is missing or invalid. Please request a new password reset link.
                            </div>
                        )}

                        {status.type && (
                            <div className={`mt-5 rounded-xl border p-3 text-sm ${
                                status.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-red-200 bg-red-50 text-red-700'
                            }`}>
                                {status.message}
                            </div>
                        )}

                        {status.type === 'success' ? (
                            <div className="mt-6 text-center">
                                <Link href="/login" className="inline-flex items-center justify-center rounded-xl bg-hwseta-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-hwseta-green-dark">
                                    Back to sign in
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                                <div>
                                    <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        New password
                                    </label>
                                    <input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        required
                                        disabled={!token}
                                        className={inputClass}
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Use at least 8 characters with uppercase, lowercase, a number, and a special character.
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Confirm password
                                    </label>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        required
                                        disabled={!token}
                                        className={inputClass}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !token}
                                    className="w-full rounded-xl bg-hwseta-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-hwseta-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Resetting password...' : 'Reset password'}
                                </button>
                            </form>
                        )}

                        <p className="mt-6 text-center text-sm text-slate-600">
                            Need a new link?{' '}
                            <Link href="/forgot-password" className="font-semibold text-hwseta-green hover:text-hwseta-green-dark">
                                Start again
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordContent />
        </Suspense>
    );
}

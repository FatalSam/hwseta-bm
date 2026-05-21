'use client';

import Link from 'next/link';

interface ForgotPasswordProps {
    email: string;
    error: string | null;
    success: string | null;
    loading: boolean;
    onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export default function ForgotPassword({
    email,
    error,
    success,
    loading,
    onEmailChange,
    onSubmit,
}: ForgotPasswordProps) {
    const inputClass =
        'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-hwseta-green focus:border-hwseta-green transition-shadow';

    return (
        <section className="py-12 sm:py-16 md:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="max-w-md mx-auto">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-hwseta-green-muted p-6 sm:p-8">
                        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-hwseta-green mb-1 text-center">
                            Reset password
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900 text-center mb-1">Forgot your password?</h2>
                        <p className="text-slate-600 text-sm text-center mb-6">
                            Enter your email address and we&apos;ll send you a link to reset your password.
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl" role="alert">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 p-3 bg-hwseta-green-muted border border-hwseta-green/25 text-hwseta-green-dark text-sm rounded-xl" role="status">
                                {success}
                            </div>
                        )}

                        <form onSubmit={onSubmit} className="space-y-5">
                            <div>
                                <label className="block text-slate-700 text-sm font-medium mb-1.5" htmlFor="forgot-email">
                                    Email address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="forgot-email"
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={onEmailChange}
                                    placeholder="you@company.com"
                                    required
                                    disabled={!!success}
                                    className={inputClass}
                                />
                                <p className="text-xs text-slate-500 mt-1">Enter the email associated with your account</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !!success}
                                className="w-full py-3 px-6 rounded-xl bg-hwseta-green text-white font-semibold hover:bg-hwseta-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending…' : success ? 'Check your email' : 'Send reset link'}
                            </button>

                            <p className="text-center text-sm text-slate-600">
                                Remember your password?{' '}
                                <Link href="/login" className="font-medium text-hwseta-green hover:text-hwseta-green-dark transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

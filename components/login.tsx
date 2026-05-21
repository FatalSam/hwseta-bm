'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FormToggleSwitch } from '@/components/admin/FormToggleSwitch';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

interface LoginFormData {
    userName: string;
    password: string;
}

interface LoginProps {
    formData: LoginFormData;
    showPassword: boolean;
    error: string | null;
    isLoggingIn: boolean;
    isAuthenticated: boolean;
    onFormDataChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onShowPasswordToggle: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

export default function Login({
    formData,
    showPassword,
    error,
    isLoggingIn,
    isAuthenticated,
    onFormDataChange,
    onShowPasswordToggle,
    onSubmit
}: LoginProps) {
    const [rememberMe, setRememberMe] = useState(false);
    const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-hwseta-green focus:border-hwseta-green transition-shadow";

    if (isAuthenticated) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-hwseta-green mx-auto" />
                    <p className="mt-4 text-slate-600">Redirecting…</p>
                </div>
            </div>
        );
    }

    return (
        <section className="py-12 sm:py-16 md:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mx-auto max-w-[39.5rem]">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-hwseta-green-muted p-6 sm:p-8 md:p-9">
                        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-hwseta-green mb-1 text-center">
                            Sign in
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900 text-center mb-1">Welcome back</h2>
                        <p className="text-slate-600 text-sm text-center mb-6">Sign in to access your account</p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl" role="alert">
                                {error}
                            </div>
                        )}

                        <form onSubmit={onSubmit} className="space-y-5">
                            <div>
                                <label className="block text-slate-700 text-sm font-medium mb-1.5">Email</label>
                                <input
                                    type="text"
                                    name="userName"
                                    value={formData.userName}
                                    onChange={onFormDataChange}
                                    placeholder="Enter your email (same as when you registered)"
                                    required
                                    className={inputClass}
                                />
                                <p className="text-xs text-slate-500 mt-1">Beneficiary login uses your email as the username</p>
                            </div>

                            <div>
                                <label className="block text-slate-700 text-sm font-medium mb-1.5">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={onFormDataChange}
                                        placeholder="Enter your password"
                                        required
                                        className={`${inputClass} pr-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={onShowPasswordToggle}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-hwseta-green transition-colors"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <FormToggleSwitch
                                checked={rememberMe}
                                onChange={setRememberMe}
                                label="Remember me"
                                description="Stay signed in on this device."
                            />

                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full py-3 px-6 rounded-xl bg-hwseta-green text-white font-semibold hover:bg-hwseta-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoggingIn ? 'Signing in…' : 'Sign in'}
                            </button>

                            <p className="text-center text-sm text-slate-600">
                                Don&apos;t have an account?{' '}
                                <Link href="/signup" className="font-medium text-hwseta-green hover:text-hwseta-green-dark transition-colors">
                                    Register
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
} 
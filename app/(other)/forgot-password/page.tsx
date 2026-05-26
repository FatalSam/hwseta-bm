'use client';

import { useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/breadcrumb';
import { completePasswordReset, requestPasswordReset, verifyPasswordResetOtp } from '@/api/auth';
import type { PasswordResetAccountOption, PasswordResetChannel } from '@/types/auth';

type SmsStep = 'request' | 'verify' | 'select' | 'reset' | 'done';

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

export default function ForgotPasswordPage() {
    const [channel, setChannel] = useState<PasswordResetChannel>('email');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [requestId, setRequestId] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [availableUsers, setAvailableUsers] = useState<PasswordResetAccountOption[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [smsStep, setSmsStep] = useState<SmsStep>('request');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

    const inputClass = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-hwseta-green focus:outline-none focus:ring-2 focus:ring-hwseta-green/25';
    const buttonClass = 'inline-flex items-center justify-center rounded-xl bg-hwseta-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-hwseta-green-dark disabled:cursor-not-allowed disabled:opacity-50';

    const resetStatus = () => setStatus({ type: null, message: '' });

    const handleEmailRequest = async (event: React.FormEvent) => {
        event.preventDefault();
        resetStatus();
        if (!email.trim()) {
            setStatus({ type: 'error', message: 'Please enter your email address.' });
            return;
        }

        try {
            setIsSubmitting(true);
            const result = await requestPasswordReset({ channel: 'email', email: email.trim() });
            setStatus({ type: 'success', message: result.message || 'If this email is registered, a reset link has been sent.' });
        } catch (error) {
            setStatus({ type: 'error', message: getErrorMessage(error) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSmsRequest = async (event: React.FormEvent) => {
        event.preventDefault();
        resetStatus();
        if (!phoneNumber.trim()) {
            setStatus({ type: 'error', message: 'Please enter your cellphone number.' });
            return;
        }

        try {
            setIsSubmitting(true);
            const result = await requestPasswordReset({ channel: 'sms', phoneNumber: phoneNumber.trim() });
            if (!result.requestId) {
                setStatus({ type: 'success', message: result.message || 'If this cellphone number is registered, an OTP has been sent.' });
                return;
            }
            setRequestId(result.requestId);
            setSmsStep('verify');
            setStatus({ type: 'success', message: result.message || 'OTP has been sent to your cellphone number.' });
        } catch (error) {
            setStatus({ type: 'error', message: getErrorMessage(error) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOtpVerify = async (event: React.FormEvent) => {
        event.preventDefault();
        resetStatus();
        if (!requestId || !/^\d{6}$/.test(otp.trim())) {
            setStatus({ type: 'error', message: 'Please enter the 6-digit OTP.' });
            return;
        }

        try {
            setIsSubmitting(true);
            const result = await verifyPasswordResetOtp({ requestId, otp: otp.trim() });
            const users = result.users ?? [];
            setAvailableUsers(users);
            if (users.length === 0) {
                setStatus({ type: 'error', message: 'No usernames were found for this cellphone number.' });
                return;
            }
            setSelectedUserId('');
            setSmsStep('select');
            setStatus({ type: 'success', message: 'OTP verified successfully. Please select which username you want to reset.' });
        } catch (error) {
            setStatus({ type: 'error', message: getErrorMessage(error) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSmsReset = async (event: React.FormEvent) => {
        event.preventDefault();
        resetStatus();
        if (!selectedUserId) {
            setStatus({ type: 'error', message: 'Please select which username you want to reset.' });
            setSmsStep('select');
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
            const result = await completePasswordReset({ requestId, otp: otp.trim(), userId: selectedUserId, newPassword });
            setSmsStep('done');
            setStatus({ type: 'success', message: result.message || 'Password reset successfully. You can now sign in.' });
        } catch (error) {
            setStatus({ type: 'error', message: getErrorMessage(error) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetSmsFlow = () => {
        setOtp('');
        setRequestId('');
        setAvailableUsers([]);
        setSelectedUserId('');
        setNewPassword('');
        setConfirmPassword('');
        setSmsStep('request');
        resetStatus();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-hwseta-green-muted/40">
            <Breadcrumb breadcrumbTitle="Forgotten Password" />
            <section className="py-12 sm:py-16 md:py-20">
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                    <div className="rounded-2xl border border-hwseta-green-muted bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
                        <p className="mb-1 text-center text-xs font-semibold uppercase tracking-[0.18em] text-hwseta-green">
                            Account recovery
                        </p>
                        <h1 className="text-center text-2xl font-bold text-slate-900">Forgotten password?</h1>
                        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
                            Reset your password using an email reset link or a one-time PIN sent to your registered cellphone number.
                        </p>

                        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                            {(['email', 'sms'] as const).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        setChannel(option);
                                        resetStatus();
                                    }}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                        channel === option
                                            ? 'bg-white text-hwseta-green-dark shadow-sm'
                                            : 'text-slate-600 hover:text-hwseta-green-dark'
                                    }`}
                                >
                                    {option === 'email' ? 'Email reset link' : 'SMS OTP'}
                                </button>
                            ))}
                        </div>

                        {status.type && (
                            <div className={`mt-5 rounded-xl border p-3 text-sm ${
                                status.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-red-200 bg-red-50 text-red-700'
                            }`}>
                                {status.message}
                            </div>
                        )}

                        {channel === 'email' && (
                            <form onSubmit={handleEmailRequest} className="mt-6 space-y-5">
                                <div>
                                    <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Email address
                                    </label>
                                    <input
                                        id="reset-email"
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="Enter your registered email"
                                        required
                                        className={inputClass}
                                    />
                                </div>
                                <button type="submit" disabled={isSubmitting} className={`${buttonClass} w-full`}>
                                    {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
                                </button>
                            </form>
                        )}

                        {channel === 'sms' && smsStep === 'request' && (
                            <form onSubmit={handleSmsRequest} className="mt-6 space-y-5">
                                <div>
                                    <label htmlFor="reset-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Cellphone number
                                    </label>
                                    <input
                                        id="reset-phone"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(event) => setPhoneNumber(event.target.value)}
                                        placeholder="0821234567 or +27821234567"
                                        required
                                        className={inputClass}
                                    />
                                </div>
                                <button type="submit" disabled={isSubmitting} className={`${buttonClass} w-full`}>
                                    {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                                </button>
                            </form>
                        )}

                        {channel === 'sms' && smsStep === 'verify' && (
                            <form onSubmit={handleOtpVerify} className="mt-6 space-y-5">
                                <div>
                                    <label htmlFor="reset-otp" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        OTP
                                    </label>
                                    <input
                                        id="reset-otp"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        required
                                        className={`${inputClass} text-center text-xl tracking-[0.45em]`}
                                    />
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                                    <button type="button" onClick={resetSmsFlow} className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 hover:text-hwseta-green-dark">
                                        Start again
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className={buttonClass}>
                                        {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {channel === 'sms' && smsStep === 'select' && (
                            <div className="mt-6 space-y-5 rounded-xl border border-slate-200 p-5">
                                <p className="text-sm text-slate-600">
                                    Select which username linked to this cellphone number you want to reset.
                                </p>
                                <div className="space-y-3">
                                    {availableUsers.map((user) => (
                                        <button
                                            key={user.userId}
                                            type="button"
                                            onClick={() => {
                                                setSelectedUserId(user.userId);
                                                setSmsStep('reset');
                                                resetStatus();
                                            }}
                                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-hwseta-green hover:bg-emerald-50/40"
                                        >
                                            <span>{user.username}</span>
                                            <span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500">
                                                Select
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <button type="button" onClick={resetSmsFlow} className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 hover:text-hwseta-green-dark">
                                    Start again
                                </button>
                            </div>
                        )}

                        {channel === 'sms' && smsStep === 'reset' && (
                            <form onSubmit={handleSmsReset} className="mt-6 space-y-5">
                                {selectedUserId && (
                                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                        Resetting password for{' '}
                                        <strong>
                                            {availableUsers.find((user) => user.userId === selectedUserId)?.username ?? 'selected account'}
                                        </strong>
                                        .
                                    </p>
                                )}
                                <div>
                                    <label htmlFor="sms-new-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        New password
                                    </label>
                                    <input
                                        id="sms-new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        required
                                        className={inputClass}
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Use at least 8 characters with uppercase, lowercase, a number, and a special character.
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor="sms-confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Confirm password
                                    </label>
                                    <input
                                        id="sms-confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        required
                                        className={inputClass}
                                    />
                                </div>
                                <button type="submit" disabled={isSubmitting} className={`${buttonClass} w-full`}>
                                    {isSubmitting ? 'Resetting password...' : 'Reset password'}
                                </button>
                            </form>
                        )}

                        {channel === 'sms' && smsStep === 'done' && (
                            <div className="mt-6 text-center">
                                <Link href="/login" className={buttonClass}>
                                    Back to sign in
                                </Link>
                            </div>
                        )}

                        <p className="mt-6 text-center text-sm text-slate-600">
                            Remembered your password?{' '}
                            <Link href="/login" className="font-semibold text-hwseta-green hover:text-hwseta-green-dark">
                                Back to sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

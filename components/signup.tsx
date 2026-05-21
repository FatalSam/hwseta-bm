'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdErrorOutline } from 'react-icons/md';
import { useAuth } from '@/hooks/useAuth';
import { useRedirectIfAuthenticated } from '@/hooks/useRedirectIfAuthenticated';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { FormToggleSwitch } from '@/components/admin/FormToggleSwitch';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SA_PHONE_REGEX = /^(?:\+27|0)[0-9]{9}$/;

function isValidEmail(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.length > 0 && EMAIL_REGEX.test(trimmed);
}

function isValidSaPhone(value: string): boolean {
    const normalized = value.replace(/[\s\-()]/g, '');
    return SA_PHONE_REGEX.test(normalized);
}

const PASSWORD_MIN_LENGTH = 8;

function getPasswordError(password: string): string | null {
    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must include at least one uppercase letter.';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must include at least one lowercase letter.';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must include at least one number.';
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return 'Password must include at least one special character (e.g. !@#$%^&*).';
    }
    return null;
}

function firstMeaningfulString(value: unknown): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const found = firstMeaningfulString(item);
            if (found) return found;
        }
    }

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;

        const directKeys = ['message', 'error', 'detail', 'title', 'exceptionMessage'];
        for (const key of directKeys) {
            const found = firstMeaningfulString(record[key]);
            if (found) return found;
        }

        if (record.errors && typeof record.errors === 'object') {
            const found = firstMeaningfulString(Object.values(record.errors));
            if (found) return found;
        }

        for (const nestedValue of Object.values(record)) {
            const found = firstMeaningfulString(nestedValue);
            if (found) return found;
        }
    }

    return null;
}

function normalizeSignupErrorMessage(error: unknown): string {
    const responseData =
        error && typeof error === 'object' && 'responseData' in error
            ? (error as { responseData?: unknown }).responseData
            : null;

    const rawMessage = firstMeaningfulString(responseData)
        || (error instanceof Error ? error.message : null)
        || 'Registration failed. Please try again.';

    const normalized = rawMessage.toLowerCase();

    if (
        normalized.includes('email') && (normalized.includes('exists') || normalized.includes('taken') || normalized.includes('duplicate'))
    ) {
        return 'That email address is already registered. Please use another email or sign in.';
    }

    if (normalized.includes('phone') && (normalized.includes('exists') || normalized.includes('duplicate'))) {
        return 'That phone number is already registered. Please use another number.';
    }

    if (normalized.includes('server error') || normalized.includes('internal server error')) {
        return 'We could not create your account right now. Please check your details and try again.';
    }

    return rawMessage;
}

export default function Signup() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: ''
    });
    const { register, isRegistering } = useAuth();
    const { isAuthenticated } = useRedirectIfAuthenticated();
    const router = useRouter();

    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => {
            setError(null);
        }, 4500);

        return () => clearTimeout(timer);
    }, [error]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name } = e.target;
        let { value } = e.target;

        if (name === 'phoneNumber') {
            value = value.replace(/[^0-9+\s\-()]/g, '');
        }

        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
        if (name === 'email') setEmailError(null);
        if (name === 'phoneNumber') setPhoneError(null);
        if (name === 'password') setPasswordError(null);
        if (name === 'confirmPassword') setConfirmPasswordError(null);
    };

    const validateEmailField = () => {
        const v = formData.email.trim();
        if (!v) {
            setEmailError('Email address is required.');
            return;
        }
        if (!isValidEmail(formData.email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }
        setEmailError(null);
    };

    const validatePhoneField = () => {
        const v = formData.phoneNumber.trim();
        if (!v) {
            setPhoneError('Phone number is required.');
            return;
        }
        if (!isValidSaPhone(formData.phoneNumber)) {
            setPhoneError('Use a South African number: +27 or 0 followed by 9 digits (e.g. +27 82 123 4567 or 0821234567).');
            return;
        }
        setPhoneError(null);
    };

    const validatePasswordField = () => {
        if (!formData.password) {
            setPasswordError('Password is required.');
            return;
        }
        const err = getPasswordError(formData.password);
        setPasswordError(err);
    };

    const validateConfirmPasswordField = () => {
        if (!formData.confirmPassword) {
            setConfirmPasswordError('Please confirm your password.');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setConfirmPasswordError('Passwords do not match.');
            return;
        }
        setConfirmPasswordError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setEmailError(null);
        setPhoneError(null);
        setPasswordError(null);
        setConfirmPasswordError(null);

        if (!termsAccepted) {
            setError('You must agree to continue.');
            return;
        }

        if (!formData.firstName.trim()) {
            setError('First name is required.');
            return;
        }
        if (!formData.lastName.trim()) {
            setError('Last name is required.');
            return;
        }

        if (!formData.email.trim()) {
            setEmailError('Email address is required.');
            setError('Email address is required.');
            return;
        }
        if (!isValidEmail(formData.email)) {
            setEmailError('Please enter a valid email address.');
            setError('Please enter a valid email address.');
            return;
        }

        if (!formData.phoneNumber.trim()) {
            setPhoneError('Phone number is required.');
            setError('Phone number is required.');
            return;
        }
        if (!isValidSaPhone(formData.phoneNumber)) {
            setPhoneError('Please enter a valid South African phone number.');
            setError('Please enter a valid South African phone number.');
            return;
        }

        if (!formData.password) {
            setPasswordError('Password is required.');
            setError('Password is required.');
            return;
        }
        const passwordErr = getPasswordError(formData.password);
        if (passwordErr) {
            setPasswordError(passwordErr);
            setError(passwordErr);
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setConfirmPasswordError('Passwords do not match.');
            setError('Passwords do not match.');
            return;
        }

        try {
            await register({
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                phoneNumber: formData.phoneNumber.replace(/[\s\-()]/g, ''),
                password: formData.password,
            });
            const { isBeneficiary, logout } = useAuthStore.getState();
            if (!isBeneficiary()) {
                logout();
                setError('Registration succeeded, but this portal is only for beneficiary accounts. Please contact support if you believe this is an error.');
                return;
            }
            router.replace('/dashboard/beneficiary');
        } catch (err: unknown) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Registration failed:', err);
            }
            setError(normalizeSignupErrorMessage(err));
        }
    };

    const isFormValid =
        !!formData.firstName.trim() &&
        !!formData.lastName.trim() &&
        isValidEmail(formData.email) &&
        isValidSaPhone(formData.phoneNumber) &&
        !!formData.password &&
        getPasswordError(formData.password) === null &&
        formData.password === formData.confirmPassword &&
        termsAccepted;

    const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-hwseta-green focus:border-hwseta-green transition-shadow";
    const inputErrorClass = "!border-red-300 focus:!ring-red-500 focus:!border-red-500";
    const labelClass = "block text-slate-700 text-sm font-medium mb-1.5";

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
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-hwseta-green-muted p-6 sm:p-8 md:p-9">
                        {error && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
                                <div
                                    className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-3xl border border-red-100 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl"
                                    role="alert"
                                    aria-live="assertive"
                                >
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-orange-400" />
                                    <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg shadow-red-200">
                                                <MdErrorOutline className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-semibold tracking-tight text-slate-900">Registration error</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-600">{error}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setError(null)}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
                                            aria-label="Close error message"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-hwseta-green mb-1 text-center">
                            Beneficiary registration
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900 text-center mb-1">Create your account</h2>
                        <p className="text-slate-600 text-sm text-center mb-6">Register with your email; you will sign in with the same email address.</p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass} htmlFor="reg-firstname">First name <span className="text-red-500">*</span></label>
                                    <input id="reg-firstname" type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First name" required className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="reg-lastname">Last name <span className="text-red-500">*</span></label>
                                    <input id="reg-lastname" type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last name" required className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass} htmlFor="reg-email">Email Address <span className="text-red-500">*</span></label>
                                    <input id="reg-email" type="email" name="email" value={formData.email} onChange={handleChange} onBlur={validateEmailField} placeholder="support@mybeneficiary.co.za" required aria-invalid={!!emailError} aria-describedby={emailError ? 'reg-email-error' : undefined} className={`${inputClass} ${emailError ? inputErrorClass : ''}`} />
                                    {emailError && <p id="reg-email-error" className="text-xs text-red-600 mt-1" role="alert">{emailError}</p>}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="reg-phone">Mobile Number <span className="text-red-500">*</span></label>
                                    <input
                                        id="reg-phone"
                                        type="tel"
                                        name="phoneNumber"
                                        inputMode="tel"
                                        pattern="[0-9+\s\-()]*"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        onBlur={validatePhoneField}
                                        placeholder="0821234567 or +27821234567"
                                        required
                                        aria-invalid={!!phoneError}
                                        aria-describedby={[phoneError ? 'reg-phone-error' : '', 'reg-phone-hint'].filter(Boolean).join(' ') || undefined}
                                        className={`${inputClass} ${phoneError ? inputErrorClass : ''}`}
                                    />
                                    {phoneError && <p id="reg-phone-error" className="text-xs text-red-600 mt-1" role="alert">{phoneError}</p>}
                                    <p id="reg-phone-hint" className="text-xs text-slate-500 mt-1">South African format: 0821234567 or +27821234567</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass} htmlFor="reg-password">Password <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input id="reg-password" type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} onBlur={validatePasswordField} placeholder="Min 8 chars, upper, lower, number, special" required minLength={PASSWORD_MIN_LENGTH} aria-invalid={!!passwordError} aria-describedby={passwordError ? 'reg-password-error' : undefined} className={`${inputClass} pr-10 ${passwordError ? inputErrorClass : ''}`} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-hwseta-green transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                            {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {passwordError && <p id="reg-password-error" className="text-xs text-red-600 mt-1" role="alert">{passwordError}</p>}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="reg-confirm">Confirm password <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input id="reg-confirm" type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={validateConfirmPasswordField} placeholder="Confirm password" required aria-invalid={!!confirmPasswordError} aria-describedby={confirmPasswordError ? 'reg-confirm-error' : undefined} className={`${inputClass} pr-10 ${confirmPasswordError ? inputErrorClass : ''}`} />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-hwseta-green transition-colors" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                                            {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {confirmPasswordError && <p id="reg-confirm-error" className="text-xs text-red-600 mt-1" role="alert">{confirmPasswordError}</p>}
                                </div>
                            </div>

                            <FormToggleSwitch
                                checked={termsAccepted}
                                onChange={setTermsAccepted}
                                label="I agree to the terms and conditions"
                                description="You must accept before creating an account."
                            />

                            <button type="submit" disabled={!isFormValid || isRegistering} className="w-full py-3 px-6 rounded-xl bg-hwseta-green text-white font-semibold hover:bg-hwseta-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {isRegistering ? 'Creating account…' : 'Register'}
                            </button>

                            <p className="text-center text-sm text-slate-600">
                                Already have an account? <Link href="/login" className="font-medium text-hwseta-green hover:text-hwseta-green-dark transition-colors">Sign in</Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

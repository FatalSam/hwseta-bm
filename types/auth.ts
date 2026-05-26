export interface Login {
    userName: string;
    password: string;
}

export interface User {
    userID: string;
    firstName: string;
    lastName: string;
    email: string;
    userName: string;
    companyID: string;
    companyName: string;
    role: string;
}

export interface LoginResponse {
    user: User;
    token: string;
    refreshToken?: string | null;
}

/** HWSETA Beneficiary API — POST /api/Auth/Register */
export interface RegisterBeneficiary {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
}

export type PasswordResetChannel = 'email' | 'sms';

export interface PasswordResetRequestPayload {
    channel: PasswordResetChannel;
    email?: string;
    phoneNumber?: string;
}

export interface PasswordResetRequestResult {
    success: boolean;
    message: string;
    channel: PasswordResetChannel;
    requestId?: string;
    expiresAt?: string;
}

export interface PasswordResetVerifyPayload {
    requestId: string;
    otp: string;
}

export interface PasswordResetCompletePayload {
    token?: string;
    requestId?: string;
    otp?: string;
    userId?: string;
    newPassword: string;
}

export interface PasswordResetAccountOption {
    userId: string;
    username: string;
}

export interface PasswordResetResult {
    success: boolean;
    message: string;
    users?: PasswordResetAccountOption[];
}

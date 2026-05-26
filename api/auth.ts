import apiClient from "@/ultis/apiClient";
import { buildUserFromToken } from "@/lib/jwt-utils";
import type {
    Login,
    LoginResponse,
    PasswordResetCompletePayload,
    PasswordResetAccountOption,
    PasswordResetRequestPayload,
    PasswordResetRequestResult,
    PasswordResetResult,
    PasswordResetVerifyPayload,
    RegisterBeneficiary,
    User,
} from "@/types/auth";

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

/**
 * Normalizes HWSETA Auth responses: API may return `{ token }` only, or full user + refreshToken.
 */
export function normalizeLoginResponse(data: unknown): LoginResponse {
    if (!isRecord(data)) {
        throw new Error("Invalid login response.");
    }

    const token = typeof data.token === "string" ? data.token : "";
    if (!token) {
        throw new Error("No token in response.");
    }

    const refreshToken =
        typeof data.refreshToken === "string" ? data.refreshToken : null;

    let user: User;
    if (isRecord(data.user)) {
        const u = data.user;
        const fromJwt = buildUserFromToken(token);
        user = {
            userID: String(u.userID ?? u.userId ?? fromJwt.userID),
            firstName: String(u.firstName ?? fromJwt.firstName),
            lastName: String(u.lastName ?? fromJwt.lastName),
            email: String(u.email ?? fromJwt.email),
            userName: String(u.userName ?? u.email ?? fromJwt.userName),
            companyID: String(u.companyID ?? u.companyId ?? ""),
            companyName: String(u.companyName ?? ""),
            role: String(u.role ?? fromJwt.role),
        };
    } else {
        user = buildUserFromToken(token);
    }

    return { user, token, refreshToken };
}

export const login = async (credentials: Login): Promise<LoginResponse> => {
    const response = await apiClient.post<unknown>("/api/Auth/Login", credentials);
    return normalizeLoginResponse(response.data);
};

export const register = async (
    payload: RegisterBeneficiary
): Promise<LoginResponse> => {
    const response = await apiClient.post<unknown>("/api/Auth/Register", payload);
    return normalizeLoginResponse(response.data);
};

export const requestPasswordReset = async (
    payload: PasswordResetRequestPayload
): Promise<PasswordResetRequestResult> => {
    const response = await apiClient.post<PasswordResetRequestResult>("/api/Auth/password-reset/request", payload);
    return response.data;
};

function normalizePasswordResetResult(data: unknown): PasswordResetResult {
    const obj = isRecord(data) ? data : {};
    const rawUsers = Array.isArray(obj.users) ? obj.users : Array.isArray(obj.Users) ? obj.Users : [];
    const users: PasswordResetAccountOption[] = rawUsers.flatMap((raw) => {
        if (!isRecord(raw)) return [];
        const userId = raw.userId ?? raw.UserId ?? raw.userID ?? raw.UserID;
        const username = raw.username ?? raw.Username ?? raw.userName ?? raw.UserName ?? raw.email ?? raw.Email;
        if (userId == null || username == null || String(userId).trim() === '' || String(username).trim() === '') {
            return [];
        }
        return [{ userId: String(userId), username: String(username) }];
    });

    return {
        success: Boolean(obj.success ?? obj.Success),
        message: String(obj.message ?? obj.Message ?? ''),
        ...(users.length > 0 ? { users } : {}),
    };
}

export const verifyPasswordResetOtp = async (
    payload: PasswordResetVerifyPayload
): Promise<PasswordResetResult> => {
    const response = await apiClient.post<unknown>("/api/Auth/password-reset/verify-otp", payload);
    return normalizePasswordResetResult(response.data);
};

export const completePasswordReset = async (
    payload: PasswordResetCompletePayload
): Promise<PasswordResetResult> => {
    const response = await apiClient.post<unknown>("/api/Auth/password-reset/complete", payload);
    return normalizePasswordResetResult(response.data);
};

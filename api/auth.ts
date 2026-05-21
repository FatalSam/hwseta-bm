import apiClient from "@/ultis/apiClient";
import { buildUserFromToken } from "@/lib/jwt-utils";
import type { Login, LoginResponse, RegisterBeneficiary, User } from "@/types/auth";

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

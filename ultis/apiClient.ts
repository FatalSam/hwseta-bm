import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { environment } from "@/config/environment";
import { buildUserFromToken } from "@/lib/jwt-utils";

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

/** Lock: only one refresh runs at a time; concurrent 401s wait on this. */
let refreshPromise: Promise<boolean> | null = null;

function getRequestUrl(config: { url?: string; baseURL?: string }): string {
    const url = config.url ?? '';
    const base = config.baseURL ?? '';
    return url.startsWith('http') ? url : `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

function isRefreshTokenRequest(config: { url?: string; baseURL?: string }): boolean {
    return getRequestUrl(config).toLowerCase().includes('refresh-token');
}

/** Matches /api/Auth/... and legacy /api/auth/... */
function isAuthRequest(config: { url?: string; baseURL?: string }): boolean {
    return getRequestUrl(config).toLowerCase().includes('/api/auth/');
}

async function tryRefresh(): Promise<boolean> {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return false;
    try {
        const { data } = await axios.post<Record<string, unknown>>(
            `${environment.apiUrl.replace(/\/$/, '')}/api/auth/refresh-token`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 30000 }
        );
        const token = typeof data.token === 'string' ? data.token : '';
        if (!token) return false;
        const rt = typeof data.refreshToken === 'string' ? data.refreshToken : null;
        useAuthStore.getState().login(buildUserFromToken(token), token, rt);
        return true;
    } catch {
        return false;
    } finally {
        refreshPromise = null;
    }
}

const apiClient = axios.create({
    baseURL: environment.apiUrl,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    // Set default timeout to 30 seconds
    timeout: 30000
});

// Add a request interceptor to add the auth token to requests
apiClient.interceptors.request.use(
    (config) => {
        // Get the token from the auth store
        const token = useAuthStore.getState().token;
        
        // Do not attach stale auth headers to login/register endpoints.
        if (token && !isAuthRequest(config)) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Only log in development mode
        if (environment.isDevelopment) {
            console.log('API Client Request:', {
                url: config.url,
                method: config.method,
                baseURL: config.baseURL,
            });
        }
        
        return config;
    },
    (error) => {
        if (environment.isDevelopment) {
            // Safely log request error without circular references
            const errorInfo: Record<string, unknown> = {
                message: error.message || 'Request error',
            };
            if (error.code) {
                errorInfo.code = error.code;
            }
            console.error('API Client Request Error:', errorInfo);
        }
        return Promise.reject(error);
    }
);

// Helper function to get user-friendly error message
const getUserFriendlyErrorMessage = (error: any): string => {
    // Network errors (no response from server)
    if (!error.response) {
        if (error.code === 'ERR_NETWORK') {
            return 'Unable to connect to the server. Please check your internet connection and try again.';
        }
        if (error.code === 'ECONNABORTED') {
            return 'The request took too long. Please try again.';
        }
        if (error.message?.includes('Network Error')) {
            return 'Network error. Please check your connection and try again.';
        }
        return 'Unable to reach the server. Please check your connection and try again.';
    }

    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const errorData = error.response?.data;
    const isAuthEndpoint = isAuthRequest(error.config ?? {});

    // Handle specific HTTP status codes
    switch (status) {
        case 400:
            return errorData?.message || 'Invalid request. Please check your input and try again.';
        case 401:
            if (isAuthEndpoint && !isRefreshTokenRequest(error.config ?? {})) {
                return errorData?.message || 'Invalid username/email or password. Please try again.';
            }
            return SESSION_EXPIRED_MESSAGE;
        case 403:
            return 'You do not have permission to perform this action.';
        case 404:
            return 'The requested resource was not found.';
        case 408:
            return 'Request timeout. Please try again.';
        case 429:
            return 'Too many requests. Please wait a moment and try again.';
        case 500:
            return 'Server error. Our team has been notified. Please try again later.';
        case 502:
            return 'Bad gateway. The server is temporarily unavailable. Please try again later.';
        case 503:
            return 'Service unavailable. The server is temporarily down. Please try again later.';
        case 504:
            return 'Gateway timeout. The server took too long to respond. Please try again.';
        default:
            if (status >= 500) {
                return 'Server error. Please try again later.';
            }
            if (status >= 400) {
                return errorData?.message || `Error: ${statusText || status}`;
            }
            return errorData?.message || 'An unexpected error occurred. Please try again.';
    }
};

// Add a response interceptor to handle common errors
apiClient.interceptors.response.use(
    (response) => {
        // Only log in development mode
        if (environment.isDevelopment) {
            console.log('API Client Response Success:', {
                url: response.config.url,
                status: response.status,
            });
        }
        return response;
    },
    async (error) => {
        // Get user-friendly error message
        const userMessage = getUserFriendlyErrorMessage(error);
        const status = error.response?.status;

        // 401: try refresh once (unless this was the refresh request), then logout and redirect on failure
        if (status === 401) {
            const config = error.config ?? {};
            if (isAuthRequest(config) && !isRefreshTokenRequest(config)) {
                const err = new Error(userMessage) as Error & { status?: number; responseData?: unknown };
                err.status = 401;
                if (error.response?.data) {
                    try {
                        JSON.stringify(error.response.data);
                        err.responseData = error.response.data;
                    } catch {
                        // Ignore non-serializable response data
                    }
                }
                return Promise.reject(err);
            }
            if (isRefreshTokenRequest(config)) {
                useAuthStore.getState().logout();
                if (typeof window !== 'undefined') window.location.href = '/login';
                const err = new Error(userMessage) as Error & { status?: number };
                err.status = 401;
                return Promise.reject(err);
            }
            const hasRefreshToken = !!useAuthStore.getState().refreshToken;
            if (hasRefreshToken) {
                if (!refreshPromise) refreshPromise = tryRefresh();
                const refreshed = await refreshPromise;
                if (refreshed) {
                    return apiClient.request(config);
                }
            }
            useAuthStore.getState().logout();
            if (typeof window !== 'undefined') window.location.href = '/login';
            const err = new Error(userMessage) as Error & { status?: number };
            err.status = 401;
            return Promise.reject(err);
        }

        // Determine if this is a network error (expected and less critical)
        const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED');
        
        // Determine if this is a 404 error (resource not found - often expected for optional endpoints)
        const isNotFoundError = error.response?.status === 404;
        
        // Only log detailed errors in development mode
        // Network errors and 404s are expected and handled gracefully, so we log them at a lower level
        if (environment.isDevelopment) {
            // These API failures are handled by the UI, so avoid console.error which Next.js surfaces as an app error overlay.
            const logMethod = console.warn;
            const logPrefix = isNetworkError ? 'API Client Network Issue' : 
                            isNotFoundError ? 'API Client Resource Not Found' : 
                            'API Client Response Error';
            
            // Safely extract error information to avoid circular references
            // Build a structured error info object with guaranteed values
            const errorInfo: Record<string, unknown> = {
                message: userMessage || 'Unknown error',
                url: error.config?.url || error.url || 'unknown',
                method: (error.config?.method || error.method || 'unknown').toUpperCase(),
            };
            
            // Include status if available
            if (error.response?.status) {
                errorInfo.status = error.response.status;
            }
            
            // Include original error message if available and different from user message
            if (error.message && error.message !== userMessage) {
                errorInfo.originalMessage = error.message;
            }
            
            // Include error code if available
            if (error.code) {
                errorInfo.code = error.code;
            }
            
            // Include response data if available and safe to serialize
            if (error.response?.data) {
                try {
                    const serialized = JSON.stringify(error.response.data);
                    if (serialized && serialized !== '{}') {
                        errorInfo.responseData = error.response.data;
                    }
                } catch {
                    // Skip if not serializable
                }
            }
            
            // Always log - we now guarantee at least message, url, and method
            logMethod(`${logPrefix}:`, errorInfo);
        }
        
        // Create a standardized error object without circular references
        // Make it an Error instance so it has proper stack trace
        const errorInstance = new Error(userMessage) as any;
        
        // Add properties directly to the error instance
        errorInstance.message = userMessage;
        if (error.response?.status) {
            errorInstance.status = error.response.status;
        }
        if (error.code) {
            errorInstance.code = error.code;
        }
        if (error.config?.url) {
            errorInstance.url = error.config.url;
        }
        if (error.config?.method) {
            errorInstance.method = error.config.method;
        }
        // Only include responseData if it's safe to serialize
        if (error.response?.data) {
            try {
                // Try to serialize to ensure it's safe
                JSON.stringify(error.response.data);
                errorInstance.responseData = error.response.data;
            } catch {
                // If it can't be serialized, skip it
            }
        }
        
        return Promise.reject(errorInstance);
    }
);

export default apiClient;
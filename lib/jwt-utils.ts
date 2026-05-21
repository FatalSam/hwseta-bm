import { jwtDecode } from 'jwt-decode';
import type { User } from '@/types/auth';

/** Seconds before expiry at which we consider the token expired (buffer) */
const EXPIRY_BUFFER_SECONDS = 60;

interface JWTPayload {
  role?: string;
  Role?: string;
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  unique_name?: string;
  /** Expiration time (seconds since epoch). Standard JWT claim. */
  exp?: number;
  /** Issued at (seconds since epoch). Standard JWT claim. */
  iat?: number;
  [key: string]: unknown;
}

const EMAIL_CLAIM =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
const NAME_CLAIM =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
const MS_ROLE_CLAIM =
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

function roleFromPayload(payload: JWTPayload | null): string | null {
  if (!payload) return null;
  if (typeof payload.Role === 'string' && payload.Role) return payload.Role;
  if (typeof payload.role === 'string' && payload.role) return payload.role;
  const ms = payload[MS_ROLE_CLAIM];
  if (typeof ms === 'string' && ms) return ms;
  if (Array.isArray(ms) && ms.length > 0) return String(ms[0]);
  return null;
}

/**
 * Decodes a JWT token and returns its payload
 * @param token - The JWT token string
 * @returns The decoded payload or null if decoding fails
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Extracts the user role from a JWT token
 * Checks for both "role" and "Role" to handle different token formats
 * @param token - The JWT token string or null
 * @returns The role string or null if not found or token is invalid
 */
export function getUserRoleFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  const payload = decodeToken(token);
  return roleFromPayload(payload);
}

/**
 * Checks if a role is an admin role (case-insensitive)
 * @param role - The role string to check
 * @returns true if the role is admin, false otherwise
 */
export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }
  return role.toLowerCase() === 'admin';
}

/**
 * Beneficiary-only portal: JWT role claim should be "Beneficiary" (case-insensitive).
 */
export function isBeneficiaryRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }
  return role.toLowerCase() === 'beneficiary';
}

/**
 * Builds a minimal User from JWT when the API returns only { token }.
 * Merges standard and common .NET claim names.
 */
export function buildUserFromToken(token: string): User {
  const payload = decodeToken(token);
  if (!payload) {
    return {
      userID: '',
      firstName: 'User',
      lastName: '',
      email: '',
      userName: '',
      companyID: '',
      companyName: '',
      role: '',
    };
  }

  const email =
    (typeof payload.email === 'string' && payload.email) ||
    (typeof payload[EMAIL_CLAIM] === 'string' && payload[EMAIL_CLAIM]) ||
    (typeof payload.unique_name === 'string' && payload.unique_name.includes('@')
      ? payload.unique_name
      : '') ||
    '';

  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  const nameFromClaim =
    (typeof payload.name === 'string' && payload.name) ||
    (typeof payload[NAME_CLAIM] === 'string' && payload[NAME_CLAIM]) ||
    '';

  let firstName =
    (typeof payload.given_name === 'string' && payload.given_name) || '';
  let lastName =
    (typeof payload.family_name === 'string' && payload.family_name) || '';

  if (!firstName && nameFromClaim) {
    const parts = nameFromClaim.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  if (!firstName && email) {
    firstName = email.split('@')[0] || 'User';
  }
  if (!firstName) {
    firstName = 'User';
  }

  const role = getUserRoleFromToken(token) || '';

  return {
    userID: sub || email || '',
    firstName,
    lastName,
    email,
    userName: email || sub || '',
    companyID: '',
    companyName: '',
    role,
  };
}

/**
 * Returns the token expiry timestamp (seconds since epoch) or null if missing/invalid.
 * @param token - The JWT token string or null
 * @returns exp claim or null
 */
export function getTokenExpiry(token: string | null): number | null {
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return payload.exp;
}

/**
 * Checks if a JWT token is expired (or within the expiry buffer).
 * Tokens without an exp claim are treated as expired for safety.
 * @param token - The JWT token string or null
 * @returns true if the token is expired or invalid
 */
export function isTokenExpired(token: string | null): boolean {
  const exp = getTokenExpiry(token);
  if (exp === null) return true;
  const nowSeconds = Date.now() / 1000;
  return nowSeconds >= exp - EXPIRY_BUFFER_SECONDS;
}


import type { AuthSession, AuthUser } from './auth.service';

export const AUTH_SESSION_KEY = 'surmesure.auth.session';

const API_ROLES = new Set(['CLIENT', 'STYLIST', 'EMPLOYEE', 'ADMIN']);

export function isAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value) || typeof value['token'] !== 'string' || !value['token']) return false;
  if (typeof value['refreshToken'] !== 'string' || !value['refreshToken']) return false;

  return isAuthUser(value['data']);
}

export function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    API_ROLES.has(String(value['role'])) &&
    typeof value['firstName'] === 'string' &&
    typeof value['lastName'] === 'string' &&
    typeof value['email'] === 'string' &&
    typeof value['phone'] === 'string' &&
    typeof value['profileImage'] === 'string' &&
    typeof value['isActive'] === 'boolean'
  );
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const sessionStorageValue = window.sessionStorage.getItem(AUTH_SESSION_KEY);
    const legacyLocalValue = window.localStorage.getItem(AUTH_SESSION_KEY);
    const rawValue = sessionStorageValue ?? legacyLocalValue;
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : null;

    if (!isAuthSession(parsedValue)) {
      window.sessionStorage.removeItem(AUTH_SESSION_KEY);
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    if (!sessionStorageValue && legacyLocalValue) {
      window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(parsedValue));
      window.localStorage.removeItem(AUTH_SESSION_KEY);
    }

    return parsedValue;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // Keep the session in memory for this page when browser storage is disabled.
  }
}

export function clearStoredAuthSession(): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // Storage can be disabled by browser policy; the in-memory session is still cleared.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

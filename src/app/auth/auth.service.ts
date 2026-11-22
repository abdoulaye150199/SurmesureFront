import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { getApiUrl } from '../api-url';
import { SubscriptionPlan } from '../subscription-plans';
import {
  clearStoredAuthSession,
  isAuthSession,
  isAuthUser,
  readAuthSession,
  writeAuthSession,
} from './auth-session.storage';

export type AppAccountRole = 'client' | 'stylist' | 'employee' | 'admin';
export type ApiAccountRole = 'CLIENT' | 'STYLIST' | 'EMPLOYEE' | 'ADMIN';

export interface AuthUser {
  id: string;
  role: ApiAccountRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  approvalStatus?: 'pending' | 'approved';
  requestedPlan?: SubscriptionPlan | null;
  subscriptionPlan?: SubscriptionPlan | null;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  data: AuthUser;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  businessName?: string;
  requestedPlan?: SubscriptionPlan;
  phone: string;
  email: string;
  password: string;
}

export interface PendingRegistration {
  status: 'pending';
  message: string;
  data: AuthUser;
}

export function isPendingRegistration(
  value: AuthUser | PendingRegistration,
): value is PendingRegistration {
  return 'status' in value && value.status === 'pending';
}

export { AUTH_SESSION_KEY } from './auth-session.storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private googleConfigRequest?: Promise<{ clientId: string | null }>;
  private session: AuthSession | null = this.readSession();

  get user(): AuthUser | null {
    return this.session?.data ?? null;
  }

  get token(): string | null {
    return this.session?.token ?? null;
  }

  get isAuthenticated(): boolean {
    return !!this.session?.token && !!this.session.data.isActive;
  }

  get appRole(): AppAccountRole | null {
    if (this.user?.role === 'CLIENT') return 'client';
    if (this.user?.role === 'STYLIST') return 'stylist';
    if (this.user?.role === 'EMPLOYEE') return 'employee';
    if (this.user?.role === 'ADMIN') return 'admin';
    return null;
  }

  async login(email: string, password: string, role: AppAccountRole): Promise<AuthUser> {
    if (role === 'admin' && !/^\/admin(?:\/|$)/.test(window.location.pathname)) {
      throw new Error('Accès administrateur réservé à /admin.');
    }
    const endpoint = role === 'admin' ? '/auth/admin/login' : '/auth/login';
    return this.authenticate(endpoint, { email, password });
  }

  async register(
    role: Exclude<AppAccountRole, 'admin' | 'employee'>,
    payload: RegisterPayload,
  ): Promise<AuthUser | PendingRegistration> {
    const endpoint = role === 'stylist' ? '/auth/stylist/signup' : '/auth/register';
    return this.authenticate(endpoint, payload, true);
  }

  googleConfiguration(): Promise<{ clientId: string | null }> {
    return (this.googleConfigRequest ??= firstValueFrom(
      this.http
        .get<{ clientId: string | null }>(getApiUrl('/auth/google/config'))
        .pipe(timeout(15000)),
    ).catch((error: unknown) => {
      this.googleConfigRequest = undefined;
      throw error;
    }));
  }

  loginGoogle(credential: string): Promise<AuthUser> {
    return this.authenticate('/auth/google/login', { credential });
  }

  registerGoogle(
    payload: Omit<RegisterPayload, 'email' | 'password'> & {
      credential: string;
      role: 'client' | 'stylist';
    },
  ): Promise<AuthUser | PendingRegistration> {
    return this.authenticate('/auth/google/register', payload, true);
  }

  changeEmployeePassword(currentPassword: string, newPassword: string): Promise<AuthUser> {
    return this.authenticate('/auth/employee/password', { currentPassword, newPassword });
  }

  async validateSession(): Promise<boolean> {
    if (!this.token) return false;
    try {
      const response: unknown = await firstValueFrom(this.http.get<unknown>(getApiUrl('/auth/me')));
      if (!isAuthUser(response)) {
        this.clearSession();
        return false;
      }
      if (!this.session) return false;
      this.session = { ...this.session, data: response };
      writeAuthSession(this.session);
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500)) {
        return !!this.session?.token;
      }
      this.clearSession();
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.token) await firstValueFrom(this.http.post(getApiUrl('/auth/logout'), {}));
    } finally {
      this.clearSession();
    }
  }

  clearSession(): void {
    this.session = null;
    clearStoredAuthSession();
  }

  private authenticate(endpoint: string, body: object): Promise<AuthUser>;
  private authenticate(
    endpoint: string,
    body: object,
    allowPending: true,
  ): Promise<AuthUser | PendingRegistration>;
  private async authenticate(
    endpoint: string,
    body: object,
    allowPending = false,
  ): Promise<AuthUser | PendingRegistration> {
    try {
      const response: unknown = await firstValueFrom(
        this.http.post<unknown>(getApiUrl(endpoint), body).pipe(timeout(20000)),
      );
      if (
        allowPending &&
        typeof response === 'object' &&
        response !== null &&
        'status' in response &&
        response.status === 'pending' &&
        'data' in response &&
        isAuthUser(response.data) &&
        !response.data.isActive &&
        'message' in response &&
        typeof response.message === 'string'
      ) {
        return response as PendingRegistration;
      }
      if (!isAuthSession(response) || !response.data.isActive)
        throw new Error('Réponse d’authentification invalide.');
      if (
        response.data.role === 'ADMIN' &&
        (endpoint !== '/auth/admin/login' || !/^\/admin(?:\/|$)/.test(window.location.pathname))
      ) {
        throw new Error('Réponse d’authentification invalide.');
      }
      const session = response;
      this.session = session;
      writeAuthSession(session);
      return session.data;
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new Error('Le serveur met trop de temps à répondre. Réessayez.');
      }
      if (error instanceof HttpErrorResponse) {
        const message = error.error?.message;
        throw new Error(
          Array.isArray(message)
            ? message.join(' ')
            : message || 'Connexion impossible pour le moment.',
        );
      }
      if (error instanceof Error && error.message === 'Réponse d’authentification invalide.') {
        throw error;
      }
      throw new Error('Le serveur est momentanément indisponible. Réessayez.');
    }
  }

  private readSession(): AuthSession | null {
    return readAuthSession();
  }
}

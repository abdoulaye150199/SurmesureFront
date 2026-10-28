import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getApiUrl } from '../api-url';

export type AppAccountRole = 'client' | 'stylist' | 'admin';
export type ApiAccountRole = 'CLIENT' | 'STYLIST' | 'ADMIN';

export interface AuthUser {
  id: string;
  role: ApiAccountRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string;
  isActive: boolean;
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
  phone: string;
  email: string;
  password: string;
}

export const AUTH_SESSION_KEY = 'surmesure.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private session: AuthSession | null = this.readSession();

  constructor(private readonly http: HttpClient) {}

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
    if (this.user?.role === 'ADMIN') return 'admin';
    return null;
  }

  async login(email: string, password: string, role: AppAccountRole): Promise<AuthUser> {
    const endpoint = role === 'admin'
      ? '/auth/admin/login'
      : role === 'stylist'
        ? '/auth/stylist/login'
        : '/auth/client/login';
    return this.authenticate(endpoint, { email, password });
  }

  async register(role: Exclude<AppAccountRole, 'admin'>, payload: RegisterPayload): Promise<AuthUser> {
    const endpoint = role === 'stylist' ? '/auth/stylist/signup' : '/auth/register';
    return this.authenticate(endpoint, payload);
  }

  async validateSession(): Promise<boolean> {
    if (!this.token) return false;
    try {
      const user = await firstValueFrom(this.http.get<AuthUser>(getApiUrl('/auth/me')));
      if (!this.session) return false;
      this.session = { ...this.session, data: user };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(this.session));
      return true;
    } catch {
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
    localStorage.removeItem(AUTH_SESSION_KEY);
  }

  private async authenticate(endpoint: string, body: object): Promise<AuthUser> {
    try {
      const session = await firstValueFrom(this.http.post<AuthSession>(getApiUrl(endpoint), body));
      this.session = session;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      return session.data;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const message = error.error?.message;
        throw new Error(Array.isArray(message) ? message.join(' ') : message || 'Connexion impossible pour le moment.');
      }
      throw new Error('Le serveur est momentanément indisponible. Réessayez.');
    }
  }

  private readSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      return raw ? JSON.parse(raw) as AuthSession : null;
    } catch {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
  }

}

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, AUTH_SESSION_KEY } from './auth.service';

describe('AuthService offline session validation', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
      token: 'access-token',
      refreshToken: 'refresh-token',
      data: {
        id: 'stylist-user-1',
        role: 'STYLIST',
        firstName: 'Awa',
        lastName: 'Diop',
        email: 'awa@example.com',
        phone: '+221770000002',
        profileImage: '',
        isActive: true,
      },
    }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(AUTH_SESSION_KEY);
  });

  for (const [role, appRole] of [['CLIENT', 'client'], ['STYLIST', 'stylist'], ['EMPLOYEE', 'employee']] as const) {
    it(`detects the ${appRole} account through the shared login endpoint`, async () => {
      const login = auth.login('account@example.com', 'PrivatePassword2026', 'client');
      const request = http.expectOne(req => req.url.endsWith('/auth/login'));
      expect(request.request.body).toEqual({ email: 'account@example.com', password: 'PrivatePassword2026' });
      request.flush({ token: 'signed-token', refreshToken: 'refresh-token', data: { id: 'user', role, isActive: true } });
      expect((await login).role).toBe(role);
      expect(auth.appRole).toBe(appRole);
    });
  }

  it('keeps the dedicated administrator login endpoint', async () => {
    const login = auth.login('owner@example.com', 'PrivatePassword2026', 'admin');
    http.expectOne(req => req.url.endsWith('/auth/admin/login')).flush({ token: 'signed-token', refreshToken: 'refresh-token', data: { id: 'admin', role: 'ADMIN', isActive: true } });
    expect((await login).role).toBe('ADMIN');
  });

  it('keeps the signed-in user when session validation fails because the network is unavailable', async () => {
    const validation = auth.validateSession();
    http.expectOne((request) => request.url.endsWith('/auth/me')).error(new ProgressEvent('error'));

    expect(await validation).toBeTrue();
    expect(auth.user?.id).toBe('stylist-user-1');
    expect(localStorage.getItem(AUTH_SESSION_KEY)).not.toBeNull();
  });

  it('clears the session when the server confirms the token is unauthorized', async () => {
    const validation = auth.validateSession();
    http.expectOne((request) => request.url.endsWith('/auth/me')).flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(await validation).toBeFalse();
    expect(auth.user).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
  });
});

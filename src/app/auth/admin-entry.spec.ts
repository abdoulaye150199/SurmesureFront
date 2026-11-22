import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../app';
import { routes } from '../app.routes';
import { LoginComponent } from '../login/login';
import { AuthService, AuthUser, AUTH_SESSION_KEY } from './auth.service';

const admin = { id: 'admin', role: 'ADMIN', firstName: 'Owner', isActive: true } as AuthUser;

describe('Administrator entry URL', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter(routes)],
    });
  });
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('keeps a stored administrator session on the public homepage without restoring its dashboard', () => {
    const auth = TestBed.inject(AuthService);
    spyOnProperty(auth, 'user', 'get').and.returnValue(admin);
    spyOnProperty(auth, 'isAuthenticated', 'get').and.returnValue(true);
    spyOnProperty(auth, 'appRole', 'get').and.returnValue('admin');
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    spyOn(app, 'loadPublicCatalog').and.resolveTo();
    spyOn(app, 'loadPublicStylists').and.resolveTo();
    const restore = spyOn(
      app as unknown as {
        restoreAuthenticatedWorkspace(): Promise<void>;
      },
      'restoreAuthenticatedWorkspace',
    );
    fixture.detectChanges();
    expect(app.activeView).toBe('home');
    expect(restore).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('refuses an administrator session delivered through the public login flow', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const clear = spyOn(TestBed.inject(AuthService), 'clearSession');
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');
    app.onLoggedIn(admin);
    expect(clear).toHaveBeenCalled();
    expect(app.activeView).toBe('home');
    expect(app.authenticatedUser).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not reopen the administrator form on the homepage after cancelling /admin', () => {
    window.history.replaceState(null, '', '/admin');
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.loginRole).toBe('admin');
    app.closeLogin();
    window.history.replaceState(null, '', '/');
    app.openLogin();
    expect(app.loginRole).toBe('client');
  });

  it('refuses opening the administrator workspace from the public site', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');
    await app.openWorkspace('admin');
    expect(app.activeView).toBe('home');
    expect(app.loginRole).toBe('client');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('accepts administrator login on an administrator subpage and preserves the destination', () => {
    window.history.replaceState(null, '', '/admin/utilisateurs');
    const app = TestBed.createComponent(App).componentInstance;
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    app.onLoggedIn(admin);
    expect(app.activeView).toBe('admin');
    expect(app.authenticatedUser).toBe(admin);
    expect(navigate).toHaveBeenCalledWith('/admin/utilisateurs');
  });
});

describe('Successful administrator login', () => {
  it('emits the logged-in account without emitting the cancel event that leaves /admin', async () => {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: { login: jasmine.createSpy().and.resolveTo(admin) } },
      ],
    });
    const login = TestBed.createComponent(LoginComponent).componentInstance;
    login.initialRole = 'admin';
    login.loginEmail = 'owner@example.test';
    login.loginPassword = 'PrivatePassword2026!';
    const closed = spyOn(login.closed, 'emit');
    const loggedIn = spyOn(login.loggedIn, 'emit');
    await login.submit();
    expect(closed).not.toHaveBeenCalled();
    expect(loggedIn).toHaveBeenCalledWith(admin);
    expect(login.isOpen).toBeFalse();
  });
});

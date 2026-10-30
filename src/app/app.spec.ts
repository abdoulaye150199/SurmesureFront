import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { DashboardService } from './dashboard/dashboard.service';
import { OfflineWorkspaceStore } from './dashboard/offline-workspace.store';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('surmesure.selection');
    localStorage.removeItem('surmesure.favorites');
    localStorage.removeItem('surmesure.auth.session');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('normalizes employee contact details and displays API rejection in the dialog', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.stylistProfile = { id: 'atelier-1' } as typeof app.stylistProfile;
    app.employeeAccountEditorOpen = true;
    app.employeeAccountDraft = {
      firstName: ' Mame ', lastName: ' Sarr ', email: ' MAME@example.com ',
      phone: '+221 77 000 00 01', password: 'MotDePasse2026', specialization: ' Couture ',
    };
    const create = spyOn(TestBed.inject(DashboardService), 'createEmployeeAccount')
      .and.rejectWith(new HttpErrorResponse({ status: 409, error: { message: 'Cet e-mail ou ce numéro est déjà utilisé par un compte.' } }));

    await app.saveEmployeeAccount();

    expect(create).toHaveBeenCalledWith('atelier-1', jasmine.objectContaining({
      firstName: 'Mame', lastName: 'Sarr', email: 'mame@example.com', phone: '+221770000001',
    }));
    expect(app.employeeAccountError).toContain('déjà utilisé');
    expect(app.employeeAccountEditorOpen).toBeTrue();
    expect(app.employeeAccountSaving).toBeFalse();
  });

  it('does not send an employee account with a short password', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.employeeAccountDraft = {
      firstName: 'Mame', lastName: 'Sarr', email: 'mame@example.com',
      phone: '+221770000001', password: 'court', specialization: 'Couture',
    };
    const create = spyOn(TestBed.inject(DashboardService), 'createEmployeeAccount');
    await app.saveEmployeeAccount();
    expect(create).not.toHaveBeenCalled();
    expect(app.employeeAccountError).toContain('10 caractères');
  });

  it('should render the brand headline', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Des créations');
  });

  it('saves a favorite and exposes its state accessibly', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.favorite') as HTMLButtonElement;

    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.favoritesCount).toBe(1);
    expect(JSON.parse(localStorage.getItem('surmesure.favorites') ?? '[]')).toContain(
      fixture.componentInstance.favoriteKey(fixture.componentInstance.creations[0]),
    );
  });

  it('restores the selection after a reload', () => {
    const firstFixture = TestBed.createComponent(App);
    firstFixture.componentInstance.addToCart(firstFixture.componentInstance.creations[0]);
    firstFixture.destroy();

    const reloadedFixture = TestBed.createComponent(App);
    expect(reloadedFixture.componentInstance.cartCount).toBe(1);
  });

  it('restores the authenticated stylist workspace after a reload', () => {
    localStorage.setItem('surmesure.auth.session', JSON.stringify({
      token: 'access-token',
      refreshToken: 'refresh-token',
      data: {
        id: 'stylist-1',
        role: 'STYLIST',
        firstName: 'Awa',
        lastName: 'Diop',
        email: 'awa@example.com',
        phone: '+221770000001',
        profileImage: '',
        isActive: true,
      },
    }));

    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance.activeView).toBe('stylist');
    expect(fixture.componentInstance.authenticatedUser?.id).toBe('stylist-1');
  });

  it('returns an expired client session to login and restores the requested measurements page', async () => {
    const client = {
      id: 'client-1',
      role: 'CLIENT' as const,
      firstName: 'Fatou',
      lastName: 'Ndiaye',
      email: 'fatou@example.com',
      phone: '+221770000001',
      profileImage: '',
      isActive: true,
    };
    localStorage.setItem('surmesure.auth.session', JSON.stringify({
      token: 'access-token',
      refreshToken: 'refresh-token',
      data: client,
    }));

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await app.openClientMeasurements();
    app.onSessionExpired();

    expect(app.activeView).toBe('home');
    expect(app.loginOpen).toBeTrue();
    expect(app.authenticatedUser).toBeNull();
    expect(localStorage.getItem('surmesure.auth.session')).toBeNull();

    app.onLoggedIn(client);
    expect(app.activeView).toBe('measure');
  });

  it('shows the last synchronized measurements to a stylist when the API is offline', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const dashboard = TestBed.inject(DashboardService);
    const offlineStore = TestBed.inject(OfflineWorkspaceStore);
    const measurement = {
      id: 'measurement-1',
      stylistId: 'atelier-1',
      clientId: null,
      clientName: 'Aminata Fall',
      clientPhone: '+221770000001',
      measurements: { poitrine: 92 },
      notes: '',
      createdAt: '2026-10-28T12:00:00.000Z',
      updatedAt: '2026-10-28T12:00:00.000Z',
    };
    app.authenticatedUser = {
      id: 'stylist-user-1', role: 'STYLIST', firstName: 'Awa', lastName: 'Diop',
      email: 'awa@example.com', phone: '+221770000002', profileImage: '', isActive: true,
    };
    spyOn(dashboard, 'loadStylistDashboard').and.rejectWith(new Error('offline'));
    spyOn(dashboard, 'listStylistPersonnel').and.rejectWith(new Error('offline'));
    spyOn(offlineStore, 'load').and.resolveTo({
      userId: 'stylist-user-1', role: 'stylist', savedAt: '2026-10-28T12:00:00.000Z',
      measurements: [measurement],
      stylistProfile: {
        id: 'atelier-1', userId: 'stylist-user-1', businessName: 'Atelier Awa', about: '',
        specialties: [], rating: 0,
        user: { firstName: 'Awa', lastName: 'Diop', profileImage: '' },
      },
    });

    await app.loadDashboard('stylist');

    expect(app.stylistMeasurements).toEqual([measurement]);
    expect(app.stylistProfile?.businessName).toBe('Atelier Awa');
    expect(app.dashboardError).toContain('Hors connexion');
  });

  it('shows the last synchronized measurements to an employee when the API is offline', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const dashboard = TestBed.inject(DashboardService);
    const offlineStore = TestBed.inject(OfflineWorkspaceStore);
    const measurement = {
      id: 'measurement-2',
      stylistId: 'atelier-1',
      clientId: null,
      clientName: 'Mariama Fall',
      clientPhone: '+221770000003',
      measurements: { taille: 74 },
      notes: '',
      createdAt: '2026-10-28T12:00:00.000Z',
      updatedAt: '2026-10-28T12:00:00.000Z',
    };
    app.authenticatedUser = {
      id: 'employee-user-1', role: 'EMPLOYEE', firstName: 'Mame', lastName: 'Sarr',
      email: 'mame@example.com', phone: '+221770000004', profileImage: '', isActive: true,
    };
    spyOn(dashboard, 'loadEmployeeDashboard').and.rejectWith(new Error('offline'));
    spyOn(offlineStore, 'load').and.resolveTo({
      userId: 'employee-user-1', role: 'employee', savedAt: '2026-10-28T12:00:00.000Z',
      measurements: [measurement],
      employeeContext: {
        id: 'employee-1', stylistId: 'atelier-1', userId: 'employee-user-1', firstName: 'Mame',
        lastName: 'Sarr', email: 'mame@example.com', phone: '+221770000004',
        specialization: 'Couture', active: true, hireDate: '2026-10-01T00:00:00.000Z',
        stylist: { id: 'atelier-1', businessName: 'Atelier Awa' },
      },
    });

    await app.loadDashboard('employee');

    expect(app.stylistMeasurements).toEqual([measurement]);
    expect(app.employeeContext?.stylist.businessName).toBe('Atelier Awa');
    expect(app.dashboardError).toContain('Hors connexion');
  });
});

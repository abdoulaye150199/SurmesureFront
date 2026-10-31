import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { DashboardOrder, DashboardService } from './dashboard/dashboard.service';
import { OfflineWorkspaceStore } from './dashboard/offline-workspace.store';
import { AuthService } from './auth/auth.service';

describe('App', () => {
  beforeEach(async () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    localStorage.removeItem('surmesure.selection');
    localStorage.removeItem('surmesure.favorites');
    localStorage.removeItem('surmesure.auth.session');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    document.title = 'Sur Mesure Style';
  });

  it('shows exactly four employee pages and the first-login password suggestion', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    spyOn(app, 'ngAfterViewInit');
    app.activeView = 'employee';
    app.authenticatedUser = { id: 'employee', role: 'EMPLOYEE', firstName: 'Mame', lastName: 'Sarr', mustChangePassword: true } as NonNullable<App['authenticatedUser']>;
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('#employee-main-nav');
    expect(nav.querySelectorAll('button').length).toBe(4);
    expect(nav.textContent).toContain('Nouvelle commande');
    expect(nav.textContent).not.toContain('Nouvelle fiche');
    expect(fixture.nativeElement.querySelector('#employee-order-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.employee-password-welcome')).toBeTruthy();
    app.setEmployeePage('profile');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#employee-order-form')).toBeNull();
    expect(fixture.nativeElement.querySelector('.employee-security-form').textContent).toContain('Modifier mon mot de passe');
    expect(fixture.nativeElement.querySelector('.customer-profile').textContent).toContain('Première connexion');
  });

  it('rejects different password confirmations and clears secrets after success', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const auth = TestBed.inject(AuthService);
    const change = spyOn(auth, 'changeEmployeePassword').and.resolveTo({ mustChangePassword: false } as NonNullable<App['authenticatedUser']>);
    app.employeePasswordDraft = { current: 'InitialPassword2026', next: 'PersonalPassword2026', confirm: 'DifferentPassword2026' };
    await app.changeEmployeePassword();
    expect(change).not.toHaveBeenCalled();
    expect(app.employeePasswordError).toBeTruthy();
    app.employeePasswordDraft.confirm = app.employeePasswordDraft.next;
    await app.changeEmployeePassword();
    expect(change).toHaveBeenCalledWith('InitialPassword2026', 'PersonalPassword2026');
    expect(app.employeePasswordDraft.current).toBe('');
    expect(app.authenticatedUser?.mustChangePassword).toBeFalse();
  });

  it('gives client pages distinct URLs and responds to browser history', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.demoMode = true;
    app.setClientPage('orders');
    expect(window.location.hash).toBe('#/client/commandes');
    expect(app.clientPage).toBe('orders');
    app.setClientPage('measurements');
    expect(window.location.hash).toBe('#/client/mesures');
    expect(app.activeView).toBe('measure');
    window.history.replaceState(null, '', '#/client/commandes');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(app.activeView).toBe('client');
    expect(app.clientPage).toBe('orders');
    app.setClientPage('profile');
    expect(window.location.hash).toBe('#/client/profil');
    expect(app.clientPageTitle).toBe('Mon profil');
    app.setView('home');
    expect(window.location.hash).toBe('');
  });

  it('restores the requested client page after reload with a valid account', () => {
    const auth = TestBed.inject(AuthService);
    spyOnProperty(auth, 'isAuthenticated', 'get').and.returnValue(true);
    spyOnProperty(auth, 'appRole', 'get').and.returnValue('client');
    spyOnProperty(auth, 'user', 'get').and.returnValue({ id: 'client', role: 'CLIENT', firstName: 'Fatou' } as NonNullable<App['authenticatedUser']>);
    window.history.replaceState(null, '', '#/client/favoris');
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.clientPage).toBe('favorites');
    expect(fixture.componentInstance.showFavoritesOnly).toBeTrue();
    expect(fixture.componentInstance.activeView).toBe('client');
  });

  it('requires login on direct client links and keeps the requested page after login', () => {
    window.history.replaceState(null, '', '#/client/rendez-vous');
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.activeView).toBe('home');
    expect(app.loginOpen).toBeTrue();
    spyOn(app, 'loadDashboard').and.resolveTo();
    app.onLoggedIn({ id: 'client', role: 'CLIENT', firstName: 'Fatou' } as NonNullable<App['authenticatedUser']>);
    expect(app.clientPage).toBe('appointments');
    expect(app.activeView).toBe('client');
    expect(window.location.hash).toBe('#/client/rendez-vous');
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('lets the stylist approve the selected model and updates its displayed status', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const record = { id: 'sheet', stylistId: 'atelier', clientId: 'client', clientName: 'Fatou', clientPhone: '+221770000001', modelName: 'Tenue de fête', measurements: { poitrine: 92 }, notes: '', source: 'client' as const, validatedAt: null, createdAt: '', updatedAt: '2026-10-31T12:00:00Z' };
    app.stylistMeasurements = [record];
    app.openMeasurementValidation(record);
    const approved = { ...record, validatedAt: '2026-10-31T13:00:00Z', validatedById: 'stylist' };
    const approve = spyOn(TestBed.inject(DashboardService), 'validateMeasurement').and.resolveTo(approved);
    await app.confirmMeasurementValidation();
    expect(approve).toHaveBeenCalledWith(record, 'Tenue de fête');
    expect(app.stylistMeasurements[0]).toEqual(approved);
    expect(app.measurementValidationRecord).toBeNull();
    expect(app.measurementValidationLabel(app.stylistMeasurements[0])).toContain('Validées');
  });

  it('does not mark order measurements approved based on production status or a different model', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.clientOrders = [timedOrder({ description: 'Tenue de fête', status: 'inProgress' })];
    expect(app.orderStepReached(1)).toBeFalse();
    const record = { id: 'sheet', stylistId: 'atelier', clientId: 'client', clientName: 'Fatou', clientPhone: '', modelName: 'Autre modèle', measurements: { poitrine: 92 }, notes: '', validatedAt: '2026-10-31T13:00:00Z', createdAt: '', updatedAt: '' };
    app.clientMeasurements = [record];
    expect(app.orderStepReached(1)).toBeFalse();
    app.clientMeasurements = [{ ...record, modelName: 'Tenue de fête' }];
    expect(app.orderStepReached(1)).toBeTrue();
    app.clientMeasurements = [];
    app.clientOrders = [timedOrder({ measurements: { poitrine: 92 } })];
    expect(app.orderStepReached(1)).toBeTrue();
  });

  it('creates a named measurement model without replacing earlier sheets', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.openClientModelEditor();
    app.clientModelName = 'Tenue de cérémonie';
    app.clientModelStylistId = 'atelier';
    app.clientModelValues = { taille: 74, entrejambe: 80 };
    const created = { id: 'model-sheet', stylistId: 'atelier', clientId: 'client', clientName: 'Fatou', clientPhone: '+221770000001', modelName: 'Tenue de cérémonie', measurements: { taille: 74, entrejambe: 80 }, notes: '', createdAt: '', updatedAt: '' };
    const create = spyOn(TestBed.inject(DashboardService), 'createClientModelMeasurements').and.resolveTo(created);
    await app.saveClientModel();
    expect(create).toHaveBeenCalledWith(jasmine.objectContaining({ modelName: 'Tenue de cérémonie', measurements: { taille: 74, entrejambe: 80 } }));
    expect(app.clientMeasurements[0]).toEqual(created);
    expect(app.clientModelEditorOpen).toBeFalse();
    expect(app.measurementValue('taille', 'Tenue de cérémonie')).toBe(74);
    expect(app.measurementValue('taille', 'Robe & ensemble')).toBeNull();
  });

  it('shows only actual measurement sheets without preset clothing categories', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.demoMode = true;
    app.activeView = 'measure';
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.measurement-model-card')).toBeNull();
    expect(page.querySelector('.measurement-profile-progress')).toBeNull();
    expect(page.textContent).toContain('Aucune fiche de mesures');
    (page.querySelector('.client-add-measurement') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(page.querySelector('[name="clientModelType"]')).toBeNull();
    expect(page.querySelector('[name="clientModelName"]')).not.toBeNull();
  });

  const timedOrder = (overrides: Partial<DashboardOrder> = {}): DashboardOrder => ({
    id: 'timed-order', stylistId: 'atelier', clientId: 'client', clientName: 'Fatou', clientPhone: '+221770000001',
    description: 'Robe', totalPrice: 45000, currency: 'XOF', status: 'inProgress',
    createdAt: '2030-01-01T12:00:00Z', updatedAt: '2030-01-01T12:00:00Z', dueAt: '2030-01-03T12:00:00Z', ...overrides,
  });

  it('updates time progress and triggers the reminder at 24 hours remaining', () => {
    jasmine.clock().install();
    let fixture: ReturnType<typeof TestBed.createComponent<App>> | undefined;
    try {
      jasmine.clock().mockDate(new Date('2030-01-02T11:59:00Z'));
      fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      spyOnProperty(TestBed.inject(AuthService), 'isAuthenticated', 'get').and.returnValue(true);
      spyOnProperty(TestBed.inject(AuthService), 'user', 'get').and.returnValue({ id: 'client', role: 'CLIENT' } as NonNullable<App['authenticatedUser']>);
      app.clientOrders = [timedOrder()];
      expect(app.clientDeliveryReminders.length).toBe(0);
      jasmine.clock().tick(60_000);
      expect(app.clientDeliveryReminders.length).toBe(1);
      expect(app.orderTimeProgress(app.clientOrders[0])).toBe(50);
      expect(app.orderTimeRemainingLabel(app.clientOrders[0])).toBe('Temps restant : 1 j');
    } finally {
      fixture?.destroy();
      jasmine.clock().uninstall();
    }
  });

  it('remembers read reminders per client and alerts again for a changed delivery date', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.orderClock.set(new Date('2030-01-02T12:00:00Z').getTime());
    app.clientOrders = [timedOrder({ clientId: 'reminder-client-a' })];
    app.authenticatedUser = { id: 'reminder-client-a', role: 'CLIENT' } as typeof app.authenticatedUser;
    spyOnProperty(TestBed.inject(AuthService), 'isAuthenticated', 'get').and.returnValue(true);
    spyOnProperty(TestBed.inject(AuthService), 'user', 'get').and.callFake(() => app.authenticatedUser);
    localStorage.removeItem('surmesure.delivery-reminders.reminder-client-a');
    localStorage.removeItem('surmesure.delivery-reminders.reminder-client-b');
    expect(app.unreadDeliveryReminders).toBe(1);
    // Opening the notification panel updates the clock to the actual current time.
    spyOn(app, 'updateOrderClock');
    app.openClientNotifications();
    expect(app.unreadDeliveryReminders).toBe(0);
    app.clientOrders = [timedOrder({ clientId: 'reminder-client-a', dueAt: '2030-01-03T11:00:00Z' })];
    expect(app.unreadDeliveryReminders).toBe(1);
    app.authenticatedUser = { id: 'reminder-client-b', role: 'CLIENT' } as typeof app.authenticatedUser;
    app.clientOrders = [timedOrder({ clientId: 'reminder-client-b' })];
    expect(app.unreadDeliveryReminders).toBe(1);
    localStorage.removeItem('surmesure.delivery-reminders.reminder-client-a');
    localStorage.removeItem('surmesure.delivery-reminders.reminder-client-b');
  });

  it('handles overdue, cancelled, delivered and undated orders without false reminders', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.orderClock.set(new Date('2030-01-03T12:00:00Z').getTime());
    const overdue = timedOrder();
    const cancelled = timedOrder({ status: 'cancelled', dueAt: '2030-01-04T11:00:00Z' });
    const delivered = timedOrder({ status: 'delivered', dueAt: '2030-01-04T11:00:00Z' });
    const undated = timedOrder({ dueAt: null });
    app.clientOrders = [overdue, cancelled, delivered, undated];
    expect(app.clientDeliveryReminders).toEqual([]);
    expect(app.orderTimeProgress(overdue)).toBe(100);
    expect(app.orderTimeRemainingLabel(overdue)).toContain('Échéance atteinte');
    expect(app.orderTimeRemainingLabel(delivered)).toBe('Commande livrée');
    expect(app.orderTimeProgress(cancelled)).toBeNull();
    expect(app.orderTimeProgress(undated)).toBeNull();
  });

  it('restricts tracking to the signed-in client and their own linked orders', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.orderClock.set(new Date('2030-01-02T12:00:00Z').getTime());
    const order = timedOrder();
    app.clientOrders = [order];
    expect(app.canTrackOrder(order)).toBeFalse();
    expect(app.clientDeliveryReminders).toEqual([]);
    const signedIn = spyOnProperty(TestBed.inject(AuthService), 'isAuthenticated', 'get').and.returnValue(true);
    spyOnProperty(TestBed.inject(AuthService), 'user', 'get').and.returnValue({ id: 'client', role: 'CLIENT' } as NonNullable<App['authenticatedUser']>);
    expect(app.canTrackOrder(order)).toBeTrue();
    expect(app.canTrackOrder({ ...order, clientId: 'other' })).toBeFalse();
    expect(app.canTrackOrder({ ...order, clientId: null })).toBeFalse();
    app.demoMode = true;
    expect(app.canTrackOrder(order)).toBeFalse();
    app.demoMode = false;
    signedIn.and.returnValue(false);
    expect(app.clientDeliveryReminders).toEqual([]);
    app.openClientNotifications();
    expect(app.clientNotificationsOpen).toBeFalse();
    expect(app.loginOpen).toBeTrue();
  });

  it('creates a stylist order and adds it to the order list', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.stylistProfile = { id: 'atelier' } as typeof app.stylistProfile;
    app.openOrderEditor();
    app.orderMeasurements = { poitrine: 92, taille: 74 };
    app.orderDurationDays = 7;
    app.orderDueAt = '2099-12-20T15:30';
    app.orderDraft = { clientName: ' Fatou Ndiaye ', clientPhone: '+221770000001', description: ' Robe sur mesure ', totalPrice: 45000, notes: '' };
    const created = { ...app.orderDraft, id: 'order', stylistId: 'atelier', clientId: null, currency: 'XOF', status: 'pending' as const, createdAt: '', updatedAt: '', totalPrice: 45000 };
    const create = spyOn(TestBed.inject(DashboardService), 'createOrder').and.resolveTo(created);
    await app.saveOrder();
    expect(create).toHaveBeenCalledWith('atelier', jasmine.objectContaining({ clientName: 'Fatou Ndiaye', description: 'Robe sur mesure', totalPrice: 45000, measurements: { poitrine: 92, taille: 74 }, durationDays: 7, dueAt: '2099-12-20T15:30:00.000Z' }));
    expect(app.stylistOrders).toEqual([created]);
    expect(app.orderEditorOpen).toBeFalse();
    expect(app.stylistPage).toBe('orders');
  });

  it('keeps the order draft and shows the API error when creation fails', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.stylistProfile = { id: 'atelier' } as typeof app.stylistProfile;
    app.openOrderEditor();
    app.orderMeasurements = { poitrine: 92, taille: 74 };
    app.orderDurationDays = 7;
    app.orderDueAt = '2099-12-20T15:30';
    app.orderDraft = { clientName: 'Fatou Ndiaye', clientPhone: '+221770000001', description: 'Robe', totalPrice: 45000, notes: '' };
    spyOn(TestBed.inject(DashboardService), 'createOrder').and.rejectWith(new HttpErrorResponse({ status: 400, error: { message: 'Téléphone invalide' } }));
    await app.saveOrder();
    expect(app.orderError).toBe('Téléphone invalide');
    expect(app.orderEditorOpen).toBeTrue();
    expect(app.orderDraft.clientName).toBe('Fatou Ndiaye');
    expect(app.orderSaving).toBeFalse();
  });

  it('rejects a new order without measurements or a valid duration before sending it', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.openOrderEditor();
    const create = spyOn(TestBed.inject(DashboardService), 'createOrder');
    await app.saveOrder();
    expect(app.orderError).toContain('au moins une mesure');
    app.orderMeasurements = { poitrine: 92 };
    app.orderDurationDays = -1;
    await app.saveOrder();
    expect(app.orderError).toContain('durée');
    expect(create).not.toHaveBeenCalled();
  });

  it('requires a future delivery time and displays it in Dakar time', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.openOrderEditor();
    app.orderMeasurements = { poitrine: 92 };
    app.orderDurationDays = 7;
    const create = spyOn(TestBed.inject(DashboardService), 'createOrder');
    for (const value of ['', '2000-01-01T12:00', 'invalid']) {
      app.orderDueAt = value;
      await app.saveOrder();
      expect(app.orderError).toContain('livraison/retrait');
    }
    expect(create).not.toHaveBeenCalled();
    expect(app.orderDeliveryLabel({ dueAt: '2099-12-20T15:30:00.000Z' } as Parameters<App['orderDeliveryLabel']>[0])).toContain('15:30');
  });

  it('opens separate client tabs and keeps navigation available from measurements', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.demoMode = true;
    app.activeView = 'client';
    fixture.detectChanges();
    const clickTab = (label: string) => {
      const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.client-dashboard-sidebar nav button'));
      (buttons.find(button => button.querySelector('span')?.textContent === label) as HTMLButtonElement).click();
      fixture.detectChanges();
    };

    clickTab('Mes commandes');
    expect(fixture.nativeElement.querySelector('.client-portal-header h1').textContent).toBe('Mes commandes');
    expect(fixture.nativeElement.querySelector('.client-quick-overview')).toBeNull();
    clickTab('Mes mesures');
    expect(app.activeView).toBe('measure');
    clickTab('Rendez-vous');
    expect(fixture.nativeElement.querySelector('.client-portal-header h1').textContent).toBe('Rendez-vous');
    expect(fixture.nativeElement.querySelector('.dashboard-inline-empty').textContent).toContain('Aucun rendez-vous');
    clickTab('Mes favoris');
    expect(app.showFavoritesOnly).toBeTrue();
    expect(fixture.nativeElement.querySelector('.client-dashboard-sidebar nav .active span').textContent).toBe('Mes favoris');
    clickTab('Vue d’ensemble');
    expect(app.showFavoritesOnly).toBeFalse();
    expect(fixture.nativeElement.querySelector('.client-quick-overview')).not.toBeNull();
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
    spyOnProperty(TestBed.inject(AuthService), 'isAuthenticated', 'get').and.returnValue(true);
    const firstFixture = TestBed.createComponent(App);
    firstFixture.componentInstance.addToCart(firstFixture.componentInstance.creations[0]);
    firstFixture.destroy();

    const reloadedFixture = TestBed.createComponent(App);
    expect(reloadedFixture.componentInstance.cartCount).toBe(1);
  });

  it('allows visitor likes but requires login for selection, including demo mode', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const item = app.creations[0];
    await app.toggleFavorite(item);
    expect(app.loginOpen).toBeFalse();
    expect(app.favoritesCount).toBe(1);

    app.loginOpen = false;
    app.demoMode = true;
    app.addToCart(item);
    expect(app.loginOpen).toBeTrue();
    expect(app.cartCount).toBe(0);
    expect(localStorage.getItem('surmesure.selection')).toBeNull();
  });

  it('sends anonymous likes to the API once and updates the creator count', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const item = { ...app.creations[0], id: 'catalog-1' };
    const save = spyOn(TestBed.inject(DashboardService), 'setCatalogLike')
      .and.resolveTo({ liked: true, likesCount: 7 });
    await app.toggleFavorite(item);
    expect(save).toHaveBeenCalledWith('catalog-1', jasmine.any(String), true);
    const visitorId = save.calls.mostRecent().args[1];
    save.and.resolveTo({ liked: false, likesCount: 6 });
    await app.toggleFavorite(item);
    expect(save).toHaveBeenCalledWith('catalog-1', visitorId, false);
    expect(app.favoritesCount).toBe(0);
    expect(app.loginOpen).toBeFalse();
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

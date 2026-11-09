import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard';
import { DashboardService, AdminUser } from '../dashboard/dashboard.service';
import { routes } from '../app.routes';

describe('Admin pages and deletion', () => {
  const account = { id: 'client', role: 'CLIENT', firstName: 'Awa', lastName: 'Diop' } as AdminUser;
  let api: {
    loadAdminDashboard: jasmine.Spy;
    loadAdminUsers: jasmine.Spy;
    deleteAdminUser: jasmine.Spy;
  };
  beforeEach(() => {
    api = {
      loadAdminDashboard: jasmine.createSpy().and.resolveTo({ summary: {}, users: [] }),
      loadAdminUsers: jasmine
        .createSpy()
        .and.resolveTo({ data: [account], meta: { total: 1, page: 1, totalPages: 1 } }),
      deleteAdminUser: jasmine.createSpy().and.resolveTo({ success: true }),
    };
    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        { provide: DashboardService, useValue: api },
      ],
    });
  });
  it('restores a dedicated page from its URL and browser navigation', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/catalogue');
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    expect(component.activeSection).toBe('catalog');
    await router.navigateByUrl('/admin/commandes');
    expect(component.activeSection).toBe('orders');
    component.selectSection('users');
    await fixture.whenStable();
    expect(router.url).toBe('/admin/utilisateurs');
    component.ngOnDestroy();
  });
  it('replaces the current page and sends filters to the server', async () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    component.users = [account];
    component.userQuery = 'atelier';
    component.roleFilter = 'STYLIST';
    const stylist = { ...account, id: 'stylist', role: 'STYLIST' } as AdminUser;
    api.loadAdminUsers.and.resolveTo({
      data: [stylist],
      meta: { total: 24, page: 2, totalPages: 3 },
    });
    await component.loadUsers(false, 2);
    expect(api.loadAdminUsers).toHaveBeenCalledWith(2, 10, 'atelier', 'STYLIST');
    expect(component.users).toEqual([stylist]);
    expect(component.usersTotal).toBe(24);
    expect(component.usersFirst).toBe(11);
    expect(component.usersLast).toBe(20);
    expect(component.usersPage).toBe(2);
  });
  it('keeps the current page if navigation fails', async () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    component.users = [account];
    api.loadAdminUsers.and.rejectWith(new Error('offline'));
    await component.loadUsers(false, 2);
    expect(component.usersPage).toBe(1);
    expect(component.users).toEqual([account]);
    expect(component.usersLoading).toBeFalse();
  });
  it('requires confirmation before deleting and preserves administrators', async () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    component.requestDeletion({ ...account, role: 'ADMIN' });
    expect(component.deletionTarget).toBeNull();
    component.requestDeletion(account);
    expect(api.deleteAdminUser).not.toHaveBeenCalled();
    expect(component.deletionTarget).toEqual(account);
    await component.confirmDeletion();
    expect(api.deleteAdminUser).toHaveBeenCalledOnceWith('client');
    expect(component.deletionTarget).toBeNull();
  });
  it('keeps the account visible and the confirmation open if deletion fails', async () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    api.deleteAdminUser.and.rejectWith(new Error('offline'));
    component.users = [account];
    component.requestDeletion(account);
    await component.confirmDeletion();
    expect(component.users).toEqual([account]);
    expect(component.deletionTarget).toEqual(account);
    expect(component.deletionError).toBeTruthy();
    expect(component.deleting).toBeFalse();
  });
});

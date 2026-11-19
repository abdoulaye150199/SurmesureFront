import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard';
import { AdminRegistrationNotification, DashboardService } from '../dashboard/dashboard.service';
import { routes } from '../app.routes';

describe('Admin stylist registration notifications', () => {
  const notification: AdminRegistrationNotification = {
    id: 'stylist',
    firstName: 'Awa',
    lastName: 'Diop',
    email: 'awa@example.test',
    requestedPlan: 'ATELIER',
    approvalStatus: 'pending',
    createdAt: '2026-11-19T12:00:00Z',
    readAt: null,
    stylist: { businessName: 'Atelier Awa' },
  };
  let api: {
    loadAdminNotifications: jasmine.Spy;
    readAdminNotification: jasmine.Spy;
    loadAdminUsers: jasmine.Spy;
  };
  const page = (data: AdminRegistrationNotification[], unreadCount: number) => ({
    data,
    unreadCount,
    meta: { nextCursor: null, hasMore: false },
  });
  beforeEach(() => {
    api = {
      loadAdminNotifications: jasmine.createSpy().and.resolveTo(page([], 0)),
      readAdminNotification: jasmine
        .createSpy()
        .and.resolveTo({ id: notification.id, readAt: '2026-11-19T13:00:00Z' }),
      loadAdminUsers: jasmine
        .createSpy()
        .and.resolveTo({ data: [], meta: { total: 0, page: 1, totalPages: 1 } }),
    };
    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [provideRouter(routes), { provide: DashboardService, useValue: api }],
    });
  });

  it('announces a new registration once when the unread count increases', async () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    const toast = spyOn(component, 'showToast');
    await component.loadNotifications();
    api.loadAdminNotifications.and.resolveTo(page([notification], 1));
    await component.loadNotifications();
    await component.loadNotifications();
    expect(component.unreadNotifications).toBe(1);
    expect(component.notifications[0].stylist?.businessName).toBe('Atelier Awa');
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('persists reading before opening the selected stylist registration', async () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    component.notifications = [notification];
    component.unreadNotifications = 1;
    component.notificationsOpen = true;
    await component.openRegistrationNotification(notification);
    expect(api.readAdminNotification).toHaveBeenCalledOnceWith(notification.id);
    expect(component.notifications[0].readAt).toBe('2026-11-19T13:00:00Z');
    expect(component.unreadNotifications).toBe(0);
    expect(component.notificationsOpen).toBeFalse();
    expect(api.loadAdminUsers).toHaveBeenCalledWith(1, 10, notification.email, 'STYLIST', 'ALL');
  });

  it('keeps a notification unread if saving the read state fails', async () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    component.notifications = [notification];
    component.unreadNotifications = 1;
    component.notificationsOpen = true;
    api.readAdminNotification.and.rejectWith(new Error('offline'));
    await component.openRegistrationNotification(notification);
    expect(component.unreadNotifications).toBe(1);
    expect(component.notifications[0].readAt).toBeNull();
    expect(component.notificationsOpen).toBeTrue();
    expect(api.loadAdminUsers).not.toHaveBeenCalled();
  });

  it('preserves previous notifications if an automatic refresh fails', async () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    component.notifications = [notification];
    component.unreadNotifications = 7;
    api.loadAdminNotifications.and.rejectWith(new Error('offline'));
    await component.loadNotifications();
    expect(component.notifications).toEqual([notification]);
    expect(component.unreadNotifications).toBe(7);
    expect(component.notificationsLoading).toBeFalse();
  });

  it('does not restore an old unread count when a refresh finishes after reading', async () => {
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    component.notifications = [notification];
    component.unreadNotifications = 1;
    let resolve!: (value: ReturnType<typeof page>) => void;
    api.loadAdminNotifications.and.returnValue(new Promise((done) => (resolve = done)));
    const refreshing = component.loadNotifications();
    await component.openRegistrationNotification(notification);
    resolve(page([notification], 1));
    await refreshing;
    expect(component.unreadNotifications).toBe(0);
    expect(component.notifications[0].readAt).not.toBeNull();
  });
});

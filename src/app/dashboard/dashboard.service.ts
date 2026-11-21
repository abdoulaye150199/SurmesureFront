import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getApiUrl } from '../api-url';
import { SubscriptionPlan, includesPlan } from '../subscription-plans';

export type DashboardOrderStatus =
  'pending' | 'inProgress' | 'completed' | 'delivered' | 'cancelled';
export interface OrderInput {
  measurements?: Record<string, number>;
  durationDays?: number;
  dueAt?: string;
  clientName: string;
  clientPhone: string;
  description: string;
  totalPrice: number;
  notes: string;
}
export type DashboardAppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface StylistProfileUpdate {
  businessName: string;
  about: string;
  specialties: string[];
  profileImage: string;
}

export interface CatalogItemInput {
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  availableColors: string[];
}

export interface DashboardOrder {
  measurements?: Record<string, number>;
  durationDays?: number | null;
  dueAt?: string | null;
  id: string;
  stylistId: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  description: string;
  status: DashboardOrderStatus;
  totalPrice: number | string;
  currency: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  stylist?: { businessName: string };
  client?: { firstName: string; lastName: string; email: string } | null;
}

export interface DashboardMeasurement {
  stylist?: { businessName: string };
  source?: 'stylist' | 'client' | 'employee' | 'legacy';
  validatedAt?: string | null;
  validatedById?: string | null;
  modelName?: string | null;
  modelType?: string | null;
  id: string;
  stylistId: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  measurements: Record<string, number>;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardAppointment {
  id: string;
  clientId: string;
  stylistId: string;
  service: string;
  startsAt: string;
  status: DashboardAppointmentStatus;
  notes?: string | null;
  stylist?: {
    businessName: string;
    user: { firstName: string; lastName: string; profileImage: string };
  };
  client?: { firstName: string; lastName: string; phone: string; profileImage: string };
}

export interface DashboardCatalogItem {
  stylist?: { businessName: string };
  likesCount?: number;
  id: string;
  stylistId: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number | string;
  currency: string;
  availableColors: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStylist {
  id: string;
  userId: string;
  businessName: string;
  about: string;
  specialties: string[];
  rating: number | string;
  user: {
    firstName: string;
    lastName: string;
    profileImage: string;
    subscriptionPlan?: SubscriptionPlan | null;
  };
}

export interface DashboardPersonnel {
  id: string;
  stylistId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  active: boolean;
  hireDate: string;
  user?: { id: string; email: string; active: boolean } | null;
}

export interface EmployeeWorkspaceContext extends DashboardPersonnel {
  stylist: { id: string; businessName: string };
}

export interface EmployeeAccountInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  specialization: string;
}

export interface EmployeeMeasurementInput {
  clientName: string;
  clientPhone: string;
  measurements: Record<string, number>;
  notes: string;
}

interface CursorPage<T> {
  data: T[];
  meta: { nextCursor: string | null; hasMore: boolean };
}

export interface ClientDashboardSnapshot {
  orders: DashboardOrder[];
  measurements: DashboardMeasurement[];
  appointments: DashboardAppointment[];
  catalog: DashboardCatalogItem[];
  stylists: DashboardStylist[];
  stylistsCursor: string | null;
}

export interface StylistDashboardSnapshot {
  orders: DashboardOrder[];
  measurements: DashboardMeasurement[];
  appointments: DashboardAppointment[];
  catalog: DashboardCatalogItem[];
  profile: DashboardStylist | null;
  catalogCursor: string | null;
  catalogTotal: number;
}

export interface AdminUser {
  approvalStatus?: 'pending' | 'approved';
  requestedPlan?: SubscriptionPlan | null;
  subscriptionPlan?: SubscriptionPlan | null;
  approvedAt?: string | null;
  id: string;
  role: 'CLIENT' | 'STYLIST' | 'EMPLOYEE' | 'ADMIN';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  stylist?: {
    id: string;
    businessName: string;
    specialties: string[];
    rating: number | string;
  } | null;
}

export interface AdminDashboardSnapshot {
  catalog?: DashboardCatalogItem[];
  summary: {
    pendingRegistrations?: number;
    users: number;
    clients: number;
    stylists: number;
    orders: number;
    activeOrders: number;
    measurements: number;
    appointments: number;
    catalogItems: number;
    revenue: number | string;
  };
  users: AdminUser[];
  orders: DashboardOrder[];
  appointments: DashboardAppointment[];
}

export interface AdminRegistrationNotification {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  requestedPlan: SubscriptionPlan;
  approvalStatus: 'pending' | 'approved';
  createdAt: string;
  readAt: string | null;
  stylist: { businessName: string } | null;
}

export interface AdminNotificationsPage extends CursorPage<AdminRegistrationNotification> {
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly publicRequests = new Map<string, Promise<unknown>>();

  private getPublic<T>(path: string): Promise<T> {
    const pending = this.publicRequests.get(path);
    if (pending) return pending as Promise<T>;
    const request = firstValueFrom(this.http.get<T>(getApiUrl(path))).finally(() => {
      this.publicRequests.delete(path);
    });
    this.publicRequests.set(path, request);
    return request;
  }

  // The two public list endpoints return arrays. Request an extra row for the next-page marker.
  private async publicPage<T extends { id: string }>(path: string, limit: number, cursor?: string): Promise<CursorPage<T>> {
    const query = new URLSearchParams({ limit: String(limit + 1) });
    if (cursor) query.set('cursor', cursor);
    const rows = await this.getPublic<T[]>(`${path}?${query}`);
    const data = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    return { data, meta: { hasMore, nextCursor: hasMore ? data[data.length - 1].id : null } };
  }

  loadPublicCatalogPage(limit = 12, cursor?: string) {
    return this.publicPage<DashboardCatalogItem>('/catalog', limit, cursor);
  }

  loadPublicStylistsPage(cursor?: string) {
    return this.publicPage<DashboardStylist>('/stylists', 20, cursor);
  }

  async publicStylist(id: string) {
    const rows = await this.getPublic<DashboardStylist[]>(`/stylists?limit=1&ids=${encodeURIComponent(id)}`);
    return rows[0];
  }

  async favoriteCatalog(ids: string[]) {
    const items: DashboardCatalogItem[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const query = new URLSearchParams({ limit: '50', ids: ids.slice(i, i + 50).join(',') });
      items.push(...await this.getPublic<DashboardCatalogItem[]>(`/catalog?${query}`));
    }
    return items;
  }

  private get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(getApiUrl(path)));
  }

  private async getAllCursorPages<T>(path: string): Promise<T[]> {
    const rows: T[] = [];
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ limit: '100' });
      if (cursor) query.set('cursor', cursor);
      const page: CursorPage<T> = await this.get<CursorPage<T>>(`${path}?${query}`);
      rows.push(...page.data);
      cursor = page.meta.hasMore ? page.meta.nextCursor : null;
    } while (cursor);
    return rows;
  }

  loadOwnCatalogPage(cursor?: string) {
    const query = new URLSearchParams({ limit: '20' });
    if (cursor) query.set('cursor', cursor);
    return this.get<CursorPage<DashboardCatalogItem>>(`/stylist/catalog?${query}`);
  }

  async loadClientDashboard(): Promise<ClientDashboardSnapshot> {
    const [orders, measurements, appointments, catalog, stylists] = await Promise.all([
      this.getAllCursorPages<DashboardOrder>('/orders'),
      this.get<DashboardMeasurement[]>('/measurements'),
      this.get<DashboardAppointment[]>('/appointments'),
      this.loadPublicCatalogPage(),
      this.loadPublicStylistsPage(),
    ]);
    return { orders, measurements, appointments, catalog: catalog.data, stylists: stylists.data, stylistsCursor: stylists.meta.nextCursor };
  }

  async loadStylistDashboard(
    userId: string,
    plan: SubscriptionPlan = 'STUDIO',
  ): Promise<StylistDashboardSnapshot> {
    const [orders, measurements, appointments, catalog, profile] = await Promise.all([
      this.getAllCursorPages<DashboardOrder>(`/stylist/${userId}/orders`),
      includesPlan(plan, 'ATELIER')
        ? this.getAllCursorPages<DashboardMeasurement>(`/stylist/${userId}/measurements`)
        : Promise.resolve([]),
      includesPlan(plan, 'ATELIER')
        ? this.get<DashboardAppointment[]>(`/stylist/${userId}/appointments`)
        : Promise.resolve([]),
      this.loadOwnCatalogPage(),
      this.get<DashboardStylist & { _count: { catalogItems: number } }>('/stylist/profile'),
    ]);
    return {
      orders,
      measurements,
      appointments,
      catalog: catalog.data,
      catalogCursor: catalog.meta.nextCursor,
      catalogTotal: profile._count.catalogItems,
      profile,
    };
  }

  async loadEmployeeDashboard(): Promise<{
    employee: EmployeeWorkspaceContext;
    measurements: DashboardMeasurement[];
    orders: DashboardOrder[];
  }> {
    const [employee, measurements, orders] = await Promise.all([
      this.get<EmployeeWorkspaceContext>('/employee/me'),
      this.getAllCursorPages<DashboardMeasurement>('/employee/measurements'),
      this.getAllCursorPages<DashboardOrder>('/employee/orders'),
    ]);
    return { employee, measurements, orders };
  }

  createEmployeeOrder(input: OrderInput): Promise<DashboardOrder> {
    return firstValueFrom(this.http.post<DashboardOrder>(getApiUrl('/employee/orders'), input));
  }

  createEmployeeCatalog(input: CatalogItemInput): Promise<DashboardCatalogItem> {
    return firstValueFrom(
      this.http.post<DashboardCatalogItem>(getApiUrl('/employee/catalog'), input),
    );
  }

  listStylistPersonnel(stylistId: string): Promise<DashboardPersonnel[]> {
    return firstValueFrom(
      this.http.get<DashboardPersonnel[]>(getApiUrl(`/stylist/${stylistId}/personnel`)),
    );
  }

  createEmployeeAccount(
    stylistId: string,
    input: EmployeeAccountInput,
  ): Promise<DashboardPersonnel> {
    return firstValueFrom(
      this.http.post<DashboardPersonnel>(
        getApiUrl(`/stylist/${stylistId}/personnel/accounts`),
        input,
      ),
    );
  }

  setCatalogLike(
    id: string,
    visitorId: string,
    liked: boolean,
  ): Promise<{ liked: boolean; likesCount: number }> {
    return firstValueFrom(
      this.http.post<{ liked: boolean; likesCount: number }>(getApiUrl(`/catalog/${id}/like`), {
        visitorId,
        liked,
      }),
    );
  }

  setEmployeeAccess(
    stylistId: string,
    personnelId: string,
    active: boolean,
  ): Promise<{ success: boolean; active: boolean }> {
    return firstValueFrom(
      this.http.patch<{ success: boolean; active: boolean }>(
        getApiUrl(`/stylist/${stylistId}/personnel/${personnelId}/access`),
        { active },
      ),
    );
  }

  removeEmployee(stylistId: string, personnelId: string): Promise<{ success: boolean }> {
    return firstValueFrom(
      this.http.delete<{ success: boolean }>(
        getApiUrl(`/stylist/${stylistId}/personnel/${personnelId}`),
      ),
    );
  }

  createEmployeeMeasurement(input: EmployeeMeasurementInput): Promise<DashboardMeasurement> {
    return firstValueFrom(
      this.http.post<DashboardMeasurement>(getApiUrl('/employee/measurements'), input),
    );
  }

  createStylistMeasurement(
    stylistId: string,
    input: EmployeeMeasurementInput,
  ): Promise<DashboardMeasurement> {
    return firstValueFrom(
      this.http.post<DashboardMeasurement>(getApiUrl(`/stylist/${stylistId}/measurements`), input),
    );
  }

  updateEmployeeMeasurement(
    id: string,
    measurements: Record<string, number>,
    notes: string,
  ): Promise<DashboardMeasurement> {
    return firstValueFrom(
      this.http.put<DashboardMeasurement>(getApiUrl(`/employee/measurements/${id}`), {
        measurements,
        notes,
      }),
    );
  }

  updateOrderStatus(id: string, status: DashboardOrderStatus): Promise<DashboardOrder> {
    return firstValueFrom(this.http.patch<DashboardOrder>(getApiUrl(`/orders/${id}`), { status }));
  }

  createOrder(stylistId: string, input: OrderInput): Promise<DashboardOrder> {
    return firstValueFrom(
      this.http.post<DashboardOrder>(getApiUrl(`/stylist/${stylistId}/orders`), input),
    );
  }

  createAppointment(input: {
    stylistId: string;
    service: string;
    startsAt: string;
    notes: string;
  }): Promise<DashboardAppointment> {
    return firstValueFrom(this.http.post<DashboardAppointment>(getApiUrl('/appointments'), input));
  }

  listAppointments(role: 'client' | 'stylist', userId: string): Promise<DashboardAppointment[]> {
    return firstValueFrom(
      this.http.get<DashboardAppointment[]>(
        getApiUrl(role === 'stylist' ? `/stylist/${userId}/appointments` : '/appointments'),
      ),
    );
  }

  updateAppointmentStatus(
    id: string,
    status: DashboardAppointmentStatus,
  ): Promise<DashboardAppointment> {
    return firstValueFrom(
      this.http.patch<DashboardAppointment>(getApiUrl(`/appointments/${id}/status`), { status }),
    );
  }

  updateStylistMeasurement(
    id: string,
    measurements: Record<string, number>,
    notes: string,
  ): Promise<DashboardMeasurement> {
    return firstValueFrom(
      this.http.put<DashboardMeasurement>(getApiUrl(`/measurements/${id}`), {
        measurements,
        notes,
      }),
    );
  }

  updateStylistProfile(profile: StylistProfileUpdate): Promise<DashboardStylist> {
    return firstValueFrom(this.http.put<DashboardStylist>(getApiUrl('/stylist/profile'), profile));
  }

  createCatalogItem(item: CatalogItemInput): Promise<DashboardCatalogItem> {
    return firstValueFrom(this.http.post<DashboardCatalogItem>(getApiUrl('/catalog'), item));
  }

  updateCatalogItem(id: string, item: CatalogItemInput): Promise<DashboardCatalogItem> {
    return firstValueFrom(this.http.patch<DashboardCatalogItem>(getApiUrl(`/catalog/${id}`), item));
  }

  deactivateCatalogItem(id: string): Promise<{ success: boolean }> {
    return firstValueFrom(this.http.delete<{ success: boolean }>(getApiUrl(`/catalog/${id}`)));
  }

  saveClientMeasurements(
    stylistId: string,
    measurements: Record<string, number>,
    measurementId?: string,
  ): Promise<DashboardMeasurement> {
    return firstValueFrom(
      this.http.put<DashboardMeasurement>(getApiUrl('/client/measurements'), {
        stylistId,
        measurements,
        ...(measurementId && { measurementId }),
      }),
    );
  }

  createClientModelMeasurements(input: {
    stylistId: string;
    modelName: string;
    modelType?: string;
    measurements: Record<string, number>;
    notes: string;
  }): Promise<DashboardMeasurement> {
    return firstValueFrom(
      this.http.post<DashboardMeasurement>(getApiUrl('/client/measurements'), input),
    );
  }

  validateMeasurement(
    record: DashboardMeasurement,
    modelName: string,
  ): Promise<DashboardMeasurement> {
    return firstValueFrom(
      this.http.patch<DashboardMeasurement>(getApiUrl(`/measurements/${record.id}/validate`), {
        modelName,
        expectedUpdatedAt: record.updatedAt,
      }),
    );
  }

  loadAdminDashboard(): Promise<AdminDashboardSnapshot> {
    return firstValueFrom(this.http.get<AdminDashboardSnapshot>(getApiUrl('/admin/dashboard')));
  }

  loadAdminNotifications(cursor?: string): Promise<AdminNotificationsPage> {
    const query = new URLSearchParams({ limit: '20' });
    if (cursor) query.set('cursor', cursor);
    return firstValueFrom(
      this.http.get<AdminNotificationsPage>(getApiUrl(`/admin/notifications?${query}`)),
    );
  }

  readAdminNotification(id: string): Promise<{ id: string; readAt: string }> {
    return firstValueFrom(
      this.http.patch<{ id: string; readAt: string }>(
        getApiUrl(`/admin/notifications/${id}/read`),
        {},
      ),
    );
  }
  loadAdminUsers(
    page = 1,
    limit = 10,
    search = '',
    role = 'ALL',
    approvalStatus = 'ALL',
  ): Promise<{
    data: AdminUser[];
    meta: { total: number; page: number; totalPages: number };
  }> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) query.set('search', search.trim());
    if (role !== 'ALL') query.set('role', role);
    if (approvalStatus !== 'ALL') query.set('approvalStatus', approvalStatus);
    return firstValueFrom(
      this.http.get<{
        data: AdminUser[];
        meta: { total: number; page: number; totalPages: number };
      }>(getApiUrl(`/admin/users?${query}`)),
    );
  }

  deleteAdminUser(id: string): Promise<{ success: boolean }> {
    return firstValueFrom(this.http.delete<{ success: boolean }>(getApiUrl(`/admin/users/${id}`)));
  }

  setAdminUserStatus(id: string, active: boolean): Promise<AdminUser> {
    return firstValueFrom(
      this.http.patch<AdminUser>(getApiUrl(`/admin/users/${id}/status`), { active }),
    );
  }

  approveAdminUser(id: string, subscriptionPlan: SubscriptionPlan): Promise<AdminUser> {
    return firstValueFrom(
      this.http.patch<AdminUser>(getApiUrl(`/admin/users/${id}/approval`), { subscriptionPlan }),
    );
  }

  adminUpdateOrderStatus(id: string, status: DashboardOrderStatus): Promise<DashboardOrder> {
    return firstValueFrom(
      this.http.patch<DashboardOrder>(getApiUrl(`/admin/orders/${id}`), { status }),
    );
  }
}

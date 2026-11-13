import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getApiUrl } from '../api-url';

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
  user: { firstName: string; lastName: string; profileImage: string };
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
}

export interface StylistDashboardSnapshot {
  orders: DashboardOrder[];
  measurements: DashboardMeasurement[];
  appointments: DashboardAppointment[];
  catalog: DashboardCatalogItem[];
  profile: DashboardStylist | null;
}

export interface AdminUser {
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

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly inFlightGets = new Map<string, Promise<unknown>>();
  private readonly readCache = new Map<string, { expiresAt: number; value: unknown }>();

  private getOnce<T>(url: string, factory?: () => Promise<T>, cacheMs = 0): Promise<T> {
    const cached = this.readCache.get(url);
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value as T);
    if (cached) this.readCache.delete(url);
    const existing = this.inFlightGets.get(url) as Promise<T> | undefined;
    if (existing) return existing;
    const request = (factory ? factory() : firstValueFrom(this.http.get<T>(url))).then((value) => {
      if (cacheMs > 0) this.readCache.set(url, { value, expiresAt: Date.now() + cacheMs });
      return value;
    });
    this.inFlightGets.set(url, request);
    void request
      .finally(() => {
        if (this.inFlightGets.get(url) === request) this.inFlightGets.delete(url);
      })
      .catch(() => undefined);
    return request;
  }

  async loadPublicCatalogPage(
    limit = 12,
    cursor?: string,
  ): Promise<CursorPage<DashboardCatalogItem>> {
    const query = new URLSearchParams({ limit: String(limit + 1) });
    if (cursor) query.set('cursor', cursor);
    const rows = await this.getOnce<DashboardCatalogItem[]>(getApiUrl(`/catalog?${query}`));
    const data = rows.slice(0, limit);
    return {
      data,
      meta: {
        hasMore: rows.length > limit,
        nextCursor: rows.length > limit ? (data.at(-1)?.id ?? null) : null,
      },
    };
  }

  loadPublicStylists(): Promise<DashboardStylist[]> {
    return this.getAllCursorPages<DashboardStylist>('/stylists');
  }

  private async getAllCursorPages<T>(path: string, limit = 100): Promise<T[]> {
    const cacheKey = `${getApiUrl(path)}?all-pages=${limit}`;
    return this.getOnce<T[]>(
      cacheKey,
      async () => {
        const rows: T[] = [];
        let cursor: string | null = null;
        let hasMore = true;
        while (hasMore) {
          const query = new URLSearchParams({ limit: String(limit) });
          if (cursor) query.set('cursor', cursor);
          const page = await this.getOnce<CursorPage<T>>(`${getApiUrl(path)}?${query}`);
          rows.push(...page.data);
          cursor = page.meta.nextCursor;
          hasMore = page.meta.hasMore && !!cursor;
        }
        return rows;
      },
      30_000,
    );
  }

  private invalidateReadCache(): void {
    this.readCache.clear();
  }

  async loadClientDashboard(): Promise<ClientDashboardSnapshot> {
    const [orders, measurements, appointments, catalog, stylists] = await Promise.all([
      this.getAllCursorPages<DashboardOrder>('/orders'),
      this.getOnce<DashboardMeasurement[]>(getApiUrl('/measurements')),
      this.getOnce<DashboardAppointment[]>(getApiUrl('/appointments')),
      this.getAllCursorPages<DashboardCatalogItem>('/catalog'),
      this.getAllCursorPages<DashboardStylist>('/stylists'),
    ]);
    return { orders, measurements, appointments, catalog, stylists };
  }

  async loadStylistDashboard(userId: string): Promise<StylistDashboardSnapshot> {
    const [orders, measurements, appointments, catalog, stylists] = await Promise.all([
      this.getAllCursorPages<DashboardOrder>(`/stylist/${userId}/orders`),
      this.getAllCursorPages<DashboardMeasurement>(`/stylist/${userId}/measurements`),
      this.getOnce<DashboardAppointment[]>(getApiUrl(`/stylist/${userId}/appointments`)),
      this.getAllCursorPages<DashboardCatalogItem>('/catalog'),
      this.getAllCursorPages<DashboardStylist>('/stylists'),
    ]);
    const profile = stylists.find((stylist) => stylist.userId === userId) ?? null;
    return {
      orders,
      measurements,
      appointments,
      catalog: profile ? catalog.filter((item) => item.stylistId === profile.id) : [],
      profile,
    };
  }

  async loadEmployeeDashboard(): Promise<{
    employee: EmployeeWorkspaceContext;
    measurements: DashboardMeasurement[];
    orders: DashboardOrder[];
  }> {
    const [employee, measurements, orders] = await Promise.all([
      this.getOnce<EmployeeWorkspaceContext>(getApiUrl('/employee/me')),
      this.getAllCursorPages<DashboardMeasurement>('/employee/measurements'),
      this.getAllCursorPages<DashboardOrder>('/employee/orders'),
    ]);
    return { employee, measurements, orders };
  }

  createEmployeeOrder(input: OrderInput): Promise<DashboardOrder> {
    this.invalidateReadCache();
    return firstValueFrom(this.http.post<DashboardOrder>(getApiUrl('/employee/orders'), input));
  }

  createEmployeeCatalog(input: CatalogItemInput): Promise<DashboardCatalogItem> {
    this.invalidateReadCache();
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
    this.invalidateReadCache();
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
    this.invalidateReadCache();
    return firstValueFrom(
      this.http.post<DashboardMeasurement>(getApiUrl('/employee/measurements'), input),
    );
  }

  createStylistMeasurement(
    stylistId: string,
    input: EmployeeMeasurementInput,
  ): Promise<DashboardMeasurement> {
    this.invalidateReadCache();
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
    this.invalidateReadCache();
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
    this.invalidateReadCache();
    return firstValueFrom(this.http.post<DashboardCatalogItem>(getApiUrl('/catalog'), item));
  }

  updateCatalogItem(id: string, item: CatalogItemInput): Promise<DashboardCatalogItem> {
    this.invalidateReadCache();
    return firstValueFrom(this.http.patch<DashboardCatalogItem>(getApiUrl(`/catalog/${id}`), item));
  }

  deactivateCatalogItem(id: string): Promise<{ success: boolean }> {
    this.invalidateReadCache();
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
  loadAdminUsers(
    page = 1,
    limit = 10,
    search = '',
    role = 'ALL',
  ): Promise<{
    data: AdminUser[];
    meta: { total: number; page: number; totalPages: number };
  }> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) query.set('search', search.trim());
    if (role !== 'ALL') query.set('role', role);
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

  adminUpdateOrderStatus(id: string, status: DashboardOrderStatus): Promise<DashboardOrder> {
    return firstValueFrom(
      this.http.patch<DashboardOrder>(getApiUrl(`/admin/orders/${id}`), { status }),
    );
  }
}

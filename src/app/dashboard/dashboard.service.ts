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

  async loadPublicCatalogPage(
    limit = 12,
    cursor?: string,
  ): Promise<CursorPage<DashboardCatalogItem>> {
    const query = new URLSearchParams({ limit: String(limit + 1) });
    if (cursor) query.set('cursor', cursor);
    const rows = await firstValueFrom(
      this.http.get<DashboardCatalogItem[]>(getApiUrl(`/catalog?${query}`)),
    );
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
    return firstValueFrom(this.http.get<DashboardStylist[]>(getApiUrl('/stylists?limit=100')));
  }

  async loadClientDashboard(): Promise<ClientDashboardSnapshot> {
    const [orders, measurements, appointments, catalog, stylists] = await Promise.all([
      firstValueFrom(this.http.get<CursorPage<DashboardOrder>>(getApiUrl('/orders?limit=100'))),
      firstValueFrom(this.http.get<DashboardMeasurement[]>(getApiUrl('/measurements'))),
      firstValueFrom(this.http.get<DashboardAppointment[]>(getApiUrl('/appointments'))),
      firstValueFrom(this.http.get<DashboardCatalogItem[]>(getApiUrl('/catalog?limit=100'))),
      firstValueFrom(this.http.get<DashboardStylist[]>(getApiUrl('/stylists?limit=100'))),
    ]);
    return { orders: orders.data, measurements, appointments, catalog, stylists };
  }

  async loadStylistDashboard(userId: string): Promise<StylistDashboardSnapshot> {
    const [orders, measurements, appointments, catalog, stylists] = await Promise.all([
      firstValueFrom(
        this.http.get<CursorPage<DashboardOrder>>(getApiUrl(`/stylist/${userId}/orders?limit=100`)),
      ),
      firstValueFrom(
        this.http.get<CursorPage<DashboardMeasurement>>(
          getApiUrl(`/stylist/${userId}/measurements?limit=100`),
        ),
      ),
      firstValueFrom(
        this.http.get<DashboardAppointment[]>(getApiUrl(`/stylist/${userId}/appointments`)),
      ),
      firstValueFrom(this.http.get<DashboardCatalogItem[]>(getApiUrl('/catalog?limit=100'))),
      firstValueFrom(this.http.get<DashboardStylist[]>(getApiUrl('/stylists?limit=100'))),
    ]);
    const profile = stylists.find((stylist) => stylist.userId === userId) ?? null;
    return {
      orders: orders.data,
      measurements: measurements.data,
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
      firstValueFrom(this.http.get<EmployeeWorkspaceContext>(getApiUrl('/employee/me'))),
      firstValueFrom(
        this.http.get<CursorPage<DashboardMeasurement>>(
          getApiUrl('/employee/measurements?limit=100'),
        ),
      ),
      firstValueFrom(
        this.http.get<CursorPage<DashboardOrder>>(getApiUrl('/employee/orders?limit=100')),
      ),
    ]);
    return { employee, measurements: measurements.data, orders: orders.data };
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
  loadAdminUsers(cursor?: string): Promise<CursorPage<AdminUser>> {
    const query = new URLSearchParams({ limit: '50' });
    if (cursor) query.set('cursor', cursor);
    return firstValueFrom(this.http.get<CursorPage<AdminUser>>(getApiUrl(`/admin/users?${query}`)));
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

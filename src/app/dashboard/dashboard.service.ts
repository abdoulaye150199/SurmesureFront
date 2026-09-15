import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type DashboardOrderStatus = 'pending' | 'inProgress' | 'completed' | 'delivered' | 'cancelled';
export type DashboardAppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface DashboardOrder {
  id: string;
  stylistId: string;
  clientId: string;
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
  client?: { firstName: string; lastName: string; email: string };
}

export interface DashboardMeasurement {
  id: string;
  stylistId: string;
  clientId: string;
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
  role: 'CLIENT' | 'STYLIST' | 'ADMIN';
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
  constructor(private readonly http: HttpClient) {}

  async loadClientDashboard(): Promise<ClientDashboardSnapshot> {
    const [orders, measurements, appointments, catalog, stylists] = await Promise.all([
      firstValueFrom(this.http.get<CursorPage<DashboardOrder>>(this.apiUrl('/orders?limit=100'))),
      firstValueFrom(this.http.get<DashboardMeasurement[]>(this.apiUrl('/measurements'))),
      firstValueFrom(this.http.get<DashboardAppointment[]>(this.apiUrl('/appointments'))),
      firstValueFrom(this.http.get<DashboardCatalogItem[]>(this.apiUrl('/catalog?limit=100'))),
      firstValueFrom(this.http.get<DashboardStylist[]>(this.apiUrl('/stylists?limit=100'))),
    ]);
    return { orders: orders.data, measurements, appointments, catalog, stylists };
  }

  async loadStylistDashboard(userId: string): Promise<StylistDashboardSnapshot> {
    const [orders, measurements, appointments, catalog, stylists] = await Promise.all([
      firstValueFrom(this.http.get<CursorPage<DashboardOrder>>(this.apiUrl(`/stylist/${userId}/orders?limit=100`))),
      firstValueFrom(this.http.get<CursorPage<DashboardMeasurement>>(this.apiUrl(`/stylist/${userId}/measurements?limit=100`))),
      firstValueFrom(this.http.get<DashboardAppointment[]>(this.apiUrl(`/stylist/${userId}/appointments`))),
      firstValueFrom(this.http.get<DashboardCatalogItem[]>(this.apiUrl('/catalog?limit=100'))),
      firstValueFrom(this.http.get<DashboardStylist[]>(this.apiUrl('/stylists?limit=100'))),
    ]);
    const profile = stylists.find(stylist => stylist.userId === userId) ?? null;
    return {
      orders: orders.data,
      measurements: measurements.data,
      appointments,
      catalog: profile ? catalog.filter(item => item.stylistId === profile.id) : [],
      profile,
    };
  }

  updateOrderStatus(id: string, status: DashboardOrderStatus): Promise<DashboardOrder> {
    return firstValueFrom(this.http.patch<DashboardOrder>(this.apiUrl(`/orders/${id}`), { status }));
  }

  saveClientMeasurements(stylistId: string, measurements: Record<string, number>): Promise<DashboardMeasurement> {
    return firstValueFrom(this.http.put<DashboardMeasurement>(this.apiUrl('/client/measurements'), { stylistId, measurements }));
  }

  loadAdminDashboard(): Promise<AdminDashboardSnapshot> {
    return firstValueFrom(this.http.get<AdminDashboardSnapshot>(this.apiUrl('/admin/dashboard')));
  }

  setAdminUserStatus(id: string, active: boolean): Promise<AdminUser> {
    return firstValueFrom(this.http.patch<AdminUser>(this.apiUrl(`/admin/users/${id}/status`), { active }));
  }

  adminUpdateOrderStatus(id: string, status: DashboardOrderStatus): Promise<DashboardOrder> {
    return firstValueFrom(this.http.patch<DashboardOrder>(this.apiUrl(`/admin/orders/${id}`), { status }));
  }

  private apiUrl(endpoint: string): string {
    const base = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001/v1'
      : '/v1';
    return `${base}${endpoint}`;
  }
}

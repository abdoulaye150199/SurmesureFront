import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthUser } from '../auth/auth.service';
import {
  AdminDashboardSnapshot,
  AdminUser,
  DashboardOrder,
  DashboardOrderStatus,
  DashboardService,
} from '../dashboard/dashboard.service';

type AdminSection = 'overview' | 'users' | 'orders' | 'appointments';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent implements OnInit {
  @Input() user: AuthUser | null = null;
  @Output() readonly homeRequested = new EventEmitter<void>();
  @Output() readonly logoutRequested = new EventEmitter<void>();

  snapshot: AdminDashboardSnapshot | null = null;
  loading = true;
  error = '';
  toast = '';
  userQuery = '';
  roleFilter: 'ALL' | AdminUser['role'] = 'ALL';
  activeSection: AdminSection = 'overview';
  mobileMenuOpen = false;
  updatingUserId: string | null = null;
  updatingOrderId: string | null = null;

  constructor(private readonly dashboard: DashboardService) {}

  ngOnInit(): void {
    void this.refresh();
  }

  get initials(): string {
    return `${this.user?.firstName?.[0] ?? 'A'}${this.user?.lastName?.[0] ?? 'D'}`.toUpperCase();
  }

  get filteredUsers(): AdminUser[] {
    const query = this.userQuery.trim().toLocaleLowerCase('fr');
    return (this.snapshot?.users ?? []).filter(user => {
      const hasRole = this.roleFilter === 'ALL' || user.role === this.roleFilter;
      const searchable = `${user.firstName} ${user.lastName} ${user.email} ${user.stylist?.businessName ?? ''}`.toLocaleLowerCase('fr');
      return hasRole && (!query || searchable.includes(query));
    });
  }

  get activeUserCount(): number {
    return this.snapshot?.users.filter(user => user.active).length ?? 0;
  }

  get conversionRate(): number {
    const clients = this.snapshot?.summary.clients ?? 0;
    const orders = this.snapshot?.summary.orders ?? 0;
    return clients ? Math.min(100, Math.round((orders / clients) * 100)) : 0;
  }

  async refresh(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.snapshot = await this.dashboard.loadAdminDashboard();
    } catch {
      this.error = 'Le tableau de bord global ne peut pas être chargé. Vérifiez que l’API est disponible.';
    } finally {
      this.loading = false;
    }
  }

  selectSection(section: AdminSection): void {
    this.activeSection = section;
    document.getElementById(`admin-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async toggleUser(user: AdminUser): Promise<void> {
    if (user.id === this.user?.id) {
      this.showToast('Votre propre compte administrateur reste protégé.');
      return;
    }
    this.updatingUserId = user.id;
    try {
      const updated = await this.dashboard.setAdminUserStatus(user.id, !user.active);
      if (this.snapshot) {
        this.snapshot = {
          ...this.snapshot,
          users: this.snapshot.users.map(item => item.id === updated.id ? updated : item),
        };
      }
      this.showToast(updated.active ? 'Compte réactivé.' : 'Compte suspendu et sessions révoquées.');
    } catch {
      this.showToast('Le statut de ce compte n’a pas pu être modifié.');
    } finally {
      this.updatingUserId = null;
    }
  }

  async advanceOrder(order: DashboardOrder): Promise<void> {
    const transitions: Partial<Record<DashboardOrderStatus, DashboardOrderStatus>> = {
      pending: 'inProgress',
      inProgress: 'completed',
      completed: 'delivered',
    };
    const next = transitions[order.status];
    if (!next) {
      this.showToast(order.status === 'cancelled' ? 'Cette commande est annulée.' : 'Cette commande est déjà livrée.');
      return;
    }
    this.updatingOrderId = order.id;
    try {
      const updated = await this.dashboard.adminUpdateOrderStatus(order.id, next);
      if (this.snapshot) {
        this.snapshot = {
          ...this.snapshot,
          orders: this.snapshot.orders.map(item => item.id === updated.id ? updated : item),
        };
      }
      this.showToast(`Commande passée au statut « ${this.statusLabel(next)} ».`);
    } catch {
      this.showToast('Le statut de cette commande n’a pas pu être modifié.');
    } finally {
      this.updatingOrderId = null;
    }
  }

  showToast(message: string): void {
    this.toast = message;
    window.setTimeout(() => this.toast = '', 2800);
  }

  roleLabel(role: AdminUser['role']): string {
    return ({ CLIENT: 'Client', STYLIST: 'Styliste', EMPLOYEE: 'Employé', ADMIN: 'Administrateur' } as const)[role];
  }

  statusLabel(status: DashboardOrderStatus): string {
    return ({ pending: 'À valider', inProgress: 'En confection', completed: 'Prête', delivered: 'Livrée', cancelled: 'Annulée' } as const)[status];
  }

  statusClass(status: DashboardOrderStatus): string {
    return ({ pending: 'waiting', inProgress: 'working', completed: 'ready', delivered: 'delivered', cancelled: 'cancelled' } as const)[status];
  }

  shortId(id: string): string {
    return `SM-${id.replaceAll('-', '').slice(-4).toUpperCase()}`;
  }

  formatDate(value?: string, withTime = false): string {
    if (!value) return 'À définir';
    return new Intl.DateTimeFormat('fr-FR', withTime
      ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  number(value: number | string | undefined): number {
    return Number(value) || 0;
  }
}

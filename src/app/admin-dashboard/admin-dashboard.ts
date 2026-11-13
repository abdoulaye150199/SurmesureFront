import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, Subscription, filter } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { AuthUser } from '../auth/auth.service';
import {
  AdminDashboardSnapshot,
  AdminUser,
  DashboardOrder,
  DashboardOrderStatus,
  DashboardService,
} from '../dashboard/dashboard.service';

type AdminSection = 'overview' | 'users' | 'orders' | 'appointments' | 'catalog';
const ADMIN_PATHS: Record<AdminSection, string> = {
  overview: '/admin',
  users: '/admin/utilisateurs',
  orders: '/admin/commandes',
  appointments: '/admin/rendez-vous',
  catalog: '/admin/catalogue',
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);
  private routeSubscription?: Subscription;
  private readonly searchChanges = new Subject<string>();
  private searchSubscription?: Subscription;
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
  users: AdminUser[] = [];
  usersLoading = false;
  usersPage = 1;
  usersPageSize = 10;
  usersTotal = 0;
  usersTotalPages = 1;
  private usersRequest = 0;
  deletionTarget: AdminUser | null = null;
  deleting = false;
  deletionError = '';

  get sectionTitle(): string {
    return {
      overview: 'Vue d’ensemble',
      users: 'Utilisateurs',
      orders: 'Commandes',
      appointments: 'Rendez-vous',
      catalog: 'Catalogue',
    }[this.activeSection];
  }

  ngOnInit(): void {
    this.searchSubscription = this.searchChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => void this.loadUsers(true));
    this.syncSection();
    this.routeSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.syncSection();
        if (this.activeSection === 'users' && !this.users.length) void this.loadUsers(true);
      });
    void this.refresh();
  }
  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    this.searchChanges.complete();
  }

  private syncSection(): void {
    const path = this.router.url.split(/[?#]/)[0].replace(/\/$/, '');
    this.activeSection =
      (Object.keys(ADMIN_PATHS) as AdminSection[]).find(
        (section) => ADMIN_PATHS[section] === path,
      ) ?? 'overview';
    document.title = `${this.sectionTitle} · Administration Sur Mesure Style`;
  }

  get initials(): string {
    return `${this.user?.firstName?.[0] ?? 'A'}${this.user?.lastName?.[0] ?? 'D'}`.toUpperCase();
  }

  get filteredUsers(): AdminUser[] {
    return this.users;
  }

  onUserSearchChange(value: string): void {
    this.userQuery = value;
    this.searchChanges.next(value.trim());
  }

  get usersFirst(): number {
    return this.usersTotal ? (this.usersPage - 1) * this.usersPageSize + 1 : 0;
  }

  get usersLast(): number {
    return Math.min(this.usersPage * this.usersPageSize, this.usersTotal);
  }

  get activeUserCount(): number {
    return this.snapshot?.users.filter((user) => user.active).length ?? 0;
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
      if (this.activeSection === 'users') await this.loadUsers(true);
    } catch {
      this.error =
        'Le tableau de bord global ne peut pas être chargé. Vérifiez que l’API est disponible.';
    } finally {
      this.loading = false;
    }
  }

  selectSection(section: AdminSection): void {
    this.activeSection = section;
    this.mobileMenuOpen = false;
    void this.router.navigateByUrl(ADMIN_PATHS[section]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async loadUsers(reset = false, targetPage = this.usersPage): Promise<void> {
    const request = ++this.usersRequest;
    this.usersLoading = true;
    this.error = '';
    try {
      const page = await this.dashboard.loadAdminUsers(
        reset ? 1 : targetPage,
        this.usersPageSize,
        this.userQuery,
        this.roleFilter,
      );
      if (request !== this.usersRequest) return;
      this.users = page.data;
      this.usersTotal = page.meta.total;
      this.usersPage = page.meta.page;
      this.usersTotalPages = page.meta.totalPages;
    } catch {
      if (request === this.usersRequest) this.error = 'Impossible de charger les utilisateurs.';
    } finally {
      if (request === this.usersRequest) this.usersLoading = false;
    }
  }

  requestDeletion(account: AdminUser): void {
    if (account.role === 'ADMIN' || this.deleting) return;
    this.deletionTarget = account;
    this.deletionError = '';
  }

  async confirmDeletion(): Promise<void> {
    if (!this.deletionTarget || this.deleting) return;
    const target = this.deletionTarget;
    this.deleting = true;
    this.deletionError = '';
    try {
      await this.dashboard.deleteAdminUser(target.id);
      this.users = this.users.filter((account) => account.id !== target.id);
      this.deletionTarget = null;
      this.showToast('Compte supprimé. Accès révoqués et historique conservé.');
      await this.refresh();
    } catch {
      this.deletionError = 'La suppression a échoué. Réessayez.';
    } finally {
      this.deleting = false;
    }
  }

  async toggleUser(user: AdminUser): Promise<void> {
    if (user.id === this.user?.id) {
      this.showToast('Votre propre compte administrateur reste protégé.');
      return;
    }
    this.updatingUserId = user.id;
    try {
      const updated = await this.dashboard.setAdminUserStatus(user.id, !user.active);
      this.users = this.users.map((account) => (account.id === updated.id ? updated : account));
      if (this.snapshot) {
        this.snapshot = {
          ...this.snapshot,
          users: this.snapshot.users.map((item) => (item.id === updated.id ? updated : item)),
        };
      }
      this.showToast(
        updated.active ? 'Compte réactivé.' : 'Compte suspendu et sessions révoquées.',
      );
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
      this.showToast(
        order.status === 'cancelled'
          ? 'Cette commande est annulée.'
          : 'Cette commande est déjà livrée.',
      );
      return;
    }
    this.updatingOrderId = order.id;
    try {
      const updated = await this.dashboard.adminUpdateOrderStatus(order.id, next);
      if (this.snapshot) {
        this.snapshot = {
          ...this.snapshot,
          orders: this.snapshot.orders.map((item) => (item.id === updated.id ? updated : item)),
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
    window.setTimeout(() => (this.toast = ''), 2800);
  }

  roleLabel(role: AdminUser['role']): string {
    return (
      {
        CLIENT: 'Client',
        STYLIST: 'Styliste',
        EMPLOYEE: 'Employé',
        ADMIN: 'Administrateur',
      } as const
    )[role];
  }

  statusLabel(status: DashboardOrderStatus): string {
    return (
      {
        pending: 'À valider',
        inProgress: 'En confection',
        completed: 'Prête',
        delivered: 'Livrée',
        cancelled: 'Annulée',
      } as const
    )[status];
  }

  statusClass(status: DashboardOrderStatus): string {
    return (
      {
        pending: 'waiting',
        inProgress: 'working',
        completed: 'ready',
        delivered: 'delivered',
        cancelled: 'cancelled',
      } as const
    )[status];
  }

  shortId(id: string): string {
    return `SM-${id.replaceAll('-', '').slice(-4).toUpperCase()}`;
  }

  formatDate(value?: string, withTime = false): string {
    if (!value) return 'À définir';
    return new Intl.DateTimeFormat(
      'fr-FR',
      withTime
        ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
        : { day: 'numeric', month: 'short', year: 'numeric' },
    ).format(new Date(value));
  }

  number(value: number | string | undefined): number {
    return Number(value) || 0;
  }
}

import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './login/login';
import { SignupPageComponent } from './signup-page/signup-page';
import { AppAccountRole, AuthService, AuthUser } from './auth/auth.service';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import {
  DashboardAppointment,
  DashboardCatalogItem,
  DashboardMeasurement,
  DashboardOrder,
  DashboardOrderStatus,
  DashboardService,
  DashboardStylist,
} from './dashboard/dashboard.service';

type Collection = 'Tout' | 'Cérémonie' | 'Boubous' | 'Ensembles';
type AppView = 'home' | 'explore' | 'measure' | 'client' | 'stylist' | 'admin' | 'signup';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface Creation {
  name: string;
  stylist: string;
  price: number;
  image: string;
  category: Exclude<Collection, 'Tout'>;
  tone: string;
  badge?: string;
}

interface Stylist {
  name: string;
  studio: string;
  location: string;
  specialty: string;
  portrait: string;
  bio: string;
  email: string;
  phone: string;
}

interface MeasurementDefinition {
  key: string;
  label: string;
  group: 'upper' | 'lower';
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, LoginComponent, SignupPageComponent, AdminDashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit, OnDestroy {
  readonly filters: Collection[] = ['Tout', 'Cérémonie', 'Boubous', 'Ensembles'];
  selectedFilter: Collection = 'Tout';
  menuOpen = false;
  cartOpen = false;
  loginOpen = false;
  loginRole: AppAccountRole = 'client';
  signupRole: 'client' | 'stylist' = 'client';
  activeView: AppView = 'home';
  workspaceRole: AppAccountRole = 'stylist';
  installAvailable = false;
  selectedCreations: Creation[] = [];
  headerScrolled = false;
  headerHidden = false;
  toast = '';
  email = '';
  selectedStylist: Stylist | null = null;
  authenticatedUser: AuthUser | null;
  dashboardLoading = false;
  dashboardError = '';
  loggingOut = false;
  demoMode = false;
  clientOrders: DashboardOrder[] = [];
  clientMeasurements: DashboardMeasurement[] = [];
  clientAppointments: DashboardAppointment[] = [];
  clientCatalog: DashboardCatalogItem[] = [];
  clientStylists: DashboardStylist[] = [];
  stylistOrders: DashboardOrder[] = [];
  stylistMeasurements: DashboardMeasurement[] = [];
  stylistAppointments: DashboardAppointment[] = [];
  stylistCatalog: DashboardCatalogItem[] = [];
  stylistProfile: DashboardStylist | null = null;
  editingMeasurement: MeasurementDefinition | null = null;
  measurementDraft: number | null = null;
  measurementSaving = false;
  updatingOrderId: string | null = null;
  private revealObserver?: IntersectionObserver;
  private scrollStopTimer?: ReturnType<typeof setTimeout>;
  private installPrompt?: BeforeInstallPromptEvent;
  private pendingAuthView: 'measure' | null = null;

  constructor(private readonly auth: AuthService, private readonly dashboard: DashboardService) {
    this.authenticatedUser = this.auth.user;
    const appRole = this.auth.appRole;
    if (appRole) this.workspaceRole = appRole;
  }

  readonly creations: Creation[] = [
    { name: 'Robe Ndar', stylist: 'Atelier Awa', price: 89000, image: '/assets/look-2.png', category: 'Cérémonie', tone: 'lilac', badge: 'Nouveau' },
    { name: 'Boubou Alizé', stylist: 'Maison Diarra', price: 115000, image: '/assets/look-1.png', category: 'Boubous', tone: 'sand' },
    { name: 'Ensemble Kër', stylist: 'Seynabou Studio', price: 74000, image: '/assets/look-3.png', category: 'Ensembles', tone: 'rose', badge: 'Favori' },
    { name: 'Robe Sine', stylist: 'Atelier Awa', price: 97000, image: '/assets/look-1.png', category: 'Cérémonie', tone: 'plum' },
    { name: 'Boubou Héritage', stylist: 'Seynabou Studio', price: 128000, image: '/assets/look-3.png', category: 'Boubous', tone: 'cream' },
    { name: 'Ensemble Dakar', stylist: 'Maison Diarra', price: 82000, image: '/assets/look-2.png', category: 'Ensembles', tone: 'gold' }
  ];

  readonly stylists: Stylist[] = [
    {
      name: 'Awa Diop',
      studio: 'Atelier Awa',
      location: 'Dakar',
      specialty: 'Cérémonie',
      portrait: '/assets/stylist-awa.png',
      bio: 'Awa imagine des silhouettes de cérémonie élégantes, avec des volumes fluides et des détails qui racontent chaque histoire.',
      email: 'awa@surmesure.sn',
      phone: '+221770000001'
    },
    {
      name: 'Mame Sarr',
      studio: 'Maison Diarra',
      location: 'Saint-Louis',
      specialty: 'Moderne',
      portrait: '/assets/stylist-mame.png',
      bio: 'Mame mêle lignes contemporaines, matières fortes et finitions précises pour créer un vestiaire moderne et personnel.',
      email: 'mame@surmesure.sn',
      phone: '+221770000002'
    },
    {
      name: 'Fatou Diallo',
      studio: 'Seynabou Studio',
      location: 'Dakar',
      specialty: 'Traditionnel',
      portrait: '/assets/stylist-fatou.png',
      bio: 'Fatou revisite les savoir-faire traditionnels avec une approche sensible, actuelle et profondément ancrée dans le savoir-faire local.',
      email: 'fatou@surmesure.sn',
      phone: '+221770000003'
    }
  ];

  readonly measurementDefinitions: MeasurementDefinition[] = [
    { key: 'poitrine', label: 'Tour de poitrine', group: 'upper' },
    { key: 'epaules', label: 'Largeur d’épaules', group: 'upper' },
    { key: 'cou', label: 'Tour de cou', group: 'upper' },
    { key: 'tourBras', label: 'Tour de bras', group: 'upper' },
    { key: 'taille', label: 'Tour de taille', group: 'lower' },
    { key: 'hanches', label: 'Tour de hanches', group: 'lower' },
    { key: 'longueurRobe', label: 'Longueur robe', group: 'lower' },
    { key: 'entrejambe', label: 'Longueur entrejambe', group: 'lower' },
    { key: 'hauteur', label: 'Hauteur', group: 'lower' },
    { key: 'longueurManche', label: 'Longueur manche', group: 'upper' },
  ];

  get visibleCreations(): Creation[] {
    return this.selectedFilter === 'Tout'
      ? this.creations
      : this.creations.filter(item => item.category === this.selectedFilter);
  }

  get cartCount(): number {
    return this.selectedCreations.length;
  }

  get defaultWorkspaceRole(): AppAccountRole {
    return this.auth.appRole ?? 'client';
  }

  get userInitials(): string {
    const user = this.authenticatedUser;
    return user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : 'FS';
  }

  get userFirstName(): string {
    return this.authenticatedUser?.firstName ?? 'Fatou';
  }

  get selectedStylistCreations(): Creation[] {
    return this.selectedStylist
      ? this.creations.filter(item => item.stylist === this.selectedStylist?.studio)
      : [];
  }

  get currentClientOrder(): DashboardOrder | null {
    return this.clientOrders.find(order => order.status === 'inProgress')
      ?? this.clientOrders.find(order => order.status === 'pending')
      ?? this.clientOrders[0]
      ?? null;
  }

  get latestClientMeasurement(): DashboardMeasurement | null {
    return this.clientMeasurements[0] ?? null;
  }

  get nextClientAppointment(): DashboardAppointment | null {
    const now = Date.now();
    return this.clientAppointments.find(item => item.status !== 'cancelled' && new Date(item.startsAt).getTime() >= now)
      ?? this.clientAppointments.find(item => item.status !== 'cancelled')
      ?? null;
  }

  get measurementCompletion(): number {
    const values = this.latestClientMeasurement?.measurements ?? {};
    const completed = this.measurementDefinitions.filter(item => Number.isFinite(Number(values[item.key]))).length;
    return Math.round((completed / this.measurementDefinitions.length) * 100);
  }

  get completedMeasurementCount(): number {
    return Math.round((this.measurementCompletion / 100) * this.measurementDefinitions.length);
  }

  get missingMeasurements(): MeasurementDefinition[] {
    return this.measurementDefinitions.filter(item => this.measurementValue(item.key) == null);
  }

  get upperMeasurements(): MeasurementDefinition[] {
    return this.measurementDefinitions.filter(item => item.group === 'upper');
  }

  get lowerMeasurements(): MeasurementDefinition[] {
    return this.measurementDefinitions.filter(item => item.group === 'lower');
  }

  get upperCompletedCount(): number {
    return this.upperMeasurements.filter(item => this.measurementValue(item.key) != null).length;
  }

  get lowerCompletedCount(): number {
    return this.lowerMeasurements.filter(item => this.measurementValue(item.key) != null).length;
  }

  get clientActiveOrderCount(): number {
    return this.clientOrders.filter(order => order.status === 'pending' || order.status === 'inProgress').length;
  }

  get stylistActiveOrderCount(): number {
    return this.stylistOrders.filter(order => order.status === 'pending' || order.status === 'inProgress').length;
  }

  get stylistRevenue(): number {
    return this.stylistOrders
      .filter(order => order.status !== 'cancelled')
      .reduce((total, order) => total + Number(order.totalPrice), 0);
  }

  get stylistActiveClientCount(): number {
    return new Set(this.stylistOrders.filter(order => order.status !== 'cancelled').map(order => order.clientId)).size;
  }

  get dashboardMonth(): string {
    const value = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date());
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  ngAfterViewInit(): void {
    const elements = document.querySelectorAll<HTMLElement>(
      'main > section:not(.hero), footer, .values article, .product-card, .stylist-card, .journey-steps article'
    );

    elements.forEach(element => element.classList.add('reveal-ready'));

    this.revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        this.revealObserver?.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -45px' });

    elements.forEach(element => this.revealObserver?.observe(element));
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    if (this.scrollStopTimer) clearTimeout(this.scrollStopTimer);
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event): void {
    event.preventDefault();
    this.installPrompt = event as BeforeInstallPromptEvent;
    this.installAvailable = true;
  }

  @HostListener('window:appinstalled')
  onAppInstalled(): void {
    this.installAvailable = false;
    this.installPrompt = undefined;
    this.toast = 'Sur Mesure Style est maintenant installé';
    window.setTimeout(() => this.toast = '', 2600);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.headerScrolled = window.scrollY > 32;
    this.headerHidden = this.headerScrolled;

    if (this.scrollStopTimer) clearTimeout(this.scrollStopTimer);
    this.scrollStopTimer = setTimeout(() => {
      this.headerHidden = false;
    }, 180);
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.loginOpen) this.closeLogin();
    if (this.cartOpen) this.cartOpen = false;
    if (this.selectedStylist) this.closeStylist();
  }

  openStylist(stylist: Stylist): void {
    this.selectedStylist = stylist;
    this.menuOpen = false;
  }

  closeStylist(): void {
    this.selectedStylist = null;
  }

  scrollWorkspaceTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showToast(message: string): void {
    this.toast = message;
    window.setTimeout(() => this.toast = '', 2600);
  }

  async loadDashboard(role: 'client' | 'stylist'): Promise<void> {
    if (this.demoMode) {
      this.dashboardLoading = false;
      this.dashboardError = '';
      return;
    }
    this.dashboardLoading = true;
    this.dashboardError = '';
    try {
      if (role === 'client') {
        const snapshot = await this.dashboard.loadClientDashboard();
        this.clientOrders = snapshot.orders;
        this.clientMeasurements = snapshot.measurements;
        this.clientAppointments = snapshot.appointments;
        this.clientCatalog = snapshot.catalog;
        this.clientStylists = snapshot.stylists;
      } else if (this.authenticatedUser) {
        const snapshot = await this.dashboard.loadStylistDashboard(this.authenticatedUser.id);
        this.stylistOrders = snapshot.orders;
        this.stylistMeasurements = snapshot.measurements;
        this.stylistAppointments = snapshot.appointments;
        this.stylistCatalog = snapshot.catalog;
        this.stylistProfile = snapshot.profile;
      }
    } catch {
      this.dashboardError = 'Impossible de charger les données. Vérifiez que l’API est démarrée.';
    } finally {
      this.dashboardLoading = false;
    }
  }

  refreshDashboard(): void {
    const role = this.activeView === 'stylist' ? 'stylist' : 'client';
    void this.loadDashboard(role);
  }

  measurementValue(key: string): number | null {
    const value = this.latestClientMeasurement?.measurements[key];
    return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
  }

  editMeasurement(definition: MeasurementDefinition): void {
    this.editingMeasurement = definition;
    this.measurementDraft = this.measurementValue(definition.key);
  }

  editMeasurementByKey(key: string): void {
    const definition = this.measurementDefinitions.find(item => item.key === key);
    if (definition) this.editMeasurement(definition);
  }

  editNextMeasurement(): void {
    this.editMeasurement(this.missingMeasurements[0] ?? this.measurementDefinitions[0]);
  }

  closeMeasurementEditor(): void {
    this.editingMeasurement = null;
    this.measurementDraft = null;
  }

  async saveMeasurement(): Promise<void> {
    if (!this.editingMeasurement || this.measurementDraft == null || this.measurementDraft <= 0) {
      this.showToast('Saisissez une mesure valide en centimètres');
      return;
    }
    const stylistId = this.latestClientMeasurement?.stylistId ?? this.clientStylists[0]?.id;
    if (!stylistId) {
      this.showToast('Aucun styliste disponible pour enregistrer ce profil');
      return;
    }
    this.measurementSaving = true;
    try {
      const values = {
        ...(this.latestClientMeasurement?.measurements ?? {}),
        [this.editingMeasurement.key]: Number(this.measurementDraft),
      };
      const saved = this.demoMode
        ? {
            id: this.latestClientMeasurement?.id ?? 'demo-measurement-client',
            stylistId,
            clientId: this.authenticatedUser?.id ?? 'demo-client-id',
            clientName: `${this.authenticatedUser?.firstName ?? 'Fatou'} ${this.authenticatedUser?.lastName ?? 'Ndiaye'}`,
            clientPhone: this.authenticatedUser?.phone ?? '+221 77 000 00 01',
            measurements: values,
            notes: 'Profil de mensurations de démonstration',
            createdAt: this.latestClientMeasurement?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : await this.dashboard.saveClientMeasurements(stylistId, values);
      this.clientMeasurements = [saved, ...this.clientMeasurements.filter(item => item.id !== saved.id)];
      this.showToast(`${this.editingMeasurement.label} mise à jour`);
      this.closeMeasurementEditor();
    } catch {
      this.showToast('La mesure n’a pas pu être enregistrée');
    } finally {
      this.measurementSaving = false;
    }
  }

  async advanceOrder(order: DashboardOrder): Promise<void> {
    const transitions: Partial<Record<DashboardOrderStatus, DashboardOrderStatus>> = {
      pending: 'inProgress',
      inProgress: 'completed',
      completed: 'delivered',
    };
    const nextStatus = transitions[order.status];
    if (!nextStatus) {
      this.showToast(order.status === 'cancelled' ? 'Cette commande est annulée' : 'Cette commande est déjà livrée');
      return;
    }
    this.updatingOrderId = order.id;
    try {
      const updated = this.demoMode
        ? { ...order, status: nextStatus, updatedAt: new Date().toISOString() }
        : await this.dashboard.updateOrderStatus(order.id, nextStatus);
      this.stylistOrders = this.stylistOrders.map(item => item.id === updated.id ? updated : item);
      this.showToast(`Commande passée au statut « ${this.orderStatusLabel(nextStatus)} »`);
    } catch {
      this.showToast('Le statut de la commande n’a pas pu être modifié');
    } finally {
      this.updatingOrderId = null;
    }
  }

  orderStatusLabel(status: DashboardOrderStatus): string {
    return ({ pending: 'À valider', inProgress: 'En confection', completed: 'Prête', delivered: 'Livrée', cancelled: 'Annulée' } as const)[status];
  }

  orderStatusClass(status: DashboardOrderStatus): string {
    return ({ pending: 'waiting', inProgress: 'working', completed: 'ready', delivered: 'ready', cancelled: 'cancelled' } as const)[status];
  }

  orderShortId(order: DashboardOrder): string {
    return `SM-${order.id.replaceAll('-', '').slice(-4).toUpperCase()}`;
  }

  orderImage(order: DashboardOrder, index = 0): string {
    return this.clientCatalog.find(item => item.title === order.description)?.imageUrl
      ?? this.stylistCatalog.find(item => item.title === order.description)?.imageUrl
      ?? this.creations[index % this.creations.length].image;
  }

  orderStepReached(step: number): boolean {
    const order = this.currentClientOrder;
    if (!order) return false;
    const current = ({ pending: 0, inProgress: 2, completed: 3, delivered: 4, cancelled: -1 } as const)[order.status];
    return current >= step;
  }

  price(value: number | string): number {
    return Number(value) || 0;
  }

  formatDate(value?: string, format: 'short' | 'day' | 'month' | 'weekday' | 'time' = 'short'): string {
    if (!value) return 'À définir';
    const date = new Date(value);
    const options: Record<typeof format, Intl.DateTimeFormatOptions> = {
      short: { day: 'numeric', month: 'short', year: 'numeric' },
      day: { day: '2-digit' },
      month: { month: 'long' },
      weekday: { weekday: 'long' },
      time: { hour: '2-digit', minute: '2-digit' },
    };
    return new Intl.DateTimeFormat('fr-FR', options[format]).format(date);
  }

  catalogStylistName(item: DashboardCatalogItem): string {
    return this.clientStylists.find(stylist => stylist.id === item.stylistId)?.businessName ?? 'Atelier partenaire';
  }

  addCatalogToCart(item: DashboardCatalogItem): void {
    const fallbackCategory: Exclude<Collection, 'Tout'> = 'Cérémonie';
    this.addToCart({
      name: item.title,
      stylist: this.catalogStylistName(item),
      price: this.price(item.price),
      image: item.imageUrl,
      category: fallbackCategory,
      tone: 'plum',
    });
  }

  scrollTo(id: string): void {
    this.activeView = 'home';
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    this.menuOpen = false;
  }

  setView(view: AppView): void {
    if (view === 'client' || view === 'stylist' || view === 'admin') {
      this.openWorkspace(view);
      return;
    }
    if (view === 'measure') {
      void this.openMeasureWorkspace();
      return;
    }
    this.activeView = view;
    this.menuOpen = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async openWorkspace(role: AppAccountRole): Promise<void> {
    if (this.demoMode && (role === 'client' || role === 'stylist')) {
      this.workspaceRole = role;
      this.activeView = role;
      this.menuOpen = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!this.auth.isAuthenticated || this.auth.appRole !== role) {
      this.openLogin(role);
      const label = role === 'admin' ? 'Super Admin' : role === 'stylist' ? 'styliste' : 'client';
      this.showToast(`Connectez-vous avec votre compte ${label}`);
      return;
    }
    if (!await this.auth.validateSession()) {
      this.authenticatedUser = null;
      this.openLogin(role);
      this.showToast('Votre session a expiré. Reconnectez-vous.');
      return;
    }
    this.authenticatedUser = this.auth.user;
    this.workspaceRole = role;
    this.activeView = role;
    this.menuOpen = false;
    if (role !== 'admin') void this.loadDashboard(role);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async openMeasureWorkspace(): Promise<void> {
    if (!this.auth.isAuthenticated || this.auth.appRole !== 'client') {
      this.openLogin('client');
      this.pendingAuthView = 'measure';
      this.showToast('Connectez-vous avec votre compte client pour accéder à vos mesures');
      return;
    }
    if (!await this.auth.validateSession()) {
      this.authenticatedUser = null;
      this.openLogin('client');
      this.pendingAuthView = 'measure';
      this.showToast('Votre session a expiré. Reconnectez-vous.');
      return;
    }
    this.authenticatedUser = this.auth.user;
    this.workspaceRole = 'client';
    this.activeView = 'measure';
    this.menuOpen = false;
    void this.loadDashboard('client');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async installPwa(): Promise<void> {
    if (!this.installPrompt) {
      this.toast = 'L’installation directe n’est pas disponible sur ce navigateur.';
      window.setTimeout(() => this.toast = '', 3200);
      return;
    }

    await this.installPrompt.prompt();
    await this.installPrompt.userChoice;
    this.installPrompt = undefined;
    this.installAvailable = false;
  }

  openLogin(role: AppAccountRole = this.loginRole): void {
    this.demoMode = false;
    this.loginRole = role;
    this.loginOpen = true;
    this.menuOpen = false;
  }

  closeLogin(): void {
    this.loginOpen = false;
    this.pendingAuthView = null;
  }

  openSignup(role: 'client' | 'stylist' = this.signupRole): void {
    this.signupRole = role;
    this.loginOpen = false;
    this.activeView = 'signup';
    this.menuOpen = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSignupRequested(role: 'client' | 'stylist'): void {
    this.openSignup(role);
  }

  onLoggedIn(user: AuthUser): void {
    this.demoMode = false;
    const role: AppAccountRole = user.role === 'ADMIN' ? 'admin' : user.role === 'STYLIST' ? 'stylist' : 'client';
    const destination = role === 'client' ? this.pendingAuthView : null;
    this.pendingAuthView = null;
    this.authenticatedUser = user;
    this.loginOpen = false;
    this.workspaceRole = role;
    this.activeView = destination ?? role;
    if (role !== 'admin') void this.loadDashboard(role);
    this.showToast(`Bienvenue ${user.firstName}, votre espace est prêt.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onAccountCreated(user: AuthUser): void {
    this.demoMode = false;
    const role: 'client' | 'stylist' = user.role === 'STYLIST' ? 'stylist' : 'client';
    const destination = role === 'client' ? this.pendingAuthView : null;
    this.pendingAuthView = null;
    this.authenticatedUser = user;
    this.loginOpen = false;
    this.workspaceRole = role;
    this.activeView = destination ?? role;
    void this.loadDashboard(role);
    this.toast = role === 'stylist'
      ? 'Votre compte styliste est créé. Bienvenue dans votre atelier.'
      : 'Votre compte client est créé. Bienvenue chez vous.';
    window.setTimeout(() => this.toast = '', 3200);
  }

  async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    try {
      if (this.demoMode) this.auth.clearSession();
      else await this.auth.logout();
    } catch {
      this.auth.clearSession();
    } finally {
      this.authenticatedUser = null;
      this.demoMode = false;
      this.workspaceRole = 'client';
      this.pendingAuthView = null;
      this.clientOrders = [];
      this.clientMeasurements = [];
      this.clientAppointments = [];
      this.stylistOrders = [];
      this.stylistMeasurements = [];
      this.stylistAppointments = [];
      this.activeView = 'home';
      this.loggingOut = false;
      this.showToast('Vous êtes déconnecté.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  startDemo(role: 'client' | 'stylist'): void {
    const now = new Date();
    const iso = (daysFromNow: number): string => new Date(now.getTime() + daysFromNow * 86_400_000).toISOString();
    const clientId = 'demo-client-fatou';
    const stylistId = 'demo-stylist-awa';
    const clientUser: AuthUser = {
      id: clientId, role: 'CLIENT', firstName: 'Fatou', lastName: 'Ndiaye',
      email: 'fatou.demo@surmesure.sn', phone: '+221 77 000 00 01',
      profileImage: '/assets/stylist-awa.png', isActive: true,
    };
    const stylistUser: AuthUser = {
      id: stylistId, role: 'STYLIST', firstName: 'Awa', lastName: 'Diop',
      email: 'awa.demo@surmesure.sn', phone: '+221 77 000 00 02',
      profileImage: '/assets/stylist-awa.png', isActive: true,
    };
    const demoStylist: DashboardStylist = {
      id: stylistId, userId: stylistId, businessName: 'Atelier Awa',
      about: 'Créations de cérémonie et savoir-faire traditionnel revisité.',
      specialties: ['Cérémonie', 'Traditionnel'], rating: 4.9,
      user: { firstName: 'Awa', lastName: 'Diop', profileImage: '/assets/stylist-awa.png' },
    };
    const demoCatalog: DashboardCatalogItem[] = [
      { id: 'demo-piece-robe', stylistId, title: 'Robe Ndar', description: 'Robe de cérémonie sur mesure', imageUrl: '/assets/look-2.png', price: 89000, currency: 'FCFA', availableColors: ['Prune', 'Ivoire'], active: true, createdAt: iso(-14), updatedAt: iso(-2) },
      { id: 'demo-piece-boubou', stylistId, title: 'Boubou Héritage', description: 'Boubou traditionnel revisité', imageUrl: '/assets/look-1.png', price: 115000, currency: 'FCFA', availableColors: ['Sable', 'Or'], active: true, createdAt: iso(-10), updatedAt: iso(-1) },
      { id: 'demo-piece-ensemble', stylistId, title: 'Ensemble Kër', description: 'Ensemble deux pièces', imageUrl: '/assets/look-3.png', price: 74000, currency: 'FCFA', availableColors: ['Rose', 'Noir'], active: true, createdAt: iso(-6), updatedAt: iso(-1) },
    ];
    const demoMeasurement: DashboardMeasurement = {
      id: 'demo-measurement-fatou', stylistId, clientId,
      clientName: 'Fatou Ndiaye', clientPhone: clientUser.phone,
      measurements: { poitrine: 92, epaules: 38, cou: 34, tourBras: 29, taille: 74, hanches: 101, longueurRobe: 142, entrejambe: 78, hauteur: 168, longueurManche: 59 },
      notes: 'Mesures prises à l’atelier · profil démo', createdAt: iso(-18), updatedAt: iso(-2),
    };
    const demoOrder: DashboardOrder = {
      id: 'demo-order-fatou-001', stylistId, clientId, clientName: 'Fatou Ndiaye', clientPhone: clientUser.phone,
      description: 'Robe Ndar', status: 'inProgress', totalPrice: 89000, currency: 'FCFA',
      notes: 'Essayage prévu après la finition des manches.', createdAt: iso(-8), updatedAt: iso(-1),
      stylist: { businessName: 'Atelier Awa' },
    };
    const stylistOrders: DashboardOrder[] = [
      demoOrder,
      { id: 'demo-order-awa-002', stylistId, clientId: 'demo-client-mariama', clientName: 'Mariama Fall', clientPhone: '+221 77 000 00 03', description: 'Boubou Héritage', status: 'pending', totalPrice: 115000, currency: 'FCFA', notes: 'Tissu fourni par la cliente.', createdAt: iso(-2), updatedAt: iso(-1), stylist: { businessName: 'Atelier Awa' } },
    ];
    const demoAppointment: DashboardAppointment = {
      id: 'demo-appointment-001', clientId, stylistId, service: 'Essayage · Robe Ndar', startsAt: iso(3), status: 'confirmed',
      notes: 'Premier essayage à l’atelier.',
      stylist: { businessName: 'Atelier Awa', user: { firstName: 'Awa', lastName: 'Diop', profileImage: '/assets/stylist-awa.png' } },
      client: { firstName: 'Fatou', lastName: 'Ndiaye', phone: clientUser.phone, profileImage: clientUser.profileImage },
    };

    this.auth.clearSession();
    this.demoMode = true;
    this.authenticatedUser = role === 'client' ? clientUser : stylistUser;
    this.workspaceRole = role;
    this.loginOpen = false;
    this.dashboardError = '';
    this.dashboardLoading = false;
    this.clientOrders = [demoOrder];
    this.clientMeasurements = [demoMeasurement];
    this.clientAppointments = [demoAppointment];
    this.clientCatalog = demoCatalog;
    this.clientStylists = [demoStylist];
    this.stylistOrders = stylistOrders;
    this.stylistMeasurements = [demoMeasurement];
    this.stylistAppointments = [demoAppointment];
    this.stylistCatalog = demoCatalog;
    this.stylistProfile = demoStylist;
    this.activeView = role;
    this.menuOpen = false;
    this.showToast(`Mode démo ${role === 'client' ? 'client' : 'styliste'} : les modifications restent locales.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addToCart(item: Creation): void {
    if (this.selectedCreations.some(creation => creation.name === item.name)) {
      this.toast = `${item.name} est déjà dans votre sélection`;
    } else {
      this.selectedCreations = [...this.selectedCreations, item];
      this.toast = `${item.name} ajouté à votre sélection`;
    }
    window.setTimeout(() => this.toast = '', 2600);
  }

  removeFromCart(item: Creation): void {
    this.selectedCreations = this.selectedCreations.filter(creation => creation.name !== item.name);
    this.toast = `${item.name} retiré de votre sélection`;
    window.setTimeout(() => this.toast = '', 2600);
  }

  subscribe(): void {
    if (!this.email.includes('@')) {
      this.toast = 'Saisissez une adresse e-mail valide';
      window.setTimeout(() => this.toast = '', 2600);
      return;
    }
    this.toast = 'Bienvenue dans le cercle Sur Mesure';
    this.email = '';
    window.setTimeout(() => this.toast = '', 2600);
  }
}

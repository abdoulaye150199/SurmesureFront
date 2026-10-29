import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './login/login';
import { SignupPageComponent } from './signup-page/signup-page';
import { AppAccountRole, AuthService, AuthUser } from './auth/auth.service';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import {
  DashboardAppointment,
  DashboardAppointmentStatus,
  DashboardCatalogItem,
  DashboardMeasurement,
  DashboardOrder,
  DashboardOrderStatus,
  DashboardService,
  DashboardStylist,
  DashboardPersonnel,
  EmployeeWorkspaceContext,
  CatalogItemInput,
  StylistProfileUpdate,
} from './dashboard/dashboard.service';

type Collection = 'Tout' | 'Cérémonie' | 'Boubous' | 'Ensembles';
type AppView = 'home' | 'explore' | 'measure' | 'client' | 'stylist' | 'employee' | 'admin' | 'signup';
type StylistPage = 'overview' | 'orders' | 'clients' | 'creations' | 'measurements' | 'contacts' | 'planning' | 'team' | 'settings';
type EmployeePage = 'intake' | 'clients';
const CART_STORAGE_KEY = 'surmesure.selection';
const FAVORITES_STORAGE_KEY = 'surmesure.favorites';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface Creation {
  id?: string;
  name: string;
  stylist: string;
  price: number;
  image: string;
  category: Exclude<Collection, 'Tout'>;
  tone: string;
  badge?: string;
}

interface Stylist {
  id?: string;
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

interface MeasurementModel {
  name: string;
  description: string;
  fields: MeasurementDefinition[];
}

interface StylistClientRecord {
  key: string;
  name: string;
  phone: string;
  measurements: DashboardMeasurement[];
  orders: DashboardOrder[];
  appointments: DashboardAppointment[];
}

type StylistEditor = 'catalog' | 'profile' | null;

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, LoginComponent, SignupPageComponent, AdminDashboardComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss', './stylist-dashboard.scss']
})
export class App implements AfterViewInit, OnDestroy {
  readonly filters: Collection[] = ['Tout', 'Cérémonie', 'Boubous', 'Ensembles'];
  selectedFilter: Collection = 'Tout';
  menuOpen = false;
  mobileDashboardMenuOpen = false;
  cartOpen = false;
  loginOpen = false;
  loginRole: AppAccountRole = 'client';
  signupRole: 'client' | 'stylist' = 'client';
  activeView: AppView = 'home';
  stylistPage: StylistPage = 'overview';
  employeePage: EmployeePage = 'intake';
  workspaceRole: AppAccountRole = 'stylist';
  installAvailable = false;
  selectedCreations: Creation[] = [];
  favoriteKeys: string[] = [];
  showFavoritesOnly = false;
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
  publicCatalogItems: DashboardCatalogItem[] = [];
  publicStylists: DashboardStylist[] = [];
  publicCatalogLoading = false;
  publicCatalogHasMore = true;
  publicStylistsLoaded = false;
  publicStylistsLoading = false;
  private publicCatalogCursor: string | null = null;
  private publicCatalogLoaded = false;
  stylistOrders: DashboardOrder[] = [];
  stylistMeasurements: DashboardMeasurement[] = [];
  stylistAppointments: DashboardAppointment[] = [];
  stylistCatalog: DashboardCatalogItem[] = [];
  stylistProfile: DashboardStylist | null = null;
  stylistPersonnel: DashboardPersonnel[] = [];
  employeeContext: EmployeeWorkspaceContext | null = null;
  employeeAccountEditorOpen = false;
  employeeAccountSaving = false;
  employeePasswordVisible = false;
  employeeAccountDraft = { firstName: '', lastName: '', email: '', phone: '', password: '', specialization: 'Couture' };
  employeeClientName = '';
  employeeClientPhone = '';
  employeeMeasurementNotes = '';
  employeeMeasurementDraft: Record<string, number | null> = {};
  employeeMeasurementSaving = false;
  stylistClientSearch = '';
  showStylistClientForm = false;
  editingMeasurement: MeasurementDefinition | null = null;
  measurementDraft: number | null = null;
  measurementSaving = false;
  updatingOrderId: string | null = null;
  updatingAppointmentId: string | null = null;
  showAllStylistOrders = false;
  stylistEditor: StylistEditor = null;
  editingCatalogId: string | null = null;
  editorSaving = false;
  catalogImageData = '';
  catalogImageFileName = '';
  catalogImageError = '';
  stylistMeasurementEditor: DashboardMeasurement | null = null;
  stylistMeasurementDraft: Record<string, number> = {};
  stylistMeasurementNotes = '';
  stylistMeasurementSaving = false;
  catalogDraft = { title: '', description: '', imageUrl: '', price: null as number | null, colors: '' };
  profileDraft = { businessName: '', about: '', specialties: '', profileImage: '' };
  profileImageFileName = '';
  profileImageError = '';
  private revealObserver?: IntersectionObserver;
  private scrollStopTimer?: ReturnType<typeof setTimeout>;
  private installPrompt?: BeforeInstallPromptEvent;
  private pendingAuthView: 'measure' | null = null;

  constructor(private readonly auth: AuthService, private readonly dashboard: DashboardService) {
    this.selectedCreations = this.readStoredArray<Creation>(CART_STORAGE_KEY)
      .filter((item): item is Creation => !!item && typeof item.name === 'string' && typeof item.stylist === 'string');
    this.favoriteKeys = this.readStoredArray<string>(FAVORITES_STORAGE_KEY)
      .filter((key): key is string => typeof key === 'string');
    this.authenticatedUser = this.auth.user;
    const appRole = this.auth.appRole;
    if (appRole && this.auth.isAuthenticated) {
      this.workspaceRole = appRole;
      this.activeView = appRole;
    }
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

  readonly measurementModels: MeasurementModel[] = [
    {
      name: 'Robe & ensemble',
      description: 'Pour une tenue ajustée du buste aux jambes.',
      fields: ['poitrine', 'epaules', 'taille', 'hanches', 'longueurRobe', 'longueurManche']
        .map(key => this.measurementDefinitions.find(item => item.key === key)!)
    },
    {
      name: 'Chemise & veste',
      description: 'Pour ajuster le col, les épaules et les manches.',
      fields: ['cou', 'poitrine', 'epaules', 'tourBras', 'longueurManche']
        .map(key => this.measurementDefinitions.find(item => item.key === key)!)
    },
    {
      name: 'Pantalon',
      description: 'Pour une coupe confortable et à la bonne longueur.',
      fields: ['taille', 'hanches', 'entrejambe', 'hauteur']
        .map(key => this.measurementDefinitions.find(item => item.key === key)!)
    },
  ];

  get visibleCreations(): Creation[] {
    const available = this.publicCatalogLoaded
      ? this.publicCatalogItems.map(item => this.toCreation(item))
      : this.creations;
    return this.selectedFilter === 'Tout'
      ? available
      : available.filter(item => item.category === this.selectedFilter);
  }

  get visibleStylists(): Stylist[] {
    if (!this.publicStylistsLoaded) return this.stylists;
    return this.publicStylists.map((profile, index) => ({
      id: profile.id,
      name: [profile.user.firstName, profile.user.lastName].filter(Boolean).join(' ') || profile.businessName,
      studio: profile.businessName,
      location: '',
      specialty: profile.specialties.join(' · ') || 'Styliste partenaire',
      portrait: profile.user.profileImage || this.stylists[index % this.stylists.length].portrait,
      bio: profile.about || `Découvrez les créations et le savoir-faire de ${profile.businessName}.`,
      email: '',
      phone: '',
    }));
  }

  async loadPublicCatalog(reset = false): Promise<void> {
    if (this.publicCatalogLoading || (!reset && !this.publicCatalogHasMore)) return;
    if (reset) {
      this.publicCatalogItems = [];
      this.publicCatalogCursor = null;
      this.publicCatalogHasMore = true;
    }
    this.publicCatalogLoading = true;
    try {
      const page = await this.dashboard.loadPublicCatalogPage(12, this.publicCatalogCursor ?? undefined);
      this.publicCatalogItems = reset
        ? page.data
        : [...this.publicCatalogItems, ...page.data.filter(item => !this.publicCatalogItems.some(existing => existing.id === item.id))];
      this.publicCatalogCursor = page.meta.nextCursor;
      this.publicCatalogHasMore = page.meta.hasMore;
      this.publicCatalogLoaded = true;
    } catch {
      this.publicCatalogHasMore = false;
    } finally {
      this.publicCatalogLoading = false;
    }
  }

  async loadPublicStylists(): Promise<void> {
    if (this.publicStylistsLoading || this.publicStylistsLoaded) return;
    this.publicStylistsLoading = true;
    try {
      this.publicStylists = await this.dashboard.loadPublicStylists();
      this.publicStylistsLoaded = true;
    } catch {
      // Keep the local showcase available when the public API is temporarily unavailable.
    } finally {
      this.publicStylistsLoading = false;
    }
  }

  async setCreationFilter(filter: Collection): Promise<void> {
    this.selectedFilter = filter;
    while (filter !== 'Tout'
      && this.publicCatalogItems.length
      && !this.visibleCreations.length
      && this.publicCatalogHasMore
      && !this.publicCatalogLoading) {
      await this.loadPublicCatalog();
    }
  }

  private toCreation(item: DashboardCatalogItem): Creation {
    const description = `${item.title} ${item.description}`.toLowerCase();
    const category: Exclude<Collection, 'Tout'> = description.includes('boubou')
      ? 'Boubous'
      : description.includes('ensemble') ? 'Ensembles' : 'Cérémonie';
    return {
      id: item.id,
      name: item.title,
      stylist: this.catalogStylistName(item),
      price: this.price(item.price),
      image: item.imageUrl,
      category,
      tone: 'plum',
    };
  }

  get cartCount(): number {
    return this.selectedCreations.length;
  }

  get favoritesCount(): number {
    return this.favoriteKeys.length;
  }

  get visibleClientInspirations(): Array<Creation | DashboardCatalogItem> {
    const available = [...this.visibleCreations, ...this.clientCatalog];
    const items = this.showFavoritesOnly ? available.filter(item => this.isFavorite(item)) : available;
    return this.showFavoritesOnly ? items : items.slice(0, 3);
  }

  inspirationName(item: Creation | DashboardCatalogItem): string {
    return 'title' in item ? item.title : item.name;
  }

  inspirationImage(item: Creation | DashboardCatalogItem): string {
    return 'imageUrl' in item ? item.imageUrl : item.image;
  }

  inspirationStylist(item: Creation | DashboardCatalogItem): string {
    return 'title' in item ? this.catalogStylistName(item) : item.stylist;
  }

  inspirationCurrency(item: Creation | DashboardCatalogItem): string {
    return 'currency' in item ? item.currency : 'FCFA';
  }

  get defaultWorkspaceRole(): AppAccountRole {
    return this.auth.appRole ?? 'client';
  }

  get userInitials(): string {
    const user = this.authenticatedUser;
    return user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : 'FS';
  }

  get stylistPhotoUrl(): string {
    return this.stylistProfile
      ? this.stylistProfile.user.profileImage
      : this.authenticatedUser?.profileImage || '';
  }

  get userFirstName(): string {
    return this.authenticatedUser?.firstName ?? 'Fatou';
  }

  get selectedStylistCreations(): Creation[] {
    if (!this.selectedStylist) return [];
    if (this.selectedStylist.id) {
      return this.publicCatalogItems
        .filter(item => item.stylistId === this.selectedStylist?.id)
        .map(item => this.toCreation(item));
    }
    return this.creations.filter(item => item.stylist === this.selectedStylist?.studio);
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

  get visibleStylistOrders(): DashboardOrder[] {
    return this.showAllStylistOrders ? this.stylistOrders : this.stylistOrders.slice(0, 4);
  }

  get stylistPageTitle(): string {
    const titles: Record<StylistPage, string> = {
      overview: 'Tableau de bord',
      orders: 'Commandes',
      clients: 'Mes clientes',
      creations: 'Mes créations',
      measurements: 'Mesures',
      contacts: 'Contacts',
      planning: 'Planning',
      team: 'Équipe',
      settings: 'Paramètres',
    };
    return titles[this.stylistPage];
  }

  get stylistClientContacts(): Array<{ name: string; phone: string }> {
    const contacts = [
      ...this.stylistOrders.map(order => ({ name: order.clientName, phone: order.clientPhone })),
      ...this.stylistAppointments.flatMap(appointment => appointment.client ? [{
        name: `${appointment.client.firstName} ${appointment.client.lastName}`,
        phone: appointment.client.phone,
      }] : []),
      ...this.stylistMeasurements.map(measurement => ({ name: measurement.clientName, phone: measurement.clientPhone })),
    ];
    return [...new Map(contacts.filter(contact => contact.phone).map(contact => [contact.phone, contact])).values()];
  }

  get stylistClientRecords(): StylistClientRecord[] {
    const records = new Map<string, StylistClientRecord>();
    const getRecord = (name: string, phone: string): StylistClientRecord | null => {
      const key = phone.replace(/[^+\d]/g, '');
      if (!key) return null;
      const existing = records.get(key);
      if (existing) return existing;
      const record: StylistClientRecord = { key, name, phone, measurements: [], orders: [], appointments: [] };
      records.set(key, record);
      return record;
    };
    this.stylistMeasurements.forEach(item => getRecord(item.clientName, item.clientPhone)?.measurements.push(item));
    this.stylistOrders.forEach(item => getRecord(item.clientName, item.clientPhone)?.orders.push(item));
    this.stylistAppointments.forEach(item => {
      const client = item.client;
      if (client?.phone) getRecord(`${client.firstName} ${client.lastName}`, client.phone)?.appointments.push(item);
    });
    return [...records.values()]
      .filter(record => {
        const query = this.stylistClientSearch.trim().toLocaleLowerCase('fr');
        return !query || record.name.toLocaleLowerCase('fr').includes(query) || record.phone.includes(query);
      })
      .sort((left, right) => {
        const leftDate = Math.max(...[...left.measurements.map(item => item.updatedAt), ...left.orders.map(item => item.updatedAt), ...left.appointments.map(item => item.startsAt)].map(value => new Date(value).getTime()), 0);
        const rightDate = Math.max(...[...right.measurements.map(item => item.updatedAt), ...right.orders.map(item => item.updatedAt), ...right.appointments.map(item => item.startsAt)].map(value => new Date(value).getTime()), 0);
        return rightDate - leftDate;
      });
  }

  get stylistOrderActivity(): Array<{ label: string; count: number }> {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const count = this.stylistOrders.filter(order => {
        const created = new Date(order.createdAt);
        return created.getFullYear() === month.getFullYear() && created.getMonth() === month.getMonth();
      }).length;
      return { label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(month), count };
    });
  }

  get stylistRevenueActivity(): Array<{ label: string; amount: number }> {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const amount = this.stylistOrders
        .filter(order => {
          const created = new Date(order.createdAt);
          return created.getFullYear() === month.getFullYear()
            && created.getMonth() === month.getMonth()
            && order.status !== 'cancelled';
        })
        .reduce((total, order) => total + Number(order.totalPrice), 0);
      return { label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(month), amount };
    });
  }

  revenueActivityHeight(amount: number): number {
    const max = Math.max(1, ...this.stylistRevenueActivity.map(item => item.amount));
    return Math.max(4, Math.round(amount / max * 100));
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
    window.setTimeout(() => void this.loadPublicCatalog(true), 0);
    window.setTimeout(() => void this.loadPublicStylists(), 0);
    if (this.auth.isAuthenticated && this.auth.appRole) {
      void this.restoreAuthenticatedWorkspace();
    }
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

  private async restoreAuthenticatedWorkspace(): Promise<void> {
    const role = this.auth.appRole;
    if (!role || !this.auth.isAuthenticated) return;

    if (!await this.auth.validateSession()) {
      this.authenticatedUser = null;
      this.activeView = 'home';
      this.openLogin(role);
      this.showToast('Votre session a expiré. Reconnectez-vous.');
      return;
    }

    this.authenticatedUser = this.auth.user;
    this.workspaceRole = role;
    this.activeView = role;
    if (role !== 'admin') void this.loadDashboard(role);
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

    const loadMarker = document.querySelector<HTMLElement>('.catalog-load-sentinel');
    if ((this.activeView === 'home' || this.activeView === 'explore')
      && loadMarker
      && loadMarker.getBoundingClientRect().top < window.innerHeight + 500) {
      void this.loadPublicCatalog();
    }
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

  setStylistPage(page: StylistPage): void {
    this.stylistPage = page;
    this.showAllStylistOrders = page === 'orders';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setEmployeePage(page: EmployeePage): void {
    this.employeePage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showToast(message: string): void {
    this.toast = message;
    window.setTimeout(() => this.toast = '', 2600);
  }

  async loadDashboard(role: 'client' | 'stylist' | 'employee'): Promise<void> {
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
      } else if (this.authenticatedUser && role === 'employee') {
        const snapshot = await this.dashboard.loadEmployeeDashboard();
        this.employeeContext = snapshot.employee;
        this.stylistMeasurements = snapshot.measurements;
      } else if (this.authenticatedUser) {
        const snapshot = await this.dashboard.loadStylistDashboard(this.authenticatedUser.id);
        this.stylistOrders = snapshot.orders;
        this.stylistMeasurements = snapshot.measurements;
        this.stylistAppointments = snapshot.appointments;
        this.stylistCatalog = snapshot.catalog;
        this.stylistProfile = snapshot.profile;
        this.employeeContext = null;
        this.stylistPersonnel = snapshot.profile
          ? await this.dashboard.listStylistPersonnel(snapshot.profile.id)
          : [];
      }
    } catch {
      this.dashboardError = 'Impossible de charger les données. Vérifiez que l’API est démarrée.';
    } finally {
      this.dashboardLoading = false;
    }
  }

  refreshDashboard(): void {
    const role = this.activeView === 'stylist' ? 'stylist' : this.activeView === 'employee' ? 'employee' : 'client';
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

  orderActivityHeight(count: number): number {
    const max = Math.max(1, ...this.stylistOrderActivity.map(item => item.count));
    return Math.max(8, Math.round((count / max) * 100));
  }

  clearCatalogImage(): void {
    this.catalogImageData = '';
    this.catalogImageFileName = '';
    this.catalogImageError = '';
  }

  async onCatalogImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.catalogImageError = '';
    if (!file.type.startsWith('image/')) {
      this.catalogImageError = 'Choisissez un fichier image.';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      this.catalogImageError = 'L’image doit faire moins de 12 Mo.';
      return;
    }

    try {
      this.catalogImageData = await this.compressImage(file);
      this.catalogImageFileName = file.name;
    } catch (error) {
      this.catalogImageError = error instanceof Error ? error.message : 'Import de l’image impossible.';
    }
  }

  async onStylistPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.profileImageError = '';
    if (!file.type.startsWith('image/')) {
      this.profileImageError = 'Choisissez un fichier image.';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      this.profileImageError = 'La photo doit faire moins de 12 Mo.';
      return;
    }
    try {
      this.profileDraft.profileImage = await this.compressImage(file);
      this.profileImageFileName = file.name;
    } catch (error) {
      this.profileImageError = error instanceof Error ? error.message : 'Import de la photo impossible.';
    }
  }

  clearStylistPhoto(): void {
    this.profileDraft.profileImage = '';
    this.profileImageFileName = '';
    this.profileImageError = '';
  }

  private async compressImage(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement('canvas');
      let width = Math.min(bitmap.width, 1200);
      let blob: Blob | null = null;
      for (let resize = 0; resize < 7 && !blob; resize++) {
        canvas.width = width;
        canvas.height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Traitement d’image indisponible.');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
          const candidate = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
          if (candidate && candidate.size <= 55 * 1024) {
            blob = candidate;
            break;
          }
        }
        if (!blob) width = Math.max(240, Math.floor(width * 0.75));
      }
      if (!blob) throw new Error('Cette image ne peut pas être réduite suffisamment. Choisissez une autre image.');
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Lecture de l’image impossible.'));
        reader.onerror = () => reject(new Error('Lecture de l’image impossible.'));
        reader.readAsDataURL(blob!);
      });
    } finally {
      bitmap.close();
    }
  }

  openStylistEditor(type: Exclude<StylistEditor, null>, item?: DashboardCatalogItem): void {
    this.stylistEditor = type;
    if (type === 'catalog') {
      this.editingCatalogId = item?.id ?? null;
      this.catalogImageData = item?.imageUrl.startsWith('data:image/') ? item.imageUrl : '';
      this.catalogImageFileName = this.catalogImageData ? 'Image importée' : '';
      this.catalogImageError = '';
      this.catalogDraft = {
        title: item?.title ?? '',
        description: item?.description ?? '',
        imageUrl: this.catalogImageData ? '' : item?.imageUrl ?? '',
        price: item ? this.price(item.price) : null,
        colors: item?.availableColors.join(', ') ?? '',
      };
    } else {
      this.profileDraft = {
        businessName: this.stylistProfile?.businessName ?? '',
        about: this.stylistProfile?.about ?? '',
        specialties: this.stylistProfile?.specialties.join(', ') ?? '',
        profileImage: this.stylistPhotoUrl,
      };
      this.profileImageFileName = this.profileDraft.profileImage ? 'Photo actuelle' : '';
      this.profileImageError = '';
    }
  }

  closeStylistEditor(): void {
    if (!this.editorSaving) this.stylistEditor = null;
  }

  async saveStylistEditor(): Promise<void> {
    if (!this.stylistEditor) return;
    this.editorSaving = true;
    try {
      if (this.stylistEditor === 'catalog') {
        const item: CatalogItemInput = {
          title: this.catalogDraft.title.trim(),
          description: this.catalogDraft.description.trim(),
          imageUrl: this.catalogImageData || this.catalogDraft.imageUrl.trim(),
          price: Number(this.catalogDraft.price),
          currency: 'XOF',
          availableColors: this.catalogDraft.colors.split(',').map(color => color.trim()).filter(Boolean),
        };
        const saved = this.demoMode
          ? {
              id: this.editingCatalogId ?? `demo-catalog-${Date.now()}`,
              stylistId: this.stylistProfile?.id ?? 'demo-stylist-awa',
              ...item,
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : this.editingCatalogId
            ? await this.dashboard.updateCatalogItem(this.editingCatalogId, item)
            : await this.dashboard.createCatalogItem(item);
        this.stylistCatalog = this.editingCatalogId
          ? this.stylistCatalog.map(existing => existing.id === saved.id ? saved : existing)
          : [saved, ...this.stylistCatalog];
        this.publicCatalogItems = this.editingCatalogId
          ? this.publicCatalogItems.map(existing => existing.id === saved.id ? saved : existing)
          : [saved, ...this.publicCatalogItems.filter(existing => existing.id !== saved.id)];
        this.showToast(this.editingCatalogId ? 'Création mise à jour' : 'Création publiée dans votre vitrine');
      } else {
        const profile: StylistProfileUpdate = {
          businessName: this.profileDraft.businessName.trim(),
          about: this.profileDraft.about.trim(),
          specialties: this.profileDraft.specialties.split(',').map(value => value.trim()).filter(Boolean),
          profileImage: this.profileDraft.profileImage,
        };
        const saved = this.demoMode
          ? { ...(this.stylistProfile as DashboardStylist), ...profile, user: { ...this.stylistProfile!.user, profileImage: profile.profileImage } }
          : await this.dashboard.updateStylistProfile(profile);
        this.stylistProfile = saved;
        this.showToast('Profil de l’atelier mis à jour');
      }
      this.stylistEditor = null;
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Enregistrement impossible. Réessayez.');
    } finally {
      this.editorSaving = false;
    }
  }

  async deactivateCatalogItem(item: DashboardCatalogItem): Promise<void> {
    if (!window.confirm(`Retirer « ${item.title} » de votre vitrine ?`)) return;
    try {
      if (!this.demoMode) await this.dashboard.deactivateCatalogItem(item.id);
      this.stylistCatalog = this.stylistCatalog.filter(existing => existing.id !== item.id);
      this.publicCatalogItems = this.publicCatalogItems.filter(existing => existing.id !== item.id);
      this.showToast('Création retirée de votre vitrine');
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Suppression impossible. Réessayez.');
    }
  }

  async changeAppointmentStatus(appointment: DashboardAppointment, status: DashboardAppointmentStatus): Promise<void> {
    this.updatingAppointmentId = appointment.id;
    try {
      const updated = this.demoMode
        ? { ...appointment, status }
        : await this.dashboard.updateAppointmentStatus(appointment.id, status);
      this.stylistAppointments = this.stylistAppointments.map(item => item.id === updated.id ? updated : item);
      this.showToast(`Rendez-vous ${status === 'confirmed' ? 'confirmé' : status === 'cancelled' ? 'annulé' : 'terminé'}`);
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Mise à jour du rendez-vous impossible');
    } finally {
      this.updatingAppointmentId = null;
    }
  }

  async copyMeasurement(measurement: DashboardMeasurement): Promise<void> {
    const summary = Object.entries(measurement.measurements).map(([key, value]) => `${key}: ${value} cm`).join('\n');
    try {
      await navigator.clipboard.writeText(`${measurement.clientName}\n${summary}`);
      this.showToast('Mensurations copiées');
    } catch {
      this.showToast('Copie indisponible sur ce navigateur');
    }
  }

  async copyPhone(phone: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(phone);
      this.showToast('Numéro copié');
    } catch {
      this.showToast(`Numéro : ${phone}`);
    }
  }

  openEmployeeAccountEditor(): void {
    if (this.demoMode) {
      this.showToast('Créez les comptes employés depuis un atelier connecté.');
      return;
    }
    this.employeeAccountDraft = { firstName: '', lastName: '', email: '', phone: '', password: '', specialization: 'Couture' };
    this.employeePasswordVisible = false;
    this.employeeAccountEditorOpen = true;
  }

  async saveEmployeeAccount(): Promise<void> {
    const stylistId = this.stylistProfile?.id;
    if (!stylistId) {
      this.showToast('Le profil de l’atelier est introuvable. Actualisez la page.');
      return;
    }
    this.employeeAccountSaving = true;
    try {
      const employee = await this.dashboard.createEmployeeAccount(stylistId, this.employeeAccountDraft);
      this.stylistPersonnel = [employee, ...this.stylistPersonnel];
      this.employeeAccountEditorOpen = false;
      this.showToast('Compte créé. Remettez les identifiants à votre employé en privé.');
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Création du compte impossible.');
    } finally {
      this.employeeAccountSaving = false;
    }
  }

  async toggleEmployeeAccess(employee: DashboardPersonnel): Promise<void> {
    const stylistId = this.stylistProfile?.id;
    if (!stylistId || !employee.userId) {
      this.showToast('Cet employé n’a pas encore de compte de connexion.');
      return;
    }
    try {
      const result = await this.dashboard.setEmployeeAccess(stylistId, employee.id, !employee.active);
      this.stylistPersonnel = this.stylistPersonnel.map(item => item.id === employee.id
        ? { ...item, active: result.active, user: item.user ? { ...item.user, active: result.active } : item.user }
        : item);
      this.showToast(result.active ? 'Accès employé réactivé' : 'Accès employé désactivé');
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Modification de l’accès impossible.');
    }
  }

  async saveEmployeeMeasurement(): Promise<void> {
    const measurements = this.measurementDraftValues(this.employeeMeasurementDraft);
    if (this.employeeClientName.trim().length < 2 || !this.employeeClientPhone.trim() || !Object.keys(measurements).length) {
      this.showToast('Indiquez le nom, le téléphone et au moins une mensuration.');
      return;
    }
    this.employeeMeasurementSaving = true;
    try {
      const record = await this.dashboard.createEmployeeMeasurement({
        clientName: this.employeeClientName.trim(), clientPhone: this.employeeClientPhone.trim(),
        measurements, notes: this.employeeMeasurementNotes.trim(),
      });
      this.stylistMeasurements = [record, ...this.stylistMeasurements];
      this.employeeClientName = '';
      this.employeeClientPhone = '';
      this.employeeMeasurementNotes = '';
      this.employeeMeasurementDraft = {};
      this.showToast('Fiche cliente et mensurations enregistrées.');
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Enregistrement impossible. Vérifiez le numéro de téléphone.');
    } finally {
      this.employeeMeasurementSaving = false;
    }
  }

  async saveStylistClientRecord(): Promise<void> {
    const stylistId = this.stylistProfile?.id;
    const measurements = this.measurementDraftValues(this.employeeMeasurementDraft);
    if (!stylistId || this.employeeClientName.trim().length < 2 || !this.employeeClientPhone.trim() || !Object.keys(measurements).length) {
      this.showToast('Indiquez le nom, le téléphone et au moins une mensuration.');
      return;
    }
    this.employeeMeasurementSaving = true;
    try {
      const now = new Date().toISOString();
      const record = this.demoMode
        ? {
            id: `demo-measurement-${Date.now()}`, stylistId, clientId: null, clientName: this.employeeClientName.trim(),
            clientPhone: this.employeeClientPhone.trim(), measurements, notes: this.employeeMeasurementNotes.trim(), createdAt: now, updatedAt: now,
          }
        : await this.dashboard.createStylistMeasurement(stylistId, {
            clientName: this.employeeClientName.trim(), clientPhone: this.employeeClientPhone.trim(),
            measurements, notes: this.employeeMeasurementNotes.trim(),
          });
      this.stylistMeasurements = [record, ...this.stylistMeasurements];
      this.employeeClientName = '';
      this.employeeClientPhone = '';
      this.employeeMeasurementNotes = '';
      this.employeeMeasurementDraft = {};
      this.showStylistClientForm = false;
      this.showToast('Cliente et mensurations enregistrées.');
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Enregistrement impossible. Vérifiez le numéro de téléphone.');
    } finally {
      this.employeeMeasurementSaving = false;
    }
  }

  private measurementDraftValues(draft: Record<string, number | null>): Record<string, number> {
    return Object.fromEntries(
      Object.entries(draft)
        .filter((entry): entry is [string, number] => entry[1] !== null && Number.isFinite(Number(entry[1])) && Number(entry[1]) > 0)
        .map(([key, value]) => [key, Number(value)]),
    );
  }

  editStylistMeasurement(measurement: DashboardMeasurement): void {
    this.stylistMeasurementEditor = measurement;
    this.stylistMeasurementDraft = { ...measurement.measurements };
    this.stylistMeasurementNotes = measurement.notes ?? '';
  }

  closeStylistMeasurementEditor(): void {
    if (!this.stylistMeasurementSaving) this.stylistMeasurementEditor = null;
  }

  async saveStylistMeasurement(): Promise<void> {
    const current = this.stylistMeasurementEditor;
    if (!current) return;
    const validValues = Object.values(this.stylistMeasurementDraft).every(value => Number.isFinite(Number(value)) && Number(value) > 0);
    if (!validValues) {
      this.showToast('Toutes les mesures doivent être des nombres positifs');
      return;
    }
    this.stylistMeasurementSaving = true;
    try {
      const updated = this.demoMode
        ? { ...current, measurements: { ...this.stylistMeasurementDraft }, notes: this.stylistMeasurementNotes, updatedAt: new Date().toISOString() }
        : await this.dashboard.updateStylistMeasurement(current.id, this.stylistMeasurementDraft, this.stylistMeasurementNotes);
      this.stylistMeasurements = this.stylistMeasurements.map(item => item.id === updated.id ? updated : item);
      this.stylistMeasurementEditor = null;
      this.showToast('Mensurations mises à jour');
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Enregistrement des mesures impossible');
    } finally {
      this.stylistMeasurementSaving = false;
    }
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
    return this.publicStylists.find(stylist => stylist.id === item.stylistId)?.businessName
      ?? this.clientStylists.find(stylist => stylist.id === item.stylistId)?.businessName
      ?? 'Atelier partenaire';
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

  favoriteKey(item: Creation | DashboardCatalogItem): string {
    if ('title' in item) return `catalog:${item.id}`;
    return item.id ? `catalog:${item.id}` : `creation:${item.stylist}:${item.name}`;
  }

  isFavorite(item: Creation | DashboardCatalogItem): boolean {
    return this.favoriteKeys.includes(this.favoriteKey(item));
  }

  toggleFavorite(item: Creation | DashboardCatalogItem): void {
    const key = this.favoriteKey(item);
    const alreadyFavorite = this.favoriteKeys.includes(key);
    this.favoriteKeys = alreadyFavorite
      ? this.favoriteKeys.filter(favorite => favorite !== key)
      : [...this.favoriteKeys, key];
    this.writeStoredArray(FAVORITES_STORAGE_KEY, this.favoriteKeys);
    const name = 'title' in item ? item.title : item.name;
    this.showToast(alreadyFavorite ? `${name} retirée de vos favoris` : `${name} ajoutée à vos favoris`);
  }

  scrollTo(id: string): void {
    this.activeView = 'home';
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    this.menuOpen = false;
  }

  setView(view: AppView): void {
    this.mobileDashboardMenuOpen = false;
    if (view === 'client' || view === 'stylist' || view === 'employee' || view === 'admin') {
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
      const label = role === 'admin' ? 'Super Admin' : role === 'stylist' ? 'styliste' : role === 'employee' ? 'employé' : 'client';
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
    this.mobileDashboardMenuOpen = false;
    if (this.demoMode) {
      this.workspaceRole = 'client';
      this.activeView = 'measure';
      this.menuOpen = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (this.activeView === 'client' && this.authenticatedUser) {
      this.workspaceRole = 'client';
      this.activeView = 'measure';
      this.menuOpen = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
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
    const role: AppAccountRole = user.role === 'ADMIN' ? 'admin' : user.role === 'STYLIST' ? 'stylist' : user.role === 'EMPLOYEE' ? 'employee' : 'client';
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
      this.stylistPersonnel = [];
      this.stylistAppointments = [];
      this.employeeContext = null;
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
      this.writeStoredArray(CART_STORAGE_KEY, this.selectedCreations);
      this.toast = `${item.name} ajouté à votre sélection`;
    }
    window.setTimeout(() => this.toast = '', 2600);
  }

  removeFromCart(item: Creation): void {
    this.selectedCreations = this.selectedCreations.filter(creation => creation.name !== item.name);
    this.writeStoredArray(CART_STORAGE_KEY, this.selectedCreations);
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

  private readStoredArray<T>(key: string): T[] {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(value) ? value as T[] : [];
    } catch {
      return [];
    }
  }

  private writeStoredArray<T>(key: string, value: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      this.showToast('Le stockage local est indisponible sur cet appareil');
    }
  }
}

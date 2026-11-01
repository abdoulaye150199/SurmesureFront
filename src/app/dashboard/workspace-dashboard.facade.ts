import { inject, Injectable } from '@angular/core';
import { OfflineWorkspaceSnapshot, OfflineWorkspaceStore } from './offline-workspace.store';
import {
  ClientDashboardSnapshot,
  DashboardService,
  DashboardPersonnel,
  EmployeeWorkspaceContext,
  StylistDashboardSnapshot,
} from './dashboard.service';

export type WorkspaceDashboardResult =
  | { kind: 'client'; snapshot: ClientDashboardSnapshot }
  | { kind: 'stylist'; snapshot: StylistDashboardSnapshot; personnel: DashboardPersonnel[] }
  | {
      kind: 'employee';
      employee: EmployeeWorkspaceContext;
      measurements: OfflineWorkspaceSnapshot['measurements'];
      orders: NonNullable<OfflineWorkspaceSnapshot['orders']>;
    }
  | { kind: 'offline'; snapshot: OfflineWorkspaceSnapshot };

@Injectable({ providedIn: 'root' })
export class WorkspaceDashboardFacade {
  private readonly dashboard = inject(DashboardService);
  private readonly offlineWorkspace = inject(OfflineWorkspaceStore);

  async load(
    role: 'client' | 'stylist' | 'employee',
    userId: string | null,
  ): Promise<WorkspaceDashboardResult> {
    try {
      if (role === 'client')
        return { kind: 'client', snapshot: await this.dashboard.loadClientDashboard() };

      if (!userId) throw new Error('Compte utilisateur manquant.');

      if (role === 'employee') {
        const snapshot = await this.dashboard.loadEmployeeDashboard();
        await this.saveOfflineSnapshot({
          userId,
          role,
          savedAt: new Date().toISOString(),
          measurements: snapshot.measurements,
          employeeContext: snapshot.employee,
          orders: snapshot.orders,
        });
        return { kind: 'employee', ...snapshot };
      }

      const snapshot = await this.dashboard.loadStylistDashboard(userId);
      await this.saveOfflineSnapshot({
        userId,
        role,
        savedAt: new Date().toISOString(),
        measurements: snapshot.measurements,
        stylistProfile: snapshot.profile,
      });
      const personnel = snapshot.profile
        ? await this.dashboard.listStylistPersonnel(snapshot.profile.id)
        : [];
      return { kind: 'stylist', snapshot, personnel };
    } catch (error) {
      if (role === 'client' || !userId) throw error;

      const snapshot = await this.offlineWorkspace.load(userId, role).catch(() => null);
      if (snapshot) return { kind: 'offline', snapshot };
      throw error;
    }
  }

  private async saveOfflineSnapshot(snapshot: OfflineWorkspaceSnapshot): Promise<void> {
    await this.offlineWorkspace.save(snapshot).catch(() => undefined);
  }
}

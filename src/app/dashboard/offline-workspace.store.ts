import { Injectable } from '@angular/core';
import {
  DashboardMeasurement,
  DashboardStylist,
  EmployeeWorkspaceContext,
} from './dashboard.service';

export type OfflineWorkspaceRole = 'stylist' | 'employee';

export interface OfflineWorkspaceSnapshot {
  userId: string;
  role: OfflineWorkspaceRole;
  savedAt: string;
  measurements: DashboardMeasurement[];
  stylistProfile?: DashboardStylist | null;
  employeeContext?: EmployeeWorkspaceContext | null;
}

const DATABASE_NAME = 'sur-mesure-offline';
const DATABASE_VERSION = 1;
const STORE_NAME = 'workspace';
const SNAPSHOT_KEY = 'latest';

@Injectable({ providedIn: 'root' })
export class OfflineWorkspaceStore {
  async save(snapshot: OfflineWorkspaceSnapshot): Promise<void> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY);
      await this.waitForTransaction(transaction);
    } finally {
      database.close();
    }
  }

  async load(userId: string, role: OfflineWorkspaceRole): Promise<OfflineWorkspaceSnapshot | null> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
      const transactionComplete = this.waitForTransaction(transaction);
      const snapshot = await new Promise<OfflineWorkspaceSnapshot | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as OfflineWorkspaceSnapshot | undefined);
        request.onerror = () => reject(request.error ?? new Error('Lecture hors ligne impossible.'));
      });
      await transactionComplete;
      return snapshot?.userId === userId && snapshot.role === role ? snapshot : null;
    } finally {
      database.close();
    }
  }

  async clear(): Promise<void> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      await this.waitForTransaction(transaction);
    } finally {
      database.close();
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Stockage hors ligne indisponible.'));

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Ouverture du stockage hors ligne impossible.'));
      request.onblocked = () => reject(new Error('Le stockage hors ligne est occupé par un autre onglet.'));
    });
  }

  private waitForTransaction(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Écriture hors ligne impossible.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Écriture hors ligne annulée.'));
    });
  }
}

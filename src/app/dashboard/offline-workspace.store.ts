import { Injectable } from '@angular/core';
import {
  DashboardOrder,
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
  orders?: DashboardOrder[];
  stylistProfile?: DashboardStylist | null;
  employeeContext?: EmployeeWorkspaceContext | null;
}

const DATABASE_NAME = 'sur-mesure-offline';
const DATABASE_VERSION = 1;
const STORE_NAME = 'workspace';
const SNAPSHOT_KEY = 'latest';
const MAX_SNAPSHOT_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class OfflineWorkspaceStore {
  async save(snapshot: OfflineWorkspaceSnapshot): Promise<void> {
    if (!isOfflineWorkspaceSnapshot(snapshot)) {
      throw new Error('Les données hors ligne ne sont pas valides.');
    }

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
      const snapshot = await new Promise<unknown>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error('Lecture hors ligne impossible.'));
      });
      await transactionComplete;
      if (
        !isOfflineWorkspaceSnapshot(snapshot) ||
        snapshot.userId !== userId ||
        snapshot.role !== role
      ) {
        await this.clear();
        return null;
      }

      const ageMs = Date.now() - new Date(snapshot.savedAt).getTime();
      if (ageMs < 0 || ageMs > MAX_SNAPSHOT_AGE_MS) {
        await this.clear();
        return null;
      }
      return snapshot;
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
    if (typeof indexedDB === 'undefined')
      return Promise.reject(new Error('Stockage hors ligne indisponible.'));

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Ouverture du stockage hors ligne impossible.'));
      request.onblocked = () =>
        reject(new Error('Le stockage hors ligne est occupé par un autre onglet.'));
    });
  }

  private waitForTransaction(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Écriture hors ligne impossible.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Écriture hors ligne annulée.'));
    });
  }
}

function isOfflineWorkspaceSnapshot(value: unknown): value is OfflineWorkspaceSnapshot {
  if (!isRecord(value)) return false;
  if (typeof value['userId'] !== 'string' || !value['userId']) return false;
  if (value['role'] !== 'stylist' && value['role'] !== 'employee') return false;
  if (typeof value['savedAt'] !== 'string' || !Number.isFinite(Date.parse(value['savedAt'])))
    return false;
  if (!Array.isArray(value['measurements']) || !value['measurements'].every(isStoredRecordWithId))
    return false;
  if (
    value['orders'] !== undefined &&
    (!Array.isArray(value['orders']) || !value['orders'].every(isStoredRecordWithId))
  )
    return false;
  if (
    value['stylistProfile'] !== undefined &&
    value['stylistProfile'] !== null &&
    !isRecord(value['stylistProfile'])
  )
    return false;
  if (
    value['employeeContext'] !== undefined &&
    value['employeeContext'] !== null &&
    !isRecord(value['employeeContext'])
  )
    return false;
  return true;
}

function isStoredRecordWithId(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value['id'] === 'string' && value['id'].length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

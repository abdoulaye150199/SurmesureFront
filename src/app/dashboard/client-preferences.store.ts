import { Injectable } from '@angular/core';

export type CreationCategory = 'Cérémonie' | 'Boubous' | 'Ensembles';

export interface SavedCreation {
  id?: string;
  stylistId?: string;
  name: string;
  stylist: string;
  description?: string;
  currency?: string;
  price: number;
  image: string;
  category: CreationCategory;
  tone: string;
  badge?: string;
}

const CART_STORAGE_KEY = 'surmesure.selection';
const FAVORITES_STORAGE_KEY = 'surmesure.favorites';
const DELIVERY_REMINDERS_KEY = 'surmesure.delivery-reminders';
const MAX_STORED_ITEMS = 500;

@Injectable({ providedIn: 'root' })
export class ClientPreferencesStore {
  loadCreations(): SavedCreation[] {
    return this.readArray(CART_STORAGE_KEY, isSavedCreation);
  }

  saveCreations(creations: SavedCreation[]): boolean {
    return this.writeArray(CART_STORAGE_KEY, creations);
  }

  loadFavoriteKeys(): string[] {
    return this.readArray(FAVORITES_STORAGE_KEY, isStoredKey);
  }

  saveFavoriteKeys(keys: string[]): boolean {
    return this.writeArray(FAVORITES_STORAGE_KEY, keys);
  }

  loadReadDeliveryReminderKeys(userId: string): string[] {
    return this.readArray(`${DELIVERY_REMINDERS_KEY}.${userId}`, isStoredKey);
  }

  saveReadDeliveryReminderKeys(userId: string, keys: string[]): boolean {
    return this.writeArray(`${DELIVERY_REMINDERS_KEY}.${userId}`, keys.slice(-MAX_STORED_ITEMS));
  }

  private readArray<T>(key: string, isItem: (value: unknown) => value is T): T[] {
    if (typeof window === 'undefined') return [];

    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isItem).slice(-MAX_STORED_ITEMS) : [];
    } catch {
      return [];
    }
  }

  private writeArray<T>(key: string, values: T[]): boolean {
    if (typeof window === 'undefined') return false;

    try {
      window.localStorage.setItem(key, JSON.stringify(values.slice(-MAX_STORED_ITEMS)));
      return true;
    } catch {
      return false;
    }
  }
}

function isSavedCreation(value: unknown): value is SavedCreation {
  if (!isRecord(value)) return false;

  return (
    typeof value['name'] === 'string' &&
    value['name'].length > 0 &&
    value['name'].length <= 160 &&
    typeof value['stylist'] === 'string' &&
    value['stylist'].length <= 160 &&
    typeof value['price'] === 'number' &&
    Number.isFinite(value['price']) &&
    value['price'] >= 0 &&
    typeof value['image'] === 'string' &&
    value['image'].length <= 4096 &&
    ['Cérémonie', 'Boubous', 'Ensembles'].includes(String(value['category'])) &&
    typeof value['tone'] === 'string' &&
    value['tone'].length <= 80
  );
}

function isStoredKey(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

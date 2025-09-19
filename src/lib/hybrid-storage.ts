import { browser } from 'wxt/browser';

export interface StorageAdapter {
  get name(): string;
  isAvailable(): boolean;
  getItem(key: string): Promise<any>;
  setItem(key: string, value: any): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getStorageInfo(): Promise<{ used: number; available: number; quota: number }>;
  addChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void;
  removeChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void;
}

export class HybridStorage implements StorageAdapter {
  private adapter: StorageAdapter;

  constructor(adapterClasses: (new () => StorageAdapter)[]) {
    // Find the first available adapter
    let adapter: StorageAdapter | undefined;
    for (const AdapterClass of adapterClasses) {
      const testAdapter = new AdapterClass();
      if (testAdapter.isAvailable()) {
        adapter = testAdapter;
        break;
      }
    }

    if (!adapter) {
      throw new Error('No storage adapters are available');
    }

    this.adapter = adapter;
  }

  get adapterName(): string {
    return this.adapter.name;
  }

  get name(): string {
    return 'Hybrid: ' + this.adapter.name;
  }

  isAvailable(): boolean {
    return this.adapter.isAvailable();
  }

  async getItem(key: string): Promise<any> {
    return await this.adapter.getItem(key);
  }

  async setItem(key: string, value: any): Promise<void> {
    await this.adapter.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await this.adapter.removeItem(key);
  }

  async clear(): Promise<void> {
    await this.adapter.clear();
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number; adapter: string }> {
    const info = await this.adapter.getStorageInfo();
    const adapter = this.adapterName;
    return {
      ...info,
      adapter,
    };
  }

  addChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.adapter.addChangeListener(listener);
  }

  removeChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.adapter.removeChangeListener(listener);
  }
}

export class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'StudyPortalDB';
  private dbVersion = 1;
  private storeName = 'keyValueStore';
  private db: IDBDatabase | null = null;
  private listeners = new Set<(key: string, newValue: any, oldValue?: any) => void>();
  private isListening = false;
  private syncSignalKey = 'sp:indexeddb-sync-signal';

  constructor() {
    if (this.isAvailable()) {
      this.initDB();
      this.setupStorageListener();
    }
  }

  get name(): string {
    return 'IndexedDB';
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB != null;
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('key', 'key', { unique: true });
        }
      };
    });
  }

  private setupStorageListener() {
    if (this.isListening || typeof window === 'undefined') return;

    this.isListening = true;
    // Listen for localStorage storage events for cross-tab synchronization
    window.addEventListener('storage', e => {
      if (e.key === this.syncSignalKey && e.newValue && e.storageArea === localStorage) {
        const signal = parseValue(e.newValue);
        if (signal.action === 'indexeddb-updated' && signal.key && signal.timestamp !== this.getLastTimestamp()) {
          // Reload the specific key from IndexedDB and notify listeners
          this.getItem(signal.key)
            .then(newValue => {
              this.notifyListeners(signal.key, newValue, signal.oldValue);
            })
            .catch(error => {
              console.error('Failed to sync IndexedDB change:', error);
            });
        }
      }
    });
  }

  private lastTimestamp = 0;
  private getLastTimestamp(): number {
    return this.lastTimestamp;
  }

  private notifyOtherTabs(key: string, newValue: any, oldValue?: any) {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }

      this.lastTimestamp = Date.now();
      const signal = {
        timestamp: this.lastTimestamp,
        action: 'indexeddb-updated',
        key,
        oldValue,
      };

      localStorage.setItem(this.syncSignalKey, JSON.stringify(signal));
      // Clean up the signal after a short delay
      setTimeout(() => {
        try {
          localStorage.removeItem(this.syncSignalKey);
        } catch (error) {
          console.warn('Failed to clean up IndexedDB sync signal:', error);
        }
      }, 100);
    } catch (error) {
      console.warn('Failed to send IndexedDB sync signal:', error);
    }
  }

  private notifyListeners(key: string, newValue: any, oldValue?: any) {
    this.listeners.forEach(listener => {
      try {
        listener(key, newValue, oldValue);
      } catch (error) {
        console.error('IndexedDB storage listener error:', error);
      }
    });
  }

  addChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.add(listener);
  }

  removeChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.delete(listener);
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  async getItem(key: string): Promise<any> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(undefined);
            return;
          }

          resolve(parseValue(result.value));
        };
      });
    } catch (error) {
      console.error('IndexedDB getItem error:', error);
      return undefined;
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    try {
      const db = await this.ensureDB();

      // Get old value for change notification
      const oldValue = await this.getItem(key);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        // Serialize the value to JSON for storage
        const serializedValue = JSON.stringify(value);
        const request = store.put({ key, value: serializedValue, timestamp: Date.now() });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          // Notify other tabs about the change
          this.notifyOtherTabs(key, value, oldValue);
          resolve();
        };
      });
    } catch (error) {
      console.error('IndexedDB setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB removeItem error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const available = quota - used;

        return { used, available, quota };
      } catch (error) {
        console.warn('Could not get storage estimate:', error);
      }
    }

    // Fallback estimates
    return {
      used: 0,
      available: 50 * 1024 * 1024, // 50MB conservative estimate
      quota: 50 * 1024 * 1024,
    };
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  private listeners = new Set<(key: string, newValue: any, oldValue?: any) => void>();
  private isListening = false;

  constructor() {
    if (this.isAvailable()) {
      this.setupStorageListener();
    }
  }

  get name(): string {
    return 'localStorage';
  }

  isAvailable(): boolean {
    try {
      // Check if we're in a browser environment
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  private setupStorageListener() {
    if (this.isListening || typeof window === 'undefined') return;

    this.isListening = true;
    // Listen for localStorage storage events
    window.addEventListener('storage', e => {
      if (e.key && e.storageArea === localStorage) {
        const newValue = e.newValue ? parseValue(e.newValue) : undefined;
        const oldValue = e.oldValue ? parseValue(e.oldValue) : undefined;
        this.notifyListeners(e.key, newValue, oldValue);
      }
    });
  }

  private notifyListeners(key: string, newValue: any, oldValue?: any) {
    this.listeners.forEach(listener => {
      try {
        listener(key, newValue, oldValue);
      } catch (error) {
        console.error('localStorage listener error:', error);
      }
    });
  }

  addChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.add(listener);
  }

  removeChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.delete(listener);
  }
  async getItem(key: string): Promise<any> {
    const value = localStorage.getItem(key);
    return parseValue(value);
  }

  async setItem(key: string, value: any): Promise<void> {
    try {
      // Always serialize to JSON for localStorage
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      this.notifyListeners(key, value, await this.getItem(key));
    } catch (error) {
      console.error('localStorage setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
      this.notifyListeners(key, undefined, await this.getItem(key));
    } catch (error) {
      console.error('localStorage removeItem error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('localStorage clear error:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    // Estimate localStorage usage
    let used = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      console.warn('Could not estimate localStorage usage:', error);
    }

    const quota = 5 * 1024 * 1024; // 5MB typical localStorage limit
    const available = Math.max(0, quota - used);

    return { used, available, quota };
  }
}

export class BrowserStorageAdapter implements StorageAdapter {
  private listeners = new Set<(key: string, newValue: any, oldValue?: any) => void>();
  private isListening = false;

  constructor() {
    if (this.isAvailable()) {
      this.setupStorageListener();
    }
  }

  get name(): string {
    return 'Browser';
  }

  isAvailable(): boolean {
    try {
      return !!browser.runtime?.id && !!browser.storage?.local;
    } catch {
      return false;
    }
  }

  private setupStorageListener() {
    if (this.isListening) return;

    this.isListening = true;
    browser.storage.local.onChanged.addListener(changes => {
      for (const [key, change] of Object.entries(changes)) {
        // Type assertion for browser storage change objects
        const storageChange = change as { newValue?: any; oldValue?: any };
        this.notifyListeners(key, storageChange.newValue, storageChange.oldValue);
      }
    });
  }

  private notifyListeners(key: string, newValue: any, oldValue?: any) {
    this.listeners.forEach(listener => {
      try {
        listener(key, newValue, oldValue);
      } catch (error) {
        console.error('Browser storage listener error:', error);
      }
    });
  }

  addChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.add(listener);
  }

  removeChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.delete(listener);
  }

  async getItem(key: string): Promise<any> {
    try {
      const result = await browser.storage.local.get(key);
      const value = result[key];
      return value;
    } catch (error) {
      console.error('Browser storage getItem error:', error);
      return undefined;
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    try {
      await browser.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Browser storage setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await browser.storage.local.remove(key);
    } catch (error) {
      console.error('Browser storage removeItem error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await browser.storage.local.clear();
    } catch (error) {
      console.error('Browser storage clear error:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    try {
      if ('storage' in browser && 'local' in browser.storage) {
        const used = await browser.storage.local.getBytesInUse(null);
        if (browser.permissions.contains({ permissions: ['unlimitedStorage'] })) {
          return { used, available: Infinity, quota: Infinity };
        }
        const quota = browser.storage.local.QUOTA_BYTES;
        const available = Math.max(0, quota - used);

        return { used, available, quota };
      }
    } catch (error) {
      console.warn('Could not estimate browser storage usage:', error);
    }

    // Fallback estimates for extension storage
    return {
      used: 0,
      available: 10 * 1024 * 1024, // 10MB
      quota: 10 * 1024 * 1024,
    };
  }
}

export class InMemoryAdapter implements StorageAdapter {
  private listeners = new Set<(key: string, newValue: any, oldValue?: any) => void>();
  private isListening = false;
  private syncSignalKey = 'sp:inmemory-sync-signal';
  private storage: Map<string, any> = new Map();

  constructor() {
    if (this.isAvailable()) {
      this.setupStorageListener();
    }
  }

  get name(): string {
    return 'InMemory';
  }

  isAvailable(): boolean {
    try {
      // Check if we're in a browser environment
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  private setupStorageListener() {
    if (this.isListening || typeof window === 'undefined') return;

    this.isListening = true;
    // Listen for localStorage storage events for cross-tab synchronization
    window.addEventListener('storage', e => {
      if (e.key === this.syncSignalKey && e.newValue && e.storageArea === localStorage) {
        const signal = parseValue(e.newValue);
        if (signal.action === 'inmemory-updated' && signal.key && signal.timestamp !== this.getLastTimestamp()) {
          // Reload the specific key from IndexedDB and notify listeners
          this.getItem(signal.key)
            .then(oldValue => {
              this.notifyListeners(signal.key, signal.newValue, oldValue);
            })
            .catch(error => {
              console.error('Failed to sync IndexedDB change:', error);
            });
        }
      }
    });
  }

  private lastTimestamp = 0;
  private getLastTimestamp(): number {
    return this.lastTimestamp;
  }

  private notifyOtherTabs(key: string, newValue: any, oldValue?: any) {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }

      this.lastTimestamp = Date.now();
      const signal = {
        timestamp: this.lastTimestamp,
        action: 'inmemory-updated',
        key,
        oldValue,
        newValue,
      };

      localStorage.setItem(this.syncSignalKey, JSON.stringify(signal));
      // Clean up the signal after a short delay
      setTimeout(() => {
        try {
          localStorage.removeItem(this.syncSignalKey);
        } catch (error) {
          console.warn('Failed to clean up IndexedDB sync signal:', error);
        }
      }, 100);
    } catch (error) {
      console.warn('Failed to send IndexedDB sync signal:', error);
    }
  }

  private notifyListeners(key: string, newValue: any, oldValue?: any) {
    this.listeners.forEach(listener => {
      try {
        listener(key, newValue, oldValue);
      } catch (error) {
        console.error('IndexedDB storage listener error:', error);
      }
    });
  }

  addChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.add(listener);
  }

  removeChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.listeners.delete(listener);
  }

  async getItem(key: string): Promise<any> {
    return this.storage.get(key);
  }

  async setItem(key: string, value: any): Promise<void> {
    const oldValue = await this.getItem(key);
    this.storage.set(key, value);
    this.notifyListeners(key, value, oldValue);
    this.notifyOtherTabs(key, value, oldValue);
  }

  async removeItem(key: string): Promise<void> {
    const oldValue = await this.getItem(key);
    this.storage.delete(key);
    this.notifyListeners(key, undefined, oldValue);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    return { used: 0, available: Infinity, quota: Infinity };
  }
}

export class CombinedStorage implements StorageAdapter {
  private primary: StorageAdapter;
  private secondary: StorageAdapter;

  constructor(primary: StorageAdapter, secondary: StorageAdapter) {
    this.primary = primary;
    this.secondary = secondary;
  }

  get name(): string {
    return `Combined: ${this.primary.name} + ${this.secondary.name}`;
  }

  isAvailable(): boolean {
    return this.primary.isAvailable();
  }

  async getItem(key: string): Promise<any> {
    return await this.primary.getItem(key);
  }

  async setItem(key: string, value: any): Promise<void> {
    await this.primary.setItem(key, value);
    try {
      await this.secondary.setItem(key, value);
    } catch (error) {
      console.warn('Failed to set item in secondary storage:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    await this.primary.removeItem(key);
    try {
      await this.secondary.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove item from secondary storage:', error);
    }
  }

  async clear(): Promise<void> {
    await this.primary.clear();
    try {
      await this.secondary.clear();
    } catch (error) {
      console.warn('Failed to clear secondary storage:', error);
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    return await this.primary.getStorageInfo();
  }

  addChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.primary.addChangeListener(listener);
  }

  removeChangeListener(listener: (key: string, newValue: any, oldValue?: any) => void): void {
    this.primary.removeChangeListener(listener);
  }
}

/**
 * Parse a JSON string value, returning undefined if parsing fails
 */
function parseValue(value: string): any {
  if (value === null) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

// Export singleton instance
export const hybridStorage = new HybridStorage([BrowserStorageAdapter, IndexedDBAdapter, LocalStorageAdapter]);

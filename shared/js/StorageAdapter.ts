/**
 * Application storage meant for small and medium large internal app states.
 * Possible data would be non user editable cached values like auth tokens.
 * Note:
 * 1. Please consider using a Settings key first before using the storage adapter!
 * 2. The values may not be synced across multiple window instances.
 *    Don't use this for IPC.
 */
export interface StorageAdapter {
    has(key: string) : Promise<boolean>;
    get(key: string) : Promise<string | null>;
    set(key: string, value: string) : Promise<void>;
    delete(key: string) : Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
    async delete(key: string): Promise<void> {
        localStorage.removeItem(key);
    }

    async get(key: string): Promise<string | null> {
        return localStorage.getItem(key);
    }

    async has(key: string): Promise<boolean> {
        return localStorage.getItem(key) !== null;
    }

    async set(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value);
    }

}

let instance: StorageAdapter = new LocalStorageAdapter();
export function getStorageAdapter() : StorageAdapter {
    return instance;
}

export function setStorageAdapter(adapter: StorageAdapter) {
    instance = adapter;
}
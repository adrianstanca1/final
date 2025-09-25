const createMemoryStorage = () => {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
        key(index) {
            return Array.from(store.keys())[index] ?? null;
        },
        get length() {
            return store.size;
        },
    };
};
let cachedStorage = null;
export const getStorage = () => {
    if (cachedStorage) {
        return cachedStorage;
    }
    try {
        const globalScope = globalThis;
        if (globalScope && globalScope.localStorage) {
            const testKey = '__asagents_storage_test__';
            globalScope.localStorage.setItem(testKey, '1');
            globalScope.localStorage.removeItem(testKey);
            cachedStorage = globalScope.localStorage;
            return cachedStorage;
        }
    }
    catch (error) {
        console.warn('Falling back to in-memory storage adapter.', error);
    }
    cachedStorage = createMemoryStorage();
    return cachedStorage;
};
export const resetInMemoryStorage = () => {
    if (!cachedStorage) {
        return;
    }
    const globalScope = globalThis;
    if (globalScope.localStorage && cachedStorage === globalScope.localStorage) {
        return; // do not clear the real browser storage implicitly
    }
    cachedStorage.clear();
};
//# sourceMappingURL=storage.js.map
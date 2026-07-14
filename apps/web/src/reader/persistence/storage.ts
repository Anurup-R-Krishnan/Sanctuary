const safeStorageGet = (key: string): string | null => {
    try { return window.localStorage.getItem(key); } catch { return null; }
};

const safeStorageSet = (key: string, value: string): void => {
    try { window.localStorage.setItem(key, value); } catch { /* Storage can fail in private mode. */ }
};



export { safeStorageGet, safeStorageSet };

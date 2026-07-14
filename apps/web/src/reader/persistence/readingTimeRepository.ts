import { safeStorageGet, safeStorageSet } from "./storage";

const PREFIX = "sanctuary:reading-time:v1:";

export function getReadingTime(bookId: string): number {
    return Number(safeStorageGet(`${PREFIX}${bookId}`) ?? 0);
}

export function incrementReadingTime(bookId: string): number {
    const total = getReadingTime(bookId) + 1;
    safeStorageSet(`${PREFIX}${bookId}`, String(total));
    return total;
}

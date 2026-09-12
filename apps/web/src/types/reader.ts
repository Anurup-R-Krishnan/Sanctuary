export type ReaderStatus =
    | "idle"
    | "loading-book"
    | "loading-navigation"
    | "restoring-location"
    | "generating-locations"
    | "ready"
    | "error"
    | "destroyed";

export interface ReaderError {
    cause?: unknown;
    code:
        | "BOOK_DATA_MISSING"
        | "BOOK_CONTENT_MISSING"
        | "BOOK_CONTENT_EMPTY"
        | "BOOK_CONTENT_INVALID"
        | "BOOK_CONTENT_READ_FAILED"
        | "INVALID_EPUB"
        | "EPUB_INTERNAL_CRASH"
        | "RENDER_FAILED"
        | "NAVIGATION_FAILED"
        | "LOCATION_GENERATION_FAILED"
        | "NAVIGATION_TARGET_FAILED"
        | "UNKNOWN";
    message: string;
    recoverable: boolean;
    title: string;
}

export interface ReaderPosition {
    bookProgress: number;
    cfi: string;
    chapterLabel: string;
    chapterProgress: number;
    displayedPage: number;
    displayedPages: number;
    href: string;
    location: number;
    totalLocations: number;
}

export interface ReaderSelection {
    cfiRange: string;
    chapterLabel: string;
    href: string;
    text: string;
}

export interface ReaderAnnotation {
    bookId: string;
    cfiRange: string;
    chapterLabel: string;
    color: string;
    createdAt: number;
    href: string;
    id: string;
    note: string;
    text: string;
    type: "highlight" | "underline" | "note";
    updatedAt: number;
}

export interface ReaderSearchResult {
    cfi: string;
    chapterLabel: string;
    excerpt: string;
    href: string;
    id: string;
}

export interface ReaderSearchState {
    activeIndex: number;
    error: string | null;
    isSearching: boolean;
    query: string;
    results: ReaderSearchResult[];
}

export interface ReaderSessionStats {
    activeSeconds: number;
    estimatedMinutesRemaining: number | null;
    locationsPerMinute: number | null;
    sessionStartedAt: number;
}


export const DEFAULT_HIGHLIGHT_COLOR = "#facc15";

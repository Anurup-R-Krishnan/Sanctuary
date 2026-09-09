import type { ReaderStatus, ReaderError, ReaderPosition, ReaderSelection } from "@/types/reader";
import type { EpubBookHandle, EpubRendition, EpubContentsLike, TocItem } from "@/utils/epub";

import { openEpub } from "@/utils/epub";

import { getFileFingerprint, loadCachedLocations, saveCachedLocations } from "../persistence/locationCache";

export interface ReaderSessionOptions {
    blob: Blob;
    bookId: string;
    container: HTMLDivElement;
    continuous: boolean;
    direction?: "auto" | "ltr" | "rtl";
    initialCfi?: string;
    readerBackground?: string;
    spread: boolean;
    themeStyles: Record<string, Record<string, string>>;
}

export interface ReaderSessionCallbacks {
    onError: (error: ReaderError | null) => void;
    onPositionChange: (position: Partial<ReaderPosition>) => void;
    onSelection: (selection: ReaderSelection | null) => void;
    onStatusChange: (status: ReaderStatus) => void;
    onTocReady: (toc: TocItem[]) => void;
}

const LOCATION_BREAK_SIZE = 1024;
const RESIZE_DELAY_MS = 120;

export class ReaderSession {
    private bookId: string;
    public epubBook: EpubBookHandle | null = null;
    public rendition: EpubRendition | null = null;
    private aborted = false;
    private displayRequestId = 0;
    private resizeTimer: number | null = null;
    private lastWidth = 0;
    private lastHeight = 0;
    private resizeObserver: ResizeObserver | null = null;
    private sandboxObserver: MutationObserver | null = null;
    private relocateRaf: number | null = null;
    private lastRelocatedCfi = "";
    private container: HTMLDivElement;
    private callbacks: ReaderSessionCallbacks;
    private readerBackground: string;

    public totalLocations = 1;
    public tocItems: TocItem[] = [];
    private crashListener: ((e: ErrorEvent | PromiseRejectionEvent) => void) | null = null;

    private positionUpdateTimer: number | null = null;
    private lastPositionUpdate = 0;

    // History
    private backHistory: string[] = [];
    private forwardHistory: string[] = [];
    private suppressHistory = false;
    private HISTORY_LIMIT = 100;

    constructor(options: ReaderSessionOptions, callbacks: ReaderSessionCallbacks) {
        this.bookId = options.bookId;
        this.container = options.container;
        this.callbacks = callbacks;
        this.readerBackground = options.readerBackground ?? '#ffffff';
        this.init(options);
    }

    private setupSandboxObserver() {
        if (!this.container) return;
        this.sandboxObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of Array.from(mutation.addedNodes)) {
                    if (node instanceof HTMLIFrameElement) {
                        node.removeAttribute("sandbox");
                        this.preColorIframe(node);
                    } else if (node instanceof HTMLElement) {
                        node.querySelectorAll("iframe").forEach(iframe => {
                            iframe.removeAttribute("sandbox");
                            this.preColorIframe(iframe);
                        });
                    }
                }
            }
        });
        this.sandboxObserver.observe(this.container, { childList: true, subtree: true });
    }

    /** Set the iframe and its document background to the reader background color immediately,
     *  before epub.js injects theme styles. This prevents the bright white flash on page turns. */
    private preColorIframe(iframe: HTMLIFrameElement) {
        const bg = this.readerBackground;
        // Set the iframe element's own background
        iframe.style.backgroundColor = bg;
        // Try to color the inner document as soon as it's accessible
        const colorInner = () => {
            try {
                const doc = iframe.contentDocument;
                if (doc) {
                    doc.documentElement.style.backgroundColor = bg;
                    if (doc.body) doc.body.style.backgroundColor = bg;
                }
            } catch { /* cross-origin or not ready yet */ }
        };
        colorInner();
        iframe.addEventListener('load', colorInner, { once: true });
    }

    /** Update the reader background color (called when settings change). */
    public updateReaderBackground(bg: string) {
        this.readerBackground = bg;
        // Update the container background
        if (this.container) {
            this.container.style.backgroundColor = bg;
        }
        // Update existing iframes
        try {
            this.container?.querySelectorAll('iframe').forEach(iframe => {
                iframe.style.backgroundColor = bg;
                try {
                    const doc = iframe.contentDocument;
                    if (doc) {
                        doc.documentElement.style.backgroundColor = bg;
                        if (doc.body) doc.body.style.backgroundColor = bg;
                    }
                } catch { /* ignore */ }
            });
        } catch { /* ignore */ }
    }

    private async init(options: ReaderSessionOptions) {
        this.callbacks.onError(null);
        this.callbacks.onStatusChange("loading-book");
        this.setupSandboxObserver();

        // Set container background immediately to prevent white flash between page turns
        if (this.container && this.readerBackground) {
            this.container.style.backgroundColor = this.readerBackground;
        }

        const fingerprint = getFileFingerprint(this.bookId, options.blob);

        try {
            const arrayBuffer = await options.blob.arrayBuffer();
            if (this.aborted) return;

            this.epubBook = openEpub(arrayBuffer);
            this.callbacks.onStatusChange("loading-navigation");
            
            // Catch deferred/detached epub.js inner errors to prevent white-screens
            const handleEpubCrash = (e: ErrorEvent | PromiseRejectionEvent) => {
                if (this.aborted) return;
                const err = e instanceof ErrorEvent ? e.error : e.reason;
                const msg = err?.message || String(err);
                if (msg.includes("indexOf") || msg.includes("undefined") || msg.includes("Url") || msg.includes("epub")) {
                    this.callbacks.onError({
                        code: "EPUB_INTERNAL_CRASH",
                        title: "Book Rendering Failed",
                        message: "The reader engine crashed while processing this book. The file may be missing internal assets or have a malformed manifest.",
                        recoverable: false,
                    });
                    this.callbacks.onStatusChange("error");
                }
            };
            window.addEventListener("error", handleEpubCrash, { capture: true });
            window.addEventListener("unhandledrejection", handleEpubCrash);
            this.crashListener = handleEpubCrash;

            // Sanitize spine URLs to prevent indexOf(undefined) crashes in EPUB.js
            this.epubBook.loaded.spine.then(spine => {
                if (spine && typeof spine.each === "function") {
                    spine.each((section: { href?: string; url?: string }) => {
                        if (section.href === undefined) section.href = "";
                        if (section.url === undefined) section.url = "";
                    });
                }
            }).catch(() => undefined);

            this.epubBook.loaded.manifest.then(manifest => {
                if (manifest) {
                    for (const key of Object.keys(manifest)) {
                        const item = manifest[key];
                        if (item && typeof item === "object") {
                            if (item.href === undefined) item.href = "";
                        }
                    }
                }
            }).catch(() => undefined);

            this.epubBook.loaded.navigation.then(nav => {
                if (this.aborted) return;
                if (nav?.toc) {
                    this.tocItems = nav.toc;
                    this.callbacks.onTocReady(nav.toc);
                }
            }).catch(() => undefined);

            let locationsLoadedFromCache = false;
            if (this.epubBook.locations.load) {
                const cachedLocations = await loadCachedLocations(this.bookId, fingerprint, LOCATION_BREAK_SIZE);
                if (cachedLocations) {
                    this.epubBook.locations.load(cachedLocations);
                    this.totalLocations = Math.max(1, this.epubBook.locations.length());
                    locationsLoadedFromCache = this.totalLocations > 1;
                }
            }

            const bookDirection = this.epubBook.package?.metadata?.direction ?? "ltr";
            const userDirection = options.direction;
            const readingDirection = userDirection && userDirection !== "auto" ? userDirection : bookDirection;

            this.rendition = this.epubBook.renderTo(this.container, {
                width: "100%",
                height: "100%",
                spread: options.continuous ? "none" : (options.spread ? "auto" : "none"),
                minSpreadWidth: options.spread ? 800 : Infinity,
                flow: options.continuous ? "scrolled" : "paginated",
                manager: options.continuous ? "continuous" : "default",
                allowScriptedContent: true,
                direction: readingDirection,
            });

            if (this.aborted) {
                this.rendition.destroy();
                return;
            }

            this.rendition.hooks?.content?.register((contents: EpubContentsLike) => {
                if (contents.document) {
                    contents.document.querySelectorAll("script").forEach((s) => s.remove());

                    // Immediately set background on new chapter content to prevent flash
                    const bg = this.readerBackground;
                    contents.document.documentElement.style.backgroundColor = bg;
                    if (contents.document.body) contents.document.body.style.backgroundColor = bg;

                    // Forward keyboard events from iframe to main window
                    const forwardKey = (e: KeyboardEvent) => {
                        window.dispatchEvent(new KeyboardEvent(e.type, {
                            key: e.key,
                            code: e.code,
                            shiftKey: e.shiftKey,
                            altKey: e.altKey,
                            ctrlKey: e.ctrlKey,
                            metaKey: e.metaKey,
                            bubbles: true,
                            cancelable: true,
                        }));
                    };
                    contents.document.addEventListener("keydown", forwardKey, { capture: true });
                    contents.document.addEventListener("keyup", forwardKey, { capture: true });
                }
            });

            this.rendition.themes.default(options.themeStyles);

            this.callbacks.onStatusChange("restoring-location");
            
            const startLocation = options.initialCfi || undefined;
            
            let displayed = false;
            if (startLocation) {
                displayed = await this.safeDisplay(startLocation);
            }
            if (!this.aborted && !displayed) {
                this.callbacks.onError(null);
                displayed = await this.safeDisplay();
            }

            if (!displayed || this.aborted) {
                throw new Error("RENDER_FAILED");
            }

            this.rendition.on("relocated", this.handleRelocated);
            this.rendition.on("selected", this.handleSelected);

            this.setupResizeObserver();
            this.callbacks.onStatusChange("ready");

            if (!locationsLoadedFromCache) {
                this.epubBook.locations.generate(LOCATION_BREAK_SIZE)
                    .then(async () => {
                        if (this.aborted) return;
                        this.totalLocations = Math.max(1, this.epubBook.locations.length());
                        if (this.epubBook?.locations.save) {
                            await saveCachedLocations(this.bookId, fingerprint, LOCATION_BREAK_SIZE, this.epubBook.locations.save());
                        }
                    })
                    .catch(err => {
                        if (this.aborted) return;
                        console.warn("Location generation failed:", err);
                    });
            }
        } catch {
            if (this.aborted) return;
            this.callbacks.onError({
                code: "INVALID_EPUB",
                title: "This EPUB could not be opened",
                message: "The file may be damaged or use unsupported features.",
                recoverable: true,
            });
            this.callbacks.onStatusChange("error");
            this.destroy();
        }
    }

    private setupResizeObserver() {
        if (!this.container) return;
        this.lastWidth = this.container.clientWidth;
        this.lastHeight = this.container.clientHeight;

        this.resizeObserver = new ResizeObserver((entries) => {
            let changed = false;
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (Math.abs(width - this.lastWidth) >= 4 || Math.abs(height - this.lastHeight) >= 4) {
                    this.lastWidth = width;
                    this.lastHeight = height;
                    changed = true;
                }
            }
            if (!changed) return;

            if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
            this.resizeTimer = window.setTimeout(() => {
                this.resizeTimer = null;
                try {
                    this.rendition?.resize();
                } catch { /* ignore transient failures */ }
            }, RESIZE_DELAY_MS);
        });
        this.resizeObserver.observe(this.container);
    }

    private async safeDisplay(target?: string): Promise<boolean> {
        if (!this.rendition) return false;
        const requestId = ++this.displayRequestId;
        try {
            await this.rendition.display(target);
            if (requestId !== this.displayRequestId) return false;
            return true;
        } catch {
            if (requestId !== this.displayRequestId) return false;
            return false;
        }
    }

    public async display(target: string): Promise<boolean> {
        if (!target.trim()) return false;
        this.suppressHistory = true;
        return this.safeDisplay(target);
    }

    public async next(): Promise<void> {
        if (!this.rendition) return;
        
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isContinuous = (this.rendition as any).settings?.flow === "scrolled";
            if (isContinuous) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const scroller = (this.rendition as any).manager?.container;
                if (scroller && typeof scroller.scrollBy === "function") {
                    scroller.scrollBy({ top: scroller.clientHeight * 0.8, behavior: "smooth" });
                    return;
                }
            }
            await this.rendition.next();
        } catch {
            this.container.scrollBy({ top: this.container.clientHeight * 0.8, behavior: "smooth" });
        }
    }

    public async prev(): Promise<void> {
        if (!this.rendition) return;
        
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isContinuous = (this.rendition as any).settings?.flow === "scrolled";
            if (isContinuous) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const scroller = (this.rendition as any).manager?.container;
                if (scroller && typeof scroller.scrollBy === "function") {
                    scroller.scrollBy({ top: -scroller.clientHeight * 0.8, behavior: "smooth" });
                    return;
                }
            }
            await this.rendition.prev();
        } catch {
            this.container.scrollBy({ top: -this.container.clientHeight * 0.8, behavior: "smooth" });
        }
    }

    private findTocLabel(href: string): string {
        const normalize = (h: string) => h.split("#")[0].replace(/^\.?\//, "").trim();
        const target = normalize(href);
        let bestMatch = "";
        const visit = (nodes: TocItem[]) => {
            for (const item of nodes) {
                const itemHref = typeof item.href === "string" ? normalize(item.href) : "";
                if (itemHref && (target === itemHref || target.startsWith(itemHref) || itemHref.startsWith(target))) {
                    const label = typeof item.label === "string" ? item.label.trim() : "";
                    if (label && itemHref.length >= bestMatch.length) bestMatch = label;
                }
                const nested = item.subitems;
                if (nested?.length) visit(nested);
            }
        };
        visit(this.tocItems);
        return bestMatch;
    }

    private handleRelocated = (location: unknown) => {
        if (this.aborted || !this.epubBook || typeof location !== "object" || !location) return;
        const loc = location as { start?: { cfi?: string; href?: string; percentage?: number; displayed?: { page?: number; total?: number } }; end?: { href?: string } };
        const cfi = loc.start?.cfi;
        if (!cfi) return;

        if (this.relocateRaf !== null) {
            cancelAnimationFrame(this.relocateRaf);
        }

        this.relocateRaf = requestAnimationFrame(() => {
            this.relocateRaf = null;
            if (this.aborted || !this.epubBook) return;
            if (this.lastRelocatedCfi === cfi) return;
            this.lastRelocatedCfi = cfi;

            const href = loc.start?.href ?? loc.end?.href ?? "";
            let progressFraction = 0;
            try {
                progressFraction = Math.max(0, Math.min(1, this.epubBook.locations.percentageFromCfi(cfi)));
            } catch {
                const fallback = typeof loc.start?.percentage === "number" ? loc.start.percentage : 0;
                progressFraction = Math.max(0, Math.min(1, fallback));
            }

            let locationIndex = Math.max(1, Math.ceil(progressFraction * this.totalLocations));
            if (this.epubBook.locations.locationFromCfi) {
                try {
                    const exactLocation = this.epubBook.locations.locationFromCfi(cfi);
                    if (Number.isFinite(exactLocation)) {
                        locationIndex = Math.max(1, Math.min(exactLocation + 1, this.totalLocations));
                    }
                } catch { /* Fall back */ }
            }

            const displayed = loc.start?.displayed;
            const page = Math.max(1, displayed?.page ?? 1);
            const pageTotal = Math.max(page, displayed?.total ?? 1);
            const chapterFraction = pageTotal > 0 ? Math.max(0, Math.min(1, page / pageTotal)) : 0;
            const chapterLabel = this.findTocLabel(href);

            if (!this.suppressHistory) {
                const previous = this.backHistory.at(-1);
                if (previous !== cfi) {
                    this.backHistory.push(cfi);
                    if (this.backHistory.length > this.HISTORY_LIMIT) this.backHistory.shift();
                }
                this.forwardHistory = [];
            }
            this.suppressHistory = false;

            const newPos = {
                cfi,
                href,
                chapterLabel,
                bookProgress: Math.round(progressFraction * 100),
                chapterProgress: Math.round(chapterFraction * 100),
                location: locationIndex,
                totalLocations: this.totalLocations,
                displayedPage: page,
                displayedPages: pageTotal,
            };

            const now = Date.now();
            const timeSince = now - this.lastPositionUpdate;
            if (timeSince > 250) {
                this.lastPositionUpdate = now;
                this.callbacks.onPositionChange(newPos);
            } else {
                if (this.positionUpdateTimer !== null) {
                    window.clearTimeout(this.positionUpdateTimer);
                }
                this.positionUpdateTimer = window.setTimeout(() => {
                    this.lastPositionUpdate = Date.now();
                    this.callbacks.onPositionChange(newPos);
                }, 250);
            }
        });
    }

    private handleSelected = (cfiRange: string, contents: EpubContentsLike) => {
        if (this.aborted) return;
        const text = contents.window?.getSelection?.()?.toString().trim() ?? "";
        if (!text) {
            this.callbacks.onSelection(null);
            return;
        }
        this.callbacks.onSelection({
            cfiRange,
            text,
            href: "",
            chapterLabel: "",
        });
    }

    public destroy() {
        this.aborted = true;
        this.displayRequestId++;
        if (this.sandboxObserver) {
            this.sandboxObserver.disconnect();
            this.sandboxObserver = null;
        }
        if (this.relocateRaf !== null) {
            cancelAnimationFrame(this.relocateRaf);
            this.relocateRaf = null;
        }
        if (this.positionUpdateTimer !== null) {
            window.clearTimeout(this.positionUpdateTimer);
            this.positionUpdateTimer = null;
        }
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
        
        if (this.crashListener) {
            window.removeEventListener("error", this.crashListener as EventListener, { capture: true });
            window.removeEventListener("unhandledrejection", this.crashListener as EventListener);
            this.crashListener = null;
        }

        if (this.rendition) {
            try { this.rendition.off("relocated", this.handleRelocated); } catch { /* ignore */ }
            try { this.rendition.off("selected", this.handleSelected); } catch { /* ignore */ }
            try { this.rendition.destroy(); } catch { /* ignore */ }
        }
        if (this.epubBook) {
            try { this.epubBook.destroy?.(); } catch { /* ignore */ }
        }
        this.rendition = null;
        this.epubBook = null;
        if (this.container) this.container.replaceChildren();
    }
}

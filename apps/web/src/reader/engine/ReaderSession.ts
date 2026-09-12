import type { ReaderStatus, ReaderError, ReaderPosition, ReaderSelection } from "@/types/reader";
import type { EpubBookHandle, EpubRendition, EpubContentsLike, TocItem } from "@/utils/epub";

import { BookContentError } from "@/services/bookContentRepository";
import { recordReaderDiagnostic } from "@/services/readerDiagnostics";
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

/** In-memory EPUB bytes cache. Single-user desktop: keep the last parsed
 *  bytes per book so layout-mode switches never re-read the Blob. */
const epubBufferCache = new Map<string, ArrayBuffer>();

function getCachedBuffer(fingerprint: string): ArrayBuffer | null {
    return epubBufferCache.get(fingerprint) ?? null;
}

function setCachedBuffer(fingerprint: string, buffer: ArrayBuffer): void {
    // Cap the cache so one giant library can't grow RAM without bound.
    if (epubBufferCache.size >= 8 && !epubBufferCache.has(fingerprint)) {
        const oldest = epubBufferCache.keys().next();
        if (!oldest.done) epubBufferCache.delete(oldest.value);
    }
    epubBufferCache.set(fingerprint, buffer);
}

export interface ReaderFlowOptions {
    continuous: boolean;
    direction?: "auto" | "ltr" | "rtl";
    readerBackground?: string;
    spread: boolean;
    themeStyles: Record<string, Record<string, string>>;
}

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
    private initStage = "starting";
    private flowOptions: ReaderFlowOptions | null = null;
    private flowRequestId = 0;
    private switchingFlow = false;
    private lastDisplayError: unknown = null;

    public totalLocations = 1;
    public tocItems: TocItem[] = [];

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
        this.flowOptions = {
            continuous: options.continuous,
            direction: options.direction,
            spread: options.spread,
            themeStyles: options.themeStyles,
            readerBackground: options.readerBackground,
        };

        try {
            this.initStage = "reading EPUB bytes";
            let arrayBuffer = getCachedBuffer(fingerprint);
            if (!arrayBuffer) {
                arrayBuffer = await options.blob.arrayBuffer();
                setCachedBuffer(fingerprint, arrayBuffer);
            }
            if (this.aborted) return;

            // Avoid epub.js creating blob URLs for internal assets. This is more
            // reliable in the Tauri/WebKit runtime and keeps all EPUB resources
            // inside the source archive.
            this.epubBook = openEpub(arrayBuffer, { replacements: "none" });
            this.initStage = "loading EPUB navigation";
            this.callbacks.onStatusChange("loading-navigation");

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

            this.buildRendition(readingDirection);

            if (this.aborted) {
                this.rendition?.destroy();
                return;
            }

            this.callbacks.onStatusChange("restoring-location");

            const startLocation = options.initialCfi || undefined;

            const displayed = await this.displayWithFallbacks(startLocation);

            if (!displayed || this.aborted) {
                const reason = this.lastDisplayError instanceof Error ? this.lastDisplayError : new Error("RENDER_FAILED");
                throw reason;
            }

            this.attachRenditionListeners();
            this.setupResizeObserver();
            this.callbacks.onStatusChange("ready");

            if (!locationsLoadedFromCache) {
                this.generateLocationsInBackground(fingerprint);
            }
        } catch (cause) {
            if (this.aborted) return;
            recordReaderDiagnostic({
                bookId: this.bookId,
                stage: this.initStage === "opening first chapter" ? "reader-render" : "reader-initialization",
                error: cause instanceof Error ? cause.message : "Unknown reader error",
                details: { stage: this.initStage },
            });
            const contentError = cause instanceof BookContentError ? cause : null;
            const stageMessage = `The reader failed while ${this.initStage}.`;
            this.callbacks.onError({
                code: contentError?.code ?? "INVALID_EPUB",
                title: contentError?.code === "BOOK_CONTENT_MISSING" ? "This book is missing its EPUB file" : "This EPUB could not be opened",
                message: contentError?.message ?? `${stageMessage} ${cause instanceof Error ? cause.message : "The file may be damaged or use unsupported features."}`,
                cause,
                recoverable: true,
            });
            this.callbacks.onStatusChange("error");
            this.destroy();
        }
    }

    /** Build (or rebuild) only the rendition, reusing the parsed book.
     *  This is what makes layout-mode switches fast and crash-free. */
    private buildRendition(readingDirection: string) {
        if (!this.epubBook) return;
        const flow = this.flowOptions;
        this.initStage = "creating reader view";
        this.rendition = this.epubBook.renderTo(this.container, {
            width: "100%",
            height: "100%",
            spread: flow?.continuous ? "none" : (flow?.spread ? "auto" : "none"),
            minSpreadWidth: flow?.spread ? 800 : Infinity,
            flow: flow?.continuous ? "scrolled" : "paginated",
            manager: flow?.continuous ? "continuous" : "default",
            allowScriptedContent: true,
            direction: readingDirection,
        });

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

        if (flow) this.rendition.themes.default(flow.themeStyles);
    }

    private attachRenditionListeners() {
        this.rendition?.on("relocated", this.handleRelocated);
        this.rendition?.on("selected", this.handleSelected);
    }

    private detachRenditionListeners() {
        try { this.rendition?.off("relocated", this.handleRelocated); } catch { /* ignore */ }
        try { this.rendition?.off("selected", this.handleSelected); } catch { /* ignore */ }
    }

    /** Try saved CFI first, then chapter start, so one stale CFI can never
     *  brick the whole open. Remembers the last underlying error. */
    private async displayWithFallbacks(startLocation?: string): Promise<boolean> {
        if (startLocation) {
            this.initStage = "restoring reading position";
            if (await this.safeDisplay(startLocation)) return true;
            recordReaderDiagnostic({
                bookId: this.bookId,
                stage: "reader-initialization",
                error: this.lastDisplayError instanceof Error ? this.lastDisplayError.message : "Saved reading position failed; opening chapter start.",
                details: { stage: "restoring reading position" },
            });
        }
        if (this.aborted) return false;
        this.initStage = "opening first chapter";
        this.callbacks.onError(null);
        return this.safeDisplay();
    }

    /** Burn spare CPU/RAM in the background: generate page locations off the
     *  critical open path so first paint is never blocked. */
    private generateLocationsInBackground(fingerprint: string) {
        const run = () => {
            if (this.aborted || !this.epubBook) return;
            this.epubBook.locations.generate(LOCATION_BREAK_SIZE)
                .then(async () => {
                    if (this.aborted) return;
                    this.totalLocations = Math.max(1, this.epubBook!.locations.length());
                    if (this.epubBook?.locations.save) {
                        await saveCachedLocations(this.bookId, fingerprint, LOCATION_BREAK_SIZE, this.epubBook.locations.save());
                    }
                })
                .catch(err => {
                    if (this.aborted) return;
                    console.warn("Location generation failed:", err);
                });
        };
        const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
        if (typeof idle === "function") idle.call(window, run);
        else window.setTimeout(run, 0);
    }

    private getCurrentCfi(): string {
        if (this.lastRelocatedCfi) return this.lastRelocatedCfi;
        try {
            const loc = (this.rendition as unknown as { currentLocation?: () => { start?: { cfi?: string } } })?.currentLocation?.();
            const cfi = loc?.start?.cfi;
            if (cfi) return cfi;
        } catch { /* ignore */ }
        return "";
    }

    /** Switch paginated/continuous/spread/direction WITHOUT re-parsing the
     *  EPUB. Keeps the book, destroys only the rendition, re-renders at the
     *  current position. Safe to call rapidly; stale requests are dropped. */
    public async setFlow(next: ReaderFlowOptions): Promise<void> {
        if (this.aborted || !this.epubBook) return;
        const requestId = ++this.flowRequestId;
        if (this.switchingFlow) {
            // A switch is already running; the latest request wins when it finishes.
            await new Promise((resolve) => window.setTimeout(resolve, 60));
            if (requestId !== this.flowRequestId || this.aborted) return;
        }
        this.switchingFlow = true;
        // Cancel any in-flight display() so it can't win the race.
        this.displayRequestId++;
        const resumeCfi = this.getCurrentCfi();
        if (next.readerBackground) {
            this.readerBackground = next.readerBackground;
            if (this.container) this.container.style.backgroundColor = next.readerBackground;
        }
        try {
            this.callbacks.onStatusChange("restoring-location");
            this.detachRenditionListeners();
            try { this.rendition?.destroy(); } catch { /* ignore */ }
            this.rendition = null;
            if (this.container) this.container.replaceChildren();
            if (requestId !== this.flowRequestId || this.aborted) return;

            const bookDirection = this.epubBook.package?.metadata?.direction ?? "ltr";
            const readingDirection = next.direction && next.direction !== "auto" ? next.direction : bookDirection;
            this.flowOptions = next;
            this.buildRendition(readingDirection);
            if (requestId !== this.flowRequestId || this.aborted) {
                try { this.rendition?.destroy(); } catch { /* ignore */ }
                this.rendition = null;
                return;
            }
            const displayed = await this.displayWithFallbacks(resumeCfi || undefined);
            if (requestId !== this.flowRequestId || this.aborted) return;
            if (!displayed) {
                this.callbacks.onError({
                    code: "RENDER_FAILED",
                    title: "Could not switch reading mode",
                    message: this.lastDisplayError instanceof Error ? this.lastDisplayError.message : "The chapter could not be re-rendered in the new layout.",
                    cause: this.lastDisplayError,
                    recoverable: true,
                });
                this.callbacks.onStatusChange("error");
                return;
            }
            this.callbacks.onError(null);
            this.attachRenditionListeners();
            this.callbacks.onStatusChange("ready");
        } finally {
            if (requestId === this.flowRequestId) this.switchingFlow = false;
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
            this.lastDisplayError = null;
            return true;
        } catch (error) {
            if (requestId !== this.displayRequestId) return false;
            this.lastDisplayError = error;
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

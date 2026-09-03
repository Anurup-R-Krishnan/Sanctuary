import ePub from "epubjs";

export type EpubMetadata = {
  creator?: string | string[];
  title?: string;
};

export type TocItem = {
  href: string;
  id?: string;
  label: string;
  subitems?: TocItem[];
};

export type EpubLocation = {
  start: {
    cfi: string;
  };
};

export type EpubNavigation = {
  toc?: TocItem[];
};

export type EpubLocations = {
  cfiFromPercentage: (percentage: number) => string | undefined;
  generate: (chars: number) => Promise<void>;
  length: () => number;
  percentageFromCfi: (cfi: string) => number;
  locationFromCfi?: (cfi: string) => number;
  save?: () => string;
  load?: (locations: string) => void;
};

export interface EpubSearchMatch {
  cfi?: string;
  excerpt?: string;
}

export interface EpubSpineSection {
  find?(query: string): EpubSearchMatch[];
  href?: string;
  load?(loader: unknown): Promise<unknown>;
  unload?(): void;
}

export interface EpubSpineApi {
  each(callback: (section: EpubSpineSection) => void): void;
}

export interface EpubAnnotationsApi {
  highlight(
    cfiRange: string,
    data?: Record<string, unknown>,
    callback?: (event: MouseEvent) => void,
    className?: string,
    styles?: Record<string, string>,
  ): void;
  remove(cfiRange: string, type?: string): void;
  underline?(
    cfiRange: string,
    data?: Record<string, unknown>,
    callback?: (event: MouseEvent) => void,
    className?: string,
    styles?: Record<string, string>,
  ): void;
}

export interface EpubContentsLike {
  document?: Document;
  window?: Window;
}

export type EpubRendition = {
  annotations?: EpubAnnotationsApi;
  destroy: () => void;
  display: (target?: string) => Promise<void> | void;
  getContents?(): EpubContentsLike[];
  hooks?: {
    content?: {
      register: (cb: (contents: EpubContentsLike) => void) => void;
    };
    unloaded?: {
      register: (cb: (contents: EpubContentsLike) => void) => void;
    };
  };
  next: () => void;
  off: (event: string, cb: (...args: unknown[]) => void) => void;
  on(event: "relocated", cb: (location: EpubLocation) => void): void;
  on(event: "selected", cb: (cfiRange: string, contents: EpubContentsLike) => void): void;
  on(event: string, cb: (...args: unknown[]) => void): void;
  prev: () => void;
  resize: (width?: number, height?: number) => void;
  themes: {
    /** Sets the default theme. Stable API, safe to call before and after display(). */
    default: (styles: Record<string, Record<string, string>>) => void;
  };
};

export type EpubBookHandle = {
  coverUrl: () => Promise<string>;
  destroy?: () => void;
  load?: unknown;
  loaded: {
    metadata: Promise<EpubMetadata>;
    navigation: Promise<EpubNavigation>;
  };
  locations: EpubLocations;
  navigation?: {
    toc?: TocItem[];
    get?(href: string): TocItem | undefined;
  };
  package?: {
    metadata?: {
      direction?: "ltr" | "rtl";
    };
  };
  ready: Promise<unknown>;
  renderTo: (container: HTMLDivElement, options: Record<string, unknown>) => EpubRendition;
  spine?: EpubSpineApi;
};

export function openEpub(source: ArrayBuffer): EpubBookHandle {
  return ePub(source) as unknown as EpubBookHandle;
}

export function revokeObjectUrl(url: string | null | undefined): void {
  if (!url?.startsWith("blob:")) return;
  URL.revokeObjectURL(url);
}

export async function extractCoverBlobFromEpubSource(source: ArrayBuffer): Promise<Blob | null> {
  let bookData: EpubBookHandle | null = null;
  let coverHref: string | null = null;

  try {
    bookData = openEpub(source);
    await bookData.ready;
    coverHref = await bookData.coverUrl();
    if (!coverHref) return null;

    const response = await fetch(coverHref);
    return await response.blob();
  } catch {
    return null;
  } finally {
    revokeObjectUrl(coverHref);
    bookData?.destroy?.();
  }
}

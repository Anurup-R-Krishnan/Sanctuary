import type { SanctuaryApiClient } from "@sanctuary/core";

import type { CatalogSource, OpdsEntry, OpdsFeed, OpdsLink, OpdsPagination } from "@/types/opds";

// Standard Ebooks gated its full OPDS catalog behind paid Patrons Circle
// membership (every request to /feeds/opds/all now 401s with a Basic-Auth
// challenge, confirmed independently — this is Standard Ebooks' own policy
// change, not something fixable from this app). It's kept out of the
// automatic defaults so opening the catalog browser doesn't immediately
// error; a Patrons Circle member can still add it back manually via "Add
// Catalog" with auth type "basic", their account email as the username, and
// an empty password.
export const DEFAULT_CATALOGS: CatalogSource[] = [
  {
    id: "project-gutenberg",
    isDefault: true,
    name: "Project Gutenberg",
    url: "https://www.gutenberg.org/ebooks.opds/",
  },
];

function resolveUrl(href: string, baseUrl: string): string {
  if (!href) return "";
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const matchStar = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (matchStar?.[1]) {
    try {
      return decodeURIComponent(matchStar[1].trim());
    } catch {
      return matchStar[1].trim();
    }
  }
  const match = /filename="?([^";]+)"?/i.exec(header);
  if (match?.[1]) {
    return match[1].trim();
  }
  return null;
}

const NON_NAVIGATION_RELS = new Set(["related", "self", "start", "up", "alternate"]);

/** EPUB3 > EPUB2 (images) > EPUB2 (no images) > other formats. */
function acquisitionPriorityOf(type: string, href: string): number {
  const isEpub = type.startsWith("application/epub") || /\.epub/i.test(href);
  if (!isEpub) return 1;
  if (/epub3/i.test(href) || type.includes("epub3")) return 4;
  return /noimages/i.test(href) ? 2 : 3;
}

/**
 * Catalogs like Gutenberg list several editions of one book (with and without
 * images) as separate entries. Keep the best edition per title+author, in the
 * position of the first one.
 */
function dedupeEditions(entries: OpdsEntry[], priorities: Map<OpdsEntry, number>): OpdsEntry[] {
  const best = new Map<string, OpdsEntry>();
  const keyOf = (entry: OpdsEntry) => `${entry.title.toLowerCase()}|${(entry.author ?? "").toLowerCase()}`;
  for (const entry of entries) {
    if (!entry.acquisitionUrl || !entry.author) continue; // Only dedupe entries with non-empty author
    const current = best.get(keyOf(entry));
    if (!current || (priorities.get(entry) ?? 0) > (priorities.get(current) ?? 0)) best.set(keyOf(entry), entry);
  }
  const emitted = new Set<string>();
  const result: OpdsEntry[] = [];
  for (const entry of entries) {
    if (!entry.acquisitionUrl) {
      result.push(entry);
      continue;
    }
    const key = keyOf(entry);
    if (!entry.author) {
      // Don't dedupe entries without author
      result.push(entry);
      continue;
    }
    if (emitted.has(key)) continue;
    emitted.add(key);
    result.push(best.get(key) ?? entry);
  }
  return result;
}

export function parseOpdsXml(xmlText: string, baseUrl: string): OpdsFeed {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error(`XML parsing error: ${parserError.textContent?.slice(0, 100) || "Invalid XML"}`);
  }

  // Helper to get text content with namespace-aware fallback
  const getText = (el: Element | null): string | undefined => {
    if (!el) return undefined;
    const text = el.textContent?.trim();
    return text || undefined;
  };

  // Get feed root (handles both with and without namespace)
  const feedEl = xmlDoc.querySelector("feed") || xmlDoc.documentElement;

  const feedTitle = getText(feedEl.querySelector("title")) || "OPDS Catalog";
  const feedId = getText(feedEl.querySelector("id"));
  const feedIcon = getText(feedEl.querySelector("icon"));
  const feedUpdated = getText(feedEl.querySelector("updated"));

  const navigationLinks: OpdsLink[] = [];
  const pagination: OpdsPagination = {};
  let searchLink: string | undefined;

  // Only get direct children links of the feed element
  const feedLinks = Array.from(feedEl.children).filter((el) => el.localName === "link");
  feedLinks.forEach((linkEl) => {
    const rel = linkEl.getAttribute("rel") || "";
    const href = linkEl.getAttribute("href") || "";
    const type = linkEl.getAttribute("type") || undefined;
    const title = linkEl.getAttribute("title") || undefined;

    if (!href) return;
    const resolvedHref = resolveUrl(href, baseUrl);

    if (rel === "search" || type?.includes("opensearchdescription")) {
      searchLink = resolvedHref;
    } else if (rel === "next") {
      pagination.next = resolvedHref;
    } else if (rel === "previous" || rel === "prev") {
      pagination.previous = resolvedHref;
    } else if (rel === "first") {
      pagination.first = resolvedHref;
    } else if (rel === "last") {
      pagination.last = resolvedHref;
    } else if ((rel === "subsection" || type?.includes("atom+xml")) && !rel.includes("acquisition") && !NON_NAVIGATION_RELS.has(rel)) {
      // Only links to other feeds are browsable; skip e.g. rel="alternate" HTML pages.
      navigationLinks.push({
        href: resolvedHref,
        rel,
        title,
        type,
      });
    }
  });

  const entries: OpdsEntry[] = [];
  const acquisitionPriorities = new Map<OpdsEntry, number>();
  const entryElements = xmlDoc.querySelectorAll("entry");

  entryElements.forEach((entryEl) => {
    const id = getText(entryEl.querySelector("id")) ||
      `opds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = getText(entryEl.querySelector("title")) || "Untitled Book";
    // Parse author: use <name> child of <author> only
    const author = getText(entryEl.querySelector("author > name"));
    const summary = getText(entryEl.querySelector("summary")) ||
      getText(entryEl.querySelector("content"));

    // Handle published/updated date (try published first, then updated)
    const published = getText(entryEl.querySelector("published")) ||
      getText(entryEl.querySelector("updated"));

    let coverUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    let acquisitionUrl: string | undefined;
    let acquisitionPriority = 0;
    let navigationUrl: string | undefined;
    let format: string | undefined;

    for (const link of Array.from(entryEl.children).filter((el) => el.localName === "link")) {
      const rel = link.getAttribute("rel") || "";
      const href = link.getAttribute("href") || "";
      const type = link.getAttribute("type") || "";
      if (!href) continue;
      const resolved = resolveUrl(href, baseUrl);

      if (rel.includes("thumbnail")) {
        thumbnailUrl = resolved;
      } else if (rel.includes("image") || rel.includes("cover")) {
        coverUrl = resolved;
      } else if (rel.includes("acquisition")) {
        const priority = acquisitionPriorityOf(type, href);
        if (priority > acquisitionPriority) {
          acquisitionPriority = priority;
          acquisitionUrl = resolved;
          format = type || undefined;
        }
      } else if (rel === "subsection" || (type.includes("profile=opds-catalog") && !NON_NAVIGATION_RELS.has(rel))) {
        // A link into another feed. "related" (author, bookshelf) links are
        // not the entry's own target, so they don't make it a folder.
        navigationUrl ??= resolved;
      }
    }

    const entry: OpdsEntry = {
      acquisitionUrl,
      author,
      coverUrl: coverUrl || thumbnailUrl,
      format,
      id,
      navigationUrl: acquisitionUrl ? undefined : navigationUrl,
      published,
      summary,
      thumbnailUrl: thumbnailUrl || coverUrl,
      title,
    };
    acquisitionPriorities.set(entry, acquisitionPriority);
    entries.push(entry);
  });

  return {
    entries: dedupeEditions(entries, acquisitionPriorities),
    icon: feedIcon ? resolveUrl(feedIcon, baseUrl) : undefined,
    id: feedId,
    navigationLinks,
    pagination: (pagination.next || pagination.previous || pagination.first || pagination.last) ? pagination : undefined,
    searchLink,
    title: feedTitle,
    updated: feedUpdated,
  };
}

export interface Opds2Publication {
  images?: Array<{ href: string; rel?: string; type?: string }>;
  links?: Array<{ href: string; rel?: string; type?: string }>;
  metadata?: {
    author?: string | { name: string } | Array<{ name: string }>;
    description?: string;
    identifier?: string;
    published?: string;
    title?: string | { name?: string };
  };
}

export function parseOpdsJson(jsonText: string, baseUrl: string): OpdsFeed {
  const data = JSON.parse(jsonText) as {
    groups?: Array<{ publications?: Opds2Publication[] }>;
    links?: Array<{ href: string; rel?: string; title?: string; type?: string }>;
    metadata?: { title?: string; updated?: string };
    navigation?: Array<{ href: string; rel?: string; title?: string; type?: string }>;
    publications?: Opds2Publication[];
  };

  const feedTitle =
    (typeof data.metadata?.title === "string" ? data.metadata.title : undefined) ||
    "OPDS 2.0 Catalog";
  const feedUpdated = data.metadata?.updated;

  const navigationLinks: OpdsLink[] = [];
  const pagination: OpdsPagination = {};
  let searchLink: string | undefined;

  const allNavLinks = [...(data.links || []), ...(data.navigation || [])];
  for (const l of allNavLinks) {
    if (!l.href) continue;
    const resolvedHref = resolveUrl(l.href, baseUrl);
    if (l.rel === "search") {
      searchLink = resolvedHref;
    } else if (l.rel === "next") {
      pagination.next = resolvedHref;
    } else if (l.rel === "previous" || l.rel === "prev") {
      pagination.previous = resolvedHref;
    } else if (l.rel === "first") {
      pagination.first = resolvedHref;
    } else if (l.rel === "last") {
      pagination.last = resolvedHref;
    } else if (l.rel !== "self") {
      navigationLinks.push({
        href: resolvedHref,
        rel: l.rel || "related",
        title: l.title,
        type: l.type,
      });
    }
  }

  const rawPublications: Opds2Publication[] = [
    ...(data.publications || []),
    ...(data.groups?.flatMap((g) => g.publications || []) || []),
  ];

  const entries: OpdsEntry[] = rawPublications.map((pub, idx) => {
    let title = "Untitled Book";
    if (typeof pub.metadata?.title === "string") {
      title = pub.metadata.title;
    } else if (pub.metadata?.title?.name) {
      title = pub.metadata.title.name;
    }

    let author: string | undefined;
    if (typeof pub.metadata?.author === "string") {
      author = pub.metadata.author;
    } else if (Array.isArray(pub.metadata?.author)) {
      author = pub.metadata.author.map((a) => (typeof a === "string" ? a : a.name)).join(", ");
    } else if (pub.metadata?.author?.name) {
      author = pub.metadata.author.name;
    }

    const id =
      pub.metadata?.identifier ||
      pub.links?.[0]?.href ||
      `opds2-${idx}-${Date.now()}`;
    const summary = pub.metadata?.description;
    const published = pub.metadata?.published;

    let coverUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    if (pub.images && Array.isArray(pub.images)) {
      for (const img of pub.images) {
        if (!img.href) continue;
        const resolved = resolveUrl(img.href, baseUrl);
        if (img.rel?.includes("thumbnail")) {
          thumbnailUrl = resolved;
        } else {
          coverUrl = resolved;
        }
      }
    }

    let acquisitionUrl: string | undefined;
    let format: string | undefined;
    if (pub.links && Array.isArray(pub.links)) {
      for (const link of pub.links) {
        if (!link.href) continue;
        const resolved = resolveUrl(link.href, baseUrl);
        const isAcquisition =
          link.rel?.includes("acquisition") ||
          link.type === "application/epub+zip" ||
          link.href.endsWith(".epub");

        if (isAcquisition) {
          if (!acquisitionUrl || link.type === "application/epub+zip") {
            acquisitionUrl = resolved;
            format = link.type || "application/epub+zip";
          }
        }
      }
    }

    return {
      acquisitionUrl,
      author,
      coverUrl: coverUrl || thumbnailUrl,
      format,
      id,
      published,
      summary,
      thumbnailUrl: thumbnailUrl || coverUrl,
      title,
    };
  });

  return {
    entries,
    navigationLinks,
    pagination: (pagination.next || pagination.previous || pagination.first || pagination.last) ? pagination : undefined,
    searchLink,
    title: feedTitle,
    updated: feedUpdated,
  };
}

export function parseOpdsFeed(rawText: string, baseUrl: string): OpdsFeed {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{")) {
    return parseOpdsJson(trimmed, baseUrl);
  }
  return parseOpdsXml(trimmed, baseUrl);
}

export function buildCatalogAuthHeader(catalog?: CatalogSource): string | undefined {
  if (!catalog) return undefined;
  if (catalog.authType === "bearer" && catalog.bearerToken) {
    return `Bearer ${catalog.bearerToken.trim()}`;
  }
  if (catalog.authType === "basic" && (catalog.username || catalog.password)) {
    const creds = `${catalog.username || ""}:${catalog.password || ""}`;
    const encoded = typeof btoa === "function" ? btoa(creds) : Buffer.from(creds).toString("base64");
    return `Basic ${encoded}`;
  }
  return undefined;
}

const OPDS_ACCEPT_HEADER =
  "application/atom+xml,application/xml,application/opds+json,application/json;q=0.9,*/*;q=0.8";

export async function fetchCatalogFeed(
  api: SanctuaryApiClient,
  url: string,
  catalog?: CatalogSource
): Promise<OpdsFeed> {
  const res = await api.fetchOpdsProxy(url, buildCatalogAuthHeader(catalog), OPDS_ACCEPT_HEADER);

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("This catalog rejected the saved credentials.");
    if (res.status === 429) throw new Error("Too many catalog requests. Try again in a few minutes.");
    throw new Error(`Failed to load catalog feed: ${res.status} ${res.statusText}`);
  }

  const rawText = await res.text();
  return parseOpdsFeed(rawText, res.headers.get("x-upstream-url") || url);
}

export async function downloadCatalogBook(
  api: SanctuaryApiClient,
  acquisitionUrl: string,
  fallbackTitle: string,
  catalog?: CatalogSource
): Promise<File> {
  const res = await api.fetchOpdsProxy(acquisitionUrl, buildCatalogAuthHeader(catalog));
  if (!res.ok) {
    throw new Error(`Failed to download book: ${res.status} ${res.statusText}`);
  }

  const contentDisposition = res.headers.get("Content-Disposition");
  let filename = parseFilenameFromContentDisposition(contentDisposition);

  if (!filename) {
    const slug = fallbackTitle
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50)
      .trim();
    filename = `${slug || "book"}.epub`;
  } else if (!filename.includes(".")) {
    filename = `${filename}.epub`;
  }

  const blob = await res.blob();
  const fileType = blob.type || "application/epub+zip";
  return new File([blob], filename, { type: fileType });
}

export async function resolveOpenSearchUrl(
  api: SanctuaryApiClient,
  searchLink: string,
  catalog?: CatalogSource
): Promise<string> {
  // If the link already contains {searchTerms}, return it as-is
  if (searchLink.includes("{searchTerms}") || searchLink.includes("{query}") || searchLink.includes("{?query}")) {
    return searchLink;
  }

  // Otherwise, try to fetch the OpenSearch description document
  try {
    const res = await api.fetchOpdsProxy(searchLink, buildCatalogAuthHeader(catalog));
    if (!res.ok) return searchLink;

    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    // Look for <Url type="application/atom+xml" template="...{searchTerms}...">
    const urls = xml.querySelectorAll("Url");
    for (const urlEl of urls) {
      const type = urlEl.getAttribute("type") || "";
      if (type.includes("atom+xml")) {
        const template = urlEl.getAttribute("template");
        if (template?.includes("{searchTerms}")) {
          return template;
        }
      }
    }

    return searchLink;
  } catch {
    return searchLink;
  }
}

export function resolveSearchUrl(searchLink: string, query: string): string {
  if (!searchLink || !query.trim()) return searchLink;
  const encoded = encodeURIComponent(query.trim());
  if (searchLink.includes("{?query}")) {
    return searchLink.replace("{?query}", `?query=${encoded}`);
  }
  if (searchLink.includes("{query}")) {
    return searchLink.replace("{query}", encoded);
  }
  if (searchLink.includes("{searchTerms}")) {
    // Substitute searchTerms, then drop optional params we don't fill ({startPage?} etc.).
    const substituted = searchLink.replace("{searchTerms}", encoded);
    try {
      const urlObj = new URL(substituted);
      // Copy first: deleting while iterating the live iterator skips entries.
      for (const [key, value] of [...urlObj.searchParams]) {
        if (/^\{[^}]*\?\}$/.test(value)) {
          urlObj.searchParams.delete(key);
        }
      }
      return urlObj.toString();
    } catch {
      // If URL parsing fails, fall back to simple replacement
      return substituted.replace(/[?&][\w.-]+=\{[^}]*\?\}/g, "");
    }
  }
  const separator = searchLink.includes("?") ? "&" : "?";
  return `${searchLink}${separator}query=${encoded}`;
}


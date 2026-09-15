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
    url: "https://m.gutenberg.org/ebooks.opds/",
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

export function parseOpdsXml(xmlText: string, baseUrl: string): OpdsFeed {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error(`XML parsing error: ${parserError.textContent?.slice(0, 100) || "Invalid XML"}`);
  }

  const feedTitle =
    xmlDoc.querySelector("feed > title, title")?.textContent?.trim() || "OPDS Catalog";
  const feedId = xmlDoc.querySelector("feed > id, id")?.textContent?.trim();
  const feedIcon = xmlDoc.querySelector("feed > icon, icon")?.textContent?.trim();
  const feedUpdated = xmlDoc.querySelector("feed > updated, updated")?.textContent?.trim();

  const navigationLinks: OpdsLink[] = [];
  const pagination: OpdsPagination = {};
  let searchLink: string | undefined;

  const feedLinks = xmlDoc.querySelectorAll("feed > link");
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
    } else if (!rel.includes("acquisition") && !rel.includes("image") && rel !== "self") {
      navigationLinks.push({
        href: resolvedHref,
        rel,
        title,
        type,
      });
    }
  });

  const entries: OpdsEntry[] = [];
  const entryElements = xmlDoc.querySelectorAll("entry");

  entryElements.forEach((entryEl) => {
    const id =
      entryEl.querySelector("id")?.textContent?.trim() ||
      `opds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = entryEl.querySelector("title")?.textContent?.trim() || "Untitled Book";
    const author =
      entryEl.querySelector("author > name, author")?.textContent?.trim() || undefined;
    const summary =
      entryEl.querySelector("summary, content")?.textContent?.trim() || undefined;
    const published =
      entryEl.querySelector("published, updated, dc\\:issued, issued")?.textContent?.trim() ||
      undefined;

    let coverUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    let acquisitionUrl: string | undefined;
    let format: string | undefined;

    const links = entryEl.querySelectorAll("link");
    links.forEach((link) => {
      const rel = link.getAttribute("rel") || "";
      const href = link.getAttribute("href") || "";
      const type = link.getAttribute("type") || "";

      if (!href) return;
      const resolved = resolveUrl(href, baseUrl);

      if (rel.includes("thumbnail") || rel.includes("image/thumbnail")) {
        thumbnailUrl = resolved;
      } else if (rel.includes("image") || rel.includes("cover")) {
        coverUrl = resolved;
      }

      const isAcquisition =
        rel.includes("acquisition") ||
        type === "application/epub+zip" ||
        href.endsWith(".epub");

      if (isAcquisition) {
        // Prioritize EPUB format if multiple acquisition links exist
        if (!acquisitionUrl || type === "application/epub+zip" || href.endsWith(".epub")) {
          acquisitionUrl = resolved;
          format = type || "application/epub+zip";
        }
      }
    });

    entries.push({
      acquisitionUrl,
      author,
      coverUrl: coverUrl || thumbnailUrl,
      format,
      id,
      published,
      summary,
      thumbnailUrl: thumbnailUrl || coverUrl,
      title,
    });
  });

  return {
    entries,
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
    return searchLink.replace("{searchTerms}", encoded);
  }
  const separator = searchLink.includes("?") ? "&" : "?";
  return `${searchLink}${separator}query=${encoded}`;
}

export const OFFLINE_SAMPLE_CATALOG_FEED: OpdsFeed = {
  entries: [
    {
      acquisitionUrl: "https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice/downloads/jane-austen_pride-and-prejudice.epub",
      author: "Jane Austen",
      coverUrl: "https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice/cover.jpg",
      format: "application/epub+zip",
      id: "offline-pride-and-prejudice",
      published: "1813-01-28",
      summary: "A romantic novel of manners following Elizabeth Bennet as she deals with issues of manners, morality, education, and marriage in Regency England.",
      thumbnailUrl: "https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice/thumbnail.jpg",
      title: "Pride and Prejudice",
    },
    {
      acquisitionUrl: "https://standardebooks.org/ebooks/mary-shelley/frankenstein/downloads/mary-shelley_frankenstein.epub",
      author: "Mary Wollstonecraft Shelley",
      coverUrl: "https://standardebooks.org/ebooks/mary-shelley/frankenstein/cover.jpg",
      format: "application/epub+zip",
      id: "offline-frankenstein",
      published: "1818-01-01",
      summary: "A Gothic masterpiece following Victor Frankenstein, an ambitious young scientist who creates a sapient creature in an unorthodox experiment.",
      thumbnailUrl: "https://standardebooks.org/ebooks/mary-shelley/frankenstein/thumbnail.jpg",
      title: "Frankenstein; or, The Modern Prometheus",
    },
    {
      acquisitionUrl: "https://standardebooks.org/ebooks/bram-stoker/dracula/downloads/bram-stoker_dracula.epub",
      author: "Bram Stoker",
      coverUrl: "https://standardebooks.org/ebooks/bram-stoker/dracula/cover.jpg",
      format: "application/epub+zip",
      id: "offline-dracula",
      published: "1897-05-26",
      summary: "An epistolary Gothic horror novel depicting Count Dracula's attempt to move from Transylvania to England to spread the undead curse.",
      thumbnailUrl: "https://standardebooks.org/ebooks/bram-stoker/dracula/thumbnail.jpg",
      title: "Dracula",
    },
    {
      acquisitionUrl: "https://standardebooks.org/ebooks/lewis-carroll/alices-adventures-in-wonderland/downloads/lewis-carroll_alices-adventures-in-wonderland.epub",
      author: "Lewis Carroll",
      coverUrl: "https://standardebooks.org/ebooks/lewis-carroll/alices-adventures-in-wonderland/cover.jpg",
      format: "application/epub+zip",
      id: "offline-alice-wonderland",
      published: "1865-11-26",
      summary: "Alice falls through a rabbit hole into a fantastical underworld populated by unforgettable anthropomorphic creatures.",
      thumbnailUrl: "https://standardebooks.org/ebooks/lewis-carroll/alices-adventures-in-wonderland/thumbnail.jpg",
      title: "Alice's Adventures in Wonderland",
    },
    {
      acquisitionUrl: "https://standardebooks.org/ebooks/arthur-conan-doyle/the-adventures-of-sherlock-holmes/downloads/arthur-conan-doyle_the-adventures-of-sherlock-holmes.epub",
      author: "Arthur Conan Doyle",
      coverUrl: "https://standardebooks.org/ebooks/arthur-conan-doyle/the-adventures-of-sherlock-holmes/cover.jpg",
      format: "application/epub+zip",
      id: "offline-sherlock-holmes",
      published: "1892-10-14",
      summary: "Twelve ingenious detective short stories featuring Sherlock Holmes and his trusted friend Dr. John Watson.",
      thumbnailUrl: "https://standardebooks.org/ebooks/arthur-conan-doyle/the-adventures-of-sherlock-holmes/thumbnail.jpg",
      title: "The Adventures of Sherlock Holmes",
    },
    {
      acquisitionUrl: "https://standardebooks.org/ebooks/f-scott-fitzgerald/the-great-gatsby/downloads/f-scott-fitzgerald_the-great-gatsby.epub",
      author: "F. Scott Fitzgerald",
      coverUrl: "https://standardebooks.org/ebooks/f-scott-fitzgerald/the-great-gatsby/cover.jpg",
      format: "application/epub+zip",
      id: "offline-great-gatsby",
      published: "1925-04-10",
      summary: "A tragedy set in the Jazz Age exploring themes of decadence, idealism, and social upheaval on Long Island.",
      thumbnailUrl: "https://standardebooks.org/ebooks/f-scott-fitzgerald/the-great-gatsby/thumbnail.jpg",
      title: "The Great Gatsby",
    },
  ],
  id: "sanctuary-offline-sample-catalog",
  navigationLinks: [
    { href: "offline:classics", rel: "subsection", title: "All Classics" },
    { href: "offline:fiction", rel: "subsection", title: "Classic Fiction" },
    { href: "offline:gothic", rel: "subsection", title: "Gothic & Mystery" },
  ],
  title: "Sanctuary Public Domain Library (Offline Classics)",
  updated: "2026-09-14T00:00:00Z",
};

export function getOfflineSampleFeed(): OpdsFeed {
  return {
    ...OFFLINE_SAMPLE_CATALOG_FEED,
    entries: [...OFFLINE_SAMPLE_CATALOG_FEED.entries],
    navigationLinks: [...OFFLINE_SAMPLE_CATALOG_FEED.navigationLinks],
  };
}

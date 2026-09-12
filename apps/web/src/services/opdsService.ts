import type { CatalogSource, OpdsEntry, OpdsFeed, OpdsLink } from "@/types/opds";

export const DEFAULT_CATALOGS: CatalogSource[] = [
  {
    id: "standard-ebooks",
    isDefault: true,
    name: "Standard Ebooks",
    url: "https://standardebooks.org/opds/all",
  },
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
    } else if (!rel.includes("acquisition") && !rel.includes("image")) {
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
  let searchLink: string | undefined;

  const allNavLinks = [...(data.links || []), ...(data.navigation || [])];
  for (const l of allNavLinks) {
    if (!l.href) continue;
    const resolvedHref = resolveUrl(l.href, baseUrl);
    if (l.rel === "search") {
      searchLink = resolvedHref;
    } else {
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

export async function fetchCatalogFeed(url: string): Promise<OpdsFeed> {
  const res = await fetch(url, {
    headers: {
      Accept:
        "application/atom+xml,application/xml,application/opds+json,application/json;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load catalog feed: ${res.status} ${res.statusText}`);
  }

  const rawText = await res.text();
  return parseOpdsFeed(rawText, res.url || url);
}

export async function downloadCatalogBook(
  acquisitionUrl: string,
  fallbackTitle: string
): Promise<File> {
  const res = await fetch(acquisitionUrl);
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

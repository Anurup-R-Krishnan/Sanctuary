import { beforeAll, describe, expect, it } from "bun:test";

import { ensureTestDom } from "../reader/foliate/testEnv";
import {
  buildCatalogAuthHeader,
  DEFAULT_CATALOGS,
  downloadCatalogBook,
  fetchCatalogFeed,
  getSavedCustomCatalogs,
  parseOpdsFeed,
  parseOpdsJson,
  parseOpdsXml,
  removeCustomCatalog,
  saveCustomCatalog,
} from "./opdsService";

beforeAll(() => {
  ensureTestDom();
});

describe("OPDS 1.2 Atom XML Feed Parser", () => {
  const sampleAtomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opds="http://opds-spec.org/2010/catalog">
  <id>https://standardebooks.org/opds/all</id>
  <title>Standard Ebooks - Free and liberated ebooks</title>
  <updated>2026-09-12T12:00:00Z</updated>
  <icon>/favicon.ico</icon>
  <link rel="self" href="/opds/all" type="application/atom+xml;profile=opds-catalog;kind=acquisition" />
  <link rel="start" href="/opds" type="application/atom+xml;profile=opds-catalog;kind=navigation" title="Home" />
  <link rel="search" href="/opds/search{?query}" type="application/opensearchdescription+xml" />

  <entry>
    <id>https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice</id>
    <title>Pride and Prejudice</title>
    <author>
      <name>Jane Austen</name>
    </author>
    <published>1813-01-28</published>
    <updated>2026-08-01T10:00:00Z</updated>
    <summary>A romantic novel of manners written by Jane Austen in 1813.</summary>
    <link rel="http://opds-spec.org/image" href="/ebooks/jane-austen/pride-and-prejudice/cover.jpg" type="image/jpeg" />
    <link rel="http://opds-spec.org/image/thumbnail" href="/ebooks/jane-austen/pride-and-prejudice/thumbnail.jpg" type="image/jpeg" />
    <link rel="http://opds-spec.org/acquisition" href="/ebooks/jane-austen/pride-and-prejudice/downloads/jane-austen_pride-and-prejudice.epub" type="application/epub+zip" />
  </entry>

  <entry>
    <id>https://standardebooks.org/ebooks/mary-shelley/frankenstein</id>
    <title>Frankenstein; or, The Modern Prometheus</title>
    <author>
      <name>Mary Wollstonecraft Shelley</name>
    </author>
    <published>1818-01-01</published>
    <summary>A Gothic novel written by English author Mary Shelley.</summary>
    <link rel="http://opds-spec.org/cover" href="/ebooks/mary-shelley/frankenstein/cover.jpg" type="image/jpeg" />
    <link rel="http://opds-spec.org/acquisition/open-access" href="/ebooks/mary-shelley/frankenstein/frankenstein.epub" type="application/epub+zip" />
  </entry>
</feed>`;

  it("parses OPDS 1.2 Atom XML feed metadata, entries, and acquisition links", () => {
    const feed = parseOpdsXml(sampleAtomXml, "https://standardebooks.org/opds/all");

    expect(feed.title).toBe("Standard Ebooks - Free and liberated ebooks");
    expect(feed.id).toBe("https://standardebooks.org/opds/all");
    expect(feed.updated).toBe("2026-09-12T12:00:00Z");
    expect(feed.icon).toBe("https://standardebooks.org/favicon.ico");
    expect(feed.searchLink).toBe("https://standardebooks.org/opds/search%7B?query}");
    expect(feed.navigationLinks.length).toBeGreaterThan(0);

    expect(feed.entries.length).toBe(2);

    const first = feed.entries[0];
    expect(first.title).toBe("Pride and Prejudice");
    expect(first.author).toBe("Jane Austen");
    expect(first.summary).toContain("romantic novel");
    expect(first.published).toBe("1813-01-28");
    expect(first.coverUrl).toBe(
      "https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice/cover.jpg"
    );
    expect(first.thumbnailUrl).toBe(
      "https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice/thumbnail.jpg"
    );
    expect(first.acquisitionUrl).toBe(
      "https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice/downloads/jane-austen_pride-and-prejudice.epub"
    );
    expect(first.format).toBe("application/epub+zip");

    const second = feed.entries[1];
    expect(second.title).toBe("Frankenstein; or, The Modern Prometheus");
    expect(second.author).toBe("Mary Wollstonecraft Shelley");
    expect(second.acquisitionUrl).toBe(
      "https://standardebooks.org/ebooks/mary-shelley/frankenstein/frankenstein.epub"
    );
  });

  it("handles feeds with relative URLs correctly", () => {
    const feed = parseOpdsXml(sampleAtomXml, "https://standardebooks.org/opds/all");
    expect(feed.entries[0].acquisitionUrl?.startsWith("https://standardebooks.org/")).toBe(true);
  });
});

describe("OPDS 2.0 JSON Feed Parser", () => {
  const sampleOpds2Json = JSON.stringify({
    metadata: {
      title: "Public Domain Audio & Ebooks",
      updated: "2026-09-12T14:00:00Z",
    },
    links: [
      { href: "/opds2/catalog.json", rel: "self", type: "application/opds+json" },
      { href: "/search", rel: "search", type: "application/opds+json" },
    ],
    publications: [
      {
        metadata: {
          identifier: "urn:isbn:9780141439518",
          title: "Emma",
          author: { name: "Jane Austen" },
          description: "Emma Woodhouse is handsome, clever, and rich.",
          published: "1815-12-23",
        },
        images: [
          { href: "/images/emma.jpg", rel: "cover", type: "image/jpeg" },
        ],
        links: [
          {
            href: "/downloads/emma.epub",
            rel: "http://opds-spec.org/acquisition",
            type: "application/epub+zip",
          },
        ],
      },
      {
        metadata: {
          identifier: "urn:isbn:9780141439550",
          title: { name: "Sense and Sensibility" },
          author: [{ name: "Jane Austen" }],
          description: "Elinor and Marianne Dashwood.",
        },
        links: [
          {
            href: "https://external.org/sense.epub",
            rel: "http://opds-spec.org/acquisition",
            type: "application/epub+zip",
          },
        ],
      },
    ],
  });

  it("parses OPDS 2.0 JSON feeds into unified OpdsFeed format", () => {
    const feed = parseOpdsJson(sampleOpds2Json, "https://catalog.example.com/opds2/");

    expect(feed.title).toBe("Public Domain Audio & Ebooks");
    expect(feed.searchLink).toBe("https://catalog.example.com/search");
    expect(feed.entries.length).toBe(2);

    const emma = feed.entries[0];
    expect(emma.title).toBe("Emma");
    expect(emma.author).toBe("Jane Austen");
    expect(emma.summary).toBe("Emma Woodhouse is handsome, clever, and rich.");
    expect(emma.coverUrl).toBe("https://catalog.example.com/images/emma.jpg");
    expect(emma.acquisitionUrl).toBe("https://catalog.example.com/downloads/emma.epub");
    expect(emma.format).toBe("application/epub+zip");

    const sense = feed.entries[1];
    expect(sense.title).toBe("Sense and Sensibility");
    expect(sense.author).toBe("Jane Austen");
    expect(sense.acquisitionUrl).toBe("https://external.org/sense.epub");
  });

  it("parseOpdsFeed automatically detects JSON and XML", () => {
    const xmlFeed = parseOpdsFeed(
      "<feed><title>XML Feed</title><entry><title>B1</title></entry></feed>",
      "https://example.com"
    );
    expect(xmlFeed.title).toBe("XML Feed");
    expect(xmlFeed.entries.length).toBe(1);

    const jsonFeed = parseOpdsFeed(
      '{"metadata":{"title":"JSON Feed"},"publications":[]}',
      "https://example.com"
    );
    expect(jsonFeed.title).toBe("JSON Feed");
    expect(jsonFeed.entries.length).toBe(0);
  });
});

describe("downloadCatalogBook helper", () => {
  it("downloads book blob and constructs File with Content-Disposition filename", async () => {
    const originalFetch = globalThis.fetch;
    const fakeEpubBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("download-test")) {
        return new Response(fakeEpubBytes, {
          status: 200,
          headers: {
            "Content-Disposition": 'attachment; filename="custom_book_name.epub"',
            "Content-Type": "application/epub+zip",
          },
        });
      }
      return originalFetch(url);
    }) as typeof fetch;

    try {
      const file = await downloadCatalogBook("https://example.com/download-test", "Fallback Title");
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("custom_book_name.epub");
      expect(file.type).toBe("application/epub+zip");
      expect(file.size).toBe(4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("derives fallback slug filename when Content-Disposition is absent", async () => {
    const originalFetch = globalThis.fetch;
    const fakeEpubBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("fallback-test")) {
        return new Response(fakeEpubBytes, {
          status: 200,
          headers: {
            "Content-Type": "application/epub+zip",
          },
        });
      }
      return originalFetch(url);
    }) as typeof fetch;

    try {
      const file = await downloadCatalogBook(
        "https://example.com/fallback-test",
        "Moby Dick, or The Whale!"
      );
      expect(file.name).toBe("Moby_Dick_or_The_Whale.epub");
      expect(file.size).toBe(4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("DEFAULT_CATALOGS constant", () => {
  it("includes Standard Ebooks and Project Gutenberg as default sources", () => {
    expect(DEFAULT_CATALOGS.length).toBeGreaterThanOrEqual(2);
    const standardEbooks = DEFAULT_CATALOGS.find((c) => c.id === "standard-ebooks");
    expect(standardEbooks).toBeDefined();
    expect(standardEbooks?.url).toContain("standardebooks.org");

    const gutenberg = DEFAULT_CATALOGS.find((c) => c.id === "project-gutenberg");
    expect(gutenberg).toBeDefined();
    expect(gutenberg?.url).toContain("gutenberg.org");
  });
});

describe("Authenticated OPDS Feeds & Credential Handling", () => {
  it("buildCatalogAuthHeader correctly encodes Basic and Bearer auth", () => {
    expect(buildCatalogAuthHeader(undefined)).toBeUndefined();
    expect(
      buildCatalogAuthHeader({
        id: "public",
        name: "Public Feed",
        url: "https://example.com/opds",
      })
    ).toBeUndefined();

    const basicAuth = buildCatalogAuthHeader({
      authType: "basic",
      id: "calibre",
      name: "Calibre Server",
      password: "secretpassword",
      url: "https://calibre.home/opds",
      username: "reader",
    });
    expect(basicAuth).toBe("Basic cmVhZGVyOnNlY3JldHBhc3N3b3Jk");

    const bearerAuth = buildCatalogAuthHeader({
      authType: "bearer",
      bearerToken: "my-jwt-token-123",
      id: "kavita",
      name: "Kavita",
      url: "https://kavita.home/opds",
    });
    expect(bearerAuth).toBe("Bearer my-jwt-token-123");
  });

  it("fetchCatalogFeed attaches Authorization header for authenticated sources", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedAuth: string | null = null;

    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      interceptedAuth = (init?.headers as Record<string, string>)?.Authorization || null;
      return new Response(
        `<feed xmlns="http://www.w3.org/2005/Atom"><title>Secure Calibre</title></feed>`,
        { headers: { "Content-Type": "application/atom+xml" }, status: 200 }
      );
    }) as typeof fetch;

    try {
      const feed = await fetchCatalogFeed("https://calibre.home/opds", {
        authType: "basic",
        id: "calibre-1",
        name: "Calibre 1",
        password: "pw",
        url: "https://calibre.home/opds",
        username: "user",
      });

      expect(feed.title).toBe("Secure Calibre");
      expect(interceptedAuth).toBe("Basic dXNlcjpwdw==");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("downloadCatalogBook transmits Authorization header to acquisition endpoints", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedAuth: string | null = null;
    const fakeEpub = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      interceptedAuth = (init?.headers as Record<string, string>)?.Authorization || null;
      return new Response(fakeEpub, {
        headers: {
          "Content-Disposition": 'attachment; filename="secure_book.epub"',
          "Content-Type": "application/epub+zip",
        },
        status: 200,
      });
    }) as typeof fetch;

    try {
      const file = await downloadCatalogBook(
        "https://kavita.home/download/123",
        "Secure Book",
        {
          authType: "bearer",
          bearerToken: "token-abc-xyz",
          id: "kavita-1",
          name: "Kavita",
          url: "https://kavita.home/opds",
        }
      );

      expect(file.name).toBe("secure_book.epub");
      expect(interceptedAuth).toBe("Bearer token-abc-xyz");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("persists and removes custom catalogs in localStorage", () => {
    const testCatalog = {
      authType: "basic" as const,
      id: "test-calibre-custom",
      name: "Home Calibre",
      password: "pass",
      url: "https://calibre.home/opds",
      username: "admin",
    };

    saveCustomCatalog(testCatalog);
    let list = getSavedCustomCatalogs();
    expect(list.some((c) => c.id === "test-calibre-custom")).toBe(true);

    removeCustomCatalog("test-calibre-custom");
    list = getSavedCustomCatalogs();
    expect(list.some((c) => c.id === "test-calibre-custom")).toBe(false);
  });
});

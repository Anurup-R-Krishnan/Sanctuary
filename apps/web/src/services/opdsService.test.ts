import type { SanctuaryApiClient } from "@sanctuary/core";

import { beforeAll, describe, expect, it } from "bun:test";

import { ensureTestDom } from "../reader/foliate/testEnv";
import {
  buildCatalogAuthHeader,
  DEFAULT_CATALOGS,
  downloadCatalogBook,
  fetchCatalogFeed,
  getOfflineSampleFeed,
  parseOpdsFeed,
  parseOpdsJson,
  parseOpdsXml,
  resolveSearchUrl,
} from "./opdsService";

beforeAll(() => {
  ensureTestDom();
});

// A minimal stand-in for SanctuaryApiClient — fetchCatalogFeed/downloadCatalogBook
// only ever call fetchOpdsProxy, so that's the only method under test here.
function makeFakeApi(
  fetchOpdsProxy: (targetUrl: string, targetAuth?: string, targetAccept?: string) => Promise<Response>
): SanctuaryApiClient {
  return { fetchOpdsProxy } as unknown as SanctuaryApiClient;
}

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
    const fakeEpubBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const api = makeFakeApi(async () =>
      new Response(fakeEpubBytes, {
        status: 200,
        headers: {
          "Content-Disposition": 'attachment; filename="custom_book_name.epub"',
          "Content-Type": "application/epub+zip",
        },
      })
    );

    const file = await downloadCatalogBook(api, "https://example.com/download-test", "Fallback Title");
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("custom_book_name.epub");
    expect(file.type).toBe("application/epub+zip");
    expect(file.size).toBe(4);
  });

  it("derives fallback slug filename when Content-Disposition is absent", async () => {
    const fakeEpubBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const api = makeFakeApi(async () =>
      new Response(fakeEpubBytes, {
        status: 200,
        headers: { "Content-Type": "application/epub+zip" },
      })
    );

    const file = await downloadCatalogBook(
      api,
      "https://example.com/fallback-test",
      "Moby Dick, or The Whale!"
    );
    expect(file.name).toBe("Moby_Dick_or_The_Whale.epub");
    expect(file.size).toBe(4);
  });
});

describe("DEFAULT_CATALOGS constant", () => {
  it("includes Project Gutenberg as a default source", () => {
    // Standard Ebooks is deliberately excluded — its full OPDS feed now
    // requires paid Patrons Circle membership, so it 401s for everyone else.
    expect(DEFAULT_CATALOGS.length).toBeGreaterThanOrEqual(1);
    const standardEbooks = DEFAULT_CATALOGS.find((c) => c.id === "standard-ebooks");
    expect(standardEbooks).toBeUndefined();

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

  it("fetchCatalogFeed passes the target's Authorization through the proxy for authenticated sources", async () => {
    let interceptedAuth: string | undefined;

    const api = makeFakeApi(async (_targetUrl, targetAuth) => {
      interceptedAuth = targetAuth;
      return new Response(
        `<feed xmlns="http://www.w3.org/2005/Atom"><title>Secure Calibre</title></feed>`,
        { headers: { "Content-Type": "application/atom+xml" }, status: 200 }
      );
    });

    const feed = await fetchCatalogFeed(api, "https://calibre.home/opds", {
      authType: "basic",
      id: "calibre-1",
      name: "Calibre 1",
      password: "pw",
      url: "https://calibre.home/opds",
      username: "user",
    });

    expect(feed.title).toBe("Secure Calibre");
    expect(interceptedAuth).toBe("Basic dXNlcjpwdw==");
  });

  it("downloadCatalogBook passes the target's Authorization through the proxy to acquisition endpoints", async () => {
    let interceptedAuth: string | undefined;
    const fakeEpub = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

    const api = makeFakeApi(async (_targetUrl, targetAuth) => {
      interceptedAuth = targetAuth;
      return new Response(fakeEpub, {
        headers: {
          "Content-Disposition": 'attachment; filename="secure_book.epub"',
          "Content-Type": "application/epub+zip",
        },
        status: 200,
      });
    });

    const file = await downloadCatalogBook(
      api,
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
  });
});

describe("OPDS Pagination Link Parsing", () => {
  it("extracts next and previous links from OPDS 1.2 XML feeds", () => {
    const xmlWithPagination = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>https://standardebooks.org/opds/all?page=2</id>
  <title>Standard Ebooks - Page 2</title>
  <link rel="first" href="/opds/all?page=1" type="application/atom+xml" />
  <link rel="previous" href="/opds/all?page=1" type="application/atom+xml" />
  <link rel="next" href="/opds/all?page=3" type="application/atom+xml" />
  <link rel="last" href="/opds/all?page=50" type="application/atom+xml" />
  <link rel="subsection" href="/opds/subjects" title="Browse Subjects" />
  <entry>
    <id>book-1</id>
    <title>Sample Book</title>
  </entry>
</feed>`;

    const feed = parseOpdsXml(xmlWithPagination, "https://standardebooks.org/opds/all?page=2");
    expect(feed.pagination).toBeDefined();
    expect(feed.pagination?.first).toBe("https://standardebooks.org/opds/all?page=1");
    expect(feed.pagination?.previous).toBe("https://standardebooks.org/opds/all?page=1");
    expect(feed.pagination?.next).toBe("https://standardebooks.org/opds/all?page=3");
    expect(feed.pagination?.last).toBe("https://standardebooks.org/opds/all?page=50");

    // Ensure pagination links are excluded from navigation links
    expect(feed.navigationLinks.length).toBe(1);
    expect(feed.navigationLinks[0].title).toBe("Browse Subjects");
  });

  it("extracts next and previous links from OPDS 2.0 JSON feeds", () => {
    const jsonWithPagination = JSON.stringify({
      links: [
        { href: "/opds2/catalog.json?page=1", rel: "first" },
        { href: "/opds2/catalog.json?page=2", rel: "previous" },
        { href: "/opds2/catalog.json?page=4", rel: "next" },
        { href: "/opds2/categories", rel: "subsection", title: "Categories" },
      ],
      metadata: { title: "Paginated JSON Catalog" },
      publications: [],
    });

    const feed = parseOpdsJson(jsonWithPagination, "https://catalog.example.com/opds2/catalog.json?page=3");
    expect(feed.pagination).toBeDefined();
    expect(feed.pagination?.first).toBe("https://catalog.example.com/opds2/catalog.json?page=1");
    expect(feed.pagination?.previous).toBe("https://catalog.example.com/opds2/catalog.json?page=2");
    expect(feed.pagination?.next).toBe("https://catalog.example.com/opds2/catalog.json?page=4");
    expect(feed.navigationLinks.length).toBe(1);
    expect(feed.navigationLinks[0].title).toBe("Categories");
  });
});

describe("resolveSearchUrl helper", () => {
  it("interpolates {?query} template parameters properly", () => {
    const url = resolveSearchUrl("https://standardebooks.org/opds/search{?query}", "Sherlock Holmes");
    expect(url).toBe("https://standardebooks.org/opds/search?query=Sherlock%20Holmes");
  });

  it("interpolates {query} and {searchTerms} templates properly", () => {
    const url1 = resolveSearchUrl("https://example.com/search?q={query}", "Pride and Prejudice");
    expect(url1).toBe("https://example.com/search?q=Pride%20and%20Prejudice");

    const url2 = resolveSearchUrl("https://gutenberg.org/search?terms={searchTerms}", "Dracula");
    expect(url2).toBe("https://gutenberg.org/search?terms=Dracula");
  });

  it("appends query parameter when no template parameter exists", () => {
    const url = resolveSearchUrl("https://example.com/search", "Frankenstein");
    expect(url).toBe("https://example.com/search?query=Frankenstein");
  });
});

describe("Offline Sample Catalog Feed", () => {
  it("provides rich curated public domain classics with valid metadata and links", () => {
    const feed = getOfflineSampleFeed();
    expect(feed.entries.length).toBeGreaterThanOrEqual(6);
    expect(feed.title).toContain("Offline Classics");

    const titles = feed.entries.map((e) => e.title);
    expect(titles).toContain("Pride and Prejudice");
    expect(titles).toContain("Frankenstein; or, The Modern Prometheus");
    expect(titles).toContain("Dracula");

    for (const entry of feed.entries) {
      expect(entry.author).toBeDefined();
      expect(entry.summary).toBeDefined();
      expect(entry.acquisitionUrl).toContain(".epub");
      expect(entry.format).toBe("application/epub+zip");
    }

    expect(feed.navigationLinks.length).toBeGreaterThanOrEqual(3);
  });
});


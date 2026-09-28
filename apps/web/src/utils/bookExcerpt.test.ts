import { beforeAll, describe, expect, it } from "bun:test";

import { ensureTestDom } from "../reader/foliate/testEnv";
import { extractExcerpt, trimToSentence } from "./bookExcerpt";

beforeAll(() => {
  ensureTestDom();
});

const long = "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light.";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

describe("extractExcerpt", () => {
  it("returns the first long paragraph and the heading before it", () => {
    const doc = parse(`<body><h1>Contents</h1><p>Short.</p><h2>Chapter One</h2><p>${long}</p><p>${long}</p></body>`);
    expect(extractExcerpt(doc)).toEqual({ chapter: "Chapter One", text: long });
  });

  it("returns null when no paragraph is long enough", () => {
    expect(extractExcerpt(parse("<body><p>Too short.</p></body>"))).toBeNull();
  });

  it("skips paragraphs that start with a non-letter", () => {
    const doc = parse(`<body><p>“${long}</p><p>${long}</p></body>`);
    expect(extractExcerpt(doc)?.text).toBe(long);
  });
});

describe("trimToSentence", () => {
  it("keeps short text", () => {
    expect(trimToSentence("One. Two.", 50)).toBe("One. Two.");
  });

  it("cuts at the last sentence end within the limit", () => {
    expect(trimToSentence("First sentence here. Second sentence is long enough to overflow.", 36)).toBe("First sentence here.");
  });

  it("falls back to a word boundary with an ellipsis", () => {
    expect(trimToSentence("a".repeat(10) + " " + "b".repeat(40), 30)).toBe("aaaaaaaaaa…");
  });
});

import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "fs";

import { ensureTestDom } from "../foliate/testEnv";
import { getReaderEngineType, ReaderSession } from "./ReaderSession";

beforeAll(() => {
  ensureTestDom();
});

describe("ReaderSession Facade", () => {
  it("determines active engine from URL or defaults", () => {
    expect(getReaderEngineType()).toBe("foliate");
  });

  it("instantiates Foliate engine and exposes format-agnostic session", async () => {
    const buffer = fs.readFileSync("mobydick.epub");
    const blob = new Blob([buffer], { type: "application/epub+zip" });
    const container = document.getElementById("reader") as HTMLDivElement;

    let sessionStatus = "";
    let tocLength = 0;

    const session = new ReaderSession(
      {
        blob,
        bookId: "test-book-id",
        container,
        continuous: false,
        spread: false,
        themeStyles: {},
      },
      {
        onError: () => {},
        onPositionChange: () => {},
        onSelection: () => {},
        onStatusChange: (status) => {
          sessionStatus = status;
        },
        onTocReady: (toc) => {
          tocLength = toc.length;
        },
      }
    );

    expect(session).toBeDefined();
    expect(session.display).toBeTypeOf("function");
    expect(session.next).toBeTypeOf("function");
    expect(session.prev).toBeTypeOf("function");
    expect(session.setFlow).toBeTypeOf("function");

    // Wait for init ticks
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(sessionStatus).not.toBe("error");
    expect(tocLength).toBeGreaterThan(0);
    expect(session.tocItems.length).toBeGreaterThan(0);
    expect(session.totalLocations).toBeGreaterThan(1);

    // Verify search
    if (session.epubBook?.search) {
      const searchResults = await session.epubBook.search("Ishmael");
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].cfi).toBeDefined();
      expect(searchResults[0].excerpt.toLowerCase()).toContain("ishmael");
    }

    session.destroy();
  });
});

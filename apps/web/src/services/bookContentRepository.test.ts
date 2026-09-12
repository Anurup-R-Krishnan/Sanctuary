import { describe, expect, test } from "bun:test";

import { calculateEpubHash } from "@/utils/crypto";

import { verifyBookContent } from "./bookContentRepository";

describe("verifyBookContent", () => {
  test("accepts a ZIP-backed EPUB blob with the expected hash", async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
    const hash = await calculateEpubHash(bytes);
    const blob = new Blob([bytes], { type: "application/epub+zip" });

    await expect(verifyBookContent("book-1", blob, hash)).resolves.toMatchObject({
      byteLength: bytes.byteLength,
      contentHash: hash,
    });
  });

  test("rejects a missing, empty, and non-ZIP EPUB source", async () => {
    await expect(verifyBookContent("missing", null)).rejects.toMatchObject({
      code: "BOOK_CONTENT_MISSING",
    });
    await expect(verifyBookContent("empty", new Blob())).rejects.toMatchObject({
      code: "BOOK_CONTENT_EMPTY",
    });
    await expect(verifyBookContent("invalid", new Blob(["not an epub"]))).rejects.toMatchObject({
      code: "BOOK_CONTENT_INVALID",
    });
  });

  test("rejects content whose durable hash no longer matches", async () => {
    const original = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);
    const changed = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01]);
    const expectedHash = await calculateEpubHash(original);

    await expect(verifyBookContent("changed", new Blob([changed]), expectedHash)).rejects.toMatchObject({
      code: "BOOK_CONTENT_INVALID",
    });
  });

  test("accepts TXT and Markdown content when format or filename is specified", async () => {
    const txtBlob = new Blob(["Hello, this is a plain text book."]);
    await expect(verifyBookContent("book-txt", txtBlob, undefined, "txt")).resolves.toMatchObject({
      byteLength: txtBlob.size,
    });
    await expect(verifyBookContent("book-txt-fn", txtBlob, undefined, "novel.txt")).resolves.toMatchObject({
      byteLength: txtBlob.size,
    });

    const mdBlob = new Blob(["# Chapter 1\n\nSome markdown content"]);
    await expect(verifyBookContent("book-md", mdBlob, undefined, "markdown")).resolves.toMatchObject({
      byteLength: mdBlob.size,
    });
    await expect(verifyBookContent("book-md-fn", mdBlob, undefined, "story.md")).resolves.toMatchObject({
      byteLength: mdBlob.size,
    });
  });

  test("accepts FB2 XML and HTML content via header inspection", async () => {
    const fb2Blob = new Blob(["<?xml version='1.0'?><FictionBook xmlns='http://www.gribuser.ru/xml/fictionbook/2.0'></FictionBook>"]);
    await expect(verifyBookContent("book-fb2", fb2Blob)).resolves.toMatchObject({
      byteLength: fb2Blob.size,
    });

    const htmlBlob = new Blob(["<!DOCTYPE html><html><head><title>Test</title></head><body><p>Hello</p></body></html>"]);
    await expect(verifyBookContent("book-html", htmlBlob)).resolves.toMatchObject({
      byteLength: htmlBlob.size,
    });
  });
});

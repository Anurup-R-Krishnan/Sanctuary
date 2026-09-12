import { beforeAll, describe, expect, it } from "bun:test";

import { ensureTestDom } from "../foliate/testEnv";
import {
  naturalSortFilenames,
  parseComicInfoXml,
  parseComicToBook,
} from "./ComicParser";
import { detectBookFormat, isSupportedExtension } from "./FormatDetector";

beforeAll(() => {
  ensureTestDom();
});

/**
 * Pure TypeScript helper constructing uncompressed ZIP archives
 * for deterministic multi-page comic testing in node/bun.
 */
function createTestZip(files: Array<{ data: Uint8Array; name: string }>): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const data = file.data;

    // Local file header (30 bytes + name + data)
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true); // PK\x03\x04
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true); // uncompressed (store)
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, 0, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    localHeaders.push(local);

    // Central directory header (46 bytes + name)
    const central = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(central.buffer);
    cView.setUint32(0, 0x02014b50, true); // PK\x01\x02
    cView.setUint16(4, 20, true);
    cView.setUint16(6, 20, true);
    cView.setUint16(8, 0, true);
    cView.setUint16(10, 0, true);
    cView.setUint16(12, 0, true);
    cView.setUint16(14, 0, true);
    cView.setUint32(16, 0, true);
    cView.setUint32(20, data.length, true);
    cView.setUint32(24, data.length, true);
    cView.setUint16(28, nameBytes.length, true);
    cView.setUint16(30, 0, true);
    cView.setUint16(32, 0, true);
    cView.setUint16(34, 0, true);
    cView.setUint16(36, 0, true);
    cView.setUint32(38, 0, true);
    cView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralHeaders.push(central);

    offset += local.length;
  }

  const centralOffset = offset;
  let centralSize = 0;
  for (const c of centralHeaders) centralSize += c.length;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054b50, true); // PK\x05\x06
  eView.setUint16(4, 0, true);
  eView.setUint16(6, 0, true);
  eView.setUint16(8, files.length, true);
  eView.setUint16(10, files.length, true);
  eView.setUint32(12, centralSize, true);
  eView.setUint32(16, centralOffset, true);
  eView.setUint16(20, 0, true);

  const totalLength = centralOffset + centralSize + 22;
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const l of localHeaders) {
    out.set(l, pos);
    pos += l.length;
  }
  for (const c of centralHeaders) {
    out.set(c, pos);
    pos += c.length;
  }
  out.set(eocd, pos);
  return out;
}

describe("Native Comic & Manga Document Parser (CBZ/CBR)", () => {
  describe("Format Detection", () => {
    it("recognizes .cbz and .cbr file extensions", () => {
      expect(isSupportedExtension("manga_volume_01.cbz")).toBe(true);
      expect(isSupportedExtension("graphic_novel.cbr")).toBe(true);
      expect(isSupportedExtension("archive.zip")).toBe(false);
    });

    it("detects CBZ and CBR via filenames", async () => {
      expect(await detectBookFormat(new Blob(), "berserk_ch01.cbz")).toBe("cbz");
      expect(await detectBookFormat(new Blob(), "watchmen.cbr")).toBe("cbr");
    });

    it("detects CBR via RAR magic byte header", async () => {
      const rarBytes = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
      expect(await detectBookFormat(rarBytes)).toBe("cbr");
    });
  });

  describe("Collation & Metadata Extraction", () => {
    it("naturally sorts filenames so page 10 comes after page 2", () => {
      const unsorted = ["page_10.jpg", "page_1.jpg", "page_2.jpg", "page_20.jpg", "page_3.jpg"];
      const sorted = naturalSortFilenames(unsorted);
      expect(sorted).toEqual([
        "page_1.jpg",
        "page_2.jpg",
        "page_3.jpg",
        "page_10.jpg",
        "page_20.jpg",
      ]);
    });

    it("parses ComicInfo.xml metadata tags correctly", () => {
      const xml = `<ComicInfo>
        <Title>The Gathering Storm</Title>
        <Series>Akira</Series>
        <Number>4</Number>
        <Writer>Katsuhiro Otomo</Writer>
        <Summary>Neo-Tokyo crisis escalates.</Summary>
        <Year>1988</Year>
        <Month>7</Month>
        <Manga>YesAndRightToLeft</Manga>
      </ComicInfo>`;

      const meta = parseComicInfoXml(xml, "Fallback Title");
      expect(meta.title).toBe("Akira #4: The Gathering Storm");
      expect(meta.author).toBe("Katsuhiro Otomo");
      expect(meta.description).toBe("Neo-Tokyo crisis escalates.");
      expect(meta.published).toBe("1988-07");
      expect(meta.direction).toBe("rtl");
    });

    it("defaults to ltr direction when Manga tag is absent or standard", () => {
      const xml = `<ComicInfo><Title>Batman</Title><Writer>Bill Finger</Writer></ComicInfo>`;
      const meta = parseComicInfoXml(xml, "Fallback");
      expect(meta.direction).toBe("ltr");
    });
  });

  describe("End-to-End CBZ Parsing", () => {
    it("parses a CBZ archive into pre-paginated fixed-layout BookDocument", async () => {
      const dummyImage = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const comicXml = new TextEncoder().encode(
        `<ComicInfo><Title>Cyberpunk 2099</Title><Writer>Ghost Writer</Writer><Manga>YesAndRightToLeft</Manga></ComicInfo>`
      );

      const zipBytes = createTestZip([
        { data: dummyImage, name: "chapter1/page_02.png" },
        { data: dummyImage, name: "chapter1/page_01.png" },
        { data: dummyImage, name: "chapter1/page_10.png" },
        { data: comicXml, name: "ComicInfo.xml" },
      ]);

      const book = await parseComicToBook(zipBytes, "Cyberpunk.cbz");

      // Metadata assertions
      expect(book.metadata.title).toBe("Cyberpunk 2099");
      expect(book.metadata.author).toBe("Ghost Writer");
      expect(book.dir).toBe("rtl");
      expect(book.rendition?.layout).toBe("pre-paginated");

      // Naturally sorted section verification
      expect(book.sections.length).toBe(3);
      expect(book.sections[0].href).toBe("chapter1/page_01.png");
      expect(book.sections[1].href).toBe("chapter1/page_02.png");
      expect(book.sections[2].href).toBe("chapter1/page_10.png");

      // TOC matches sections
      expect(book.toc.length).toBe(3);
      expect(book.toc[0].label).toBe("Page 1");
      expect(book.toc[1].label).toBe("Page 2");

      // Section loading produces valid pre-paginated HTML viewport
      const pageUrl = await book.sections[0].load();
      expect(typeof pageUrl).toBe("string");
      expect(pageUrl).toContain("blob:");

      // Section lookup
      const resolved = book.resolveHref("chapter1/page_02.png");
      expect(resolved?.index).toBe(1);

      // Cover extraction returns first page blob
      const cover = await book.getCover?.();
      expect(cover).toBeDefined();

      // Unload and destroy clean up safely
      book.sections[0].unload?.();
      book.destroy?.();
    });

    it("rejects comic archives containing no supported image files", async () => {
      const textOnlyZip = createTestZip([
        { data: new TextEncoder().encode("Hello world"), name: "readme.txt" },
      ]);

      expect(parseComicToBook(textOnlyZip, "empty.cbz")).rejects.toThrow(
        "No supported image files found in comic archive."
      );
    });
  });
});

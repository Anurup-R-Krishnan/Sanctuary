import { describe, expect, it } from "bun:test";

import { ensureTestDom } from "../foliate/testEnv";
import { detectBookFormat, isSupportedExtension } from "./FormatDetector";
import { isPdfBytes, pageHref, pageIndexFromHref, parsePdfToBook } from "./PdfParser";

ensureTestDom();

function buildPdf(pages: string[], info = "/Title (Standard Algorithms) /Author (Ada Lovelace)"): Uint8Array {
  const objects: string[] = [];
  const pageIds = pages.map((_, i) => 4 + i * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((text, i) => {
    const stream = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
    objects[pageIds[i]!] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageIds[i]! + 1} 0 R >>`;
    objects[pageIds[i]! + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  const infoId = objects.length;
  objects[infoId] = `<< ${info} >>`;

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(body);
}

describe("PDF format", () => {
  it("is detected by extension and magic bytes", async () => {
    const bytes = buildPdf(["One"]);
    expect(isSupportedExtension("PAPER.PDF")).toBe(true);
    expect(isPdfBytes(bytes)).toBe(true);
    expect(await detectBookFormat(bytes)).toBe("pdf");
  });

  it("maps pages to hrefs and back", () => {
    expect(pageHref(0)).toBe("page-1");
    expect(pageIndexFromHref("page-12")).toBe(11);
    expect(pageIndexFromHref("page-0")).toBeNull();
    expect(pageIndexFromHref("chapter.xhtml")).toBeNull();
  });

  it("rejects payloads without a PDF header", async () => {
    await expect(parsePdfToBook(new Uint8Array([0, 1, 2, 3]), "bad.pdf")).rejects.toThrow("missing %PDF- header");
  });

  it("opens a PDF as a fixed-layout book with one section per page", async () => {
    const book = await parsePdfToBook(buildPdf(["Hello Sanctuary", "Second page"]), "algorithms.pdf");
    expect(book.metadata.title).toBe("Standard Algorithms");
    expect(book.metadata.author).toBe("Ada Lovelace");
    expect(book.rendition?.layout).toBe("pre-paginated");
    expect(book.sections).toHaveLength(2);
    expect(book.resolveHref("page-2")?.index).toBe(1);
    const doc = await book.sections[0]!.createDocument!();
    expect(doc.body.textContent).toContain("Hello Sanctuary");
    book.destroy?.();
  });
});

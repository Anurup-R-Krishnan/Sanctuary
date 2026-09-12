import { describe, expect, it } from "bun:test";
import { deflateSync } from "node:zlib";

import { ensureTestDom } from "../foliate/testEnv";
import { detectBookFormat, isSupportedExtension } from "./FormatDetector";
import {
  extractPdfInfo,
  extractPdfTextStreams,
  parsePdfToBook,
} from "./PdfParser";

ensureTestDom();

describe("Native PDF Document Parser & Ingestion", () => {
  const createMinimalPdf = (options?: {
    author?: string;
    pageCount?: number;
    textStream?: string;
    title?: string;
  }) => {
    const title = options?.title ?? "Standard Algorithms and Computation";
    const author = options?.author ?? "Ada Lovelace";
    const count = options?.pageCount ?? 2;

    let textStreamPart = "";
    if (options?.textStream) {
      textStreamPart = `
6 0 obj
<< /Length ${options.textStream.length} >>
stream
${options.textStream}
endstream
endobj`;
    }

    const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count ${count} >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R >>
endobj
5 0 obj
<< /Title (${title}) /Author (${author}) >>
endobj${textStreamPart}
trailer
<< /Root 1 0 R /Info 5 0 R >>
%%EOF`;

    return new TextEncoder().encode(pdfString);
  };

  it("FormatDetector recognizes .pdf extension and %PDF- magic bytes", async () => {
    expect(isSupportedExtension("document.pdf")).toBe(true);
    expect(isSupportedExtension("PAPER.PDF")).toBe(true);

    const pdfBytes = createMinimalPdf();
    const detectedFromExtension = await detectBookFormat(new Blob([pdfBytes]), "manual.pdf");
    expect(detectedFromExtension).toBe("pdf");

    // Sniffing without extension
    const detectedFromMagicBytes = await detectBookFormat(pdfBytes);
    expect(detectedFromMagicBytes).toBe("pdf");
  });

  it("rejects corrupted or non-PDF binary payloads", async () => {
    const corrupted = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    await expect(parsePdfToBook(corrupted, "corrupted.pdf")).rejects.toThrow(
      "Invalid PDF document: missing %PDF- header."
    );
  });

  it("extracts document title, author, and page count accurately", () => {
    const pdfBytes = createMinimalPdf({
      author: "Grace Hopper",
      pageCount: 3,
      title: "Compilers and Nanoseconds",
    });

    const info = extractPdfInfo(pdfBytes, "compilers.pdf");
    expect(info.title).toBe("Compilers and Nanoseconds");
    expect(info.author).toBe("Grace Hopper");
    expect(info.pageCount).toBe(3);
  });

  it("extracts uncompressed BT / ET text streams from PDF stream objects", async () => {
    const streamContent = "BT /F1 12 Tf (Introduction to Computing) Tj ET";
    const pdfBytes = createMinimalPdf({ textStream: streamContent });

    const textStreams = await extractPdfTextStreams(pdfBytes);
    expect(textStreams.length).toBeGreaterThan(0);
    expect(textStreams[0]).toContain("Introduction to Computing");
  });

  it("decompresses FlateDecode zlib streams using fflate", async () => {
    const rawStreamText = "BT /F1 14 Tf (Distributed Systems Architecture) Tj ET";
    const compressed = deflateSync(new TextEncoder().encode(rawStreamText));

    const header = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R >>
endobj
4 0 obj
<< /Length ${compressed.length} /Filter /FlateDecode >>
stream
`;
    const footer = `
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

    const headerBytes = new TextEncoder().encode(header);
    const footerBytes = new TextEncoder().encode(footer);
    const full = new Uint8Array(headerBytes.length + compressed.length + footerBytes.length);
    full.set(headerBytes, 0);
    full.set(compressed, headerBytes.length);
    full.set(footerBytes, headerBytes.length + compressed.length);

    const extracted = await extractPdfTextStreams(full);
    expect(extracted.length).toBe(1);
    expect(extracted[0]).toContain("Distributed Systems Architecture");
  });

  it("compiles standard pre-paginated BookDocument with fixed layout sections", async () => {
    const pdfBytes = createMinimalPdf({
      author: "Alan Turing",
      pageCount: 2,
      textStream: "BT /F1 12 Tf (On Computable Numbers) Tj ET",
      title: "Mathematical Foundations",
    });

    const book = await parsePdfToBook(pdfBytes, "turing.pdf");
    expect(book.metadata.title).toBe("Mathematical Foundations");
    expect(book.metadata.author).toBe("Alan Turing");
    expect(book.rendition?.layout).toBe("pre-paginated");
    expect(book.sections.length).toBe(2);
    expect(book.toc.length).toBe(2);

    expect(book.sections[0].title).toBe("Page 1");
    expect(book.sections[1].title).toBe("Page 2");

    // Load first section document
    const doc = book.sections[0].createDocument?.() as Document;
    expect(doc).toBeDefined();
    expect(doc.title).toBe("Page 1");
    expect(doc.body.textContent).toContain("On Computable Numbers");
    expect(doc.body.textContent).toContain("Page 1 of 2");

    // Cleanup resources
    book.destroy?.();
  });
});

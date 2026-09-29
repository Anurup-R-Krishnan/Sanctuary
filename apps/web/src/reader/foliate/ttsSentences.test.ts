import { describe, expect, it } from "bun:test";

import { buildSentences } from "./FoliateTTSController";
import { ensureTestDom } from "./testEnv";

ensureTestDom();

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(`<html lang="en"><body>${html}</body></html>`, "text/html");
}

describe("buildSentences", () => {
  it("keeps inline markup inside one sentence", () => {
    const sentences = buildSentences(docFrom("<p>The <em>quick</em> brown <a href='#'>fox</a> ran. It stopped.</p><p>Next one.</p>"));
    expect(sentences.map((s) => s.text)).toEqual(["The quick brown fox ran.", "It stopped.", "Next one."]);
    expect(sentences.map((s) => !!s.isParagraphEnd)).toEqual([false, true, true]);
    expect(sentences[0]!.range.toString()).toBe("The quick brown fox ran.");
  });

  it("reads bionic-reading markup as whole words", () => {
    const sentences = buildSentences(docFrom("<p><b>Rea</b>ding <b>i</b>s <b>fu</b>n.</p>"));
    expect(sentences.map((s) => s.text)).toEqual(["Reading is fun."]);
  });

  it("skips hidden and ruby annotation text and splits very long sentences", () => {
    const long = `${"word ".repeat(80)}end.`;
    const sentences = buildSentences(docFrom(`<p aria-hidden="true">Hidden.</p><p>漢<rt>kan</rt> text.</p><p>${long}</p>`));
    expect(sentences.some((s) => s.text.includes("Hidden"))).toBe(false);
    expect(sentences.some((s) => s.text.includes("kan"))).toBe(false);
    expect(sentences.filter((s) => s.text.startsWith("word")).every((s) => s.text.length <= 260)).toBe(true);
  });
});

describe("FoliateTTSController with a failing voice", () => {
  it("stops after repeated failures instead of skipping through the book", async () => {
    const { FoliateTTSController } = await import("./FoliateTTSController");
    const doc = docFrom("<p>One. Two. Three. Four. Five. Six.</p>");
    let attempts = 0;
    const controller = new FoliateTTSController({
      clearHighlight: () => undefined,
      getDoc: () => doc,
      highlightRange: () => undefined,
    });
    controller.setEngine({
      id: "kokoro",
      speak: (_request, { onError }) => {
        attempts += 1;
        queueMicrotask(onError);
        return { cancel: () => undefined, pause: () => undefined, resume: () => false };
      },
      stopAll: () => undefined,
    });
    await controller.start(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(attempts).toBe(3);
    expect(controller.getState().isPlaying).toBe(false);
    expect(controller.getState().error).not.toBeNull();
    controller.destroy();
  });
});

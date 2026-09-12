import { beforeAll, describe, expect, it } from "bun:test";

import { FoliateTTSController } from "./FoliateTTSController";
import { ensureTestDom } from "./testEnv";

beforeAll(() => {
  ensureTestDom();

  if (!window.speechSynthesis) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).speechSynthesis = {
      cancel: () => {},
      getVoices: () => [],
      onvoiceschanged: null,
      pause: () => {},
      paused: false,
      pending: false,
      resume: () => {},
      speak: () => {},
      speaking: false,
    };
  }

  if (typeof globalThis.SpeechSynthesisUtterance === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).SpeechSynthesisUtterance = class {
      public text: string;
      public rate = 1;
      public pitch = 1;
      public voice = null;
      public onend: (() => void) | null = null;
      public onerror: ((e: unknown) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    };
  }
});

describe("Foliate In-Book TTS Controller", () => {
  const createMockDocument = () => {
    const doc = document.implementation.createHTMLDocument("Test Chapter");
    doc.body.innerHTML = `
      <h1>Chapter One: The Departure</h1>
      <p>The wind was rising fast over the bay. We prepared the ship for a long journey.</p>
      <p>Nobody knew what awaited us beyond the horizon. Still, the crew remained confident.</p>
    `;
    return doc;
  };

  it("extracts sentences and ranges from document text nodes", () => {
    const doc = createMockDocument();
    let highlightedRange: Range | null = null;
    let cleared = false;

    const controller = new FoliateTTSController({
      clearHighlight: () => {
        cleared = true;
      },
      getDoc: () => doc,
      highlightRange: (r) => {
        highlightedRange = r;
      },
    });

    controller.extractSentences();
    const state = controller.getState();

    expect(state.totalSentences).toBeGreaterThanOrEqual(4);
    expect(state.isPlaying).toBe(false);
    expect(cleared).toBe(false);
    expect(highlightedRange).toBeNull();

    controller.destroy();
  });

  it("starts continuous playback and transitions playback state", async () => {
    const doc = createMockDocument();
    let highlightedCount = 0;
    let clearedCount = 0;

    const controller = new FoliateTTSController({
      clearHighlight: () => {
        clearedCount += 1;
      },
      getDoc: () => doc,
      highlightRange: () => {
        highlightedCount += 1;
      },
      initialRate: 1.25,
    });

    await controller.start(false);

    const state = controller.getState();
    expect(state.isPlaying).toBe(true);
    expect(state.isPaused).toBe(false);
    expect(state.currentIndex).toBe(0);
    expect(state.currentSentence).toBeDefined();
    expect(highlightedCount).toBe(1);
    expect(state.rate).toBe(1.25);

    // Pause
    controller.pause();
    expect(controller.getState().isPaused).toBe(true);

    // Resume
    controller.resume();
    expect(controller.getState().isPaused).toBe(false);

    // Next sentence
    controller.next();
    expect(controller.getState().currentIndex).toBe(1);

    // Prev sentence
    controller.prev();
    expect(controller.getState().currentIndex).toBe(0);

    // Rate adjustment
    controller.setRate(1.5);
    expect(controller.getState().rate).toBe(1.5);

    // Stop
    controller.stop();
    expect(controller.getState().isPlaying).toBe(false);
    expect(clearedCount).toBeGreaterThanOrEqual(1);

    controller.destroy();
  });

  it("advances chapter when reaching end of sentences", async () => {
    const doc = createMockDocument();
    let nextChapterCalled = false;

    const controller = new FoliateTTSController({
      clearHighlight: () => {},
      getDoc: () => doc,
      highlightRange: () => {},
      onNextChapter: async () => {
        nextChapterCalled = true;
        return false;
      },
    });

    await controller.start(false);
    const total = controller.getState().totalSentences;

    // Advance to end
    for (let i = 0; i < total; i++) {
      controller.next();
    }

    expect(nextChapterCalled).toBe(true);
    controller.destroy();
  });
});

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { FoliateTTSController } from "./FoliateTTSController";
import { MediaSessionController } from "./MediaSessionController";
import { ensureTestDom } from "./testEnv";

interface MockMediaSession {
  handlers: Record<string, (() => void) | null>;
  metadata: {
    album?: string;
    artist?: string;
    artwork?: Array<{ sizes?: string; src: string; type?: string }>;
    title?: string;
  } | null;
  playbackState: "none" | "paused" | "playing";
  setActionHandler: (action: string, handler: (() => void) | null) => void;
}

describe("MediaSessionController & Background Audio Controls", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalMediaSession: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalMediaMetadata: any;

  beforeEach(() => {
    ensureTestDom();
    originalMediaSession = (navigator as unknown as { mediaSession?: unknown }).mediaSession;
    originalMediaMetadata = (globalThis as unknown as { MediaMetadata?: unknown }).MediaMetadata;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "mediaSession", {
      configurable: true,
      value: originalMediaSession,
      writable: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).MediaMetadata = originalMediaMetadata;
  });

  it("handles environments where navigator.mediaSession is not supported gracefully", () => {
    Object.defineProperty(navigator, "mediaSession", {
      configurable: true,
      value: undefined,
      writable: true,
    });

    const controller = new MediaSessionController();
    expect(controller.isSupported()).toBe(false);

    // None of these should throw
    expect(() => {
      controller.updateMetadata({ title: "Test Title" });
      controller.setActionHandlers({
        onNext: () => {},
        onPause: () => {},
        onPlay: () => {},
        onPrevious: () => {},
      });
      controller.setPlaybackState("playing");
      controller.destroy();
    }).not.toThrow();
  });

  it("updates media session metadata and artwork correctly", () => {
    const mockSession: MockMediaSession = {
      handlers: {},
      metadata: null,
      playbackState: "none",
      setActionHandler(action: string, handler: (() => void) | null) {
        this.handlers[action] = handler;
      },
    };

    Object.defineProperty(navigator, "mediaSession", {
      configurable: true,
      value: mockSession,
      writable: true,
    });

    // Mock MediaMetadata constructor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).MediaMetadata = class MockMediaMetadata {
      public album: string;
      public artist: string;
      public artwork: Array<{ src: string; sizes?: string; type?: string }>;
      public title: string;
      constructor(init: {
        album?: string;
        artist?: string;
        artwork?: Array<{ src: string; sizes?: string; type?: string }>;
        title: string;
      }) {
        this.title = init.title;
        this.artist = init.artist || "";
        this.album = init.album || "";
        this.artwork = init.artwork || [];
      }
    };

    const controller = new MediaSessionController();
    expect(controller.isSupported()).toBe(true);

    controller.updateMetadata({
      author: "Herman Melville",
      chapter: "Loomings",
      coverUrl: "https://example.com/moby-dick.jpg",
      title: "Moby Dick",
    });

    expect(mockSession.metadata).not.toBeNull();
    expect(mockSession.metadata?.title).toBe("Moby Dick");
    expect(mockSession.metadata?.artist).toBe("Herman Melville");
    expect(mockSession.metadata?.album).toBe("Loomings");
    expect(mockSession.metadata?.artwork?.[0]?.src).toBe("https://example.com/moby-dick.jpg");
  });

  it("binds and invokes hardware action handlers", () => {
    const mockSession: MockMediaSession = {
      handlers: {},
      metadata: null,
      playbackState: "none",
      setActionHandler(action: string, handler: (() => void) | null) {
        this.handlers[action] = handler;
      },
    };

    Object.defineProperty(navigator, "mediaSession", {
      configurable: true,
      value: mockSession,
      writable: true,
    });

    const controller = new MediaSessionController();

    let playTriggered = false;
    let pauseTriggered = false;
    let nextTriggered = false;
    let prevTriggered = false;

    controller.setActionHandlers({
      onNext: () => {
        nextTriggered = true;
      },
      onPause: () => {
        pauseTriggered = true;
      },
      onPlay: () => {
        playTriggered = true;
      },
      onPrevious: () => {
        prevTriggered = true;
      },
    });

    expect(typeof mockSession.handlers.play).toBe("function");
    expect(typeof mockSession.handlers.pause).toBe("function");
    expect(typeof mockSession.handlers.nexttrack).toBe("function");
    expect(typeof mockSession.handlers.previoustrack).toBe("function");

    mockSession.handlers.play?.();
    mockSession.handlers.pause?.();
    mockSession.handlers.nexttrack?.();
    mockSession.handlers.previoustrack?.();

    expect(playTriggered).toBe(true);
    expect(pauseTriggered).toBe(true);
    expect(nextTriggered).toBe(true);
    expect(prevTriggered).toBe(true);

    // Test destroy clears handlers and metadata
    controller.destroy();
    expect(mockSession.handlers.play).toBeNull();
    expect(mockSession.handlers.pause).toBeNull();
    expect(mockSession.handlers.nexttrack).toBeNull();
    expect(mockSession.handlers.previoustrack).toBeNull();
    expect(mockSession.metadata).toBeNull();
    expect(mockSession.playbackState).toBe("none");
  });

  it("integrates seamlessly into FoliateTTSController", async () => {
    const mockSession: MockMediaSession = {
      handlers: {},
      metadata: null,
      playbackState: "none",
      setActionHandler(action: string, handler: (() => void) | null) {
        this.handlers[action] = handler;
      },
    };

    Object.defineProperty(navigator, "mediaSession", {
      configurable: true,
      value: mockSession,
      writable: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).MediaMetadata = class MockMediaMetadata {
      public album: string;
      public artist: string;
      public artwork: Array<{ src: string; sizes?: string; type?: string }>;
      public title: string;
      constructor(init: {
        album?: string;
        artist?: string;
        artwork?: Array<{ src: string; sizes?: string; type?: string }>;
        title: string;
      }) {
        this.title = init.title;
        this.artist = init.artist || "";
        this.album = init.album || "";
        this.artwork = init.artwork || [];
      }
    };

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

    const doc = document.implementation.createHTMLDocument("Test Book");
    doc.body.innerHTML = `
      <p>Sentence one of chapter one. Sentence two of chapter one.</p>
    `;

    const controller = new FoliateTTSController({
      bookMetadata: {
        author: "Frank Herbert",
        chapter: "Chapter 1",
        coverUrl: "https://example.com/dune.jpg",
        title: "Dune",
      },
      clearHighlight: () => {},
      getDoc: () => doc,
      highlightRange: () => {},
    });

    expect(mockSession.metadata?.title).toBe("Dune");
    expect(mockSession.metadata?.artist).toBe("Frank Herbert");
    expect(mockSession.metadata?.album).toBe("Chapter 1");

    // Start reading
    await controller.start(false);
    expect(mockSession.playbackState).toBe("playing");

    // Pause reading
    controller.pause();
    expect(mockSession.playbackState).toBe("paused");

    // Resume reading
    controller.resume();
    expect(mockSession.playbackState).toBe("playing");

    // Hardware skip next sentence via media session handler
    const initialIndex = controller.getState().currentIndex;
    mockSession.handlers.nexttrack?.();
    expect(controller.getState().currentIndex).toBe(initialIndex + 1);

    // Stop reading
    controller.stop();
    expect(mockSession.playbackState).toBe("none");

    // Update metadata dynamically (e.g. Chapter 2)
    controller.setBookMetadata({
      author: "Frank Herbert",
      chapter: "Chapter 2",
      coverUrl: "https://example.com/dune.jpg",
      title: "Dune",
    });
    expect(mockSession.metadata?.album).toBe("Chapter 2");

    controller.destroy();
  });
});

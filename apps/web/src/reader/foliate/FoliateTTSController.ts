/**
 * FoliateTTSController: Native, synchronized continuous text-to-speech engine
 * for Sanctuary books.
 *
 * Walks visible document text nodes, segments them into sentences, renders
 * non-destructive SVG highlight marks over the active sentence, and coordinates
 * continuous reading through window.speechSynthesis.
 */

import { type SpeechEngine, type SpeechPlayback, systemSpeechEngine } from "../tts/speechEngine";
import {
  MediaSessionController,
  type MediaSessionMetadata,
} from "./MediaSessionController";

export type TTSBookMetadata = MediaSessionMetadata;

export interface TTSControllerState {
  currentIndex: number;
  currentSentence: string | null;
  error: string | null;
  isPaused: boolean;
  isPlaying: boolean;
  rate: number;
  totalSentences: number;
}

export interface TTSControllerOptions {
  bookMetadata?: TTSBookMetadata;
  chapterPauseMs?: number;
  clearHighlight: () => void;
  getDoc: () => Document | null;
  getVisibleRange?: () => Range | null;
  highlightRange: (range: Range) => void;
  initialPitch?: number;
  initialRate?: number;
  onNextChapter?: () => Promise<boolean>;
  onPrevChapter?: () => Promise<boolean>;
  paragraphPauseMs?: number;
  revealRange?: (range: Range) => void;
  sentencePauseMs?: number;
  voiceURI?: string | null;
}

interface SentenceItem {
  isParagraphEnd?: boolean;
  range: Range;
  text: string;
}

export class FoliateTTSController {
  private options: TTSControllerOptions;
  private isPlaying = false;
  private isPaused = false;
  private currentSentence: string | null = null;
  private currentIndex = 0;
  private sentences: SentenceItem[] = [];
  private rate = 1.0;
  private pitch = 1.0;
  private voiceURI: string | null = null;
  private paragraphPauseMs = 350;
  private sentencePauseMs = 60;
  private chapterPauseMs = 800;
  private pauseTimeout: ReturnType<typeof setTimeout> | null = null;
  private playback: SpeechPlayback | null = null;
  private engine: SpeechEngine = systemSpeechEngine;
  private listeners = new Set<(state: TTSControllerState) => void>();
  private mediaSessionController: MediaSessionController;
  private destroyed = false;
  private consecutiveErrors = 0;
  private lastError: string | null = null;

  constructor(options: TTSControllerOptions) {
    this.options = options;
    if (options.initialRate !== undefined) this.rate = options.initialRate;
    if (options.initialPitch !== undefined) this.pitch = options.initialPitch;
    if (options.voiceURI !== undefined) this.voiceURI = options.voiceURI;
    if (options.paragraphPauseMs !== undefined) this.paragraphPauseMs = options.paragraphPauseMs;
    if (options.sentencePauseMs !== undefined) this.sentencePauseMs = options.sentencePauseMs;
    if (options.chapterPauseMs !== undefined) this.chapterPauseMs = options.chapterPauseMs;

    this.mediaSessionController = new MediaSessionController();
    this.setupMediaSession();
    if (options.bookMetadata) {
      this.mediaSessionController.updateMetadata(options.bookMetadata);
    }
  }

  public getMediaSessionController(): MediaSessionController {
    return this.mediaSessionController;
  }

  public setBookMetadata(meta: TTSBookMetadata): void {
    this.options.bookMetadata = meta;
    this.mediaSessionController.updateMetadata(meta);
  }

  private setupMediaSession(): void {
    this.mediaSessionController.setActionHandlers({
      onPlay: () => {
        if (this.isPaused) {
          this.resume();
        } else if (!this.isPlaying) {
          void this.start(true);
        }
      },
      onPause: () => {
        this.pause();
      },
      onNext: () => {
        this.next();
      },
      onPrevious: () => {
        this.prev();
      },
    });
  }

  public getState(): TTSControllerState {
    return {
      currentSentence: this.currentSentence,
      currentIndex: this.currentIndex,
      error: this.lastError,
      isPaused: this.isPaused,
      isPlaying: this.isPlaying,
      rate: this.rate,
      totalSentences: this.sentences.length,
    };
  }

  public subscribe(listener: (state: TTSControllerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(3.0, rate));
    if (this.isPlaying && !this.isPaused) {
      // Restart current sentence with new rate
      this.speakCurrentSentence();
    } else {
      this.notify();
    }
  }

  public setPitch(pitch: number): void {
    this.pitch = Math.max(0.5, Math.min(2, pitch));
    if (this.isPlaying && !this.isPaused && this.engine.id === "system") this.speakCurrentSentence();
  }

  public setEngine(engine: SpeechEngine): void {
    if (engine === this.engine) return;
    const wasActive = this.isPlaying && !this.isPaused;
    this.playback?.cancel();
    this.playback = null;
    this.engine.stopAll();
    this.engine = engine;
    if (wasActive) this.speakCurrentSentence();
  }

  public getEngine(): SpeechEngine {
    return this.engine;
  }

  public setVoice(voiceURI: string | null): void {
    this.voiceURI = voiceURI;
    if (this.isPlaying && !this.isPaused) {
      this.speakCurrentSentence();
    }
  }

  public setParagraphPause(ms: number): void {
    this.paragraphPauseMs = Math.max(0, ms);
  }

  public setSentencePause(ms: number): void {
    this.sentencePauseMs = Math.max(0, ms);
  }

  public setChapterPause(ms: number): void {
    this.chapterPauseMs = Math.max(0, ms);
  }

  public getParagraphPause(): number {
    return this.paragraphPauseMs;
  }

  public getSentencePause(): number {
    return this.sentencePauseMs;
  }

  public getChapterPause(): number {
    return this.chapterPauseMs;
  }

  public getSentences(): ReadonlyArray<SentenceItem> {
    return this.sentences;
  }

  public async start(fromCurrentLocation: boolean = true): Promise<void> {
    if (this.destroyed) return;
    this.consecutiveErrors = 0;
    this.lastError = null;
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    this.extractSentences();

    if (this.sentences.length === 0) {
      // Try next chapter if current is empty
      if (this.options.onNextChapter) {
        const hasNext = await this.options.onNextChapter();
        if (hasNext) {
          this.extractSentences();
        }
      }
      if (this.sentences.length === 0) {
        this.stop();
        return;
      }
    }

    this.currentIndex = fromCurrentLocation ? this.resolveStartingIndex() : 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.speakCurrentSentence();
  }

  public pause(): void {
    if (!this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    this.mediaSessionController.setPlaybackState("paused");
    this.playback?.pause();
    this.notify();
  }

  public resume(): void {
    if (!this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    this.mediaSessionController.setPlaybackState("playing");
    if (!this.playback?.resume()) this.speakCurrentSentence();
    this.notify();
  }

  public stop(): void {
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentSentence = null;
    this.playback?.cancel();
    this.playback = null;
    this.engine.stopAll();
    this.mediaSessionController.setPlaybackState("none");
    this.options.clearHighlight();
    this.notify();
  }

  public next(): void {
    if (this.destroyed) return;
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    if (this.currentIndex + 1 < this.sentences.length) {
      this.currentIndex += 1;
      this.speakCurrentSentence();
    } else if (this.options.onNextChapter) {
      void this.advanceChapter(true);
    } else {
      this.stop();
    }
  }

  public prev(): void {
    if (this.destroyed) return;
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.speakCurrentSentence();
    } else if (this.options.onPrevChapter) {
      void this.advanceChapter(false);
    }
  }

  private async advanceChapter(forward: boolean): Promise<void> {
    const handler = forward ? this.options.onNextChapter : this.options.onPrevChapter;
    if (!handler) {
      this.stop();
      return;
    }
    const success = await handler();
    if (success && !this.destroyed && this.isPlaying) {
      setTimeout(() => {
        if (this.destroyed || !this.isPlaying) return;
        this.extractSentences();
        this.currentIndex = forward ? 0 : Math.max(0, this.sentences.length - 1);
        if (this.sentences.length > 0) {
          this.speakCurrentSentence();
        } else {
          this.stop();
        }
      }, this.chapterPauseMs);
    } else {
      this.stop();
    }
  }

  private resolveStartingIndex(): number {
    if (this.sentences.length === 0) return 0;
    const visible = this.options.getVisibleRange?.();
    if (!visible) return 0;
    for (let i = 0; i < this.sentences.length; i++) {
      try {
        if (this.sentences[i]!.range.compareBoundaryPoints(Range.END_TO_START, visible) >= 0) return i;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  public extractSentences(): void {
    const doc = this.options.getDoc();
    this.sentences = doc?.body ? buildSentences(doc) : [];
  }

  private speakCurrentSentence(): void {
    if (this.destroyed || !this.isPlaying) return;
    if (this.currentIndex < 0 || this.currentIndex >= this.sentences.length) {
      this.next();
      return;
    }

    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }

    const item = this.sentences[this.currentIndex];
    this.currentSentence = item.text;

    // Apply visual highlight in overlayer
    try {
      this.options.highlightRange(item.range);
      this.options.revealRange?.(item.range);
    } catch {
      // Safe fallback if range is detached
    }

    this.mediaSessionController.setPlaybackState("playing");
    this.notify();

    this.playback?.cancel();
    const advance = () => {
      if (this.destroyed || !this.isPlaying || this.isPaused) return;
      const delay = item.isParagraphEnd ? this.paragraphPauseMs : this.sentencePauseMs;
      if (delay <= 0) {
        this.next();
        return;
      }
      this.pauseTimeout = setTimeout(() => {
        this.pauseTimeout = null;
        if (!this.destroyed && this.isPlaying && !this.isPaused) this.next();
      }, delay);
    };
    const request = { pitch: this.pitch, rate: this.rate, voice: this.voiceURI };
    this.playback = this.engine.speak({ ...request, text: item.text }, {
      onEnd: () => {
        this.consecutiveErrors = 0;
        this.lastError = null;
        advance();
      },
      onError: () => {
        if (this.destroyed || !this.isPlaying || this.isPaused) return;
        this.consecutiveErrors += 1;
        if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          this.lastError = "The voice stopped responding. Try again or choose another voice.";
          this.stop();
          return;
        }
        this.next();
      },
    });
    const upcoming = this.sentences[this.currentIndex + 1];
    if (upcoming) this.engine.prefetch?.({ ...request, text: upcoming.text });
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    this.mediaSessionController.destroy();
    this.stop();
    this.sentences = [];
    this.listeners.clear();
  }
}

const MAX_CONSECUTIVE_ERRORS = 3;
const BLOCK_SELECTOR = "address, article, aside, blockquote, dd, div, dt, figcaption, footer, h1, h2, h3, h4, h5, h6, header, li, p, pre, section, td, th";
const SKIPPED_SELECTOR = "script, style, noscript, rt, rp, [aria-hidden='true'], [hidden]";
const MAX_UTTERANCE_CHARS = 260;

interface TextSpan {
  end: number;
  node: Text;
  start: number;
}

function findPosition(spans: TextSpan[], offset: number, preferEnd: boolean): { node: Text; offset: number } | null {
  for (const span of spans) {
    if (offset < span.end || (preferEnd && offset === span.end)) {
      return { node: span.node, offset: Math.max(0, offset - span.start) };
    }
  }
  const last = spans[spans.length - 1];
  return last ? { node: last.node, offset: last.end - last.start } : null;
}

function splitLong(text: string, start: number): Array<{ start: number; text: string }> {
  if (text.length <= MAX_UTTERANCE_CHARS) return [{ start, text }];
  const pieces: Array<{ start: number; text: string }> = [];
  let cursor = 0;
  while (cursor < text.length) {
    let cut = Math.min(text.length, cursor + MAX_UTTERANCE_CHARS);
    if (cut < text.length) {
      const window = text.slice(cursor, cut);
      const breakAt = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "), window.lastIndexOf(" — "));
      const spaceAt = window.lastIndexOf(" ");
      cut = cursor + (breakAt > 40 ? breakAt + 1 : spaceAt > 40 ? spaceAt : window.length);
    }
    pieces.push({ start: start + cursor, text: text.slice(cursor, cut) });
    cursor = cut;
  }
  return pieces;
}

export function buildSentences(doc: Document): SentenceItem[] {
  const lang = doc.documentElement.getAttribute("lang") || doc.body.getAttribute("lang") || "en";
  let segmenter: Intl.Segmenter | null = null;
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      segmenter = new Intl.Segmenter(lang, { granularity: "sentence" });
    } catch {
      segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    }
  }

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIPPED_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return node.nodeValue && node.nodeValue.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  const blocks: Array<{ spans: TextSpan[]; text: string }> = [];
  let currentBlock: Element | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    const block = text.parentElement?.closest(BLOCK_SELECTOR) ?? doc.body;
    if (block !== currentBlock || blocks.length === 0) {
      blocks.push({ spans: [], text: "" });
      currentBlock = block;
    }
    const entry = blocks[blocks.length - 1]!;
    const value = text.nodeValue ?? "";
    entry.spans.push({ end: entry.text.length + value.length, node: text, start: entry.text.length });
    entry.text += value;
  }

  const sentences: SentenceItem[] = [];
  for (const block of blocks) {
    if (!block.text.trim()) continue;
    const segments = segmenter
      ? Array.from(segmenter.segment(block.text), (seg) => ({ index: seg.index, text: seg.segment }))
      : Array.from(block.text.matchAll(/[^.!?]+[.!?]*\s*/g), (m) => ({ index: m.index ?? 0, text: m[0] }));
    const blockSentences: SentenceItem[] = [];
    for (const segment of segments) {
      const leading = segment.text.length - segment.text.trimStart().length;
      const trimmed = segment.text.trim();
      if (!trimmed || !/[\p{L}\p{N}]/u.test(trimmed)) continue;
      for (const piece of splitLong(trimmed, segment.index + leading)) {
        const from = findPosition(block.spans, piece.start, false);
        const to = findPosition(block.spans, piece.start + piece.text.length, true);
        if (!from || !to) continue;
        const range = doc.createRange();
        range.setStart(from.node, from.offset);
        range.setEnd(to.node, to.offset);
        blockSentences.push({ range, text: piece.text.replace(/\s+/g, " ") });
      }
    }
    if (blockSentences.length > 0) blockSentences[blockSentences.length - 1]!.isParagraphEnd = true;
    sentences.push(...blockSentences);
  }
  return sentences;
}

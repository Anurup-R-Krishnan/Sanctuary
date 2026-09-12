/**
 * FoliateTTSController: Native, synchronized continuous text-to-speech engine
 * for Sanctuary books.
 *
 * Walks visible document text nodes, segments them into sentences, renders
 * non-destructive SVG highlight marks over the active sentence, and coordinates
 * continuous reading through window.speechSynthesis.
 */

import {
  MediaSessionController,
  type MediaSessionMetadata,
} from "./MediaSessionController";

export type TTSBookMetadata = MediaSessionMetadata;

export interface TTSControllerState {
  currentIndex: number;
  currentSentence: string | null;
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
  highlightRange: (range: Range) => void;
  initialPitch?: number;
  initialRate?: number;
  onNextChapter?: () => Promise<boolean>;
  onPrevChapter?: () => Promise<boolean>;
  paragraphPauseMs?: number;
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
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners = new Set<(state: TTSControllerState) => void>();
  private mediaSessionController: MediaSessionController;
  private destroyed = false;

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
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    this.notify();
  }

  public resume(): void {
    if (!this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    this.mediaSessionController.setPlaybackState("playing");
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        this.speakCurrentSentence();
      }
    }
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
    this.currentUtterance = null;
    this.mediaSessionController.setPlaybackState("none");
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
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
    // If sentences already loaded and there's a visible sentence, find it
    const doc = this.options.getDoc();
    if (!doc || this.sentences.length === 0) return 0;

    for (let i = 0; i < this.sentences.length; i++) {
      const rect = this.sentences[i].range.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < (window.innerHeight || 800)) {
        return i;
      }
    }
    return 0;
  }

  public extractSentences(): void {
    this.sentences = [];
    const doc = this.options.getDoc();
    if (!doc || !doc.body) return;

    const lang = doc.documentElement.getAttribute("lang") || "en";
    let segmenter: Intl.Segmenter | null = null;
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      try {
        segmenter = new Intl.Segmenter(lang, { granularity: "sentence" });
      } catch {
        segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
      }
    }

    const BLOCK_SELECTOR =
      "article, blockquote, div, footer, h1, h2, h3, h4, h5, h6, header, li, p, section";

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "noscript") {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue && node.nodeValue.trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    const textNodes: Text[] = [];
    let curr = walker.nextNode();
    while (curr) {
      textNodes.push(curr as Text);
      curr = walker.nextNode();
    }

    const rawItems: { block: Element | null; range: Range; text: string }[] = [];

    for (const node of textNodes) {
      const fullText = node.nodeValue || "";
      const block = node.parentElement?.closest(BLOCK_SELECTOR) || node.parentElement;
      if (segmenter) {
        const segments = Array.from(segmenter.segment(fullText));
        for (const seg of segments) {
          const str = seg.segment.trim();
          if (str.length === 0) continue;
          const range = doc.createRange();
          range.setStart(node, seg.index);
          range.setEnd(node, seg.index + seg.segment.length);
          rawItems.push({ block, range, text: str });
        }
      } else {
        const parts = fullText.split(/([.!?]+[\s\r\n]+)/);
        let offset = 0;
        for (let i = 0; i < parts.length; i += 2) {
          const sentence = (parts[i] + (parts[i + 1] || "")).trim();
          if (sentence.length > 0) {
            const start = fullText.indexOf(sentence, offset);
            if (start !== -1) {
              const range = doc.createRange();
              range.setStart(node, start);
              range.setEnd(node, start + sentence.length);
              rawItems.push({ block, range, text: sentence });
              offset = start + sentence.length;
            }
          }
        }
      }
    }

    for (let i = 0; i < rawItems.length; i++) {
      const isParagraphEnd =
        i === rawItems.length - 1 || rawItems[i].block !== rawItems[i + 1].block;
      this.sentences.push({
        isParagraphEnd,
        range: rawItems[i].range,
        text: rawItems[i].text,
      });
    }
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
      // Auto-scroll range into visible view
      const elem = item.range.startContainer.parentElement;
      if (elem && typeof elem.scrollIntoView === "function") {
        elem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } catch {
      // Safe fallback if range is detached
    }

    this.mediaSessionController.setPlaybackState("playing");
    this.notify();

    if (
      typeof window === "undefined" ||
      !window.speechSynthesis ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    if (this.voiceURI) {
      const voices = window.speechSynthesis.getVoices?.() || [];
      const match = voices.find((v) => v.voiceURI === this.voiceURI);
      if (match) utterance.voice = match;
    }

    utterance.onend = () => {
      if (!this.destroyed && this.isPlaying && !this.isPaused) {
        const delay = item.isParagraphEnd ? this.paragraphPauseMs : this.sentencePauseMs;
        if (delay > 0) {
          this.pauseTimeout = setTimeout(() => {
            this.pauseTimeout = null;
            if (!this.destroyed && this.isPlaying && !this.isPaused) {
              this.next();
            }
          }, delay);
        } else {
          this.next();
        }
      }
    };

    utterance.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      if (!this.destroyed && this.isPlaying && !this.isPaused) {
        this.next();
      }
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
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

export interface MediaSessionMetadata {
  author?: string;
  chapter?: string;
  coverUrl?: string;
  title: string;
}

export interface MediaSessionActionHandlers {
  onNext?: () => void;
  onPause?: () => void;
  onPlay?: () => void;
  onPrevious?: () => void;
}

/**
 * MediaSessionController bridges Sanctuary's in-book TTS playback to the
 * native browser/OS media subsystem via `navigator.mediaSession`.
 *
 * Exposes book cover, title, author, and chapter on lockscreen, smartwatch,
 * and system overlays, and responds to hardware Bluetooth / media key inputs.
 */
export class MediaSessionController {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable =
      typeof navigator !== "undefined" && "mediaSession" in navigator && !!navigator.mediaSession;
  }

  public isSupported(): boolean {
    return this.isAvailable;
  }

  public updateMetadata(meta: MediaSessionMetadata): void {
    if (!this.isAvailable) return;

    try {
      if (typeof MediaMetadata !== "undefined") {
        const artwork: MediaImage[] = [];
        if (meta.coverUrl) {
          artwork.push({
            src: meta.coverUrl,
            sizes: "512x512",
            type: "image/jpeg",
          });
        }

        navigator.mediaSession.metadata = new MediaMetadata({
          album: meta.chapter || meta.title,
          artist: meta.author || "Sanctuary Reader",
          artwork,
          title: meta.title,
        });
      }
    } catch {
      // Safe fallback if MediaMetadata constructor throws
    }
  }

  public setActionHandlers(handlers: MediaSessionActionHandlers): void {
    if (!this.isAvailable) return;

    const actionMap: Array<{ action: MediaSessionAction; handler?: () => void }> = [
      { action: "play", handler: handlers.onPlay },
      { action: "pause", handler: handlers.onPause },
      { action: "nexttrack", handler: handlers.onNext },
      { action: "previoustrack", handler: handlers.onPrevious },
    ];

    for (const { action, handler } of actionMap) {
      try {
        if (handler) {
          navigator.mediaSession.setActionHandler(action, () => {
            handler();
          });
        } else {
          navigator.mediaSession.setActionHandler(action, null);
        }
      } catch {
        // Ignore unsupported action types on specific platforms
      }
    }
  }

  public setPlaybackState(state: "none" | "paused" | "playing"): void {
    if (!this.isAvailable) return;

    try {
      navigator.mediaSession.playbackState = state;
    } catch {
      // Safe fallback
    }
  }

  public destroy(): void {
    if (!this.isAvailable) return;

    const actions: MediaSessionAction[] = ["play", "pause", "nexttrack", "previoustrack"];
    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // Ignore errors during action unregistration
      }
    }

    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    } catch {
      // Ignore errors resetting media session state
    }
  }
}

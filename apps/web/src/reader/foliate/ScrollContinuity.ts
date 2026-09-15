/**
 * Crosses chapter boundaries automatically while the user scrolls in "Scroll"
 * (continuous) reading mode, so scrolling feels unbroken from the first page
 * of the book to the last instead of stopping dead at the end of each chapter.
 *
 * foliate-js only advances chapters through an explicit next()/prev() call;
 * raw wheel/trackpad/scrollbar scrolling never triggers it on its own. This
 * class watches the renderer's own scroll signal plus wheel/touch input (the
 * only way to detect intent on a chapter shorter than the viewport, or once
 * the container is already scrolled to its end) and calls the renderer's own
 * next()/prev() once the reader has settled at a boundary and then keeps
 * scrolling anyway — reaching the edge alone never crosses it, so the last
 * lines of a chapter stay on screen to actually be read rather than getting
 * yanked away the instant they come into view.
 */

type Direction = 1 | -1;

export interface ScrollContinuityRenderer {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  containerPosition: number;
  readonly end: number;
  next(distance?: number): Promise<void>;
  prev(distance?: number): Promise<void>;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  readonly scrolled: boolean;
  readonly size: number;
  readonly start: number;
  readonly viewSize: number;
}

const BOUNDARY_THRESHOLD_PX = 2;
const SUPPRESS_MS = 400;
const TOUCH_MIN_DELTA_PX = 4;
// Ignore wheel deltas smaller than this — trackpads report tiny, sometimes
// sign-flipped deltaY values as a swipe's inertia decays to a stop, which
// would otherwise read as a deliberate scroll in the wrong direction.
const WHEEL_MIN_DELTA = 3;
// A trackpad's inertial tail keeps firing wheel events tens of ms apart for a
// while after the physical swipe ends; anything closer together than this is
// treated as the same scroll gesture. A gap this size or longer means the
// reader deliberately scrolled again.
const EDGE_GESTURE_GAP_MS = 300;
// Gestures required at a boundary, after arriving, before it's crossed.
const REQUIRED_EDGE_ATTEMPTS = 2;

export class ScrollContinuity {
  private renderer: ScrollContinuityRenderer | null = null;
  private enabled = false;
  private lastStart = 0;
  private lastDirection: Direction | null = null;
  private crossing: Promise<void> | null = null;
  private suppressUntil = 0;
  private touchStartY: number | null = null;
  private edgeDirection: Direction | null = null;
  private edgeAttempts = 0;
  private lastEdgeSignalAt = 0;

  private readonly onScroll = () => {
    if (!this.renderer) return;
    const { start } = this.renderer;
    if (start > this.lastStart) this.lastDirection = 1;
    else if (start < this.lastStart) this.lastDirection = -1;
    this.lastStart = start;
    // A real scroll event only fires while the content is still moving, so
    // it can never be the "scroll again while already pinned" signal this
    // class waits for — it just tracks direction and lets wheel/touch (which
    // keep firing even once the container is maxed out) drive the crossing.
  };

  private readonly onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaY) < WHEEL_MIN_DELTA) return;
    this.lastDirection = e.deltaY > 0 ? 1 : -1;
    this.handleEdgeInput();
  };

  private readonly onTouchStart = (e: TouchEvent) => {
    this.touchStartY = e.touches[0]?.clientY ?? null;
  };

  private readonly onTouchEnd = (e: TouchEvent) => {
    const startY = this.touchStartY;
    this.touchStartY = null;
    if (startY === null) return;
    const endY = e.changedTouches[0]?.clientY ?? startY;
    const dy = startY - endY;
    if (Math.abs(dy) < TOUCH_MIN_DELTA_PX) return;
    this.lastDirection = dy > 0 ? 1 : -1;
    this.handleEdgeInput();
  };

  public attachRenderer(renderer: ScrollContinuityRenderer): void {
    this.detachRenderer();
    this.renderer = renderer;
    this.lastStart = renderer.start;
    renderer.addEventListener("scroll", this.onScroll);
  }

  public detachRenderer(): void {
    this.renderer?.removeEventListener("scroll", this.onScroll);
    this.renderer = null;
  }

  public attachDocument(doc: Document): void {
    doc.addEventListener("wheel", this.onWheel as EventListener, { passive: true });
    doc.addEventListener("touchstart", this.onTouchStart as EventListener, { passive: true });
    doc.addEventListener("touchend", this.onTouchEnd as EventListener, { passive: true });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public noteSectionChange(): void {
    this.suppressUntil = Date.now() + SUPPRESS_MS;
    this.resetEdgeAttempts();
    if (this.renderer) this.lastStart = this.renderer.start;
  }

  private handleEdgeInput(): void {
    if (!this.enabled || !this.renderer || this.crossing) return;
    if (Date.now() < this.suppressUntil) return;
    if (!this.renderer.scrolled) return;
    const dir = this.lastDirection;
    if (dir === null) return;

    const { start, end, viewSize, size } = this.renderer;

    // A section shorter than the viewport (a title page, a part divider) is
    // pinned at start=0 with nothing to scroll — by the pixel math below it
    // is simultaneously "at" both the forward and backward edge, so any
    // scroll input in either direction would otherwise register as an edge
    // attempt regardless of which way the reader actually meant to go. There
    // is also no more of it left to reveal by waiting, so cross on the first
    // clean directional signal instead of arming the two-gesture guard.
    if (viewSize <= size + BOUNDARY_THRESHOLD_PX) {
      this.resetEdgeAttempts();
      this.cross(dir);
      return;
    }

    const atEdge = dir === 1 ? viewSize - end <= BOUNDARY_THRESHOLD_PX : start <= BOUNDARY_THRESHOLD_PX;
    if (!atEdge) {
      this.resetEdgeAttempts();
      return;
    }
    this.registerEdgeAttempt(dir);
  }

  private registerEdgeAttempt(dir: Direction): void {
    const now = Date.now();
    if (this.edgeDirection !== dir) {
      this.edgeDirection = dir;
      this.edgeAttempts = 0;
    }
    const isNewGesture = now - this.lastEdgeSignalAt >= EDGE_GESTURE_GAP_MS;
    this.lastEdgeSignalAt = now;
    if (!isNewGesture) return;

    this.edgeAttempts += 1;
    if (this.edgeAttempts >= REQUIRED_EDGE_ATTEMPTS) {
      this.resetEdgeAttempts();
      this.cross(dir);
    }
  }

  private resetEdgeAttempts(): void {
    this.edgeAttempts = 0;
    this.edgeDirection = null;
  }

  private cross(dir: Direction): void {
    const renderer = this.renderer;
    if (!renderer || this.crossing) return;
    this.crossing = (dir === 1 ? renderer.next() : renderer.prev()).finally(() => {
      this.crossing = null;
      this.suppressUntil = Date.now() + SUPPRESS_MS;
    });
  }

  /**
   * Moves the renderer by `delta` pixels along its scroll axis, bypassing
   * the renderer's own scrollBy(), whose internal bounds go stale after the
   * first viewport and make it unusable for continuous auto-scroll. Returns
   * the pixel distance actually applied. Hands-free auto-scroll crosses a
   * boundary immediately on hitting it rather than waiting for the same
   * "scroll again" confirmation manual scrolling requires — it already moves
   * at a steady, deliberate pace the reader chose, so there's no accidental
   * jump to guard against the way there is with a sudden wheel flick.
   */
  public scrollByPixels(delta: number): number {
    if (!this.renderer || delta === 0 || !this.renderer.scrolled) return 0;
    const { start, viewSize, size, containerPosition } = this.renderer;
    const sign = containerPosition < 0 ? -1 : 1;
    const maxStart = Math.max(0, viewSize - size);
    const targetStart = Math.max(0, Math.min(maxStart, start + delta));
    const applied = targetStart - start;

    if (applied === 0) {
      const dir: Direction = delta > 0 ? 1 : -1;
      this.lastDirection = dir;
      if (this.enabled && Date.now() >= this.suppressUntil) {
        this.cross(dir);
      }
      return 0;
    }

    this.renderer.containerPosition = sign * targetStart;
    return applied;
  }
}

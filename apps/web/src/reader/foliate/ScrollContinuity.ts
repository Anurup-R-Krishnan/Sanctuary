type Direction = 1 | -1;

export type ScrollContinuityMode = "continuous" | "scrolled" | "paginated";

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
const SUPPRESS_MS = 300;
const TOUCH_MIN_DELTA_PX = 4;
const WHEEL_MIN_DELTA = 3;

export class ScrollContinuity {
  private renderer: ScrollContinuityRenderer | null = null;
  private mode: ScrollContinuityMode = "paginated";
  private lastStart = 0;
  private lastDirection: Direction | null = null;
  private crossing: Promise<void> | null = null;
  private suppressUntil = 0;
  private touchStartY: number | null = null;

  private readonly onScroll = () => {
    if (!this.renderer) return;
    const { start, end, viewSize } = this.renderer;
    if (start > this.lastStart) this.lastDirection = 1;
    else if (start < this.lastStart) this.lastDirection = -1;
    this.lastStart = start;

    if (this.mode === "continuous" && viewSize > 0 && Date.now() >= this.suppressUntil && !this.crossing) {
      if (this.lastDirection === 1 && viewSize - end <= BOUNDARY_THRESHOLD_PX) {
        this.cross(1);
      } else if (this.lastDirection === -1 && start <= BOUNDARY_THRESHOLD_PX) {
        this.cross(-1);
      }
    }
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

  public setMode(mode: ScrollContinuityMode): void {
    this.mode = mode;
  }

  public setEnabled(enabled: boolean): void {
    this.mode = enabled ? "continuous" : "paginated";
  }

  public getMode(): ScrollContinuityMode {
    return this.mode;
  }

  public noteSectionChange(): void {
    this.suppressUntil = Date.now() + SUPPRESS_MS;
    if (this.renderer) this.lastStart = this.renderer.start;
  }

  private handleEdgeInput(): void {
    if (this.mode !== "continuous" || !this.renderer || this.crossing) return;
    if (Date.now() < this.suppressUntil) return;
    if (!this.renderer.scrolled) return;
    const dir = this.lastDirection;
    if (dir === null) return;

    const { start, end, viewSize, size } = this.renderer;
    if (viewSize <= size + BOUNDARY_THRESHOLD_PX) {
      this.cross(dir);
      return;
    }

    const atEdge = dir === 1 ? viewSize - end <= BOUNDARY_THRESHOLD_PX : start <= BOUNDARY_THRESHOLD_PX;
    if (atEdge) {
      this.cross(dir);
    }
  }

  private cross(dir: Direction): void {
    const renderer = this.renderer;
    if (!renderer || this.crossing) return;
    this.crossing = (dir === 1 ? renderer.next() : renderer.prev()).finally(() => {
      this.crossing = null;
      this.suppressUntil = Date.now() + SUPPRESS_MS;
    });
  }

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
      if (this.mode === "continuous" && Date.now() >= this.suppressUntil) {
        this.cross(dir);
      }
      return 0;
    }

    this.renderer.containerPosition = sign * targetStart;
    return applied;
  }
}

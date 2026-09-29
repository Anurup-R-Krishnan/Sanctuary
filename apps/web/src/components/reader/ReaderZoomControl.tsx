import { Maximize, Minus, MoveHorizontal, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { type ReaderZoom, ZOOM_WHEEL_EVENT } from "@/reader/foliate/FoliateRendition";
import { cx } from "@/utils/cx";

interface ZoomTarget {
  getEffectiveScale(): number;
  getZoom(): ReaderZoom;
  setZoom(zoom: ReaderZoom): void;
}

interface ReaderZoomControlProps {
  target: ZoomTarget | null;
}

const STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

function nextZoomStep(current: number, direction: 1 | -1): number {
  if (direction > 0) return STEPS.find((step) => step > current + 0.01) ?? STEPS[STEPS.length - 1]!;
  return [...STEPS].reverse().find((step) => step < current - 0.01) ?? STEPS[0]!;
}

export function ReaderZoomControl({ target }: ReaderZoomControlProps) {
  const [zoom, setZoomState] = useState<ReaderZoom>(() => target?.getZoom() ?? "fit-page");

  const apply = useCallback((next: ReaderZoom) => {
    if (!target) return;
    target.setZoom(next);
    setZoomState(next);
  }, [target]);

  const step = useCallback((direction: 1 | -1) => {
    if (!target) return;
    apply(nextZoomStep(target.getEffectiveScale(), direction));
  }, [apply, target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key === "=" || event.key === "+") step(1);
      else if (event.key === "-") step(-1);
      else if (event.key === "0") apply("fit-page");
      else return;
      event.preventDefault();
    };
    let wheelDelta = 0;
    const onWheelDelta = (delta: number) => {
      wheelDelta += delta;
      if (Math.abs(wheelDelta) < 40) return;
      step(wheelDelta < 0 ? 1 : -1);
      wheelDelta = 0;
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onWheelDelta(event.deltaY);
    };
    const onFrameWheel = (event: Event) => onWheelDelta(Number((event as CustomEvent<number>).detail) || 0);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener(ZOOM_WHEEL_EVENT, onFrameWheel);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener(ZOOM_WHEEL_EVENT, onFrameWheel);
    };
  }, [apply, step, target]);

  if (!target) return null;
  const label = zoom === "fit-page" ? "Fit page" : zoom === "fit-width" ? "Fit width" : `${Math.round(zoom * 100)}%`;
  const button = "flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-line/50 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div
      aria-label="Page zoom"
      className="fixed bottom-24 right-4 z-[60] flex items-center gap-0.5 rounded-lg border border-line bg-surface-raised p-1 shadow-paper sm:right-6"
      role="toolbar"
    >
      <button aria-label="Zoom out" className={button} onClick={() => step(-1)} title="Zoom out (Ctrl −)" type="button">
        <Minus className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="min-w-[4.5rem] text-center text-xs font-medium tabular-nums text-fg">{label}</span>
      <button aria-label="Zoom in" className={button} onClick={() => step(1)} title="Zoom in (Ctrl +)" type="button">
        <Plus className="h-4 w-4" />
      </button>
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
      <button aria-label="Fit width" aria-pressed={zoom === "fit-width"} className={cx(button, zoom === "fit-width" && "bg-accent/10 text-accent")} onClick={() => apply("fit-width")} title="Fit width" type="button">
        <MoveHorizontal className="h-4 w-4" />
      </button>
      <button aria-label="Fit page" aria-pressed={zoom === "fit-page"} className={cx(button, zoom === "fit-page" && "bg-accent/10 text-accent")} onClick={() => apply("fit-page")} title="Fit page (Ctrl 0)" type="button">
        <Maximize className="h-4 w-4" />
      </button>
    </div>
  );
}

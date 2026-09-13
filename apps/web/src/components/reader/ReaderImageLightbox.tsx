import {
  Contrast,
  Download,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import type { LightboxImageTarget } from "@/reader/contracts/engine";

export interface ReaderImageLightboxProps {
  image: LightboxImageTarget | null;
  onClose: () => void;
}

export function ReaderImageLightbox({
  image,
  onClose,
}: ReaderImageLightboxProps) {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isInverted, setIsInverted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(position);
  positionRef.current = position;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Reset view state when opening a new image
  useEffect(() => {
    if (image) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsInverted(false);
    }
  }, [image]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(5, Number((prev + 0.25).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(0.5, Number((prev - 0.25).toFixed(2)));
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleToggleInvert = useCallback(() => {
    setIsInverted((prev) => !prev);
  }, []);

  const handleDownload = useCallback(() => {
    if (!image?.src) return;
    const a = document.createElement("a");
    a.href = image.src;
    const filename = (image.title || image.alt || "book-image")
      .replace(/[^a-z0-9_-]/gi, "_")
      .toLowerCase();
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [image]);

  // Native container gesture and wheel listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isPointerDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isPointerDragging = true;
      dragStartX = e.clientX - positionRef.current.x;
      dragStartY = e.clientY - positionRef.current.y;
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // Benign
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDragging) return;
      setPosition({
        x: e.clientX - dragStartX,
        y: e.clientY - dragStartY,
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      isPointerDragging = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // Benign
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    };

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      if (scaleRef.current > 1) {
        handleReset();
      } else {
        setScale(2.5);
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("dblclick", onDblClick);

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("dblclick", onDblClick);
    };
  }, [handleZoomIn, handleZoomOut, handleReset]);

  // Keyboard shortcut listeners
  useEffect(() => {
    if (!image) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleReset();
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        handleToggleInvert();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPosition((p) => ({ ...p, x: p.x + 30 }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPosition((p) => ({ ...p, x: p.x - 30 }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setPosition((p) => ({ ...p, y: p.y + 30 }));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setPosition((p) => ({ ...p, y: p.y - 30 }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    image,
    onClose,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    handleToggleInvert,
  ]);

  if (!image) return null;

  return (
    <div
      aria-label="Image Lightbox"
      aria-modal="true"
      className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex flex-col justify-between select-none animate-fadeIn"
      role="dialog"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur border-b border-white/10 text-white z-10">
        <div className="flex items-center gap-2.5 overflow-hidden mr-4">
          <span className="text-sm font-medium truncate max-w-[60vw]">
            {image.caption || image.title || image.alt || "Image View"}
          </span>
          {image.naturalWidth && image.naturalHeight && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 shrink-0 font-mono">
              {image.naturalWidth} × {image.naturalHeight} px
            </span>
          )}
        </div>

        <button
          aria-label="Close image lightbox"
          className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          onClick={onClose}
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Canvas Viewport */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        ref={containerRef}
      >
        <img
          alt={image.alt || image.caption || "Expanded view"}
          className="max-w-[90vw] max-h-[80vh] object-contain transition-transform duration-75 pointer-events-none drop-shadow-2xl"
          src={image.src}
          style={{
            filter: isInverted ? "invert(1) hue-rotate(180deg)" : "none",
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        />
      </div>

      {/* Bottom Floating Controls Bar */}
      <div className="flex items-center justify-center p-4 z-10">
        <div className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-white/15 text-white shadow-2xl backdrop-blur-xl">
          <button
            aria-label="Zoom out"
            className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/80 hover:text-white"
            onClick={handleZoomOut}
            title="Zoom out (-)"
            type="button"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            aria-label="Reset zoom to 100%"
            className="px-2 py-1 text-xs font-mono font-medium rounded-md hover:bg-white/10 text-white/90 hover:text-white transition-colors"
            onClick={handleReset}
            title="Reset zoom (0)"
            type="button"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            aria-label="Zoom in"
            className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/80 hover:text-white"
            onClick={handleZoomIn}
            title="Zoom in (+)"
            type="button"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/20 mx-0.5" />

          <button
            aria-label="Reset position and fit"
            className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/80 hover:text-white"
            onClick={handleReset}
            title="Fit to screen"
            type="button"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            aria-label="Invert colors for dark diagrams"
            className={`p-2 rounded-full active:scale-90 transition-all ${
              isInverted
                ? "bg-light-accent dark:bg-dark-accent text-white"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
            onClick={handleToggleInvert}
            title="Invert colors (I)"
            type="button"
          >
            <Contrast className="w-4 h-4" />
          </button>

          <button
            aria-label="Download image"
            className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/80 hover:text-white"
            onClick={handleDownload}
            title="Download image"
            type="button"
          >
            <Download className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/20 mx-0.5" />

          <button
            aria-label="Close lightbox"
            className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/80 hover:text-white"
            onClick={onClose}
            title="Close (Esc)"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

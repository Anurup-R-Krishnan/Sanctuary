import { beforeAll, describe, expect, it, mock } from "bun:test";

import { ScrollContinuity, type ScrollContinuityRenderer } from "./ScrollContinuity";
import { ensureTestDom } from "./testEnv";

beforeAll(() => {
  ensureTestDom();
});

function createMockRenderer(initial: Partial<ScrollContinuityRenderer> = {}): ScrollContinuityRenderer & {
  end: number;
  listeners: Record<string, EventListenerOrEventListenerObject[]>;
  nextMock: ReturnType<typeof mock>;
  prevMock: ReturnType<typeof mock>;
  start: number;
} {
  const listeners: Record<string, EventListenerOrEventListenerObject[]> = {};
  const nextMock = mock(() => Promise.resolve());
  const prevMock = mock(() => Promise.resolve());

  const mockRenderer = {
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(listener);
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((l) => l !== listener);
      }
    },
    containerPosition: 0,
    end: 500,
    listeners,
    next: nextMock,
    nextMock,
    prev: prevMock,
    prevMock,
    scrolled: true,
    size: 500,
    start: 0,
    viewSize: 1000,
    ...initial,
  };

  return mockRenderer;
}

describe("ScrollContinuity", () => {
  it("defaults to paginated mode and handles setMode/setEnabled", () => {
    const sc = new ScrollContinuity();
    expect(sc.getMode()).toBe("paginated");

    sc.setMode("continuous");
    expect(sc.getMode()).toBe("continuous");

    sc.setMode("scrolled");
    expect(sc.getMode()).toBe("scrolled");

    sc.setEnabled(true);
    expect(sc.getMode()).toBe("continuous");

    sc.setEnabled(false);
    expect(sc.getMode()).toBe("paginated");
  });

  it("scrolls within bounds and returns delta applied", () => {
    const sc = new ScrollContinuity();
    const renderer = createMockRenderer({
      containerPosition: 0,
      end: 500,
      size: 500,
      start: 0,
      viewSize: 1500,
    });
    sc.attachRenderer(renderer);
    sc.setMode("continuous");

    const applied = sc.scrollByPixels(120);
    expect(applied).toBe(120);
    expect(renderer.containerPosition).toBe(120);
  });

  it("triggers cross(1) when scrolling past the bottom boundary in continuous mode", () => {
    const sc = new ScrollContinuity();
    const renderer = createMockRenderer({
      containerPosition: 1000,
      end: 1500,
      size: 500,
      start: 1000,
      viewSize: 1500,
    });
    sc.attachRenderer(renderer);
    sc.setMode("continuous");

    const applied = sc.scrollByPixels(50);
    expect(applied).toBe(0);
    expect(renderer.nextMock).toHaveBeenCalledTimes(1);
    expect(renderer.prevMock).toHaveBeenCalledTimes(0);
  });

  it("triggers cross(-1) when scrolling past the top boundary in continuous mode", () => {
    const sc = new ScrollContinuity();
    const renderer = createMockRenderer({
      containerPosition: 0,
      end: 500,
      size: 500,
      start: 0,
      viewSize: 1500,
    });
    sc.attachRenderer(renderer);
    sc.setMode("continuous");

    const applied = sc.scrollByPixels(-50);
    expect(applied).toBe(0);
    expect(renderer.prevMock).toHaveBeenCalledTimes(1);
    expect(renderer.nextMock).toHaveBeenCalledTimes(0);
  });

  it("does not cross chapter boundaries in scrolled mode", () => {
    const sc = new ScrollContinuity();
    const renderer = createMockRenderer({
      containerPosition: 1000,
      end: 1500,
      size: 500,
      start: 1000,
      viewSize: 1500,
    });
    sc.attachRenderer(renderer);
    sc.setMode("scrolled");

    const applied = sc.scrollByPixels(50);
    expect(applied).toBe(0);
    expect(renderer.nextMock).toHaveBeenCalledTimes(0);
    expect(renderer.prevMock).toHaveBeenCalledTimes(0);
  });

  it("does not cross chapter boundaries in paginated mode", () => {
    const sc = new ScrollContinuity();
    const renderer = createMockRenderer({
      containerPosition: 1000,
      end: 1500,
      size: 500,
      start: 1000,
      viewSize: 1500,
    });
    sc.attachRenderer(renderer);
    sc.setMode("paginated");

    const applied = sc.scrollByPixels(50);
    expect(applied).toBe(0);
    expect(renderer.nextMock).toHaveBeenCalledTimes(0);
    expect(renderer.prevMock).toHaveBeenCalledTimes(0);
  });

  it("crosses on native scroll event at bottom edge in continuous mode", () => {
    const sc = new ScrollContinuity();
    const renderer = createMockRenderer({
      end: 1400,
      size: 500,
      start: 900,
      viewSize: 1500,
    });
    sc.attachRenderer(renderer);
    sc.setMode("continuous");

    renderer.start = 1000;
    renderer.end = 1500;
    const scrollListener = renderer.listeners["scroll"]?.[0] as EventListener;
    expect(scrollListener).toBeDefined();

    scrollListener(new Event("scroll"));
    expect(renderer.nextMock).toHaveBeenCalledTimes(1);
  });

  it("handles short sections smaller than viewport by crossing in continuous mode", () => {
    const sc = new ScrollContinuity();
    const renderer = createMockRenderer({
      end: 300,
      size: 500,
      start: 0,
      viewSize: 300,
    });
    sc.attachRenderer(renderer);
    sc.setMode("continuous");

    const doc = document.createElement("div");
    sc.attachDocument(doc as unknown as Document);

    const WheelEventCtor = (window as unknown as { WheelEvent?: typeof WheelEvent }).WheelEvent;
    const wheelEvent = WheelEventCtor
      ? new WheelEventCtor("wheel", { deltaY: 20 })
      : Object.assign(new Event("wheel"), { deltaY: 20 });

    doc.dispatchEvent(wheelEvent);
    expect(renderer.nextMock).toHaveBeenCalledTimes(1);
  });
});

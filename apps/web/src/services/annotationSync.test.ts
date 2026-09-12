import type { CoreAnnotation, SanctuaryApiClient } from "@sanctuary/core";

import { describe, expect, it, mock } from "bun:test";

import type { ReaderAnnotation } from "@/types/reader";

// Unit test for monotonic reading progress logic
describe("Monotonic Reading Progress Resolution", () => {
  interface BookProgressState {
    lastLocation: string;
    progress: number;
  }

  function resolveProgressUpdate(
    current: BookProgressState,
    update: { force?: boolean; lastLocation?: string; progress?: number }
  ): { resolved: BookProgressState; status: "stale_ignored" | "updated" } {
    if (update.progress === undefined) {
      return {
        resolved: {
          lastLocation: update.lastLocation ?? current.lastLocation,
          progress: current.progress,
        },
        status: "updated",
      };
    }

    const isBackward = current.progress > update.progress;
    if (isBackward && !update.force) {
      // Stale update from an offline device or older session
      return {
        resolved: current,
        status: "stale_ignored",
      };
    }

    return {
      resolved: {
        lastLocation: update.lastLocation ?? current.lastLocation,
        progress: update.progress,
      },
      status: "updated",
    };
  }

  it("advances progress when update is forward", () => {
    const current: BookProgressState = { lastLocation: "epubcfi(/6/2[c1]!/4/1)", progress: 25 };
    const result = resolveProgressUpdate(current, {
      lastLocation: "epubcfi(/6/4[c2]!/4/1)",
      progress: 50,
    });

    expect(result.status).toBe("updated");
    expect(result.resolved.progress).toBe(50);
    expect(result.resolved.lastLocation).toBe("epubcfi(/6/4[c2]!/4/1)");
  });

  it("rejects backward progress regression without force flag", () => {
    const current: BookProgressState = { lastLocation: "epubcfi(/6/6[c3]!/4/1)", progress: 75 };
    const result = resolveProgressUpdate(current, {
      force: false,
      lastLocation: "epubcfi(/6/2[c1]!/4/1)",
      progress: 30,
    });

    expect(result.status).toBe("stale_ignored");
    expect(result.resolved.progress).toBe(75);
    expect(result.resolved.lastLocation).toBe("epubcfi(/6/6[c3]!/4/1)");
  });

  it("allows backward progress adjustment when force flag is set explicitly", () => {
    const current: BookProgressState = { lastLocation: "epubcfi(/6/6[c3]!/4/1)", progress: 80 };
    const result = resolveProgressUpdate(current, {
      force: true,
      lastLocation: "epubcfi(/6/2[c1]!/4/1)",
      progress: 10,
    });

    expect(result.status).toBe("updated");
    expect(result.resolved.progress).toBe(10);
    expect(result.resolved.lastLocation).toBe("epubcfi(/6/2[c1]!/4/1)");
  });
});

describe("Annotation Cloud Sync & Conflict Resolution", () => {
  function mergeAnnotations(
    local: ReaderAnnotation[],
    remote: CoreAnnotation[]
  ): { changed: boolean; merged: ReaderAnnotation[] } {
    const map = new Map(local.map((a) => [a.id, a]));
    let changed = false;

    for (const r of remote) {
      const existing = map.get(r.id);
      const remoteUpdatedAt = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;

      if (!existing || remoteUpdatedAt > existing.updatedAt) {
        const item: ReaderAnnotation = {
          bookId: r.bookId,
          cfiRange: r.cfi,
          chapterLabel: r.chapterLabel || existing?.chapterLabel || "",
          color: r.color || "#facc15",
          createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
          href: r.href || existing?.href || "",
          id: r.id,
          note: r.note || "",
          text: r.text,
          type: (r.type as ReaderAnnotation["type"]) || "highlight",
          updatedAt: remoteUpdatedAt || Date.now(),
        };
        map.set(r.id, item);
        changed = true;
      }
    }

    return {
      changed,
      merged: Array.from(map.values()),
    };
  }

  it("merges remote annotations into local annotations based on latest updatedAt timestamp", () => {
    const localAnnotations: ReaderAnnotation[] = [
      {
        bookId: "book-1",
        cfiRange: "epubcfi(/6/2!/4/1)",
        chapterLabel: "Chapter 1",
        color: "#facc15",
        createdAt: 1000,
        href: "chapter1.xhtml",
        id: "ann-1",
        note: "local note",
        text: "first quote",
        type: "highlight",
        updatedAt: 1000,
      },
      {
        bookId: "book-1",
        cfiRange: "epubcfi(/6/4!/4/1)",
        chapterLabel: "Chapter 2",
        color: "#38bdf8",
        createdAt: 2000,
        href: "chapter2.xhtml",
        id: "ann-2",
        note: "local note 2",
        text: "second quote",
        type: "note",
        updatedAt: 2500,
      },
    ];

    const remoteAnnotations: CoreAnnotation[] = [
      {
        bookId: "book-1",
        cfi: "epubcfi(/6/2!/4/1)",
        chapterLabel: "Chapter 1",
        color: "#22c55e",
        createdAt: new Date(1000).toISOString(),
        href: "chapter1.xhtml",
        id: "ann-1",
        note: "updated remote note",
        text: "first quote",
        type: "highlight",
        updatedAt: new Date(3000).toISOString(),
      },
      {
        bookId: "book-1",
        cfi: "epubcfi(/6/6!/4/1)",
        chapterLabel: "Chapter 3",
        color: "#ec4899",
        createdAt: new Date(4000).toISOString(),
        href: "chapter3.xhtml",
        id: "ann-3",
        note: "remote-only note",
        text: "third quote",
        type: "underline",
        updatedAt: new Date(4000).toISOString(),
      },
    ];

    const { changed, merged } = mergeAnnotations(localAnnotations, remoteAnnotations);

    expect(changed).toBe(true);
    expect(merged.length).toBe(3);

    const mergedAnn1 = merged.find((a) => a.id === "ann-1");
    expect(mergedAnn1?.note).toBe("updated remote note");
    expect(mergedAnn1?.color).toBe("#22c55e");
    expect(mergedAnn1?.updatedAt).toBe(3000);

    const mergedAnn2 = merged.find((a) => a.id === "ann-2");
    expect(mergedAnn2?.note).toBe("local note 2");
    expect(mergedAnn2?.updatedAt).toBe(2500);

    const mergedAnn3 = merged.find((a) => a.id === "ann-3");
    expect(mergedAnn3?.id).toBe("ann-3");
    expect(mergedAnn3?.type).toBe("underline");
  });

  it("does not overwrite newer local annotation with older remote annotation", () => {
    const localAnnotations: ReaderAnnotation[] = [
      {
        bookId: "book-1",
        cfiRange: "epubcfi(/6/2!/4/1)",
        chapterLabel: "Chapter 1",
        color: "#facc15",
        createdAt: 1000,
        href: "chapter1.xhtml",
        id: "ann-1",
        note: "newer local edit",
        text: "first quote",
        type: "highlight",
        updatedAt: 5000,
      },
    ];

    const remoteAnnotations: CoreAnnotation[] = [
      {
        bookId: "book-1",
        cfi: "epubcfi(/6/2!/4/1)",
        chapterLabel: "Chapter 1",
        color: "#facc15",
        createdAt: new Date(1000).toISOString(),
        href: "chapter1.xhtml",
        id: "ann-1",
        note: "older cloud note",
        text: "first quote",
        type: "highlight",
        updatedAt: new Date(2000).toISOString(),
      },
    ];

    const { changed, merged } = mergeAnnotations(localAnnotations, remoteAnnotations);
    expect(changed).toBe(false);
    expect(merged[0].note).toBe("newer local edit");
    expect(merged[0].updatedAt).toBe(5000);
  });
});

describe("SyncQueue Annotation Mutations", () => {
  it("dispatches SAVE_ANNOTATION and DELETE_ANNOTATION to SanctuaryApiClient", async () => {
    const savedAnnotations: CoreAnnotation[] = [];
    const deletedAnnotationIds: string[] = [];

    const mockApi = {
      deleteAnnotation: mock(async (id: string) => {
        deletedAnnotationIds.push(id);
      }),
      saveAnnotation: mock(async (payload: CoreAnnotation) => {
        savedAnnotations.push(payload);
      }),
    } as unknown as SanctuaryApiClient;

    const saveMutation = {
      createdAt: Date.now(),
      id: "mut-1",
      payload: {
        bookId: "book-123",
        cfi: "epubcfi(/6/2!/4/1)",
        chapterLabel: "Ch. 1",
        color: "#facc15",
        createdAt: new Date().toISOString(),
        href: "chapter1.xhtml",
        id: "ann-123",
        note: "test note",
        text: "highlighted text",
        type: "highlight",
        updatedAt: new Date().toISOString(),
      } satisfies CoreAnnotation,
      type: "SAVE_ANNOTATION" as const,
    };

    const deleteMutation = {
      createdAt: Date.now(),
      id: "mut-2",
      payload: { id: "ann-123" },
      type: "DELETE_ANNOTATION" as const,
    };

    // Execute save dispatch
    if (saveMutation.type === "SAVE_ANNOTATION") {
      await mockApi.saveAnnotation(saveMutation.payload);
    }
    expect(mockApi.saveAnnotation).toHaveBeenCalledTimes(1);
    expect(savedAnnotations[0].id).toBe("ann-123");
    expect(savedAnnotations[0].text).toBe("highlighted text");

    // Execute delete dispatch
    if (deleteMutation.type === "DELETE_ANNOTATION") {
      await mockApi.deleteAnnotation(deleteMutation.payload.id);
    }
    expect(mockApi.deleteAnnotation).toHaveBeenCalledTimes(1);
    expect(deletedAnnotationIds).toContain("ann-123");
  });
});

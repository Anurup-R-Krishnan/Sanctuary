import { describe, expect, it } from "bun:test";

import type { SyncMutation } from "@/utils/db";

import { coalesceMutations } from "./SyncQueue";

describe("SyncQueue Offline Mutation Coalescing", () => {
  it("returns unchanged list when empty or containing single mutation", () => {
    expect(coalesceMutations([]).coalesced).toEqual([]);
    expect(coalesceMutations([]).obsoleteIds).toEqual([]);

    const single: SyncMutation = {
      createdAt: 1000,
      id: "mut-1",
      payload: { theme: "sepia" },
      type: "SAVE_SETTINGS",
    };
    const res = coalesceMutations([single]);
    expect(res.coalesced).toEqual([single]);
    expect(res.obsoleteIds).toEqual([]);
  });

  it("coalesces rapid consecutive SAVE_SETTINGS into the newest snapshot", () => {
    const mut1: SyncMutation = {
      createdAt: 1000,
      id: "mut-1",
      payload: { fontSize: 16 },
      type: "SAVE_SETTINGS",
    };
    const mut2: SyncMutation = {
      createdAt: 1001,
      id: "mut-2",
      payload: { fontSize: 18 },
      type: "SAVE_SETTINGS",
    };
    const mut3: SyncMutation = {
      createdAt: 1002,
      id: "mut-3",
      payload: { fontSize: 20 },
      type: "SAVE_SETTINGS",
    };

    const { coalesced, obsoleteIds } = coalesceMutations([mut1, mut2, mut3]);
    expect(coalesced.length).toBe(1);
    expect(coalesced[0].id).toBe("mut-3");
    expect(coalesced[0].payload).toEqual({ fontSize: 20 });
    expect(obsoleteIds).toEqual(["mut-1", "mut-2"]);
  });

  it("merges multiple PATCH_LIBRARY mutations for the same book into a combined payload", () => {
    const patch1: SyncMutation = {
      createdAt: 1000,
      id: "patch-1",
      payload: { data: { progress: 25 }, id: "book-abc" },
      type: "PATCH_LIBRARY",
    };
    const patch2: SyncMutation = {
      createdAt: 1010,
      id: "patch-2",
      payload: { data: { lastLocation: "epubcfi(/6/4)" }, id: "book-abc" },
      type: "PATCH_LIBRARY",
    };
    const patch3: SyncMutation = {
      createdAt: 1020,
      id: "patch-3",
      payload: { data: { progress: 30 }, id: "book-abc" },
      type: "PATCH_LIBRARY",
    };

    const { coalesced, obsoleteIds } = coalesceMutations([patch1, patch2, patch3]);
    expect(coalesced.length).toBe(1);
    expect(coalesced[0].id).toBe("patch-3");
    expect(coalesced[0].payload).toEqual({
      data: {
        lastLocation: "epubcfi(/6/4)",
        progress: 30,
      },
      id: "book-abc",
    });
    expect(obsoleteIds).toEqual(["patch-1", "patch-2"]);
  });

  it("keeps PATCH_LIBRARY mutations for different books separate", () => {
    const patchA: SyncMutation = {
      createdAt: 1000,
      id: "patch-a",
      payload: { data: { progress: 10 }, id: "book-a" },
      type: "PATCH_LIBRARY",
    };
    const patchB: SyncMutation = {
      createdAt: 1010,
      id: "patch-b",
      payload: { data: { progress: 50 }, id: "book-b" },
      type: "PATCH_LIBRARY",
    };

    const { coalesced, obsoleteIds } = coalesceMutations([patchA, patchB]);
    expect(coalesced.length).toBe(2);
    expect(coalesced[0].id).toBe("patch-a");
    expect(coalesced[1].id).toBe("patch-b");
    expect(obsoleteIds).toEqual([]);
  });

  it("discards prior PATCH_LIBRARY if a subsequent DELETE_LIBRARY for the same book is queued", () => {
    const patch: SyncMutation = {
      createdAt: 1000,
      id: "patch-1",
      payload: { data: { progress: 15 }, id: "book-del" },
      type: "PATCH_LIBRARY",
    };
    const del: SyncMutation = {
      createdAt: 1020,
      id: "del-1",
      payload: { id: "book-del" },
      type: "DELETE_LIBRARY",
    };

    const { coalesced, obsoleteIds } = coalesceMutations([patch, del]);
    expect(coalesced.length).toBe(1);
    expect(coalesced[0].id).toBe("del-1");
    expect(obsoleteIds).toEqual(["patch-1"]);
  });
});

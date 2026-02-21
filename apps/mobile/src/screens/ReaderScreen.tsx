import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Animated, Platform, View, StyleSheet } from "react-native";
import type { ReadingSessionV2 } from "@sanctuary/core";
import { LinearGradient } from "expo-linear-gradient";
import { TopBar } from "../components/TopBar";
import { ReaderPanel } from "../components/ReaderPanel";
import { ReaderWebView } from "../reader/ReaderWebView";
import type { ReaderBridgeHandle } from "../reader/ReaderWebView";
import { ReaderHeader } from "./reader/components/ReaderHeader";
import { ReaderStatusRows } from "./reader/components/ReaderStatusRows";
import { ReaderOverlays } from "./reader/components/ReaderOverlays";
import { useAppStore } from "../state/useAppStore";
import { theme } from "../theme/tokens";
import { api } from "../services/api";
import { createProgressSyncQueue } from "../services/progressSync";
import { createSessionSyncQueue } from "../services/sessionSync";
import { loadGoalsWithFallback } from "../services/goals";
import { loadLibraryWithFallback } from "../services/library";
import {
  findNextChapterLabel,
  toProgressSnapshot,
  updatePaceAndReadingTimeMinutes,
  type RelocationPayload
} from "./reader/readerLogic";

interface ActiveSession {
  id: string;
  bookId: string;
  startedAtMs: number;
  startPage: number;
  lastPage: number;
}

function createSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ReaderScreen() {
  const mode = useAppStore((s) => s.theme);
  const palette = theme[mode];
  const selectedBookId = useAppStore((s) => s.selectedBookId);
  const selected = useAppStore((s) => s.library.find((b) => b.id === selectedBookId));
  const updateBookProgress = useAppStore((s) => s.updateBookProgress);
  const setLibrary = useAppStore((s) => s.setLibrary);
  const goals = useAppStore((s) => s.goals);
  const goalsStale = useAppStore((s) => s.goalsStale);
  const setGoals = useAppStore((s) => s.setGoals);
  const [chapterTitle, setChapterTitle] = useState("");
  const [bookmarkItems, setBookmarkItems] = useState<Array<{ cfi: string; title: string }>>([]);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "error">("idle");
  const [sessionSyncState, setSessionSyncState] = useState<"idle" | "syncing" | "error">("idle");
  const [readerError, setReaderError] = useState<string | null>(null);
  const [readingTime, setReadingTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [panelMode, setPanelMode] = useState<"toc" | "bookmarks" | null>(null);
  const [tocItems, setTocItems] = useState<Array<{ href: string; label: string }>>([]);
  const [chapterPreview, setChapterPreview] = useState<string | null>(null);
  const syncRef = useRef(
    createProgressSyncQueue({
      client: api,
      onStateChange: (state) => setSyncState(state)
    })
  );
  const sessionSyncRef = useRef(
    createSessionSyncQueue({
      client: api,
      onStateChange: (state) => setSessionSyncState(state)
    })
  );
  const activeSessionRef = useRef<ActiveSession | null>(null);
  const lastRelocationRef = useRef<{ atMs: number; page: number; totalPages: number; href?: string }>({
    atMs: 0,
    page: 1,
    totalPages: 1
  });
  const pacePagesPerMinuteRef = useRef(1.6);
  const selectedRef = useRef(selected);
  const readerRef = useRef<ReaderBridgeHandle>(null);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8788";
  const bookUrl = useMemo(() => (selected ? `${apiBase}/api/content/${selected.id}` : null), [selected, apiBase]);

  useEffect(() => {
    setBookmarkItems(selected?.bookmarks || []);
  }, [selected?.id, selected?.bookmarks]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 4200,
          useNativeDriver: true
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 4200,
          useNativeDriver: true
        })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(particleAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true
        }),
        Animated.timing(particleAnim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [shimmerAnim, particleAnim]);

  const beginSession = (bookId: string, page: number) => {
    const safePage = Math.max(1, Math.round(page || 1));
    activeSessionRef.current = {
      id: createSessionId(),
      bookId,
      startedAtMs: Date.now(),
      startPage: safePage,
      lastPage: safePage
    };
  };

  const finalizeActiveSession = () => {
    const session = activeSessionRef.current;
    if (!session) return;
    activeSessionRef.current = null;
    const endedAtMs = Date.now();
    const durationSec = Math.max(0, Math.round((endedAtMs - session.startedAtMs) / 1000));
    const pagesAdvanced = Math.max(0, Math.round(session.lastPage - session.startPage));
    if (durationSec < 5 && pagesAdvanced <= 0) return;
    const payload: ReadingSessionV2 = {
      id: session.id,
      bookId: session.bookId,
      startedAt: new Date(session.startedAtMs).toISOString(),
      endedAt: new Date(endedAtMs).toISOString(),
      durationSec,
      pagesAdvanced,
      device: Platform.OS === "web" ? "web" : "android"
    };
    sessionSyncRef.current.enqueue(payload);
  };

  const handleRelocated = (data: RelocationPayload) => {
    if (!selected) return;
    const snapshot = toProgressSnapshot(data);
    updateBookProgress(selected.id, snapshot.progressPercent, data.cfi);
    setChapterTitle(data.chapterTitle || "");

    const nowMs = Date.now();
    const { nextPace, readingTimeMinutes } = updatePaceAndReadingTimeMinutes(
      lastRelocationRef.current,
      nowMs,
      snapshot.page,
      snapshot.totalPages,
      pacePagesPerMinuteRef.current
    );
    pacePagesPerMinuteRef.current = nextPace;
    setReadingTime(readingTimeMinutes);
    setCurrentPage(snapshot.page);
    setTotalPages(snapshot.totalPages);
    lastRelocationRef.current = { atMs: nowMs, page: snapshot.page, totalPages: snapshot.totalPages, href: data.href };

    syncRef.current.enqueue({
      id: selected.id,
      title: selected.title,
      author: selected.author,
      progress: snapshot.page,
      totalPages: snapshot.totalPages,
      lastLocation: data.cfi
    });
    const active = activeSessionRef.current;
    if (active && active.bookId === selected.id) {
      active.lastPage = Math.max(active.lastPage, snapshot.page);
    }

    setChapterPreview(findNextChapterLabel(tocItems, data.href, data.chapterTitle));
  };

  const handleBookmarks = (items: Array<{ cfi: string; title: string }>) => {
    setBookmarkItems(items);
    if (!selected) return;
    syncRef.current.enqueue({
      id: selected.id,
      title: selected.title,
      author: selected.author,
      bookmarks: items
    });
  };

  const handleToc = (items: Array<{ href: string; label: string }>) => {
    setTocItems(items);
  };

  const openPanel = (mode: "toc" | "bookmarks") => {
    setPanelMode((prev) => (prev === mode ? null : mode));
  };

  const handlePanelSelect = (item: { href?: string; cfi?: string; label: string }) => {
    if (item.href) {
      readerRef.current?.sendCommand({ type: "NAV_TO_HREF", payload: { href: item.href } });
      setPanelMode(null);
      return;
    }
    if (item.cfi) {
      readerRef.current?.sendCommand({ type: "NAV_TO_CFI", payload: { cfi: item.cfi } });
      setPanelMode(null);
    }
  };

  const reconcileOnReconnect = useCallback(async () => {
    await Promise.all([syncRef.current.flush(), sessionSyncRef.current.flush()]);
    const [libraryResult, goalsResult] = await Promise.all([loadLibraryWithFallback(), loadGoalsWithFallback()]);
    setLibrary(libraryResult.items, { stale: libraryResult.stale, cachedAt: libraryResult.cachedAt || null });
    setGoals(goalsResult.data, { stale: goalsResult.stale, cachedAt: goalsResult.cachedAt || null });
  }, [setGoals, setLibrary]);

  useEffect(() => {
    const sync = syncRef.current;
    const sessionSync = sessionSyncRef.current;
    void sync.init();
    void sessionSync.init();
    void reconcileOnReconnect();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void reconcileOnReconnect();
        const current = selectedRef.current;
        if (current && !activeSessionRef.current) {
          beginSession(current.id, lastRelocationRef.current.page || 1);
        }
      } else {
        finalizeActiveSession();
        void sessionSync.flush();
      }
    });
    return () => {
      finalizeActiveSession();
      void sync.flush();
      void sessionSync.flush();
      sync.dispose();
      sessionSync.dispose();
      sub.remove();
    };
  }, [reconcileOnReconnect]);

  useEffect(() => {
    if (!selected) return;
    if (activeSessionRef.current?.bookId && activeSessionRef.current.bookId !== selected.id) {
      finalizeActiveSession();
    }
    if (activeSessionRef.current?.bookId === selected.id) return;
    beginSession(selected.id, currentPage || 1);
  }, [selected, currentPage]);

  const panelTheme = {
    surface: "#15100b",
    text: palette.text,
    muted: palette.muted,
    border: palette.border
  };

  const particleConfigs = useMemo(
    () => [
      { left: 40, size: 10, offset: 0 },
      { left: 120, size: 12, offset: 0.3 },
      { left: 220, size: 8, offset: 0.5 }
    ],
    []
  );

  return (
    <LinearGradient colors={["#070403", "#1a0f07", "#2f1a0a"]} style={styles.gradient}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmerLayer,
          {
            opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.6] }),
            transform: [
              {
                translateX: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-220, 220]
                })
              }
            ]
          }
        ]}
      />
      {particleConfigs.map((config) => (
        <Animated.View
          key={config.left}
          style={[
            styles.particle,
            {
              width: config.size,
              height: config.size,
              left: config.left,
              transform: [
                {
                  translateY: particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -40]
                  })
                },
                {
                  scale: particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.4]
                  })
                }
              ]
            }
          ]}
        />
      ))}
      <TopBar />
      <ReaderHeader
        selected={selected}
        chapterTitle={chapterTitle}
        tocCount={tocItems.length}
        bookmarkCount={bookmarkItems.length}
        goals={goals}
        goalsStale={goalsStale}
        onToggleToc={() => openPanel("toc")}
        onToggleBookmarks={() => openPanel("bookmarks")}
      />
      <ReaderStatusRows
        readingTime={readingTime}
        currentPage={currentPage}
        totalPages={totalPages}
        syncState={syncState}
        sessionSyncState={sessionSyncState}
      />
      <View style={styles.readerWrap}>
        <ReaderWebView
          ref={readerRef}
          bookUrl={bookUrl}
          initialLocation={selected?.lastLocation || null}
          initialBookmarks={selected?.bookmarks || []}
          onRelocated={handleRelocated}
          onToc={handleToc}
          onBookmarks={handleBookmarks}
          onError={setReaderError}
        />
      </View>
      <ReaderOverlays readerError={readerError} goalsStale={goalsStale} chapterPreview={chapterPreview} />
      <ReaderPanel
        visible={panelMode === "toc"}
        title="Table of Contents"
        items={tocItems.map((item) => ({ label: item.label, href: item.href }))}
        onSelect={handlePanelSelect}
        onClose={() => setPanelMode(null)}
        theme={panelTheme}
      />
      <ReaderPanel
        visible={panelMode === "bookmarks"}
        title="Bookmarks"
        items={bookmarkItems.map((item) => ({ label: item.title, cfi: item.cfi }))}
        onSelect={handlePanelSelect}
        onClose={() => setPanelMode(null)}
        theme={panelTheme}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  readerWrap: { flex: 1, marginTop: 8, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  shimmerLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.25)",
    opacity: 0
  },
  particle: {
    position: "absolute",
    bottom: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)"
  }
});

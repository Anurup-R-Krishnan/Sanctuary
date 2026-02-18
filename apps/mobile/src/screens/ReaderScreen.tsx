import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppState, View, Text, StyleSheet, Pressable } from "react-native";
import type { ReadingSessionV2 } from "@sanctuary/core";
import { LinearGradient } from "expo-linear-gradient";
import { TopBar } from "../components/TopBar";
import { ReaderPanel } from "../components/ReaderPanel";
import { ReaderWebView } from "../reader/ReaderWebView";
import type { ReaderBridgeHandle } from "../reader/ReaderWebView";
import { useAppStore } from "../state/useAppStore";
import { theme } from "../theme/tokens";
import { api } from "../services/api";
import { createProgressSyncQueue } from "../services/progressSync";
import { createSessionSyncQueue } from "../services/sessionSync";

interface ActiveSession {
  id: string;
  bookId: string;
  startedAtMs: number;
  startProgress: number;
  lastProgress: number;
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

  const beginSession = (bookId: string, progress: number) => {
    activeSessionRef.current = {
      id: createSessionId(),
      bookId,
      startedAtMs: Date.now(),
      startProgress: progress,
      lastProgress: progress
    };
  };

  const finalizeActiveSession = () => {
    const session = activeSessionRef.current;
    if (!session) return;
    activeSessionRef.current = null;
    const endedAtMs = Date.now();
    const durationSec = Math.max(0, Math.round((endedAtMs - session.startedAtMs) / 1000));
    const pagesAdvanced = Math.max(0, Math.round(session.lastProgress - session.startProgress));
    if (durationSec < 5 && pagesAdvanced <= 0) return;
    const payload: ReadingSessionV2 = {
      id: session.id,
      bookId: session.bookId,
      startedAt: new Date(session.startedAtMs).toISOString(),
      endedAt: new Date(endedAtMs).toISOString(),
      durationSec,
      pagesAdvanced,
      device: "desktop"
    };
    sessionSyncRef.current.enqueue(payload);
  };

  const handleRelocated = (data: { cfi: string; progress: number; chapterTitle: string; page?: number; totalPages?: number }) => {
    if (!selected) return;
    updateBookProgress(selected.id, data.progress, data.cfi);
    setChapterTitle(data.chapterTitle || "");
    const percent = Math.max(0, Math.min(100, Math.round(data.progress)));
    const readingLeft = data.totalPages && data.page ? Math.max(1, data.totalPages - data.page) : Math.max(1, 100 - percent);
    setReadingTime(Math.max(1, Math.round(readingLeft * 0.6)));
    if (data.page) setCurrentPage(data.page);
    if (data.totalPages) setTotalPages(data.totalPages);
    syncRef.current.enqueue({
      id: selected.id,
      title: selected.title,
      author: selected.author,
      progress: percent,
      totalPages: data.totalPages || 100,
      lastLocation: data.cfi
    });
    const active = activeSessionRef.current;
    if (active && active.bookId === selected.id) {
      active.lastProgress = Math.max(active.lastProgress, percent);
    }
    if (!data.totalPages && data.page) {
      setTotalPages(data.page);
    }

    const currentIndex = tocItems.findIndex((item) => item.label === data.chapterTitle);
    if (currentIndex >= 0 && currentIndex < tocItems.length - 1) {
      setChapterPreview(tocItems[currentIndex + 1].label);
    } else {
      setChapterPreview(null);
    }
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

  const handlePanelSelect = (item: { href?: string; label: string }) => {
    if (item.href) {
      readerRef.current?.sendCommand({ type: "NAV_TO_HREF", payload: { href: item.href } });
      setPanelMode(null);
    }
  };

  useEffect(() => {
    const sync = syncRef.current;
    const sessionSync = sessionSyncRef.current;
    void sync.init();
    void sessionSync.init();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void sync.flush();
        void sessionSync.flush();
        const current = selectedRef.current;
        if (current && !activeSessionRef.current) {
          beginSession(current.id, current.progressPercent || 0);
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
  }, []);

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
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: "#fff" }]}>{selected?.title || "Reader"}</Text>
          <Text style={[styles.meta, { color: "#b9ada2" }]}>
            {selected?.author || "Open a book to start."}
          </Text>
          {!!selected && (
            <Text style={[styles.meta, { color: "#a88e7b", marginTop: 4 }]}> 
              {chapterTitle ? `${chapterTitle} • ` : ""}
              {selected.progressPercent}% • TOC {tocItems.length} • Bookmarks {bookmarkItems.length}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.actionBtn} onPress={() => openPanel("toc")}>
            <Text style={styles.actionText}>Contents</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => openPanel("bookmarks")}>
            <Text style={styles.actionText}>Bookmarks</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.statsWrap}>
        <Text style={[styles.statsLabel, { color: "#f6e8d9" }]}>Reading time ~ {readingTime}m</Text>
        <Text style={[styles.statsLabel, { color: "#f6e8d9" }]}>Page {currentPage || 1} / {totalPages || 1}</Text>
      </View>
      <View style={styles.syncStatusWrap}>
        <Text style={[styles.statsLabel, { color: "#cdd1cf" }]}>
          {syncState === "syncing" ? "Progress syncing…" : syncState === "error" ? "Progress sync error" : "Progress synced"}
        </Text>
        <Text style={[styles.statsLabel, { color: "#cdd1cf" }]}>
          {sessionSyncState === "syncing" ? "Sessions syncing…" : sessionSyncState === "error" ? "Session sync error" : "Sessions synced"}
        </Text>
      </View>
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
      {!!readerError && (
        <View style={styles.errorCapsule}>
          <Text style={{ color: "#fff" }}>{readerError}</Text>
        </View>
      )}
      {chapterPreview && (
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Next chapter</Text>
          <Text style={styles.previewText}>{chapterPreview}</Text>
        </View>
      )}
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: "row", alignItems: "flex-end" },
  title: { fontSize: 26, fontWeight: "700" },
  meta: { fontSize: 14, letterSpacing: 0.4 },
  headerActions: { flexDirection: "row", marginLeft: 16 },
  actionBtn: { borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  statsWrap: { marginHorizontal: 20, flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  syncStatusWrap: { marginHorizontal: 20, flexDirection: "row", justifyContent: "space-between", paddingBottom: 10 },
  statsLabel: { fontSize: 11, letterSpacing: 0.5 },
  readerWrap: { flex: 1, marginTop: 8, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  errorCapsule: {
    position: "absolute",
    top: 80,
    right: 24,
    backgroundColor: "rgba(180,40,40,0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    elevation: 8
  },
  previewCard: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: "rgba(16,9,6,0.88)",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)"
  },
  previewLabel: { fontSize: 10, color: "#c6b3a1", marginBottom: 4 },
  previewText: { fontSize: 15, color: "#fff", fontWeight: "600" },
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

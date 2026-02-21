import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, PanResponder } from "react-native";
import { WebView } from "react-native-webview";
import type { ReaderBridgeCommand, ReaderBridgeEvent } from "@sanctuary/reader-webview";
import { readerBridgeBootstrap } from "@sanctuary/reader-webview";

export interface ReaderBridgeHandle {
  sendCommand: (command: ReaderBridgeCommand) => void;
}

interface ReaderWebViewProps {
  bookUrl?: string | null;
  initialLocation?: string | null;
  initialBookmarks?: Array<{ cfi: string; title: string }>;
  onRelocated?: (data: { cfi: string; href?: string; progress: number; chapterTitle: string; page: number; totalPages: number }) => void;
  onToc?: (items: Array<{ href: string; label: string }>) => void;
  onBookmarks?: (items: Array<{ cfi: string; title: string }>) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
}

function safeParseEvent(payload: string): ReaderBridgeEvent | null {
  try {
    return JSON.parse(payload) as ReaderBridgeEvent;
  } catch {
    return null;
  }
}

export const ReaderWebView = React.forwardRef<ReaderBridgeHandle, ReaderWebViewProps>(function ReaderWebView({
  bookUrl,
  initialLocation,
  initialBookmarks,
  onRelocated,
  onToc,
  onBookmarks,
  onReady,
  onError
}: ReaderWebViewProps, ref) {
  const webviewRef = useRef<WebView>(null);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [opened, setOpened] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendCommand = useCallback((command: ReaderBridgeCommand) => {
    const payload = JSON.stringify(command);
    const escaped = payload.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    webviewRef.current?.injectJavaScript(
      `window.SanctuaryReaderBridge && window.SanctuaryReaderBridge.onCommand('${escaped}'); true;`
    );
  }, []);

  const openCurrentBook = useCallback(() => {
    if (!bridgeReady || !bookUrl) return;
    setErrorMessage(null);
    sendCommand({
      type: "OPEN_BOOK",
      payload: {
        url: bookUrl,
        initialLocation: initialLocation || null,
        initialBookmarks: initialBookmarks || []
      }
    });
    setOpened(true);
  }, [bridgeReady, bookUrl, initialLocation, initialBookmarks, sendCommand]);

  useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") {
      ref({ sendCommand });
      return;
    }
    if (ref) {
      ref.current = { sendCommand };
    }
  }, [ref, sendCommand]);

  useEffect(() => {
    openCurrentBook();
  }, [openCurrentBook]);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const parsed = safeParseEvent(event.nativeEvent.data);
      if (!parsed) return;

      if (parsed.type === "READY") {
        setBridgeReady(true);
        onReady?.();
        return;
      }
      if (parsed.type === "BOOK_OPENED") {
        setOpened(true);
        setErrorMessage(null);
        return;
      }
      if (parsed.type === "RELOCATED") {
        onRelocated?.(parsed.payload);
        return;
      }
      if (parsed.type === "TOC_READY") {
        onToc?.(parsed.payload.items);
        return;
      }
      if (parsed.type === "BOOKMARKS_CHANGED") {
        onBookmarks?.(parsed.payload.bookmarks);
        return;
      }
      if (parsed.type === "ERROR") {
        setOpened(false);
        setErrorMessage(parsed.payload.message);
        onError?.(parsed.payload.message);
      }
    },
    [onReady, onRelocated, onToc, onBookmarks, onError]
  );

  const gestureResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 44 && gesture.vx > 0.18) {
            sendCommand({ type: "NAV_PREV" });
          } else if (gesture.dx < -44 && gesture.vx < -0.18) {
            sendCommand({ type: "NAV_NEXT" });
          }
        }
      }),
    [sendCommand]
  );

  const html = useMemo(() => {
    return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      html, body { margin: 0; height: 100%; background: #f7f0e5; color: #201a15; }
      #reader { height: 100vh; width: 100vw; overflow: hidden; }
      #status {
        position: fixed; right: 12px; top: 12px; z-index: 50;
        background: rgba(0,0,0,.68); color: #fff; font: 12px sans-serif;
        padding: 6px 10px; border-radius: 999px;
      }
    </style>
    <script src="https://unpkg.com/epubjs/dist/epub.min.js"></script>
  </head>
  <body>
    <div id="reader"></div>
    <div id="status">Bridge loading…</div>
    <script>
      ${readerBridgeBootstrap}
      document.getElementById("status").textContent = "Bridge ready";
    </script>
  </body>
</html>`;
  }, []);

  if (!bookUrl) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Select a book from Library to open reader.</Text>
      </View>
    );
  }

  return (
    <View style={styles.readerRoot}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
      />
      <View style={styles.tapOverlay} {...gestureResponder.panHandlers}>
        <Pressable
          style={[styles.tapZone, styles.tapLeft]}
          onPress={() => sendCommand({ type: "NAV_PREV" })}
          accessibilityLabel="Previous page zone"
        />
        <Pressable
          style={[styles.tapZone, styles.tapRight]}
          onPress={() => sendCommand({ type: "NAV_NEXT" })}
          accessibilityLabel="Next page zone"
        />
      </View>
      <View style={styles.controls}>
        <Pressable style={styles.controlBtn} onPress={() => sendCommand({ type: "NAV_PREV" })}>
          <Text style={styles.controlText}>Prev</Text>
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={() => sendCommand({ type: "TOGGLE_BOOKMARK" })}>
          <Text style={styles.controlText}>Bookmark +/-</Text>
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={() => sendCommand({ type: "NAV_NEXT" })}>
          <Text style={styles.controlText}>Next</Text>
        </Pressable>
      </View>
      {!opened && (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>{errorMessage ? "Reader failed to open" : "Opening EPUB…"}</Text>
          {!!errorMessage && (
            <>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable style={styles.retryBtn} onPress={openCurrentBook}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  readerRoot: { flex: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyText: { color: "#7f6f60", textAlign: "center" },
  controls: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 4
  },
  tapZone: {
    flex: 1
  },
  tapLeft: {
    alignItems: "flex-start"
  },
  tapRight: {
    alignItems: "flex-end"
  },
  controlBtn: {
    backgroundColor: "rgba(18,14,11,0.82)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  controlText: { color: "white", fontWeight: "700" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(245,238,229,0.88)"
  },
  loadingText: {
    color: "#4b3f34",
    fontWeight: "600"
  },
  errorText: {
    color: "#7f3f2f",
    marginTop: 8,
    textAlign: "center",
    maxWidth: 280
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: "#2b1f17",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  retryText: {
    color: "white",
    fontWeight: "700"
  }
});

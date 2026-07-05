export type ReaderBridgeCommand =
  | { type: "OPEN_BOOK"; payload: { url: string; initialLocation?: string | null; initialBookmarks?: Array<{ cfi: string; title: string }> } }
  | { type: "NAV_NEXT" }
  | { type: "NAV_PREV" }
  | { type: "NAV_TO_CFI"; payload: { cfi: string } }
  | { type: "NAV_TO_PERCENT"; payload: { percent: number } }
  | { type: "NAV_TO_HREF"; payload: { href: string } }
  | { type: "SET_THEME"; payload: { fg: string; bg: string; accent: string } }
  | { type: "SET_TYPO"; payload: { fontSize: number; lineHeight: number; textWidth: number } }
  | { type: "ADD_BOOKMARK" }
  | { type: "TOGGLE_BOOKMARK" }
  | { type: "REMOVE_BOOKMARK"; payload: { cfi: string } };

export type ReaderBridgeEvent =
  | { type: "READY" }
  | {
      type: "RELOCATED";
      payload: { cfi: string; href?: string; progress: number; chapterTitle: string; page: number; totalPages: number };
    }
  | { type: "TOC_READY"; payload: { items: Array<{ href: string; label: string }> } }
  | { type: "BOOKMARKS_CHANGED"; payload: { bookmarks: Array<{ cfi: string; title: string }> } }
  | { type: "BOOK_OPENED" }
  | { type: "ERROR"; payload: { message: string } };

export const readerBridgeBootstrap = `
(function () {
  var book = null;
  var rendition = null;
  var tocItems = [];
  var bookmarks = [];
  var currentCfi = "";
  var currentHref = "";
  var currentChapter = "";
  var currentPage = 0;
  var totalPagesCount = 0;
  var currentTheme = { fg: "#1E1A16", bg: "#FFFDF8", accent: "#B37A4C" };
  var currentTypo = { fontSize: 18, lineHeight: 1.7, textWidth: 72 };
  var locationsReady = false;

  function post(event) {
    if (!window.ReactNativeWebView) return;
    window.ReactNativeWebView.postMessage(JSON.stringify(event));
  }

  function fail(message) {
    post({ type: "ERROR", payload: { message: String(message) } });
  }

  function applyThemeAndTypography() {
    if (!rendition) return;
    rendition.themes.default({
      body: {
        "background-color": currentTheme.bg + " !important",
        color: currentTheme.fg + " !important",
        "font-size": currentTypo.fontSize + "px !important",
        "line-height": String(currentTypo.lineHeight) + " !important",
        margin: "0 auto !important",
        "max-width": currentTypo.textWidth + "ch !important",
        padding: "16px !important"
      },
      p: {
        "font-size": "inherit !important",
        "line-height": "inherit !important",
        color: "inherit !important"
      },
      a: {
        color: currentTheme.accent + " !important"
      }
    });
  }

  function flattenToc(items, out) {
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      out.push({ href: item.href, label: item.label });
      if (item.subitems && item.subitems.length) flattenToc(item.subitems, out);
    }
  }

  function normalizeHref(href) {
    if (!href || typeof href !== "string") return "";
    return href.split("#")[0].replace(/^\\/+/, "");
  }

  function chapterFromHref(href) {
    if (!href || !tocItems.length) return "";
    var normalized = normalizeHref(href);
    for (var i = 0; i < tocItems.length; i += 1) {
      var tocHref = normalizeHref(tocItems[i].href);
      if (tocHref && (normalized.indexOf(tocHref) >= 0 || tocHref.indexOf(normalized) >= 0)) {
        return tocItems[i].label || "";
      }
    }
    return "";
  }

  function emitRelocated(location) {
    if (!location || !location.start) return;
    currentCfi = location.start.cfi || currentCfi || "";
    currentHref = location.start.href || currentHref || "";
    currentChapter = chapterFromHref(currentHref);
    var progress = 0;
    if (locationsReady && book && book.locations && typeof book.locations.percentageFromCfi === "function" && currentCfi) {
      progress = Math.round((book.locations.percentageFromCfi(currentCfi) || 0) * 100);
    } else if (typeof location.start.percentage === "number") {
      progress = Math.round(location.start.percentage * 100);
    }
    if (location.start.displayed && typeof location.start.displayed.total === "number" && location.start.displayed.total > 0) {
      totalPagesCount = Math.max(1, Math.round(location.start.displayed.total));
      currentPage = Math.max(1, Math.round(location.start.displayed.page || 1));
    } else if (book && book.locations && locationsReady && typeof book.locations.length === "function") {
      totalPagesCount = Math.max(1, book.locations.length());
      currentPage = Math.max(1, Math.ceil((Math.max(0, Math.min(100, progress)) / 100) * totalPagesCount || 1));
    } else {
      currentPage = Math.max(1, currentPage || 1);
      totalPagesCount = Math.max(currentPage, totalPagesCount || currentPage);
    }
    post({
      type: "RELOCATED",
      payload: {
        cfi: currentCfi,
        href: currentHref,
        progress: Math.max(0, Math.min(100, progress)),
        chapterTitle: currentChapter,
        page: currentPage,
        totalPages: Math.max(currentPage, totalPagesCount)
      }
    });
  }

  async function openBook(payload) {
    try {
      if (!window.ePub) {
        fail("epub.js is not available in WebView runtime");
        return;
      }
      if (!payload || !payload.url) {
        fail("OPEN_BOOK requires payload.url");
        return;
      }

      if (rendition) rendition.destroy();
      if (book) book.destroy();
      document.getElementById("reader").innerHTML = "";
      tocItems = [];
      bookmarks = Array.isArray(payload.initialBookmarks) ? payload.initialBookmarks.filter(function (b) {
        return b && typeof b.cfi === "string" && b.cfi.length > 0;
      }).map(function (b) {
        return { cfi: b.cfi, title: typeof b.title === "string" && b.title ? b.title : "Bookmark" };
      }) : [];
      currentCfi = "";
      currentHref = "";
      currentChapter = "";
      currentPage = 0;
      totalPagesCount = 0;
      locationsReady = false;

      book = window.ePub(payload.url);
      rendition = book.renderTo("reader", {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "none"
      });

      var nav = await book.loaded.navigation;
      var flat = [];
      if (nav && nav.toc) flattenToc(nav.toc, flat);
      tocItems = flat;
      post({ type: "TOC_READY", payload: { items: tocItems } });

      rendition.on("relocated", emitRelocated);

      await rendition.display(payload.initialLocation || undefined);
      applyThemeAndTypography();

      try {
      await book.locations.generate(1024);
      locationsReady = true;
      if (book.locations && typeof book.locations.length === "function") {
        totalPagesCount = Math.max(1, book.locations.length());
      }
      if (rendition && rendition.currentLocation) {
        emitRelocated(rendition.currentLocation());
      }
      } catch (e) {
        locationsReady = false;
      }

      post({ type: "BOOK_OPENED" });
      post({ type: "BOOKMARKS_CHANGED", payload: { bookmarks: bookmarks } });
    } catch (err) {
      fail(err && err.message ? err.message : String(err));
    }
  }

  function onCommand(raw) {
    try {
      var cmd = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!cmd || !cmd.type) return;

      switch (cmd.type) {
        case "OPEN_BOOK":
          openBook(cmd.payload || {});
          break;
        case "NAV_NEXT":
          if (rendition) rendition.next();
          break;
        case "NAV_PREV":
          if (rendition) rendition.prev();
          break;
        case "NAV_TO_CFI":
          if (rendition && cmd.payload && cmd.payload.cfi) rendition.display(cmd.payload.cfi);
          break;
        case "NAV_TO_PERCENT":
          if (rendition && book && book.locations && locationsReady && cmd.payload) {
            var pct = Math.max(0, Math.min(1, Number(cmd.payload.percent) / 100));
            var cfi = book.locations.cfiFromPercentage(pct);
            if (cfi) rendition.display(cfi);
          }
          break;
        case "NAV_TO_HREF":
          if (rendition && cmd.payload && cmd.payload.href) {
            var href = cmd.payload.href;
            rendition.display(href).catch(function () {
              var fallback = normalizeHref(href);
              if (!fallback) return;
              var matched = null;
              for (var i = 0; i < tocItems.length; i += 1) {
                var tocHref = normalizeHref(tocItems[i].href);
                if (tocHref === fallback || tocHref.indexOf(fallback) >= 0 || fallback.indexOf(tocHref) >= 0) {
                  matched = tocItems[i].href;
                  break;
                }
              }
              if (matched) rendition.display(matched);
            });
          }
          break;
        case "SET_THEME":
          currentTheme = {
            fg: cmd.payload && cmd.payload.fg ? cmd.payload.fg : currentTheme.fg,
            bg: cmd.payload && cmd.payload.bg ? cmd.payload.bg : currentTheme.bg,
            accent: cmd.payload && cmd.payload.accent ? cmd.payload.accent : currentTheme.accent
          };
          applyThemeAndTypography();
          break;
        case "SET_TYPO":
          currentTypo = {
            fontSize: Number(cmd.payload && cmd.payload.fontSize) || currentTypo.fontSize,
            lineHeight: Number(cmd.payload && cmd.payload.lineHeight) || currentTypo.lineHeight,
            textWidth: Number(cmd.payload && cmd.payload.textWidth) || currentTypo.textWidth
          };
          applyThemeAndTypography();
          break;
        case "ADD_BOOKMARK":
          if (!currentCfi) break;
          if (!bookmarks.find(function (b) { return b.cfi === currentCfi; })) {
            bookmarks.push({ cfi: currentCfi, title: currentChapter || "Bookmark" });
            post({ type: "BOOKMARKS_CHANGED", payload: { bookmarks: bookmarks } });
          }
          break;
        case "TOGGLE_BOOKMARK":
          if (!currentCfi) break;
          var existing = bookmarks.find(function (b) { return b.cfi === currentCfi; });
          if (existing) {
            bookmarks = bookmarks.filter(function (b) { return b.cfi !== currentCfi; });
          } else {
            bookmarks.push({ cfi: currentCfi, title: currentChapter || "Bookmark" });
          }
          post({ type: "BOOKMARKS_CHANGED", payload: { bookmarks: bookmarks } });
          break;
        case "REMOVE_BOOKMARK":
          if (!cmd.payload || !cmd.payload.cfi) break;
          bookmarks = bookmarks.filter(function (b) { return b.cfi !== cmd.payload.cfi; });
          post({ type: "BOOKMARKS_CHANGED", payload: { bookmarks: bookmarks } });
          break;
        default:
          break;
      }
    } catch (err) {
      fail(err && err.message ? err.message : String(err));
    }
  }

  window.addEventListener("message", function (event) { onCommand(event.data); });
  document.addEventListener("message", function (event) { onCommand(event.data); });
  window.SanctuaryReaderBridge = { onCommand: onCommand };
  post({ type: "READY" });
})();
`;

import type { SanctuaryApiClient } from "@sanctuary/core";

import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Folder,
  Globe,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";

import type { OpdsEntry, OpdsFeed } from "@/types/opds";

import { CatalogBookCard } from "@/components/library/CatalogBookCard";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import {
  downloadCatalogBook,
  fetchCatalogFeed,
  getOfflineSampleFeed,
  resolveSearchUrl,
} from "@/services/opdsService";
import { useCatalogStore } from "@/store/useCatalogStore";

interface CatalogBrowserProps {
  api: SanctuaryApiClient;
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({ api, isOpen, onClose, onImport }) => {
  const { activeCatalogId, addCatalog, catalogs, removeCatalog, setActiveCatalog } =
    useCatalogStore(
      useShallow((state) => ({
        activeCatalogId: state.activeCatalogId,
        addCatalog: state.addCatalog,
        catalogs: state.catalogs,
        removeCatalog: state.removeCatalog,
        setActiveCatalog: state.setActiveCatalog,
      }))
    );

  const [feed, setFeed] = useState<OpdsFeed | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importError, setImportError] = useState<string | null>(null);

  // Add catalog form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState("");
  const [newCatalogUrl, setNewCatalogUrl] = useState("");
  const [authType, setAuthType] = useState<"basic" | "bearer" | "none">("none");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const activeCatalog = useMemo(
    () => catalogs.find((c) => c.id === activeCatalogId) || catalogs[0],
    [catalogs, activeCatalogId]
  );

  useEffect(() => {
    if (!isOpen || !activeCatalog) return;
    setCurrentUrl(activeCatalog.url);
    setHistory([]);
  }, [isOpen, activeCatalogId, activeCatalog]);

  const loadFeed = useCallback(
    async (url: string) => {
      if (!url) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchCatalogFeed(api, url, activeCatalog);
        setFeed(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load catalog feed");
      } finally {
        setIsLoading(false);
      }
    },
    [api, activeCatalog]
  );

  useEffect(() => {
    if (isOpen && currentUrl) {
      void loadFeed(currentUrl);
    }
  }, [isOpen, currentUrl, loadFeed]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (showAddForm) {
          setShowAddForm(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showAddForm]);

  const handleNavigate = (targetUrl: string) => {
    setHistory((prev) => [...prev, currentUrl]);
    setCurrentUrl(targetUrl);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentUrl(previous);
  };

  const handleImportBook = async (entry: OpdsEntry) => {
    if (!entry.acquisitionUrl) return;
    setImportingId(entry.id);
    setImportError(null);
    try {
      const file = await downloadCatalogBook(api, entry.acquisitionUrl, entry.title, activeCatalog);
      await onImport(file);
      setImportedIds((prev) => new Set([...prev, entry.id]));
    } catch (err) {
      console.error("Failed to import catalog book:", err);
      setImportError(
        `Couldn't import "${entry.title}": ${err instanceof Error ? err.message : "download failed"}`
      );
    } finally {
      setImportingId(null);
    }
  };

  const handleAddCatalogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatalogName.trim() || !newCatalogUrl.trim()) {
      setAddError("Please provide both name and URL.");
      return;
    }
    try {
      new URL(newCatalogUrl.trim());
    } catch {
      setAddError("Please provide a valid URL (e.g. https://example.com/opds).");
      return;
    }

    addCatalog(newCatalogName, newCatalogUrl, {
      authType,
      bearerToken: authType === "bearer" ? bearerToken.trim() : undefined,
      password: authType === "basic" ? password : undefined,
      username: authType === "basic" ? username.trim() : undefined,
    });
    setNewCatalogName("");
    setNewCatalogUrl("");
    setAuthType("none");
    setUsername("");
    setPassword("");
    setBearerToken("");
    setShowAddForm(false);
    setAddError(null);
  };

  const filteredEntries = useMemo(() => {
    if (!feed?.entries) return [];
    if (!searchQuery.trim()) return feed.entries;
    const query = searchQuery.toLowerCase();
    return feed.entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.author?.toLowerCase().includes(query) ||
        entry.summary?.toLowerCase().includes(query)
    );
  }, [feed, searchQuery]);

  if (!isOpen) return null;

  return createPortal(
    <div
      aria-labelledby="catalog-browser-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pt-16 sm:pt-16 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          if (showAddForm) {
            setShowAddForm(false);
          } else {
            onClose();
          }
        }
      }}
      role="dialog"
      tabIndex={-1}
    >
      <div className="relative w-full max-w-5xl h-[min(85vh,calc(100vh-5rem))] flex flex-col rounded-2xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-light-accent/15 dark:bg-dark-accent/20 text-light-accent dark:text-dark-accent flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 id="catalog-browser-title" className="text-lg font-bold text-light-text dark:text-dark-text flex items-center gap-2">
                OPDS Catalog Browser
              </h2>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                Browse public domain ebooks and personal media servers
              </p>
            </div>
          </div>

          <IconButton
            className="text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text"
            icon={<X className="w-5 h-5" />}
            label="Close catalog browser"
            onClick={onClose}
            variant="ghost"
          />
        </div>

        {/* Toolbar: Catalog switcher, search, and actions */}
        <div className="px-6 py-3 border-b border-light-border/60 dark:border-dark-border/60 flex flex-wrap items-center justify-between gap-3 bg-light-surface/40 dark:bg-dark-surface/40">
          {/* Catalog tabs */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {catalogs.map((catalog) => (
              <div key={catalog.id} className="flex items-center group">
                <button
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                    activeCatalogId === catalog.id
                      ? "bg-light-accent text-white dark:bg-dark-accent dark:text-black shadow-xs font-semibold"
                      : "bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 border border-light-border/60 dark:border-dark-border/60"
                  }`}
                  onClick={() => setActiveCatalog(catalog.id)}
                  type="button"
                >
                  {catalog.authType && catalog.authType !== "none" && (
                    <Lock className="w-3 h-3 opacity-80" />
                  )}
                  <span>{catalog.name}</span>
                </button>
                {!catalog.isDefault && (
                  <button
                    aria-label={`Remove catalog ${catalog.name}`}
                    className="ml-1 p-1 text-light-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCatalog(catalog.id);
                    }}
                    type="button"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            <Button
              className="!px-2.5 !py-1 text-xs gap-1"
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              variant="ghost"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>

          {/* Search in catalog */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-muted dark:text-dark-text-muted pointer-events-none" />
            <input
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border focus:outline-none focus:border-light-accent dark:focus:border-dark-accent text-light-text dark:text-dark-text placeholder:text-light-text-muted/60"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter catalog books..."
              type="text"
              value={searchQuery}
            />
          </div>
        </div>

        {/* Add Catalog Form Dropdown */}
        {showAddForm && (
          <form
            className="px-6 py-4 bg-light-surface/60 dark:bg-dark-surface/60 border-b border-light-border dark:border-dark-border flex flex-col gap-3 animate-fadeIn"
            onSubmit={handleAddCatalogSubmit}
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
                  Catalog Name
                </label>
                <input
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-light-accent dark:focus:border-dark-accent"
                  onChange={(e) => setNewCatalogName(e.target.value)}
                  placeholder="e.g. My Calibre Server"
                  required
                  type="text"
                  value={newCatalogName}
                />
              </div>
              <div className="flex-2 min-w-[240px]">
                <label className="block text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
                  OPDS Feed URL
                </label>
                <input
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-light-accent dark:focus:border-dark-accent"
                  onChange={(e) => setNewCatalogUrl(e.target.value)}
                  placeholder="https://example.com/opds"
                  required
                  type="url"
                  value={newCatalogUrl}
                />
              </div>
              <div className="w-48">
                <label className="block text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
                  Authentication
                </label>
                <select
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-light-accent dark:focus:border-dark-accent"
                  onChange={(e) => setAuthType(e.target.value as "basic" | "bearer" | "none")}
                  value={authType}
                >
                  <option value="none">Public / None</option>
                  <option value="basic">HTTP Basic (Calibre / Kavita)</option>
                  <option value="bearer">Bearer Token / API Key</option>
                </select>
              </div>
            </div>

            {authType === "basic" && (
              <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-light-border/60 dark:border-dark-border/60">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
                    Username
                  </label>
                  <input
                    autoComplete="username"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-light-accent dark:focus:border-dark-accent"
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Calibre username"
                    type="text"
                    value={username}
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
                    Password
                  </label>
                  <input
                    autoComplete="current-password"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-light-accent dark:focus:border-dark-accent"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Calibre password"
                    type="password"
                    value={password}
                  />
                </div>
              </div>
            )}

            {authType === "bearer" && (
              <div className="pt-1 border-t border-light-border/60 dark:border-dark-border/60">
                <label className="block text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
                  Bearer Token or API Key
                </label>
                <input
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text font-mono focus:outline-none focus:border-light-accent dark:focus:border-dark-accent"
                  onChange={(e) => setBearerToken(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  type="password"
                  value={bearerToken}
                />
              </div>
            )}

            <div className="flex items-center gap-2 justify-end pt-1">
              <Button onClick={() => setShowAddForm(false)} size="sm" variant="ghost">
                Cancel
              </Button>
              <Button size="sm" type="submit" variant="primary">
                Save Catalog
              </Button>
            </div>
            {addError && (
              <p className="w-full text-xs text-red-500 font-medium">{addError}</p>
            )}
          </form>
        )}

        {/* Sub-navigation / Breadcrumbs */}
        {feed && (history.length > 0 || feed.navigationLinks.length > 0) && (
          <div className="px-6 py-2 border-b border-light-border/60 dark:border-dark-border/60 flex items-center gap-2 text-xs overflow-x-auto bg-light-surface/30 dark:bg-dark-surface/30">
            {history.length > 0 && (
              <button
                className="px-2 py-1 rounded bg-light-surface dark:bg-dark-surface border border-light-border/60 dark:border-dark-border/60 hover:bg-light-border/40 font-medium text-light-text dark:text-dark-text"
                onClick={handleBack}
                type="button"
              >
                ← Back
              </button>
            )}
            <span className="font-semibold text-light-text dark:text-dark-text truncate">
              {feed.title}
            </span>
            {feed.navigationLinks.slice(0, 5).map((nav, idx) => (
              <button
                key={idx}
                className="px-2 py-0.5 rounded text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text underline underline-offset-2 flex-shrink-0"
                onClick={() => handleNavigate(nav.href)}
                type="button"
              >
                {nav.title || nav.rel}
              </button>
            ))}
          </div>
        )}

        {/* Catalog Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Loader2 className="w-8 h-8 text-light-accent dark:text-dark-accent animate-spin mb-3" />
              <p className="text-sm font-medium text-light-text dark:text-dark-text">
                Fetching catalog feed...
              </p>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                Parsing publications and acquisition links
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center max-w-md mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <h3 className="text-sm font-semibold text-light-text dark:text-dark-text">
                Unable to Load Catalog
              </h3>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 mb-4">
                {error}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  className="gap-2"
                  onClick={() => void loadFeed(currentUrl)}
                  size="sm"
                  variant="secondary"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setFeed(getOfflineSampleFeed());
                    setError(null);
                  }}
                  size="sm"
                  variant="primary"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Browse Offline Classics
                </Button>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            searchQuery ? (
              <div className="flex flex-col items-center justify-center h-64 text-center max-w-sm mx-auto">
                <Search className="w-10 h-10 text-light-text-muted/40 dark:text-dark-text-muted/40 mb-3" />
                <p className="text-sm font-semibold text-light-text dark:text-dark-text">
                  No matching publications
                </p>
                <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 mb-4">
                  No books in this view matched &ldquo;{searchQuery}&rdquo;.
                </p>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setSearchQuery("")} size="sm" variant="secondary">
                    Clear filter
                  </Button>
                  {feed?.searchLink && (
                    <Button
                      className="gap-1.5"
                      onClick={() => {
                        const searchUrl = resolveSearchUrl(feed.searchLink!, searchQuery);
                        void loadFeed(searchUrl);
                      }}
                      size="sm"
                      variant="primary"
                    >
                      Search Online
                    </Button>
                  )}
                </div>
              </div>
            ) : feed?.navigationLinks && feed.navigationLinks.length > 0 ? (
              <div className="space-y-4">
                <div className="border-b border-light-border/60 dark:border-dark-border/60 pb-2">
                  <h3 className="text-sm font-semibold text-light-text dark:text-dark-text">
                    Catalog Categories & Collections
                  </h3>
                  <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                    Select a section below to explore publications
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {feed.navigationLinks.map((nav, idx) => (
                    <button
                      className="p-3.5 rounded-xl bg-light-surface/60 dark:bg-dark-surface/60 hover:bg-light-surface/90 dark:hover:bg-dark-surface/90 border border-light-border dark:border-dark-border flex items-center justify-between text-left transition-all group"
                      key={idx}
                      onClick={() => handleNavigate(nav.href)}
                      type="button"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-light-accent/15 dark:bg-dark-accent/20 text-light-accent dark:text-dark-accent flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-light-text dark:text-dark-text truncate group-hover:text-light-accent dark:group-hover:text-dark-accent">
                          {nav.title || nav.rel}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-light-text-muted group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center max-w-sm mx-auto">
                <BookOpen className="w-10 h-10 text-light-text-muted/40 dark:text-dark-text-muted/40 mb-3" />
                <p className="text-sm font-medium text-light-text dark:text-dark-text">
                  No publications found
                </p>
                <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 mb-4">
                  This feed currently has no direct book entries.
                </p>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setFeed(getOfflineSampleFeed());
                  }}
                  size="sm"
                  variant="secondary"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Load Offline Classics
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {importError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs flex-1">{importError}</p>
                  <IconButton
                    icon={<X className="w-3.5 h-3.5" />}
                    label="Dismiss"
                    onClick={() => setImportError(null)}
                    size="sm"
                    variant="ghost"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEntries.map((entry) => (
                  <CatalogBookCard
                    entry={entry}
                    isImported={importedIds.has(entry.id)}
                    isImporting={importingId === entry.id}
                    key={entry.id}
                    onImport={handleImportBook}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Feed Pagination Footer */}
        {feed?.pagination && (feed.pagination.previous || feed.pagination.next) && (
          <div className="px-6 py-3 border-t border-light-border dark:border-dark-border flex items-center justify-between bg-light-surface/40 dark:bg-dark-surface/40">
            <Button
              className="gap-1 !text-xs !py-1.5"
              disabled={!feed.pagination.previous}
              onClick={() => feed.pagination?.previous && handleNavigate(feed.pagination.previous)}
              size="sm"
              variant="secondary"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous Page
            </Button>

            <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">
              Feed Navigation
            </span>

            <Button
              className="gap-1 !text-xs !py-1.5"
              disabled={!feed.pagination.next}
              onClick={() => feed.pagination?.next && handleNavigate(feed.pagination.next)}
              size="sm"
              variant="secondary"
            >
              Next Page
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

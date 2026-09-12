import { AlertCircle, BookOpen, Globe, Loader2, Lock, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import type { OpdsEntry, OpdsFeed } from "@/types/opds";

import { CatalogBookCard } from "@/components/library/CatalogBookCard";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { downloadCatalogBook, fetchCatalogFeed } from "@/services/opdsService";
import { useCatalogStore } from "@/store/useCatalogStore";

interface CatalogBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({ isOpen, onClose, onImport }) => {
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
        const data = await fetchCatalogFeed(url, activeCatalog);
        setFeed(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load catalog feed");
      } finally {
        setIsLoading(false);
      }
    },
    [activeCatalog]
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
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    try {
      const file = await downloadCatalogBook(entry.acquisitionUrl, entry.title, activeCatalog);
      await onImport(file);
      setImportedIds((prev) => new Set([...prev, entry.id]));
    } catch (err) {
      console.error("Failed to import catalog book:", err);
      alert(err instanceof Error ? err.message : "Failed to download and import book");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl bg-light-surface dark:bg-dark-surface border border-black/[0.1] dark:border-white/[0.1] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-light-text dark:text-dark-text flex items-center gap-2">
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
        <div className="px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
          {/* Catalog tabs */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {catalogs.map((catalog) => (
              <div key={catalog.id} className="flex items-center group">
                <button
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                    activeCatalogId === catalog.id
                      ? "bg-[rgb(var(--accent))] text-white shadow-sm"
                      : "bg-black/[0.04] dark:bg-white/[0.06] text-light-text dark:text-dark-text hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
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
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-light-surface dark:bg-dark-surface border border-black/[0.1] dark:border-white/[0.1] focus:outline-none focus:border-[rgb(var(--accent))] text-light-text dark:text-dark-text placeholder:text-light-text-muted/60"
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
            className="px-6 py-4 bg-black/[0.03] dark:bg-white/[0.04] border-b border-black/[0.08] dark:border-white/[0.08] flex flex-col gap-3 animate-fadeIn"
            onSubmit={handleAddCatalogSubmit}
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
                  Catalog Name
                </label>
                <input
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-surface dark:bg-dark-surface border border-black/[0.1] dark:border-white/[0.1] text-light-text dark:text-dark-text"
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
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-surface dark:bg-dark-surface border border-black/[0.1] dark:border-white/[0.1] text-light-text dark:text-dark-text"
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
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-surface dark:bg-dark-surface border border-black/[0.1] dark:border-white/[0.1] text-light-text dark:text-dark-text"
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
              <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
                    Username
                  </label>
                  <input
                    autoComplete="username"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-surface dark:bg-dark-surface border border-black/[0.1] dark:border-white/[0.1] text-light-text dark:text-dark-text"
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
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-surface dark:bg-dark-surface border border-black/[0.1] dark:border-white/[0.1] text-light-text dark:text-dark-text"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Calibre password"
                    type="password"
                    value={password}
                  />
                </div>
              </div>
            )}

            {authType === "bearer" && (
              <div className="pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                <label className="block text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
                  Bearer Token or API Key
                </label>
                <input
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-surface dark:bg-dark-surface border border-black/[0.1] dark:border-white/[0.1] text-light-text dark:text-dark-text font-mono"
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
          <div className="px-6 py-2 border-b border-black/[0.04] dark:border-white/[0.04] flex items-center gap-2 text-xs overflow-x-auto bg-black/[0.01] dark:bg-white/[0.01]">
            {history.length > 0 && (
              <button
                className="px-2 py-1 rounded bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] font-medium text-light-text dark:text-dark-text"
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
              <Loader2 className="w-8 h-8 text-[rgb(var(--accent))] animate-spin mb-3" />
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
              <Button
                className="gap-2"
                onClick={() => void loadFeed(currentUrl)}
                size="sm"
                variant="secondary"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BookOpen className="w-10 h-10 text-light-text-muted/40 dark:text-dark-text-muted/40 mb-3" />
              <p className="text-sm font-medium text-light-text dark:text-dark-text">
                No publications found
              </p>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                {searchQuery
                  ? `No books matched "${searchQuery}".`
                  : "This feed currently has no direct book entries."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEntries.map((entry) => (
                <CatalogBookCard
                  key={entry.id}
                  entry={entry}
                  isImported={importedIds.has(entry.id)}
                  isImporting={importingId === entry.id}
                  onImport={handleImportBook}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import {
  ArrowUpDown,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
  Search,
  User,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import type { EntityType, XRayEntity } from '@/utils/xrayEntityEngine';

import {
  buildXRayBookIndex,
  filterXRayEntities,
  indexChapterEntities,
  sortXRayEntities,
} from '@/utils/xrayEntityEngine';

export interface ReaderXRayDrawerProps {
  activeChapterIndex?: number;
  activeChapterText?: string;
  activeChapterTitle?: string;
  bookChapters?: { index: number; text: string; title?: string }[];
  initialEntityQuery?: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToChapter?: (chapterIndex: number) => void;
}

export const ReaderXRayDrawer: React.FC<ReaderXRayDrawerProps> = ({
  activeChapterIndex = 0,
  activeChapterText = '',
  activeChapterTitle = 'Active Chapter',
  bookChapters,
  initialEntityQuery = '',
  isOpen,
  onClose,
  onNavigateToChapter,
}) => {
  const [scope, setScope] = useState<'book' | 'chapter'>('chapter');
  const [searchQuery, setSearchQuery] = useState(initialEntityQuery);
  const [selectedCategory, setSelectedCategory] = useState<EntityType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'chronological' | 'mentions'>('mentions');
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);

  // Sync initial search query when drawer opens
  useEffect(() => {
    if (isOpen && initialEntityQuery) {
      setSearchQuery(initialEntityQuery);
    }
  }, [isOpen, initialEntityQuery]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute entities based on selected scope
  const { allEntities, charactersCount, locationsCount, termsCount } = useMemo(() => {
    if (!isOpen) {
      return {
        allEntities: [],
        charactersCount: 0,
        locationsCount: 0,
        termsCount: 0,
      };
    }

    if (scope === 'book' && bookChapters && bookChapters.length > 0) {
      const bookIndex = buildXRayBookIndex(bookChapters, 1);
      return {
        allEntities: bookIndex.entities,
        charactersCount: bookIndex.charactersCount,
        locationsCount: bookIndex.locationsCount,
        termsCount: bookIndex.termsCount,
      };
    }

    const chapterEntities = indexChapterEntities(activeChapterText, {
      chapterIndex: activeChapterIndex,
      chapterTitle: activeChapterTitle,
      minMentions: 1,
    });

    let chars = 0;
    let locs = 0;
    let terms = 0;
    for (const ent of chapterEntities) {
      if (ent.category === 'character') chars++;
      else if (ent.category === 'location') locs++;
      else terms++;
    }

    return {
      allEntities: chapterEntities,
      charactersCount: chars,
      locationsCount: locs,
      termsCount: terms,
    };
  }, [isOpen, scope, bookChapters, activeChapterText, activeChapterIndex, activeChapterTitle]);

  // Filter and sort entities
  const displayedEntities = useMemo(() => {
    const filtered = filterXRayEntities(allEntities, searchQuery, selectedCategory);
    return sortXRayEntities(filtered, sortBy);
  }, [allEntities, searchQuery, selectedCategory, sortBy]);

  if (!isOpen) return null;

  const hasMultipleChapters = Boolean(bookChapters && bookChapters.length > 1);

  // Helper for generating 2-letter initials
  const getInitials = (name: string): string => {
    const parts = name.replace(/^(Mr|Mrs|Ms|Dr|Prof|Lord|Lady|Count|Sir)\.?\s+/i, '').split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderCategoryIcon = (category: EntityType) => {
    switch (category) {
      case 'character':
        return <User className="w-3.5 h-3.5" />;
      case 'location':
        return <MapPin className="w-3.5 h-3.5" />;
      case 'concept':
        return <BookOpen className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const highlightEntity = (text: string, entityName: string, aliases: string[]) => {
    const namesToHighlight = [entityName, ...aliases].filter(Boolean);
    const escaped = namesToHighlight.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

    return (
      <span>
        {parts.map((part, i) => {
          const isMatch = namesToHighlight.some((n) => n.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <mark
                className="bg-amber-400/25 dark:bg-amber-400/30 text-amber-900 dark:text-amber-200 font-semibold px-0.5 rounded"
                key={i}
              >
                {part}
              </mark>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex justify-end pointer-events-auto">
      {/* Backdrop */}
      <button
        aria-label="Close drawer backdrop"
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in cursor-default border-0"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      {/* Slide-over drawer */}
      <div className="relative w-full max-w-md bg-page text-fg shadow-2xl border-l border-line flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-line flex items-center justify-between shrink-0 bg-subtle/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent border border-light-accent/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight flex items-center gap-2">
                X-Ray
                <span className="text-xs px-2 py-0.5 rounded-full bg-line/60 border border-line text-fg-muted font-normal font-mono">
                  {displayedEntities.length}
                </span>
              </h2>
              <p className="text-xs text-fg-muted truncate max-w-[210px]">
                {scope === 'chapter' ? activeChapterTitle : 'Full Book Scope'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Scope toggle (Chapter vs Book) */}
            {hasMultipleChapters && (
              <div className="flex items-center bg-surface/60 border border-line p-0.5 rounded-lg text-xs font-medium">
                <button
                  className={`px-2 py-1 rounded-md transition-all ${
                    scope === 'chapter'
                      ? 'bg-light-primary dark:bg-dark-secondary shadow-xs text-fg font-semibold'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                  onClick={() => setScope('chapter')}
                  type="button"
                >
                  Chapter
                </button>
                <button
                  className={`px-2 py-1 rounded-md transition-all ${
                    scope === 'book'
                      ? 'bg-light-primary dark:bg-dark-secondary shadow-xs text-fg font-semibold'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                  onClick={() => setScope('book')}
                  type="button"
                >
                  Book
                </button>
              </div>
            )}

            <button
              aria-label="Close X-Ray"
              className="p-1.5 rounded-lg text-light-text-muted hover:text-fg hover:bg-line/40 transition-colors"
              onClick={onClose}
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filter Toolbar */}
        <div className="p-3 border-b border-line flex flex-col gap-2.5 shrink-0 bg-subtle/40">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
            <input
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-light-primary dark:bg-dark-secondary/90 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-fg placeholder:text-fg-muted transition-all"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter characters, locations, or aliases…"
              type="text"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                aria-label="Clear search input"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-light-text-muted hover:text-fg"
                onClick={() => setSearchQuery('')}
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs & Sort */}
          <div className="flex items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                className={`px-2 py-1 rounded-md transition-colors shrink-0 font-medium ${
                  selectedCategory === 'all'
                    ? 'bg-light-accent/15 dark:bg-dark-accent/20 text-accent font-semibold shadow-xs'
                    : 'text-fg-muted hover:bg-line/40'
                }`}
                onClick={() => setSelectedCategory('all')}
                type="button"
              >
                All ({allEntities.length})
              </button>
              <button
                className={`px-2 py-1 rounded-md transition-colors shrink-0 font-medium flex items-center gap-1 ${
                  selectedCategory === 'character'
                    ? 'bg-light-accent/15 dark:bg-dark-accent/20 text-accent font-semibold shadow-xs'
                    : 'text-fg-muted hover:bg-line/40'
                }`}
                onClick={() => setSelectedCategory('character')}
                type="button"
              >
                <User className="w-3 h-3" />
                People ({charactersCount})
              </button>
              <button
                className={`px-2 py-1 rounded-md transition-colors shrink-0 font-medium flex items-center gap-1 ${
                  selectedCategory === 'location'
                    ? 'bg-light-accent/15 dark:bg-dark-accent/20 text-accent font-semibold shadow-xs'
                    : 'text-fg-muted hover:bg-line/40'
                }`}
                onClick={() => setSelectedCategory('location')}
                type="button"
              >
                <MapPin className="w-3 h-3" />
                Places ({locationsCount})
              </button>
              {termsCount > 0 && (
                <button
                  className={`px-2 py-1 rounded-md transition-colors shrink-0 font-medium flex items-center gap-1 ${
                    selectedCategory === 'concept'
                      ? 'bg-light-accent/15 dark:bg-dark-accent/20 text-accent font-semibold shadow-xs'
                      : 'text-fg-muted hover:bg-line/40'
                  }`}
                  onClick={() => setSelectedCategory('concept')}
                  type="button"
                >
                  <BookOpen className="w-3 h-3" />
                  Terms ({termsCount})
                </button>
              )}
            </div>

            {/* Sort toggle */}
            <div className="flex items-center shrink-0">
              <button
                aria-label="Toggle sort order"
                className="p-1 rounded-md hover:bg-line/40 text-fg-muted flex items-center gap-1 text-xs"
                onClick={() => {
                  if (sortBy === 'mentions') setSortBy('chronological');
                  else if (sortBy === 'chronological') setSortBy('alphabetical');
                  else setSortBy('mentions');
                }}
                title={`Sort: ${sortBy}`}
                type="button"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="capitalize">{sortBy === 'chronological' ? 'Timeline' : sortBy}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Entity List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {displayedEntities.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-subtle flex items-center justify-center mx-auto text-fg-muted border border-line/60">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-fg">
                  No entities found
                </p>
                <p className="text-xs text-fg-muted mt-1 max-w-xs mx-auto">
                  {searchQuery
                    ? `No characters, locations, or terms match "${searchQuery}".`
                    : selectedCategory !== 'all'
                    ? `No ${selectedCategory} entities detected in this passage.`
                    : 'Start reading or expand scope to explore characters across the book.'}
                </p>
              </div>

              {/* Action recovery buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {searchQuery && (
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-subtle hover:bg-surface border border-line text-fg transition-colors"
                    onClick={() => setSearchQuery('')}
                    type="button"
                  >
                    Clear search
                  </button>
                )}
                {selectedCategory !== 'all' && (
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-subtle hover:bg-surface border border-line text-fg transition-colors"
                    onClick={() => setSelectedCategory('all')}
                    type="button"
                  >
                    Show all categories
                  </button>
                )}
                {scope === 'chapter' && hasMultipleChapters && (
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:opacity-90 transition-opacity shadow-xs"
                    onClick={() => setScope('book')}
                    type="button"
                  >
                    Search entire book
                  </button>
                )}
              </div>
            </div>
          ) : (
            displayedEntities.map((entity: XRayEntity, index: number) => {
              const isExpanded = expandedEntityId === entity.id;
              const initials = getInitials(entity.name);

              return (
                <div
                  className="rounded-xl border border-line bg-light-card dark:bg-dark-secondary/60 shadow-xs hover:border-accent/40 transition-all overflow-hidden"
                  key={`${entity.id}-${index}`}
                >
                  {/* Entity Card Header */}
                  <button
                    aria-expanded={isExpanded}
                    className="w-full text-left p-3 flex items-start gap-3 cursor-pointer select-none bg-transparent border-0"
                    onClick={() => setExpandedEntityId(isExpanded ? null : entity.id)}
                    type="button"
                  >
                    {/* Avatar Initials Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold ${entity.color}`}
                    >
                      {initials}
                    </div>

                    {/* Entity Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-semibold text-fg truncate flex items-center gap-1.5">
                          {entity.name}
                        </h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface/80 text-fg-muted shrink-0 border border-line/60">
                          {entity.mentionsCount} {entity.mentionsCount === 1 ? 'mention' : 'mentions'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-fg-muted">
                        <span className="inline-flex items-center gap-1 capitalize">
                          {renderCategoryIcon(entity.category)}
                          {entity.category}
                        </span>

                        {entity.firstChapterTitle && scope === 'book' && (
                          <>
                            <span>•</span>
                            <span className="truncate flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              First seen: {entity.firstChapterTitle}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Aliases pill */}
                      {entity.aliases.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {entity.aliases.map((alias) => (
                            <span
                              className="text-2xs px-1.5 py-0.5 rounded bg-surface/80 text-fg-muted border border-line/60"
                              key={alias}
                            >
                              aka {alias}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expand/Collapse Chevron Indicator */}
                    <div className="p-1 text-light-text-muted hover:text-fg shrink-0 mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Excerpts List */}
                  {isExpanded && (
                    <div className="border-t border-line/60 bg-subtle/50 dark:bg-subtle/40 p-3 space-y-2 animate-in fade-in duration-150">
                      <div className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Contextual Excerpts ({entity.occurrences.length})
                      </div>

                      <div className="space-y-2">
                        {entity.occurrences.map((occ, idx) => (
                          <div
                            className="text-xs p-2.5 rounded-lg bg-page border border-line/70 text-fg leading-relaxed group"
                            key={idx}
                          >
                            <p>
                              {highlightEntity(occ.excerpt, entity.name, entity.aliases)}
                            </p>

                            <div className="mt-2 flex items-center justify-between text-xs text-fg-muted">
                              <span>
                                {occ.chapterTitle ? occ.chapterTitle : `Chapter ${(occ.chapterIndex ?? 0) + 1}`}
                              </span>

                              {onNavigateToChapter && occ.chapterIndex !== undefined && (
                                <button
                                  className="inline-flex items-center gap-1 text-accent hover:underline font-medium opacity-85 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateToChapter(occ.chapterIndex!);
                                  }}
                                  type="button"
                                >
                                  Go to passage
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-line text-xs text-fg-muted flex items-center justify-between shrink-0 bg-subtle/60">
          <span>Press <kbd className="font-mono bg-line/60 border border-line px-1 py-0.5 rounded text-2xs text-fg">X</kbd> to toggle</span>
          <span>Book Index</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

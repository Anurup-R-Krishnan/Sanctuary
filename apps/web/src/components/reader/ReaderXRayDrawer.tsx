import {
  ArrowUpDown,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
  Search,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

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
  }, [scope, bookChapters, activeChapterText, activeChapterIndex, activeChapterTitle]);

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
        return <Sparkles className="w-3.5 h-3.5" />;
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        aria-label="Close drawer backdrop"
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in cursor-default border-0"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      {/* Slide-over drawer */}
      <div className="relative w-full max-w-md bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl border-l border-stone-200 dark:border-stone-800 flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-100/70 dark:bg-stone-900/70 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight flex items-center gap-2">
                X-Ray Dossier
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-normal">
                  {displayedEntities.length}
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-[210px]">
                {scope === 'chapter' ? activeChapterTitle : 'Full Book Scope'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Scope toggle (Chapter vs Book) */}
            {hasMultipleChapters && (
              <div className="flex items-center bg-stone-200/80 dark:bg-stone-800 p-0.5 rounded-lg text-xs font-medium">
                <button
                  className={`px-2 py-1 rounded-md transition-all ${
                    scope === 'chapter'
                      ? 'bg-white dark:bg-stone-700 shadow-xs text-stone-900 dark:text-stone-100'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                  onClick={() => setScope('chapter')}
                  type="button"
                >
                  Chapter
                </button>
                <button
                  className={`px-2 py-1 rounded-md transition-all ${
                    scope === 'book'
                      ? 'bg-white dark:bg-stone-700 shadow-xs text-stone-900 dark:text-stone-100'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                  onClick={() => setScope('book')}
                  type="button"
                >
                  Book
                </button>
              </div>
            )}

            <button
              aria-label="Close X-Ray Dossier"
              className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
              onClick={onClose}
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filter Toolbar */}
        <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex flex-col gap-2.5 shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 transition-all placeholder:text-stone-400"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter characters, locations, or aliases…"
              type="text"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
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
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                }`}
                onClick={() => setSelectedCategory('all')}
                type="button"
              >
                All ({allEntities.length})
              </button>
              <button
                className={`px-2 py-1 rounded-md transition-colors shrink-0 font-medium flex items-center gap-1 ${
                  selectedCategory === 'character'
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
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
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
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
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                  }`}
                  onClick={() => setSelectedCategory('concept')}
                  type="button"
                >
                  <Sparkles className="w-3 h-3" />
                  Terms ({termsCount})
                </button>
              )}
            </div>

            {/* Sort toggle */}
            <div className="flex items-center shrink-0">
              <button
                aria-label="Toggle sort order"
                className="p-1 rounded-md hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 flex items-center gap-1 text-[11px]"
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
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-stone-200/80 dark:bg-stone-800 flex items-center justify-center mx-auto mb-3 text-stone-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                No entities found
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs mx-auto">
                {searchQuery
                  ? `No characters or locations matching "${searchQuery}".`
                  : 'Start reading or switch to full book scope to explore character dossiers.'}
              </p>
            </div>
          ) : (
            displayedEntities.map((entity: XRayEntity) => {
              const isExpanded = expandedEntityId === entity.id;
              const initials = getInitials(entity.name);

              return (
                <div
                  className="rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-850 shadow-xs hover:border-stone-300 dark:hover:border-stone-700 transition-all overflow-hidden"
                  key={entity.id}
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
                        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                          {entity.name}
                        </h3>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0 border border-stone-200/60 dark:border-stone-700/60">
                          {entity.mentionsCount} {entity.mentionsCount === 1 ? 'mention' : 'mentions'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-stone-500 dark:text-stone-400">
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
                              className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700/60"
                              key={alias}
                            >
                              aka {alias}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expand/Collapse Chevron Indicator */}
                    <div className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 shrink-0 mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Excerpts List */}
                  {isExpanded && (
                    <div className="border-t border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 p-3 space-y-2 animate-in fade-in duration-150">
                      <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        Contextual Excerpts ({entity.occurrences.length})
                      </div>

                      <div className="space-y-2">
                        {entity.occurrences.map((occ, idx) => (
                          <div
                            className="text-xs p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/50 text-stone-700 dark:text-stone-300 leading-relaxed group"
                            key={idx}
                          >
                            <p>
                              {highlightEntity(occ.excerpt, entity.name, entity.aliases)}
                            </p>

                            <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500">
                              <span>
                                {occ.chapterTitle ? occ.chapterTitle : `Chapter ${(occ.chapterIndex ?? 0) + 1}`}
                              </span>

                              {onNavigateToChapter && occ.chapterIndex !== undefined && (
                                <button
                                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium opacity-80 group-hover:opacity-100 transition-opacity"
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
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between shrink-0 bg-stone-100/50 dark:bg-stone-900/50">
          <span>Press <kbd className="font-mono bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded text-[10px]">X</kbd> to toggle</span>
          <span>Heuristic NER • Zero external calls</span>
        </div>
      </div>
    </div>
  );
};

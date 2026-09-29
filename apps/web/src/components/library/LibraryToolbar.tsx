import { ChevronDown, Filter, Globe, Grid3X3, List, SortAsc } from "lucide-react";
import React from "react";

import type { FilterOption, SortOption, ViewMode } from "@/types";

import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { IconButton } from "@/components/ui/IconButton";

interface LibraryToolbarProps {
  bookCount: number;
  filterBy: FilterOption;
  filterLabel: string;
  onOpenCatalog?: () => void;
  setFilterBy: (v: FilterOption) => void;
  setShowFilterMenu: (v: boolean) => void;
  setShowSortMenu: (v: boolean) => void;
  setSortBy: (v: SortOption) => void;
  setViewMode: (v: ViewMode) => void;
  showFilterMenu: boolean;
  showSortMenu: boolean;
  sortBy: SortOption;
  sortLabel: string;
  viewMode: ViewMode;
}

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Recently Opened", value: "recent" },
  { label: "Title", value: "title" },
  { label: "Author", value: "author" },
  { label: "Progress", value: "progress" },
  { label: "Date Added", value: "added" },
];

const FILTER_OPTIONS: { label: string; value: FilterOption }[] = [
  { label: "All Books", value: "all" },
  { label: "Favorites", value: "favorites" },
  { label: "To Read", value: "to-read" },
  { label: "Reading", value: "reading" },
  { label: "Finished", value: "finished" },
];

export function LibraryToolbar({
  bookCount,
  filterBy,
  filterLabel,
  onOpenCatalog,
  setFilterBy,
  setShowFilterMenu,
  setShowSortMenu,
  setSortBy,
  setViewMode,
  showFilterMenu,
  showSortMenu,
  sortBy,
  sortLabel,
  viewMode,
}: LibraryToolbarProps) {
  const sortMenuId = "library-sort-menu";
  const filterMenuId = "library-filter-menu";
  const sortTriggerId = "library-sort-trigger";
  const filterTriggerId = "library-filter-trigger";

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-line pb-5">
      <div>
        <p className="label-caps">
          {bookCount} {bookCount === 1 ? "book" : "books"}
        </p>
        <h1 className="mt-1.5 font-display text-4xl font-medium tracking-[-0.025em] text-fg sm:text-[2.75rem] sm:leading-[1.05]">Library</h1>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center p-0.5 rounded-lg border border-line bg-surface">
          <IconButton
            onClick={() => setViewMode("grid")}
            label="Grid view"
            icon={<Grid3X3 className="w-4 h-4" />}
            variant="ghost"
            className={viewMode === "grid" ? "bg-page shadow-xs text-fg font-medium" : "text-fg-muted hover:text-fg"}
          />
          <IconButton
            onClick={() => setViewMode("list")}
            label="List view"
            icon={<List className="w-4 h-4" />}
            variant="ghost"
            className={viewMode === "list" ? "bg-page shadow-xs text-fg font-medium" : "text-fg-muted hover:text-fg"}
          />
        </div>

        <div className="relative">
          <Button
            id={sortTriggerId}
            onClick={() => {
              setShowSortMenu(!showSortMenu);
              setShowFilterMenu(false);
            }}
            variant="secondary"
            aria-label={`Sort by: ${sortLabel}`}
            aria-haspopup="menu"
            aria-expanded={showSortMenu}
            aria-controls={showSortMenu ? sortMenuId : undefined}
            className="inline-flex items-center gap-1.5 !px-3 !py-2 !rounded-lg text-fg-muted whitespace-nowrap"
          >
            <SortAsc className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">{sortLabel}</span>
            <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
          </Button>
          <DropdownMenu
            id={sortMenuId}
            show={showSortMenu}
            options={SORT_OPTIONS}
            value={sortBy}
            onSelect={(v) => setSortBy(v as SortOption)}
            onClose={() => setShowSortMenu(false)}
            triggerId={sortTriggerId}
          />
        </div>

        <div className="relative">
          <Button
            id={filterTriggerId}
            onClick={() => {
              setShowFilterMenu(!showFilterMenu);
              setShowSortMenu(false);
            }}
            variant="secondary"
            aria-label={`Filter by: ${filterLabel}`}
            aria-haspopup="menu"
            aria-expanded={showFilterMenu}
            aria-controls={showFilterMenu ? filterMenuId : undefined}
            className="inline-flex items-center gap-1.5 !px-3 !py-2 !rounded-lg text-fg-muted whitespace-nowrap"
          >
            <Filter className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">{filterLabel}</span>
            <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${showFilterMenu ? "rotate-180" : ""}`} />
          </Button>
          <DropdownMenu
            id={filterMenuId}
            onClose={() => setShowFilterMenu(false)}
            onSelect={(v) => setFilterBy(v as FilterOption)}
            options={FILTER_OPTIONS}
            show={showFilterMenu}
            triggerId={filterTriggerId}
            value={filterBy}
          />
        </div>

        {onOpenCatalog && (
          <Button
            aria-label="Open OPDS Catalogs"
            className="inline-flex items-center gap-1.5 !px-3 !py-2 !rounded-lg text-fg-muted whitespace-nowrap"
            onClick={onOpenCatalog}
            variant="secondary"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Catalogs</span>
          </Button>
        )}
      </div>
    </div>
  );
}

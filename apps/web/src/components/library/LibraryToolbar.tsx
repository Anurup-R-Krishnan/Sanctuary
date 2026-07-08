import { Grid3X3, List, SortAsc, Filter, ChevronDown } from "lucide-react";
import React from "react";

import type { SortOption, FilterOption, ViewMode } from "@/types";

import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { IconButton } from "@/components/ui/IconButton";

interface LibraryToolbarProps {
  bookCount: number;
  filterBy: FilterOption;
  filterLabel: string;
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

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently Opened" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "progress", label: "Progress" },
  { value: "added", label: "Date Added" },
];

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All Books" },
  { value: "favorites", label: "Favorites" },
  { value: "to-read", label: "To Read" },
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
];

export function LibraryToolbar({
  bookCount,
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  sortLabel,
  showSortMenu,
  setShowSortMenu,
  filterBy,
  setFilterBy,
  filterLabel,
  showFilterMenu,
  setShowFilterMenu,
}: LibraryToolbarProps) {
  const sortMenuId = "library-sort-menu";
  const filterMenuId = "library-filter-menu";

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Library</h2>
        <p className="text-light-text-muted dark:text-dark-text-muted mt-1 text-sm">
          {bookCount} {bookCount === 1 ? "book" : "books"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center p-0.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface">
          <IconButton
            onClick={() => setViewMode("grid")}
            label="Grid view"
            icon={<Grid3X3 className="w-4 h-4" />}
            variant="ghost"
            className={viewMode === "grid" ? "bg-black/[0.05] dark:bg-white/[0.08] text-light-text dark:text-dark-text" : "text-light-text-muted/50 dark:text-dark-text-muted/50 hover:text-light-text dark:hover:text-dark-text"}
          />
          <IconButton
            onClick={() => setViewMode("list")}
            label="List view"
            icon={<List className="w-4 h-4" />}
            variant="ghost"
            className={viewMode === "list" ? "bg-black/[0.05] dark:bg-white/[0.08] text-light-text dark:text-dark-text" : "text-light-text-muted/50 dark:text-dark-text-muted/50 hover:text-light-text dark:hover:text-dark-text"}
          />
        </div>

        <div className="relative">
          <Button
            onClick={() => {
              setShowSortMenu(!showSortMenu);
              setShowFilterMenu(false);
            }}
            variant="secondary"
            aria-label={`Sort by: ${sortLabel}`}
            aria-haspopup="menu"
            aria-expanded={showSortMenu}
            aria-controls={showSortMenu ? sortMenuId : undefined}
            className="gap-1.5 !px-3 !py-2 !rounded-lg text-light-text-muted dark:text-dark-text-muted"
          >
            <SortAsc className="w-4 h-4" />
            <span className="hidden sm:inline">{sortLabel}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
          </Button>
          <DropdownMenu
            id={sortMenuId}
            show={showSortMenu}
            options={SORT_OPTIONS}
            value={sortBy}
            onSelect={(v) => setSortBy(v as SortOption)}
            onClose={() => setShowSortMenu(false)}
          />
        </div>

        <div className="relative">
          <Button
            onClick={() => {
              setShowFilterMenu(!showFilterMenu);
              setShowSortMenu(false);
            }}
            variant="secondary"
            aria-label={`Filter by: ${filterLabel}`}
            aria-haspopup="menu"
            aria-expanded={showFilterMenu}
            aria-controls={showFilterMenu ? filterMenuId : undefined}
            className="gap-1.5 !px-3 !py-2 !rounded-lg text-light-text-muted dark:text-dark-text-muted"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{filterLabel}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilterMenu ? "rotate-180" : ""}`} />
          </Button>
          <DropdownMenu
            id={filterMenuId}
            show={showFilterMenu}
            options={FILTER_OPTIONS}
            value={filterBy}
            onSelect={(v) => setFilterBy(v as FilterOption)}
            onClose={() => setShowFilterMenu(false)}
          />
        </div>
      </div>
    </div>
  );
}

import {
    List,
    ArrowUp,
    ArrowDown,
    ChevronRight,
    ChevronDown,
    Search,
    Bookmark as BookmarkIcon,
    X
} from "lucide-react";
import { useState } from "react";

import type { Bookmark } from "@/types";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";

interface TocItem {
    href: string;
    id: string;
    label: string;
    subitems?: TocItem[] | undefined;
}

interface ReaderControlsProps {
    bookmarks: Bookmark[];
    onClose?: () => void;
    onJumpToBottom: () => void;
    onJumpToTop: () => void;
    onNavigate: (href: string) => void;
    onRemoveBookmark: (id: string) => void;
    toc: TocItem[];
}

function ReaderControls({
    toc,
    bookmarks,
    onClose,
    onNavigate,
    onJumpToTop,
    onJumpToBottom,
    onRemoveBookmark,
}: ReaderControlsProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<"chapters" | "bookmarks">("chapters");

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedItems(newExpanded);
    };

    const filterToc = (items: TocItem[]): TocItem[] => {
        if (!searchQuery) return items;
        return items.reduce((acc: TocItem[], item) => {
            const matches = item.label.toLowerCase().includes(searchQuery.toLowerCase());
            const filteredSub = item.subitems ? filterToc(item.subitems) : [];
            if (matches || filteredSub.length > 0) {
                acc.push({ ...item, subitems: filteredSub });
            }
            return acc;
        }, []);
    };

    const filteredToc = filterToc(toc);

    const TocEntry = ({ item, depth = 0 }: { item: TocItem; depth?: number }) => {
        const hasSubs = item.subitems && item.subitems.length > 0;
        const isExpanded = expandedItems.has(item.id);

        return (
            <div className="select-none">
                <div
                    className="flex flex-wrap items-center gap-1 px-2 py-1.5 rounded-lg transition-colors cursor-pointer hover:bg-light-surface/80 dark:hover:bg-dark-surface/80"
                    style={{ paddingLeft: `${8 + depth * 12}px` }}
                    onClick={() => onNavigate(item.href)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onNavigate(item.href);
                        }
                    }}
                    role="button"
                    tabIndex={0}
                >
                    {hasSubs && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                            className="mr-1"
                            label={isExpanded ? "Collapse" : "Expand"}
                            icon={isExpanded ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
                            variant="ghost"
                            size="sm"
                        />
                    )}
                    {!hasSubs && <div className="w-4" />}
                    <span
                        className="text-sm truncate flex-1 text-light-text dark:text-dark-text opacity-80"
                    >
                        {item.label}
                    </span>
                </div>
                {hasSubs && isExpanded && (
                    <div className="mt-0.5">
                        {item.subitems!.map(sub => <TocEntry key={sub.id} item={sub} depth={depth + 1} />)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                <h2 className="font-semibold text-light-text dark:text-dark-text">Contents</h2>
                {onClose && (
                    <IconButton
                        onClick={onClose}
                        label="Close contents"
                        icon={<X className="w-4 h-4" />}
                        variant="ghost"
                        size="sm"
                    />
                )}
            </div>

            <div className="flex-1 flex flex-col p-4 pb-4 overflow-hidden">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 mb-6">
                <Button
                    onClick={onJumpToTop}
                    variant="secondary"
                    className="gap-2 py-2.5"
                >
                    <ArrowUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Top</span>
                </Button>
                <Button
                    onClick={onJumpToBottom}
                    variant="secondary"
                    className="gap-2 py-2.5"
                >
                    <ArrowDown className="w-4 h-4" />
                    <span className="text-sm font-medium">Bottom</span>
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border rounded-xl mb-4" role="tablist">
                <Button
                    onClick={() => setActiveTab("chapters")}
                    role="tab"
                    aria-selected={activeTab === "chapters"}
                    variant="nav"
                    className={`relative flex-1 gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-instant ${activeTab === "chapters"
                        ? "text-light-accent dark:text-dark-accent font-semibold"
                        : "text-light-text-muted/60 dark:text-dark-text-muted/60 hover:text-light-text dark:hover:text-dark-text"
                        }`}
                >
                    {activeTab === "chapters" && (
                        <div className="absolute inset-0 bg-light-primary dark:bg-dark-primary rounded-lg shadow-xs border border-light-border dark:border-dark-border" />
                    )}
                    <List className="w-4 h-4 relative" />
                    <span className="relative">Chapters</span>
                </Button>
                <Button
                    onClick={() => setActiveTab("bookmarks")}
                    role="tab"
                    aria-selected={activeTab === "bookmarks"}
                    variant="nav"
                    className={`relative flex-1 gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-instant ${activeTab === "bookmarks"
                        ? "text-light-accent dark:text-dark-accent font-semibold"
                        : "text-light-text-muted/60 dark:text-dark-text-muted/60 hover:text-light-text dark:hover:text-dark-text"
                        }`}
                >
                    {activeTab === "bookmarks" && (
                        <div className="absolute inset-0 bg-light-primary dark:bg-dark-primary rounded-lg shadow-xs border border-light-border dark:border-dark-border" />
                    )}
                    <BookmarkIcon className="w-4 h-4 relative" />
                    <span className="relative">Bookmarks</span>
                </Button>
            </div>

            {/* Content */}
            <div
                className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2"
                role="tabpanel"
                aria-label={activeTab === "chapters" ? "Chapters" : "Bookmarks"}
            >
                {activeTab === "chapters" ? (
                    <>
                        <div className="mb-4">
                            <Input
                                type="text"
                                placeholder="Search chapters..."
                                aria-label="Search chapters"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                icon={<Search className="w-4 h-4 opacity-40" />}
                            />
                        </div>
                        <div className="space-y-0.5">
                            {filteredToc.length > 0 ? (
                                filteredToc.map(item => <TocEntry key={item.id} item={item} />)
                            ) : (
                                <p className="text-center py-8 text-sm text-light-text-muted dark:text-dark-text-muted opacity-80">No chapters found</p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="space-y-2">
                        {bookmarks.length > 0 ? (
                            bookmarks.map(bm => (
                                <div key={bm.id} className="group flex flex-wrap items-center gap-3 p-3 rounded-xl border border-light-border/40 dark:border-dark-border/40 hover:bg-light-surface/80 dark:hover:bg-dark-surface/80 transition-colors">
                                    <Button
                                        onClick={() => onNavigate(bm.cfi)}
                                        variant="ghost"
                                        className="flex-1 !justify-start !text-left !px-0 !py-0 !rounded-none"
                                    >
                                        <span className="flex flex-col items-start gap-0.5">
                                            <span className="text-sm font-medium text-light-text dark:text-dark-text">{bm.title}</span>
                                            <span className="text-xs text-light-text-muted dark:text-dark-text-muted">{new Date(bm.createdAt).toLocaleDateString()}</span>
                                        </span>
                                    </Button>
                                    <IconButton
                                        onClick={() => onRemoveBookmark(bm.id)}
                                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all"
                                        label="Remove bookmark"
                                        icon={<X className="w-4 h-4" />}
                                        variant="ghost"
                                        size="sm"
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 px-6 text-center animate-fadeIn">
                                <div className="w-14 h-14 mb-4 rounded-2xl bg-light-surface/60 dark:bg-dark-surface/60 flex items-center justify-center border border-light-border dark:border-dark-border">
                                    <BookmarkIcon className="w-6 h-6 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.5} />
                                </div>
                                <p className="text-light-text dark:text-dark-text font-medium">No bookmarks yet</p>
                                <p className="mt-1 text-sm text-light-text-muted dark:text-dark-text-muted">Bookmark pages while reading to find them quickly.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default ReaderControls;

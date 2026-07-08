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
import { useSettings } from "@/store/useSettingsStore";

interface TocItem {
    href: string;
    id: string;
    label: string;
    subitems?: TocItem[] | undefined;
}

interface ReaderControlsProps {
    bookmarks: Bookmark[];
    onJumpToBottom: () => void;
    onJumpToTop: () => void;
    onNavigate: (href: string) => void;
    onRemoveBookmark: (id: string) => void;
    toc: TocItem[];
}

function ReaderControls({
    toc,
    bookmarks,
    onNavigate,
    onJumpToTop,
    onJumpToBottom,
    onRemoveBookmark,
}: ReaderControlsProps) {
    const readerForeground = useSettings((state) => state.readerForeground);
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
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
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
                        className="text-sm truncate flex-1 opacity-80"
                        style={{ color: readerForeground }}
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
        <div className="flex flex-col h-full pb-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 mb-6">
                <Button
                    onClick={onJumpToTop}
                    variant="secondary"
                    className="gap-2 !p-3 !rounded-xl"
                >
                    <ArrowUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Top</span>
                </Button>
                <Button
                    onClick={onJumpToBottom}
                    variant="secondary"
                    className="gap-2 !p-3 !rounded-xl"
                >
                    <ArrowDown className="w-4 h-4" />
                    <span className="text-sm font-medium">Bottom</span>
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-xl mb-4" role="tablist">
                <Button
                    onClick={() => setActiveTab("chapters")}
                    role="tab"
                    aria-selected={activeTab === "chapters"}
                    variant="nav"
                    className={`flex-1 gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-200 ${activeTab === "chapters"
                        ? "bg-white dark:bg-white/10 shadow-sm font-medium"
                        : "opacity-60 hover:opacity-100"
                        }`}
                    style={{ color: activeTab === "chapters" ? readerForeground : undefined }}
                >
                    <List className="w-4 h-4" />
                    <span>Chapters</span>
                </Button>
                <Button
                    onClick={() => setActiveTab("bookmarks")}
                    role="tab"
                    aria-selected={activeTab === "bookmarks"}
                    variant="nav"
                    className={`flex-1 gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-200 ${activeTab === "bookmarks"
                        ? "bg-white dark:bg-white/10 shadow-sm font-medium"
                        : "opacity-60 hover:opacity-100"
                        }`}
                    style={{ color: activeTab === "bookmarks" ? readerForeground : undefined }}
                >
                    <BookmarkIcon className="w-4 h-4" />
                    <span>Bookmarks</span>
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2">
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
                                <p className="text-center py-8 opacity-50 text-sm">No chapters found</p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="space-y-2">
                        {bookmarks.length > 0 ? (
                            bookmarks.map(bm => (
                                <div key={bm.id} className="group flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <Button
                                        onClick={() => onNavigate(bm.cfi)}
                                        variant="ghost"
                                        className="flex-1 !justify-start !text-left !px-0 !py-0 !rounded-none"
                                    >
                                        <span className="flex flex-col items-start gap-0.5">
                                            <span className="text-sm font-medium" style={{ color: readerForeground }}>{bm.title}</span>
                                            <span className="text-xs opacity-60">{new Date(bm.createdAt).toLocaleDateString()}</span>
                                        </span>
                                    </Button>
                                    <IconButton
                                        onClick={() => onRemoveBookmark(bm.id)}
                                        className="opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-all"
                                        label="Remove bookmark"
                                        icon={<X className="w-4 h-4" />}
                                        variant="ghost"
                                        size="sm"
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-8 opacity-50 text-sm">No bookmarks yet</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReaderControls;

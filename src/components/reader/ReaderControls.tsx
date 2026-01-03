import React, { useState } from "react";
import { 
    List, 
    ArrowUp, 
    ArrowDown, 
    SkipForward, 
    Book, 
    Keyboard, 
    HelpCircle, 
    ChevronRight,
    ChevronDown,
    Search,
    Bookmark as BookmarkIcon,
    X
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { Bookmark } from "@/types";

interface TocItem {
    id: string;
    href: string;
    label: string;
    subitems?: TocItem[];
}

interface ReaderControlsProps {
    toc: TocItem[];
    bookmarks: Bookmark[];
    currentChapter: string;
    onNavigate: (href: string, label: string) => void;
    onNextChapter: () => void;
    onJumpToTop: () => void;
    onJumpToBottom: () => void;
    onRemoveBookmark: (id: string) => void;
}

const ReaderControls: React.FC<ReaderControlsProps> = ({
    toc,
    bookmarks,
    currentChapter,
    onNavigate,
    onNextChapter,
    onJumpToTop,
    onJumpToBottom,
    onRemoveBookmark,
}) => {
    const { readerAccent, readerForeground } = useSettings();
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
        const isActive = currentChapter === item.label;

        return (
            <div className="select-none">
                <div 
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${isActive ? "bg-light-accent/10 dark:bg-dark-accent/10" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
                    style={{ paddingLeft: `${8 + depth * 12}px` }}
                    onClick={() => onNavigate(item.href, item.label)}
                >
                    {hasSubs && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                            aria-expanded={isExpanded}
                        >
                            {isExpanded ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
                        </button>
                    )}
                    {!hasSubs && <div className="w-4" />}
                    <span 
                        className={`text-sm truncate flex-1 ${isActive ? "font-medium" : "opacity-80"}`}
                        style={{ color: isActive ? readerAccent : readerForeground }}
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
                <button 
                    onClick={onNextChapter}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                    <SkipForward className="w-4 h-4" />
                    <span className="text-sm font-medium">Next Chapter</span>
                </button>
                <button 
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-50 cursor-not-allowed"
                    title="Not implemented"
                    disabled
                    aria-disabled="true"
                >
                    <Book className="w-4 h-4" />
                    <span className="text-sm font-medium">Series</span>
                </button>
                <button 
                    onClick={onJumpToTop}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                    <ArrowUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Top</span>
                </button>
                <button 
                    onClick={onJumpToBottom}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                    <ArrowDown className="w-4 h-4" />
                    <span className="text-sm font-medium">Bottom</span>
                </button>
            </div>

            {/* Utilities */}
            <div className="flex gap-2 mb-6 pb-6 border-b border-black/10 dark:border-white/10">
                <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <Keyboard className="w-4 h-4 opacity-70" />
                    <span className="text-xs font-medium">Shortcuts</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <HelpCircle className="w-4 h-4 opacity-70" />
                    <span className="text-xs font-medium">Help</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-xl mb-4" role="tablist">
                <button
                    onClick={() => setActiveTab("chapters")}
                    role="tab"
                    aria-selected={activeTab === "chapters"}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-200 ${activeTab === "chapters"
                            ? "bg-white dark:bg-white/10 shadow-sm font-medium"
                            : "opacity-60 hover:opacity-100"
                        }`}
                    style={{ color: activeTab === "chapters" ? readerForeground : undefined }}
                >
                    <List className="w-4 h-4" />
                    <span>Chapters</span>
                </button>
                <button
                    onClick={() => setActiveTab("bookmarks")}
                    role="tab"
                    aria-selected={activeTab === "bookmarks"}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-200 ${activeTab === "bookmarks"
                            ? "bg-white dark:bg-white/10 shadow-sm font-medium"
                            : "opacity-60 hover:opacity-100"
                        }`}
                    style={{ color: activeTab === "bookmarks" ? readerForeground : undefined }}
                >
                    <BookmarkIcon className="w-4 h-4" />
                    <span>Bookmarks</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2">
                {activeTab === "chapters" ? (
                    <>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                            <input 
                                type="text" 
                                placeholder="Search chapters..." 
                                aria-label="Search chapters"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border-none text-sm focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent outline-none"
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
                                    <button 
                                        onClick={() => onNavigate(bm.cfi, bm.title)} 
                                        className="flex-1 text-left"
                                    >
                                        <p className="text-sm font-medium" style={{ color: readerForeground }}>{bm.title}</p>
                                        <p className="text-xs opacity-60">{new Date(bm.createdAt).toLocaleDateString()}</p>
                                    </button>
                                    <button 
                                        onClick={() => onRemoveBookmark(bm.id)} 
                                        className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                        aria-label="Remove bookmark"
                                    >
                                        <X className="w-4 h-4 text-red-500" />
                                    </button>
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

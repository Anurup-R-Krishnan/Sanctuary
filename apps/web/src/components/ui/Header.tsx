import React, { useState } from "react";
import { Theme } from "@/types";
import { Search, Moon, Sun, User, LogOut, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  searchTerm: string;
  onSearch: (term: string) => void;
  isGuest: boolean;
  onShowLogin?: () => void;
  onSignOut?: () => void;
  userEmail?: string | null;
  userImage?: string | null;
}

const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  searchTerm,
  onSearch,
  isGuest,
  onShowLogin,
  onSignOut,
  userEmail,
  userImage,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-40 pt-4 pb-2 px-4 md:px-8 bg-[rgb(var(--paper-cream))] bg-opacity-95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto">
        <div className="relative flex items-center justify-between p-3 rounded-lg border-2 border-[rgb(var(--ink-navy))] bg-white shadow-pixel transition-all duration-300">
            {/* Shelf/Wood Texture Top Border (CSS handled in index.css generally, but specific here) */}
            <div className="absolute -top-2 left-4 right-4 h-2 bg-[rgb(var(--aged-paper))] border-x-2 border-t-2 border-[rgb(var(--ink-navy))] rounded-t-md -z-10" />

            {/* Left: Brand / Logo */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[rgb(var(--woodstock-gold))] border-2 border-[rgb(var(--ink-navy))] rounded-full flex items-center justify-center font-serif font-bold text-xl text-[rgb(var(--ink-navy))]">
                    S
                </div>
                <span className="hidden sm:block font-serif font-bold text-xl text-[rgb(var(--ink-navy))] tracking-tight">
                    Sanctuary
                </span>
            </div>

            {/* Center: Index Card Search */}
            <div className="flex-1 max-w-md mx-4 relative perspective-500">
                <motion.div
                    animate={{
                        rotateX: isSearchFocused ? -5 : 0,
                        y: isSearchFocused ? -4 : 0,
                        scale: isSearchFocused ? 1.02 : 1
                    }}
                    className={`relative flex items-center gap-2 px-4 py-2 bg-[rgb(var(--paper-cream))] border-2 border-[rgb(var(--ink-navy))] rounded-md transition-shadow ${isSearchFocused ? "shadow-lg" : "shadow-sm"}`}
                >
                    <Search className={`w-4 h-4 ${isSearchFocused ? "text-[rgb(var(--clay-red))]" : "text-[rgb(var(--sepia-brown))]"}`} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearch(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Search index cards..."
                        className="w-full bg-transparent outline-none text-sm font-hand text-[rgb(var(--ink-navy))] placeholder-[rgb(var(--sepia-brown))]/50"
                    />
                    {searchTerm && (
                        <button onClick={() => onSearch("")} className="text-[rgb(var(--ink-navy))] hover:text-[rgb(var(--clay-red))]">
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {/* Index Tab */}
                    <div className="absolute -top-3 right-4 px-2 py-0.5 bg-[rgb(var(--paper-cream))] border-2 border-b-0 border-[rgb(var(--ink-navy))] rounded-t text-[8px] font-pixel font-bold uppercase tracking-widest text-[rgb(var(--ink-navy))]">
                        FIND
                    </div>
                </motion.div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-full hover:bg-[rgb(var(--aged-paper))] border-2 border-transparent hover:border-[rgb(var(--ink-navy))] transition-all"
                    title="Toggle lighting"
                >
                    {theme === Theme.DARK ? <Moon className="w-5 h-5 text-[rgb(var(--ink-navy))]" /> : <Sun className="w-5 h-5 text-[rgb(var(--ink-navy))]" />}
                </button>

                {isGuest ? (
                    <button
                        onClick={onShowLogin}
                        className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-[rgb(var(--ink-navy))] text-[rgb(var(--paper-cream))] rounded-full font-bold text-xs hover:bg-[rgb(var(--sage-green))] transition-colors border-2 border-transparent"
                    >
                        <User className="w-3 h-3" />
                        Sign In
                    </button>
                ) : (
                    <div className="relative group">
                        <button className="w-9 h-9 rounded-full overflow-hidden border-2 border-[rgb(var(--ink-navy))] bg-[rgb(var(--woodstock-gold))]">
                            {userImage ? (
                                <img src={userImage} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-[rgb(var(--ink-navy))]">
                                    {userEmail?.[0]?.toUpperCase() || "U"}
                                </div>
                            )}
                        </button>

                        {/* Dropdown Menu (Paper Style) */}
                        <div className="absolute right-0 top-full mt-2 w-48 py-1 bg-white border-2 border-[rgb(var(--ink-navy))] rounded-lg shadow-pixel opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <div className="px-4 py-2 border-b-2 border-[rgb(var(--ink-navy))]/10">
                                <p className="text-xs font-bold text-[rgb(var(--ink-navy))] truncate">{userEmail}</p>
                            </div>
                            <button
                                onClick={onSignOut}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

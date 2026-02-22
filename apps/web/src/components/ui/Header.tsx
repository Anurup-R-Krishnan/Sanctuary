import React, { useState } from "react";
import { Theme } from "@/types";
import { Search, Moon, Sun, User, LogOut, X, Sparkles, Star } from "lucide-react";
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
    <header className="relative z-50 pt-8 pb-4 px-4 sm:px-8">
      {/*
        ============================================================
        Header: Thick Rounded Rectangle
        ============================================================
      */}
      <div className="max-w-7xl mx-auto relative">
        <div
          className="relative flex items-center justify-between p-4 sm:p-5 rounded-2xl border-4 border-scrap-navy bg-scrap-cream shadow-scrap-deep transition-all duration-300"
        >
            {/* Hanging Charms (Dangling from the bottom edge) */}
            <div className="absolute -bottom-16 left-12 w-px h-16 bg-scrap-navy/40 flex flex-col items-center justify-end z-0 animate-wiggle origin-top">
                 <div className="w-5 h-5 rounded-full border-2 border-scrap-navy bg-[#F1E0C5] flex items-center justify-center shadow-sm">
                    <span className="text-xs">☾</span>
                 </div>
            </div>
            <div className="absolute -bottom-12 left-16 w-px h-12 bg-scrap-navy/40 flex flex-col items-center justify-end z-0 animate-wiggle origin-top" style={{ animationDelay: '1s' }}>
                 <div className="w-3 h-3 text-scrap-navy bg-white rounded-full border border-scrap-navy flex items-center justify-center shadow-sm">
                    <span className="text-[8px]">★</span>
                 </div>
            </div>

            {/* Left: Brand / Logo */}
            <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 bg-[#F1E0C5] border-2 border-scrap-navy rounded-full flex items-center justify-center font-head font-bold text-2xl text-scrap-navy shadow-inner transform rotate-[-3deg]">
                    S
                </div>
                <span className="font-head font-bold text-2xl text-scrap-navy tracking-tight hidden sm:block">
                    Sanctuary
                </span>
            </div>

            {/* Center: Search Bar (Taped Notebook Paper) */}
            <div className="flex-1 max-w-lg mx-4 sm:mx-8 relative group">
                {/* Tape Strip (Top Center) */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-scrap-sage/50 rotate-[-1deg] backdrop-blur-[1px] shadow-sm z-20 pointer-events-none"
                     style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.4) 5px, rgba(255,255,255,0.4) 10px)" }}
                />

                <motion.div
                    animate={{
                        rotate: isSearchFocused ? -1 : 1,
                        scale: isSearchFocused ? 1.02 : 1
                    }}
                    className="relative flex items-center gap-2 px-4 py-3 bg-white border border-scrap-navy/20 rounded-sm shadow-sm transition-shadow hover:shadow-md"
                    style={{
                        backgroundImage: "repeating-linear-gradient(transparent, transparent 23px, #e5e7eb 24px)",
                        backgroundAttachment: "local"
                    }}
                >
                    <Search className={`w-5 h-5 ${isSearchFocused ? "text-scrap-navy" : "text-scrap-blue"}`} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearch(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Search index cards..."
                        className="w-full bg-transparent outline-none text-base font-body text-scrap-navy placeholder-scrap-blue/60"
                    />
                    {searchTerm && (
                        <button onClick={() => onSearch("")} className="text-scrap-navy hover:text-red-500">
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {/* Index Tab */}
                    <div className="absolute -right-2 -top-4 bg-scrap-cream border-2 border-scrap-navy px-2 py-0.5 rounded-t-lg font-head text-[10px] font-bold uppercase tracking-widest text-scrap-navy transform rotate-6 shadow-sm">
                        FIND
                    </div>
                </motion.div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3 relative z-10">
                <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-full hover:bg-scrap-kraft/20 border-2 border-transparent hover:border-scrap-navy transition-all transform hover:rotate-12"
                    title="Toggle lighting"
                >
                    {theme === Theme.DARK ? <Moon className="w-6 h-6 text-scrap-navy" /> : <Sun className="w-6 h-6 text-scrap-navy" />}
                </button>

                {isGuest ? (
                    <button
                        onClick={onShowLogin}
                        className="hidden sm:flex items-center gap-2 px-5 py-2 bg-scrap-navy text-scrap-cream rounded-lg font-bold text-sm hover:bg-scrap-blue transition-all shadow-scrap-card hover:shadow-scrap-lift transform hover:-translate-y-0.5 font-head"
                    >
                        <User className="w-4 h-4" />
                        Sign In
                    </button>
                ) : (
                    <div className="relative group">
                        <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-scrap-navy bg-[#F1E0C5] shadow-md hover:scale-105 transition-transform">
                            {userImage ? (
                                <img src={userImage} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-scrap-navy font-head text-lg">
                                    {userEmail?.[0]?.toUpperCase() || "U"}
                                </div>
                            )}
                        </button>

                        {/* Dropdown Menu (Paper Style) */}
                        <div className="absolute right-0 top-full mt-3 w-56 p-1 bg-white border-2 border-scrap-navy rounded-lg shadow-scrap-deep opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 rotate-1 origin-top-right">
                             <div className="bg-[#faf9f6] border border-dashed border-gray-300 p-3 rounded">
                                <div className="pb-2 mb-2 border-b border-gray-200">
                                    <p className="text-xs font-bold text-scrap-navy truncate font-body">{userEmail}</p>
                                </div>
                                <button
                                    onClick={onSignOut}
                                    className="w-full text-left px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold font-head rounded transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                             </div>
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

import React, { useEffect, useRef, useState } from "react";
import { Search, LogOut, LogIn, X, BookOpen, Moon, Sun } from "lucide-react";
import { Theme } from "@/types";

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  searchTerm: string;
  onSearch: (term: string) => void;
  isGuest?: boolean;
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
  isGuest = false,
  onShowLogin,
  onSignOut,
  userEmail,
  userImage,
}) => {

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      <div className="w-full px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-light-surface/80 backdrop-blur-md border border-black/[0.08] flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 text-light-accent" strokeWidth={2} />
            </div>
            <div>
              <p className="text-base font-bold text-light-text leading-tight tracking-tight">Sanctuary</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isGuest ? (
              <button
                onClick={onShowLogin}
                className="h-[38px] px-4 rounded-xl bg-light-accent text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-transform hover:scale-105 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : onSignOut ? (
              <div className="flex items-center gap-3 bg-light-surface/80 backdrop-blur-md border border-black/[0.08] p-1.5 rounded-[14px] shadow-sm">
                {userImage && <img src={userImage} alt="Profile" className="w-7 h-7 rounded-lg" />}
                {userEmail && (
                  <span className="hidden lg:inline max-w-[150px] truncate text-[13px] font-medium text-light-text px-1">
                    {userEmail}
                  </span>
                )}
                <button
                  onClick={onSignOut}
                  className="h-7 px-2.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-light-text text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};


export default Header;

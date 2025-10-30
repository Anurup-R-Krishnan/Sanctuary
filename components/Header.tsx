import React, { useState } from 'react';
import { Theme } from '../types';
import ThemeToggle from './ThemeToggle';
import { SearchIcon } from './icons/SearchIcon';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  searchTerm: string;
  onSearch: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, searchTerm, onSearch }) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 md:px-8 bg-light-primary/80 dark:bg-dark-primary/80 backdrop-blur-lg shadow-soft-md dark:shadow-dark-soft-md">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center">
          <svg width="32" height="32" viewBox="0 0 24 24" className="text-light-accent dark:text-dark-accent mr-3">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8zm-1-12h2v4h-2zm0 6h2v2h-2z" opacity="0.3"/>
            <path fill="currentColor" d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8s8-3.59 8-8s-3.59-8-8-8zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6s6 2.69 6 6s-2.69 6-6 6zm1-10h-2v4h2v-4zm0 6h-2v2h2v-2z"/>
          </svg>
          <h1 className="font-serif text-xl font-semibold tracking-wider text-light-text dark:text-dark-text" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            Sanctuary
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={isSearchFocused ? "Search for books, authors..." : "Search"}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={`pl-10 pr-4 py-2 rounded-full bg-light-surface dark:bg-dark-surface border border-transparent focus:border-light-accent dark:focus:border-dark-accent focus:outline-none focus:ring-2 focus:ring-light-accent/50 dark:focus:ring-dark-accent/50 transition-all duration-300 ease-in-out text-light-text dark:text-dark-text placeholder-light-text-muted dark:placeholder-dark-text-muted ${isSearchFocused || searchTerm ? 'w-64' : 'w-40'}`}
            />
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
};

export default Header;

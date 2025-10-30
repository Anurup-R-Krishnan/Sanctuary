import React, { useState, useRef, useEffect } from 'react';
import { View } from '../types';
import { LibraryIcon } from './icons/LibraryIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

interface NavigationProps {
  activeView: View;
  onNavigate: (view: View) => void;
  isReaderActive: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate, isReaderActive }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const navItems = [
    { view: View.LIBRARY, label: 'Library', icon: LibraryIcon },
    { view: View.READER, label: 'Reading', icon: BookOpenIcon, disabled: !isReaderActive },
    { view: View.SETTINGS, label: 'Settings', icon: SettingsIcon },
  ];

  useEffect(() => {
    const activeItemIndex = navItems.findIndex(item => item.view === activeView);
    const activeItem = itemRefs.current[activeItemIndex];
    
    if (activeItem && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      
      setIndicatorStyle({
        width: itemRect.width,
        left: itemRect.left - navRect.left,
        opacity: 1
      });
    } else if (activeView === View.READER) {
      const readerItemIndex = navItems.findIndex(item => item.view === View.READER);
      const readerItem = itemRefs.current[readerItemIndex];
       if(readerItem && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const itemRect = readerItem.getBoundingClientRect();
        setIndicatorStyle({
            width: itemRect.width,
            left: itemRect.left - navRect.left,
            opacity: 1
        });
       }
    }
  }, [activeView, isReaderActive]);

  return (
    <nav 
      ref={navRef}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50 rounded-full bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-lg shadow-soft-lg dark:shadow-dark-soft-lg"
    >
      <div className="relative flex justify-around p-2">
        <div 
          className="absolute bottom-2 h-10 rounded-full bg-light-primary dark:bg-dark-primary shadow-soft-md dark:shadow-dark-soft-md transition-all duration-500 ease-spring"
          style={indicatorStyle}
        />
        {navItems.map((item, index) => (
          <button
            key={item.view}
            ref={el => { itemRefs.current[index] = el; }}
            onClick={() => !item.disabled && onNavigate(item.view)}
            disabled={item.disabled}
            className={`relative z-10 flex-1 flex flex-col items-center justify-center p-2 rounded-full transition-colors duration-300 text-light-text-muted dark:text-dark-text-muted focus:outline-none ${activeView === item.view ? 'text-light-accent dark:text-dark-accent' : 'hover:text-light-text dark:hover:text-dark-text'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={item.label}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
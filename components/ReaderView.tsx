import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book } from '../types';
import { useSettings } from '../context/SettingsContext';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';

interface ReaderViewProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (id: string, progress: number, lastLocation: string) => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ book, onClose, onUpdateProgress }) => {
  const { fontSize, lineHeight } = useSettings();
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const [showControls, setShowControls] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const onRelocated = useCallback((location: any) => {
    setCurrentLocation(location);
    const progress = location.start.percentage;
    const cfi = location.start.cfi;
    onUpdateProgress(book.id, Math.round(progress * 100), cfi);
  }, [book.id, onUpdateProgress]);

  useEffect(() => {
    if (!viewerRef.current) return;
    if (!window.ePub) {
        console.error("epub.js not loaded");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    const objectUrl = URL.createObjectURL(book.epubBlob);
    const epubBook = window.ePub(objectUrl);
    bookRef.current = epubBook;
    const rendition = epubBook.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'auto',
    });
    renditionRef.current = rendition;

    epubBook.ready.then(() => {
        setToc(epubBook.navigation?.toc || []);
    }).catch(err => {
        console.error('EPUB ready error:', err);
    });

    rendition.on('relocated', onRelocated);

    rendition.display(book.lastLocation || undefined)
      .then(() => setIsLoading(false))
      .catch(err => {
        console.error('Display error:', err);
        setIsLoading(false);
      });

    return () => {
        try { rendition.destroy?.(); } catch {}
        try { bookRef.current?.destroy?.(); } catch {}
        URL.revokeObjectURL(objectUrl);
    };
  }, [book.id]);

  useEffect(() => {
    if (renditionRef.current) {
        renditionRef.current.themes.fontSize(`${fontSize}px`);
        renditionRef.current.themes.override('line-height', `${lineHeight}`);
    }
  }, [fontSize, lineHeight]);

  const nextPage = () => renditionRef.current?.next();
  const prevPage = () => renditionRef.current?.prev();
  const goToChapter = (href: string) => {
    renditionRef.current?.display(href);
    setShowToc(false);
  }

  const progressPercent = currentLocation ? Math.round(currentLocation.start.percentage * 100) : book.progress;
  const currentPage = currentLocation?.start.displayed.page;
  const totalPages = currentLocation?.start.displayed.total;

  return (
    <div className="fixed inset-0 bg-light-primary dark:bg-dark-primary z-[60] animate-[fadeIn_0.5s_ease-out]">
      {/* Header Controls */}
      <div className={`fixed top-0 left-0 right-0 p-4 z-20 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
           <button onClick={onClose} className="flex items-center space-x-2 text-light-text dark:text-dark-text hover:text-light-accent dark:hover:text-dark-accent transition-colors p-2 rounded-full bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm">
            <ChevronLeftIcon className="w-6 h-6" />
            <span className="font-medium">Library</span>
          </button>
           <button onClick={() => setShowToc(true)} className="p-2 rounded-full bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-light-text dark:text-dark-text" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="h-full flex justify-center items-center" onClick={() => setShowControls(prev => !prev)}>
         {isLoading && <div className="text-light-text-muted dark:text-dark-text-muted">Loading Book...</div>}
         <div id="viewer" ref={viewerRef} className={`w-full h-full max-w-4xl reader-content transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}></div>
      </div>
      <div onClick={prevPage} className="absolute left-0 top-0 h-full w-1/5 z-10"></div>
      <div onClick={nextPage} className="absolute right-0 top-0 h-full w-1/5 z-10"></div>


       {/* Footer Controls */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 z-20 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
        <div className="max-w-3xl mx-auto flex flex-col items-center space-y-2">
            <div className="w-full flex items-center justify-between text-sm text-light-text-muted dark:text-dark-text-muted bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm p-2 rounded-full">
                <span>Page {currentPage || '-'} of {totalPages || '-'}</span>
                <span>{progressPercent}% Complete</span>
            </div>
            <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full">
                <div className="h-1 bg-light-accent dark:bg-dark-accent rounded-full" style={{width: `${progressPercent}%`}}></div>
            </div>
        </div>
      </div>

      {/* Table of Contents Modal */}
       {showToc && (
         <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center" onClick={() => setShowToc(false)}>
            <div className="bg-light-surface dark:bg-dark-surface w-full max-w-md max-h-[80vh] rounded-2xl shadow-soft-xl dark:shadow-dark-soft-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-serif font-semibold p-4 border-b border-light-primary dark:border-dark-primary">Contents</h3>
                <ul className="overflow-y-auto p-2">
                    {toc.map((item, index) => (
                        <li key={index}>
                            <button onClick={() => goToChapter(item.href)} className="w-full text-left p-3 rounded-lg hover:bg-light-primary dark:hover:bg-dark-primary transition-colors">
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
         </div>
       )}
    </div>
  );
};

export default ReaderView;

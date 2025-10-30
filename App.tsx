import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Theme, View, Book } from './types';
import { useBookLibrary } from './hooks/useBookLibrary';
import Header from './components/Header';
import Navigation from './components/Navigation';
import LibraryGrid from './components/LibraryGrid';
import ReaderView from './components/ReaderView';
import SettingsView from './components/SettingsView';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? Theme.DARK : Theme.LIGHT);
  const [view, setView] = useState<View>(View.LIBRARY);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const { books, addBook, updateBookProgress, isLoading } = useBookLibrary();
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === Theme.DARK) {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#1c1815';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#f9f7f0';
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
  }, []);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setView(View.READER);
  };
  
  const handleCloseReader = () => {
    setView(View.LIBRARY);
    setSelectedBook(null);
  };

  useEffect(() => {
    if (view === View.LIBRARY) {
        const timer = setTimeout(() => setIsLibraryVisible(true), 300); // match transition duration
        return () => clearTimeout(timer);
    } else {
        setIsLibraryVisible(false);
    }
  }, [view]);

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books;
    return books.filter(book => 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [books, searchTerm]);


  const renderView = () => {
    switch (view) {
      case View.READER:
        return selectedBook && <ReaderView book={selectedBook} onClose={handleCloseReader} onUpdateProgress={updateBookProgress} />;
      case View.SETTINGS:
        return <SettingsView />;
      case View.LIBRARY:
      default:
        // This case is handled by the main layout to allow for transitions
        return null;
    }
  };

  return (
    <div className={`min-h-screen font-sans bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-500`}>
      <Header theme={theme} onToggleTheme={toggleTheme} searchTerm={searchTerm} onSearch={setSearchTerm} />
      <main className="px-4 md:px-8 pt-28 pb-24 relative">
        <div className={`transition-opacity duration-300 ${isLibraryVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <LibraryGrid 
            books={filteredBooks} 
            onSelectBook={handleSelectBook} 
            addBook={addBook}
            isLoading={isLoading}
          />
        </div>
        <div className={`absolute top-28 left-0 right-0 px-4 md:px-8 transition-opacity duration-300 ${!isLibraryVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           {renderView()}
        </div>
      </main>
      <Navigation activeView={view} onNavigate={setView} isReaderActive={!!selectedBook} />
    </div>
  );
};

export default App;
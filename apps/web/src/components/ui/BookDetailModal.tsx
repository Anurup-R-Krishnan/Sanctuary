import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Book as BookType } from '@/types';
import { BookOpen, X, Clock, Heart, FileText } from 'lucide-react';

interface BookDetailModalProps {
    book: BookType | null;
    isOpen: boolean;
    onClose: () => void;
    onRead: (book: BookType) => void;
    onToggleFavorite: (id: string) => void;
}

const BookDetailModal: React.FC<BookDetailModalProps> = ({ book, isOpen, onClose, onRead, onToggleFavorite }) => {
    if (!book) return null;

    const progressPercentage = Math.round((book.progress / book.totalPages) * 100);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="w-full max-w-2xl bg-light-surface rounded-3xl shadow-glow-sm border border-black/10 overflow-hidden pointer-events-auto flex flex-col md:flex-row"
                        >
                            {/* Cover Side */}
                            <div className="relative w-full md:w-2/5 aspect-[3/4] md:aspect-auto bg-black/5 flex items-center justify-center">
                                {book.coverUrl ? (
                                    <img
                                        src={book.coverUrl}
                                        alt={book.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <BookOpen className="w-16 h-16 text-light-accent" strokeWidth={1.5} />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                                {/* Float content on top of cover */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 left-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-md transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleFavorite(book.id);
                                    }}
                                    className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-colors ${book.isFavorite ? 'bg-red-500/90 text-white' : 'bg-black/20 text-white hover:bg-red-500/90'
                                        }`}
                                >
                                    <Heart className={`w-5 h-5 ${book.isFavorite ? 'fill-current' : ''}`} />
                                </button>
                            </div>

                            {/* Details Side */}
                            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold font-serif text-light-text leading-tight mb-2 line-clamp-2">
                                        {book.title}
                                    </h2>
                                    <p className="text-lg text-light-text-muted font-medium mb-6 line-clamp-1">
                                        {book.author}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-light-accent/10">
                                                <FileText className="w-4 h-4 text-light-accent" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-light-text-muted uppercase tracking-wider font-semibold">Length</p>
                                                <p className="text-sm font-medium">{book.totalPages} Pages</p>
                                            </div>
                                        </div>
                                        {book.lastOpenedAt && (
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-light-accent/10">
                                                    <Clock className="w-4 h-4 text-light-accent" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-light-text-muted uppercase tracking-wider font-semibold">Last Read</p>
                                                    <p className="text-sm font-medium line-clamp-1">{new Date(book.lastOpenedAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {progressPercentage > 0 && (
                                        <div className="mb-8">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-xs font-medium text-light-text-muted uppercase tracking-wider">Progress</span>
                                                <span className="font-bold text-light-accent">{progressPercentage}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-light-accent"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progressPercentage}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {book.tags?.map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-black/5 rounded-full text-xs font-medium text-light-text-muted">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-black/5">
                                    <button
                                        onClick={() => onRead(book)}
                                        className="w-full relative overflow-hidden py-4 rounded-full bg-light-accent text-white font-semibold text-lg shadow-glow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                    >
                                        <span className="relative z-10">{progressPercentage > 0 ? "Continue Reading" : "Begin Reading"}</span>
                                        <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BookDetailModal;

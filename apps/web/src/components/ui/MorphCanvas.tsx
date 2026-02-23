import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Book as BookType } from '@/types';

interface MorphCanvasProps {
    book: BookType | null;
    onAnimationComplete: () => void;
}

const MorphCanvas: React.FC<MorphCanvasProps> = ({ book, onAnimationComplete }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (book) {
            setIsAnimating(true);
            // Simulate the 204-frame morph with a CSS/Framer duration
            // Awwwards level programmatic transition: Expand the cover, dissolve into the paper background
            const timer = setTimeout(() => {
                setIsAnimating(false);
                onAnimationComplete();
            }, 1800); // 1.8s transition
            return () => clearTimeout(timer);
        }
    }, [book, onAnimationComplete]);

    return (
        <AnimatePresence>
            {isAnimating && book && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="fixed inset-0 z-[100] bg-light-surface flex items-center justify-center overflow-hidden"
                >
                    {/* Animated background that morphs into the reader color */}
                    <motion.div
                        initial={{ scale: 1, borderRadius: "24px" }}
                        animate={{ scale: 15, borderRadius: "0px" }}
                        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute w-32 h-40 bg-light-primary shadow-glow-lg origin-center"
                    />

                    {/* The expanding book cover */}
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1.2, y: 0, opacity: [0, 1, 0] }}
                        transition={{
                            duration: 1.6,
                            ease: "easeInOut",
                            opacity: { times: [0, 0.2, 0.8, 1] }
                        }}
                        className="relative z-10 w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl"
                    >
                        {book.coverUrl && (
                            <img src={book.coverUrl} alt="Transitionizing..." className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </motion.div>

                    {/* Particles / Dust effect for premium feel */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.8 }}
                        className="absolute inset-0 z-20 pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle at center, rgba(184, 149, 108, 0.1) 0%, transparent 70%)',
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MorphCanvas;

import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface ScrapbookLayoutProps {
  children: ReactNode;
  view?: string;
}

const ScrapbookLayout: React.FC<ScrapbookLayoutProps> = ({ children, view }) => {
  return (
    <div className="relative min-h-screen w-full bg-scrap-cream overflow-hidden">
      {/*
        ============================================================
        LAYER 0: Base Texture
        ============================================================
      */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-multiply"
        style={{ backgroundImage: "var(--noise-svg)" }}
      />

      {/*
        ============================================================
        LAYER 1: The Big Scraps (Collage Background)
        ============================================================
      */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">

        {/* Top Left: Celestial Star Map (Abstracted) */}
        <motion.div
            initial={{ opacity: 0, rotate: -5 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute -top-20 -left-20 w-96 h-96 bg-scrap-navy opacity-10 rounded-full blur-3xl transform rotate-12"
        />
        <div className="absolute top-10 left-10 w-64 h-64 border-2 border-scrap-navy/10 rounded-full opacity-20 animate-spin-slow" style={{ animationDuration: '60s' }}>
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-scrap-navy rounded-full transform -translate-x-1/2" />
            <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-scrap-navy rounded-full transform -translate-x-1/2" />
        </div>

        {/* Right Side: Vintage Sheet Music (CSS Pattern) */}
        <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 0.6 }}
            className="absolute top-1/4 -right-12 w-80 h-[600px] bg-scrap-kraft/30 rotate-3 transform shadow-lg"
            style={{
                clipPath: "polygon(2% 0%, 100% 0%, 100% 100%, 0% 100%, 5% 90%, 0% 80%, 3% 70%, 0% 60%, 4% 50%, 0% 40%, 3% 30%, 0% 20%, 5% 10%)",
                backgroundImage: "repeating-linear-gradient(transparent, transparent 19px, rgba(44, 58, 79, 0.1) 20px)"
            }}
        >
             {/* Music Notes Scatter */}
             <div className="absolute top-20 left-10 text-4xl opacity-20 rotate-12">𝄞</div>
             <div className="absolute top-40 left-20 text-3xl opacity-20 -rotate-12">𝅘𝅥𝅮</div>
             <div className="absolute bottom-20 left-12 text-3xl opacity-20 rotate-6">𝅘𝅥𝅯</div>
        </motion.div>

        {/* Bottom Left: Night Sky / Navy Paper */}
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute -bottom-24 -left-12 w-[500px] h-[400px] bg-scrap-navy transform -rotate-2 shadow-scrap-deep"
            style={{ clipPath: "polygon(0% 10%, 10% 0%, 100% 5%, 95% 100%, 0% 100%)" }}
        >
             {/* Stars */}
             <div className="absolute top-10 right-20 text-scrap-cream opacity-40 text-xl">✦</div>
             <div className="absolute top-24 right-40 text-scrap-cream opacity-20 text-sm">✧</div>
             <div className="absolute top-40 right-10 text-scrap-cream opacity-30 text-lg">★</div>
             <div className="absolute top-1/2 left-1/3 w-32 h-32 border border-scrap-cream/10 rounded-full" />
        </motion.div>

        {/* Center/Random: Coffee Stain */}
        <div className="absolute top-1/2 left-1/4 w-40 h-40 border-8 border-[#5D4037]/10 rounded-full transform scale-y-75 -rotate-12 mix-blend-multiply pointer-events-none blur-sm" />
      </div>

      {/*
        ============================================================
        LAYER 2: Content Container
        ============================================================
      */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default ScrapbookLayout;

import React, { useRef } from "react";
import { User, BookOpen, PenTool } from "lucide-react";
import { SignIn } from "@/hooks/useAuth";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface AuthProps {
  onContinueAsGuest?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onContinueAsGuest }) => {
  // Parallax Effect for Illustration
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-300, 300], [5, -5]);
  const rotateY = useTransform(x, [-300, 300], [-5, 5]);

  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      x.set(event.clientX - rect.left - rect.width / 2);
      y.set(event.clientY - rect.top - rect.height / 2);
    }
  };

  return (
    <div className="min-h-screen flex bg-[rgb(var(--paper-cream))] overflow-hidden">
      {/* Left: Cozy Illustration (Desktop Only) */}
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { x.set(0); y.set(0); }}
        className="hidden lg:flex w-1/2 relative overflow-hidden bg-[rgb(var(--aged-paper))] border-r-2 border-[rgb(var(--ink-navy))] items-center justify-center perspective-1000"
      >
        {/* Animated Dust Motes Background */}
        <div className="absolute inset-0 z-0">
             {[...Array(20)].map((_, i) => (
               <motion.div
                 key={i}
                 className="absolute w-1 h-1 bg-white/40 rounded-full"
                 initial={{
                   x: Math.random() * 1000,
                   y: Math.random() * 1000,
                   opacity: 0
                 }}
                 animate={{
                   y: [null, Math.random() * -100],
                   opacity: [0, 0.8, 0]
                 }}
                 transition={{
                   duration: Math.random() * 10 + 10,
                   repeat: Infinity,
                   ease: "linear"
                 }}
               />
             ))}
        </div>

        <motion.div
          style={{ rotateX, rotateY, z: 50 }}
          className="relative z-10 p-12 text-center max-w-lg preserve-3d"
        >
             <motion.div
               className="mb-8 relative inline-block group cursor-pointer"
               whileHover={{ scale: 1.02 }}
             >
                <img
                  src="/images/bunnies-stack.jpg"
                  alt="Cozy Reading Bunnies"
                  className="rounded-2xl shadow-deep border-4 border-white transform rotate-2 max-h-[500px] object-cover relative z-10"
                />
                {/* Backing Photo Effect */}
                <div className="absolute inset-0 bg-white border-2 border-[rgb(var(--aged-paper))] rounded-2xl transform -rotate-2 -translate-x-2 translate-y-2 z-0 shadow-sm" />

                {/* Tape */}
                <div className="tape-strip -top-4 left-1/2 -translate-x-1/2 w-32 bg-white/30 rotate-3 z-20" />

                {/* Pixel decoration */}
                <div className="absolute -top-8 -left-8 text-5xl animate-bounce-gentle z-20 drop-shadow-md">✨</div>
                <div className="absolute -bottom-8 -right-8 text-5xl animate-bounce-gentle z-20 drop-shadow-md" style={{ animationDelay: '1s'}}>💤</div>
             </motion.div>

             <h2 className="text-4xl font-serif font-bold text-[rgb(var(--ink-navy))] mb-4 drop-shadow-sm">
               "Just one more chapter..."
             </h2>
             <p className="text-[rgb(var(--sepia-brown))] text-xl font-hand font-bold -rotate-1 italic">
               Join the bunnies in your personal reading sanctuary.
             </p>
        </motion.div>
      </div>

      {/* Right: Login Form (Guest Book Style) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
         {/* Background decoration for mobile */}
         <div className="lg:hidden absolute inset-0 bg-[rgb(var(--aged-paper))]/30 z-0" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="relative z-10 w-full max-w-md perspective-1000"
        >
          <div className="text-center mb-10">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[rgb(var(--woodstock-gold))] border-4 border-[rgb(var(--ink-navy))] shadow-pixel mb-6 cursor-pointer"
            >
              <BookOpen className="w-10 h-10 text-[rgb(var(--ink-navy))]" strokeWidth={2} />
            </motion.div>
            <h1 className="text-5xl font-serif font-bold text-[rgb(var(--ink-navy))] mb-2 tracking-tight">Sanctuary</h1>
            <div className="h-1.5 w-24 bg-[rgb(var(--ink-navy))] mx-auto rounded-full opacity-20 my-4" />
            <p className="text-[rgb(var(--sepia-brown))] font-serif italic text-lg">Please sign the guestbook to enter.</p>
          </div>

          {/* Guest Book Card */}
          <div className="bg-white p-1 md:p-2 rounded-xl shadow-deep transform rotate-1">
            <div className="card-paper p-8 md:p-10 relative overflow-hidden bg-[#faf9f6] border-2 border-[rgb(var(--ink-navy))] border-dashed">

               {/* Signing Pen Animation */}
               <motion.div
                 className="absolute top-10 right-10 pointer-events-none opacity-0"
                 animate={{ opacity: [0, 1, 0], x: [0, -10, 0], y: [0, 10, 0] }}
                 transition={{ repeat: Infinity, repeatDelay: 5, duration: 2 }}
               >
                  <PenTool className="w-8 h-8 text-[rgb(var(--ink-navy))]" />
               </motion.div>

              <div className="relative z-10 space-y-8">
                <div className="auth-wrapper [&_.cl-card]:!shadow-none [&_.cl-card]:!border-none [&_.cl-card]:!bg-transparent [&_.cl-internal-b3fm6y]:!hidden">
                  <SignIn />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-dotted border-[rgb(var(--ink-navy))]/30" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-xs font-pixel uppercase tracking-widest text-[rgb(var(--sepia-brown))] bg-[#faf9f6]">
                      Or
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  disabled={!onContinueAsGuest}
                  className="w-full group relative btn-cozy h-14 text-lg border-2 border-[rgb(var(--ink-navy))]"
                >
                  <span className="flex items-center justify-center gap-3">
                      <User className="h-5 w-5" />
                      <span className="font-serif italic font-bold">Browse as Guest</span>
                  </span>
                  {/* Ink Splatter Hover Effect (CSS) */}
                  <div className="absolute inset-0 bg-[rgb(var(--ink-navy))] opacity-0 group-hover:opacity-10 transition-opacity rounded-full pointer-events-none" />
                </button>

                <p className="text-xs text-center text-[rgb(var(--sepia-brown))] opacity-70 font-hand font-bold rotate-1">
                  (Your reading progress will be saved on this device)
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;

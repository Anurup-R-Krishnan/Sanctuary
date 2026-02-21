import React from "react";
import { User, BookOpen, Sparkles } from "lucide-react";
import { SignIn } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface AuthProps {
  onContinueAsGuest?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onContinueAsGuest }) => {
  return (
    <div className="min-h-screen flex bg-[rgb(var(--paper-cream))]">
      {/* Left: Cozy Illustration (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[rgb(var(--aged-paper))] border-r-2 border-[rgb(var(--ink-navy))] items-center justify-center">
        {/* Background Texture */}
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] mix-blend-multiply" />

        <div className="relative z-10 p-12 text-center max-w-lg">
             <div className="mb-8 relative inline-block">
                <img
                  src="/images/bunnies-stack.jpg"
                  alt="Cozy Reading Bunnies"
                  className="rounded-2xl shadow-pixel border-2 border-[rgb(var(--ink-navy))] max-h-[500px] object-cover"
                />
                {/* Pixel decoration */}
                <div className="absolute -top-6 -left-6 text-4xl animate-bounce-gentle">✨</div>
                <div className="absolute -bottom-6 -right-6 text-4xl animate-bounce-gentle" style={{ animationDelay: '1s'}}>💤</div>
             </div>

             <h2 className="text-3xl font-serif font-bold text-[rgb(var(--ink-navy))] mb-4">
               "Just one more chapter..."
             </h2>
             <p className="text-[rgb(var(--sepia-brown))] text-lg font-serif italic">
               Join the bunnies in your personal reading sanctuary.
             </p>
        </div>
      </div>

      {/* Right: Login Form (Guest Book Style) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
         {/* Background decoration for mobile */}
         <div className="lg:hidden absolute inset-0 bg-[rgb(var(--aged-paper))]/30 z-0" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(var(--woodstock-gold))] border-2 border-[rgb(var(--ink-navy))] shadow-pixel mb-6">
              <BookOpen className="w-8 h-8 text-[rgb(var(--ink-navy))]" strokeWidth={2} />
            </div>
            <h1 className="text-4xl font-serif font-bold text-[rgb(var(--ink-navy))] mb-2">Sanctuary</h1>
            <div className="h-1 w-24 bg-[rgb(var(--ink-navy))] mx-auto rounded-full opacity-20" />
            <p className="text-[rgb(var(--sepia-brown))] mt-4 font-medium">Please sign the guestbook to enter.</p>
          </div>

          <div className="card-paper p-8 md:p-10 relative overflow-hidden">
             {/* "Paper" lines background */}
             <div className="absolute inset-0 pointer-events-none opacity-5"
                  style={{ backgroundImage: 'linear-gradient(rgb(var(--ink-navy)) 1px, transparent 1px)', backgroundSize: '100% 2rem' }}
             />

            <div className="relative z-10 space-y-8">
              <div className="auth-wrapper [&_.cl-card]:!shadow-none [&_.cl-card]:!border-none [&_.cl-card]:!bg-transparent [&_.cl-internal-b3fm6y]:!hidden">
                <SignIn />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-[rgb(var(--ink-navy))]/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-xs font-pixel uppercase tracking-widest text-[rgb(var(--sepia-brown))] bg-white">
                    Or
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onContinueAsGuest}
                disabled={!onContinueAsGuest}
                className="w-full group relative btn-cozy h-12 text-lg shadow-pixel hover:shadow-none hover:translate-y-[2px] active:translate-y-[4px] border-2 border-[rgb(var(--ink-navy))]"
              >
                <span className="flex items-center justify-center gap-3">
                    <User className="h-5 w-5" />
                    <span>Browse as Guest</span>
                </span>
              </button>

              <p className="text-xs text-center text-[rgb(var(--sepia-brown))] opacity-70 font-serif italic">
                (Your reading progress will be saved on this device)
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;

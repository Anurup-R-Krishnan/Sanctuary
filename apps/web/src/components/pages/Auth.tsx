import React from "react";
import { User, BookOpen } from "lucide-react";
import { SignIn } from "@/hooks/useAuth";

interface AuthProps {
  onContinueAsGuest?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onContinueAsGuest }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-light-primary dark:bg-dark-primary relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-light-accent/[0.04] via-transparent to-transparent dark:from-dark-accent/[0.03]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-light-accent/10 dark:via-dark-accent/10 to-transparent" />
      </div>

      <div className="relative w-full max-w-sm mx-4 animate-fadeInUp">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-light-accent to-amber-600 dark:from-dark-accent dark:to-amber-500 mb-5 shadow-lg glow-sm">
            <BookOpen className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">Sanctuary</h1>
          <p className="text-light-text-muted dark:text-dark-text-muted mt-2 text-sm">Your personal reading haven</p>
        </div>

        <div className="card p-7">
          <div className="mb-5">
            <SignIn />
          </div>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/[0.06] dark:border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-light-text-muted dark:text-dark-text-muted bg-light-surface dark:bg-dark-surface">
                or
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueAsGuest}
            disabled={!onContinueAsGuest}
            className="btn-secondary w-full"
          >
            <User className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
            <span>Continue as guest</span>
          </button>

          <p className="text-[11px] text-light-text-muted/60 dark:text-dark-text-muted/60 mt-5 text-center">
            Guest data is stored locally on this device
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

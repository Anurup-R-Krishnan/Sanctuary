import { SignIn } from "@clerk/clerk-react";
import { BookOpen } from "lucide-react";

interface AuthScreenProps {
  onContinueAsGuest: () => void;
}

export function AuthScreen({ onContinueAsGuest }: AuthScreenProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-light-primary dark:bg-dark-primary p-4 selection:bg-light-accent/30 selection:text-inherit">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-light-accent dark:bg-dark-accent flex items-center justify-center shadow-glow-md mb-4 ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-instant hover:scale-105">
          <BookOpen className="w-8 h-8 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-3xl font-semibold text-light-text dark:text-dark-text tracking-tight">Sanctuary</h1>
        <p className="font-sans text-sm text-light-text-muted dark:text-dark-text-muted mt-1.5 max-w-xs">
          Sign in to sync your library and reading progress across devices
        </p>
      </div>

      <div className="w-full max-w-md flex justify-center">
        <SignIn
          routing="hash"
          appearance={{
            variables: {
              colorPrimary: "#B8956C",
              colorText: "#09090B",
              fontFamily: "'Satoshi', system-ui, sans-serif",
              borderRadius: "16px",
            },
            elements: {
              rootBox: "w-full",
              card: "bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border shadow-xl rounded-2xl p-6",
              headerTitle: "font-serif text-2xl font-semibold text-light-text dark:text-dark-text tracking-tight",
              headerSubtitle: "font-sans text-sm text-light-text-muted dark:text-dark-text-muted",
              socialButtonsBlockButton: "rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 font-sans transition-all duration-instant shadow-sm",
              socialButtonsBlockButtonText: "font-medium text-sm text-light-text dark:text-dark-text",
              formButtonPrimary: "rounded-xl bg-light-accent dark:bg-dark-accent text-white hover:opacity-90 font-sans shadow-glow-sm transition-all duration-instant font-medium py-2.5",
              formFieldInput: "rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text focus:border-light-accent dark:focus:border-dark-accent font-sans",
              footerActionLink: "text-light-accent dark:text-dark-accent hover:underline font-medium",
              identityPreviewText: "text-light-text dark:text-dark-text",
              identityPreviewEditButton: "text-light-accent dark:text-dark-accent hover:underline",
            },
          }}
        />
      </div>

      <button
        onClick={onContinueAsGuest}
        className="mt-8 px-5 py-2.5 rounded-xl text-sm font-medium text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/5 dark:border-white/5 transition-all duration-instant"
      >
        Continue as Guest (Offline only)
      </button>
    </div>
  );
}

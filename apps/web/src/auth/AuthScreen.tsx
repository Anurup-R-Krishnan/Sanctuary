import { SignIn } from "@clerk/clerk-react";
import { BookOpen } from "lucide-react";

interface AuthScreenProps {
  onContinueAsGuest: () => void;
}

export function AuthScreen({ onContinueAsGuest }: AuthScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-light-primary dark:bg-dark-primary p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-light-accent to-amber-600 dark:from-dark-accent dark:to-amber-500 flex items-center justify-center shadow-xl mb-4">
          <BookOpen className="w-8 h-8 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">Sanctuary</h1>
        <p className="text-light-text-muted dark:text-dark-text-muted mt-2">Sign in to sync your library</p>
      </div>

      <SignIn routing="hash" />

      <button
        onClick={onContinueAsGuest}
        className="mt-8 text-sm text-light-accent dark:text-dark-accent hover:underline font-medium"
      >
        Continue as Guest (Offline only)
      </button>
    </div>
  );
}

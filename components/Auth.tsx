import React, { useState } from "react";
import { Mail, User, BookOpen, Sparkles, ArrowRight, Loader2 } from "lucide-react";

import { supabase } from "../lib/supabase";

interface AuthProps {
  onContinueAsGuest?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onContinueAsGuest }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Check your email for the magic link to continue.");
    } catch (exception) {
      const fallback =
        exception instanceof Error ? exception.message : "Unable to send link.";
      setError(fallback);
      console.error("Error signing in:", exception);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-primary dark:bg-dark-primary p-4 overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-light-accent/10 dark:bg-dark-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-light-accent/5 to-transparent dark:from-dark-accent/5" />
      </div>

      <div className="relative w-full max-w-md animate-fadeInUp">
        {/* Card */}
        <div className="relative bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-3xl border border-light-card/50 dark:border-dark-card/50 shadow-soft-2xl dark:shadow-dark-soft-2xl p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-2xl blur-xl opacity-30" />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-light-accent to-amber-600 dark:from-dark-accent dark:to-amber-500 shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-serif font-bold text-light-text dark:text-dark-text">
              Sanctuary
            </h1>
            <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-2 text-center text-balance">
              Your personal reading haven. Sign in to sync your library across devices.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted transition-colors group-focus-within:text-light-accent dark:group-focus-within:text-dark-accent" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input pl-12"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                <>
                  Email me a magic link
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-light-card dark:border-dark-card" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs font-medium uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted bg-light-surface/80 dark:bg-dark-surface/80">
                or
              </span>
            </div>
          </div>

          {/* Guest mode */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={onContinueAsGuest}
              disabled={!onContinueAsGuest}
              className="btn-secondary w-full py-3 border-amber-200/50 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/10 hover:bg-amber-100/50 dark:hover:bg-amber-500/20"
            >
              <User className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              <span className="text-amber-800 dark:text-amber-300">Continue as guest</span>
            </button>
            
            <p className="flex items-start gap-2 text-xs text-light-text-muted dark:text-dark-text-muted">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
              <span>Guest libraries are stored locally. Signing in later won't restore these books.</span>
            </p>
          </div>

          {/* Messages */}
          {(message || error) && (
            <div
              className={`mt-6 rounded-xl px-4 py-3 text-sm ${
                error
                  ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 border border-red-200/50 dark:border-red-500/20"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/20"
              }`}
            >
              {error || message}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-light-text-muted/60 dark:text-dark-text-muted/60 mt-6">
          By continuing, you agree to our terms of service
        </p>
      </div>
    </div>
  );
};

export default Auth;

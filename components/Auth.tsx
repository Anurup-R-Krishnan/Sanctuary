import React, { useState } from "react";
import { Mail, User, ArrowRight, Loader2, BookOpen } from "lucide-react";
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
        options: { emailRedirectTo: window.location.origin },
      });
      if (signInError) throw signInError;
      setMessage("Check your email for the magic link.");
    } catch (exception) {
      const fallback = exception instanceof Error ? exception.message : "Unable to send link.";
      setError(fallback);
    } finally {
      setLoading(false);
    }
  };

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
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-light-text-muted/50 dark:text-dark-text-muted/50" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input pl-11"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Continue with email</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

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

          {(message || error) && (
            <div
              className={`mt-5 rounded-xl px-4 py-3 text-sm ${
                error
                  ? "bg-red-500/8 text-red-600 dark:text-red-400 border border-red-500/15"
                  : "bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15"
              }`}
            >
              {error || message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

import React, { useState } from "react";
import { Mail, User } from "lucide-react";

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

  const handleContinueAsGuest = () => {
    if (onContinueAsGuest) {
      onContinueAsGuest();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-primary dark:bg-dark-primary">
      <div className="w-full max-w-md p-8 space-y-8 bg-light-secondary dark:bg-dark-secondary rounded-lg shadow-lg">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-extrabold text-light-text dark:text-dark-text">
            Welcome to Sanctuary
          </h2>
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
            Sign in for synced progress across devices, or continue as a guest
            to keep everything on this device only.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 bg-light-primary dark:bg-dark-primary placeholder-gray-500 text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? "Sending link..." : "Email me a link"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-light-text-muted/40 dark:border-dark-text-muted/30" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-light-secondary dark:bg-dark-secondary px-2 text-light-text-muted dark:text-dark-text-muted">
              or
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleContinueAsGuest}
            disabled={!onContinueAsGuest}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-amber-300/60 dark:border-amber-200/30 bg-amber-50 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100 px-4 py-3 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <User className="h-4 w-4" />
            Continue as guest
          </button>
          <p className="text-xs text-center text-light-text-muted dark:text-dark-text-muted">
            Guest libraries live only on this device. Signing in later won’t
            restore these books.
          </p>
        </div>

        {(message || error) && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${
              error
                ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200"
                : "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-200"
            }`}
          >
            {error || message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;

import { BookOpen } from "lucide-react";
import { useCallback, useState } from "react";

import { authApiUrl, type AuthResponseUser } from "./authApi";
import { useSanctuaryAuth } from "./useSanctuaryAuth";

interface AuthScreenProps {
  onCancel: () => void;
}

export function AuthScreen({ onCancel }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useSanctuaryAuth();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);

      try {
        const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";
        const response = await fetch(
          authApiUrl(endpoint),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          }
        );

        const data = (await response.json().catch(() => ({}))) as { error?: string; token?: string; user?: AuthResponseUser };
        if (!response.ok || !data.token || !data.user) {
          setError(data.error || "Could not reach the server. Try again.");
          return;
        }
        // No reload: a guest who signs in keeps their in-memory session mode,
        // so MigrationDialog can offer to upload their local books.
        signIn(data.token, data.user);
      } catch (err) {
        setError(err instanceof Error && err.message ? "Could not reach the server. Try again." : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [isSignUp, email, password, signIn]
  );

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-page p-4 selection:bg-accent/30 selection:text-inherit">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center shadow-glow-md mb-4 ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-instant hover:scale-105">
          <BookOpen className="w-8 h-8 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="font-display font-medium text-3xl text-fg tracking-tight">Sanctuary</h1>
        <p className="font-sans text-sm text-fg-muted mt-1.5 max-w-xs">
          Optional. An account syncs your library and reading progress across devices.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-surface-raised border border-line shadow-xl rounded-xl p-6">
          <h2 className="font-display font-medium text-2xl text-fg tracking-tight mb-1">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>
          <p className="font-sans text-sm text-fg-muted mb-6">
            {isSignUp ? "Create a new account to get started" : "Sign in to your account"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block font-sans text-sm font-medium text-fg mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-line bg-surface text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 px-3 py-2.5 font-sans text-sm transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-sans text-sm font-medium text-fg mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? "At least 10 characters" : ""}
                minLength={isSignUp ? 10 : 1}
                className="w-full rounded-xl border border-line bg-surface text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 px-3 py-2.5 font-sans text-sm transition-colors"
              />
              {isSignUp && (
                <p className="font-sans text-xs text-fg-muted mt-1">
                  Password must be at least 10 characters long
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                <p className="font-sans text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-accent text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-sans shadow-glow-sm transition-all duration-instant font-medium py-2.5"
            >
              {isLoading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="w-full mt-4 font-sans text-sm text-accent hover:underline"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Create one"}
          </button>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="mt-8 px-5 py-2.5 rounded-xl text-sm font-medium text-fg-muted hover:text-fg bg-surface/40 hover:bg-surface/70 border border-line transition-all duration-instant shadow-xs"
      >
        Not now
      </button>
    </div>
  );
}

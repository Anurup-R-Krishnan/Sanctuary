import { ArrowLeft, BookOpen } from "lucide-react";
import { useCallback, useState } from "react";

import { authApiUrl, type AuthResponseUser } from "./authApi";
import { useSanctuaryAuth } from "./useSanctuaryAuth";

interface AuthScreenProps {
  onCancel: () => void;
}

const SYNC_FACTS = [
  { numeral: "I", text: "Books, progress, bookmarks and notes follow you to every device." },
  { numeral: "II", text: "Everything still works offline. Changes upload when you reconnect." },
  { numeral: "III", text: "Books already on this device can be uploaded after you sign in." },
];

const inputClass =
  "w-full rounded-lg border border-line bg-surface-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

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
        const response = await fetch(authApiUrl(endpoint), {
          body: JSON.stringify({ email, password }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        const data = (await response.json().catch(() => ({}))) as { error?: string; token?: string; user?: AuthResponseUser };
        if (!response.ok || !data.token || !data.user) {
          setError(data.error || "Could not reach the server. Try again.");
          return;
        }
        signIn(data.token, data.user);
      } catch {
        setError("Could not reach the server. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [isSignUp, email, password, signIn]
  );

  const switchMode = (next: boolean) => {
    setIsSignUp(next);
    setError("");
  };

  return (
    <div className="app-ambient-bg flex min-h-[100dvh] flex-col bg-page">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 sm:px-8">
        <button
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={onCancel}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-paper">
            <BookOpen className="h-4 w-4 text-accent-fg" strokeWidth={1.75} />
          </div>
          <span className="font-display text-lg font-medium tracking-tight text-fg">Sanctuary</span>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_24rem] lg:gap-20">
        <section className="animate-fadeInUp">
          <p className="label-caps">Optional account</p>
          <h1 className="mt-4 font-display text-5xl font-medium leading-[1.02] tracking-[-0.03em] text-fg sm:text-6xl">
            One library,
            <br />
            every device.
          </h1>
          <div className="mt-6 h-px w-14 bg-accent/70" />
          <ol className="mt-8 max-w-md space-y-5">
            {SYNC_FACTS.map((fact) => (
              <li className="flex gap-4" key={fact.numeral}>
                <span className="folio w-6 shrink-0 pt-0.5 text-sm text-accent">{fact.numeral}</span>
                <p className="text-base leading-relaxed text-fg-muted">{fact.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="paper-card animate-fadeInUp p-6 sm:p-8" style={{ animationDelay: "90ms", animationFillMode: "both" }}>
          <div className="grid grid-cols-2 border-b border-line" role="tablist">
            {[
              { label: "Sign in", value: false },
              { label: "Create account", value: true },
            ].map((tab) => (
              <button
                aria-selected={isSignUp === tab.value}
                className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
                  isSignUp === tab.value ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"
                }`}
                key={tab.label}
                onClick={() => switchMode(tab.value)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg" htmlFor="auth-email">Email</label>
              <input
                autoComplete="email"
                className={inputClass}
                id="auth-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg" htmlFor="auth-password">Password</label>
              <input
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className={inputClass}
                id="auth-password"
                minLength={isSignUp ? 10 : 1}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                value={password}
              />
              {isSignUp && <p className="mt-1.5 text-xs text-fg-muted">At least 10 characters.</p>}
            </div>

            {error && (
              <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <button
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg shadow-paper transition-[filter] hover:brightness-[1.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-fg-muted">
            Without an account, books stay on this device only.
          </p>
        </section>
      </main>
    </div>
  );
}

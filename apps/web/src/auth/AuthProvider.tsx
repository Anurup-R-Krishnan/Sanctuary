import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { authApiUrl, type AuthResponseUser } from "./authApi";
import { SanctuaryAuthContext, type SanctuaryAuthContextType, type SanctuaryUser } from "./useSanctuaryAuth";

const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === "true";
const TOKEN_KEY = "sanctuary.authToken";
// Last known account for the stored token, so an offline launch or a server
// error on /me keeps the user signed in instead of showing the auth screen.
const USER_KEY = "sanctuary.authUser";

const toUser = (data: AuthResponseUser): SanctuaryUser => ({
  displayName: null,
  email: data.email,
  id: data.id,
  imageUrl: null,
});

function readStored(): { token: string | null; user: AuthResponseUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    const user = rawUser ? (JSON.parse(rawUser) as AuthResponseUser) : null;
    return { token, user: user && typeof user.id === "string" ? user : null };
  } catch {
    return { token: null, user: null };
  }
}

function writeStored(token: string | null, user: AuthResponseUser | null) {
  try {
    if (token && user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify({ email: user.email, id: user.id }));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // Storage unavailable (private mode): the session lasts for this tab only.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(DISABLE_AUTH);
  const [user, setUser] = useState<SanctuaryUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (DISABLE_AUTH) return;
    const saved = readStored();
    if (!saved.token) {
      setIsLoaded(true);
      return;
    }
    const token = saved.token;

    void (async () => {
      try {
        const response = await fetch(authApiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const fresh = (await response.json()) as AuthResponseUser;
          writeStored(token, fresh);
          setToken(token);
          setUser(toUser(fresh));
        } else if (response.status === 401) {
          // Only a definitive rejection ends the session.
          writeStored(null, null);
        } else if (saved.user) {
          setToken(token);
          setUser(toUser(saved.user));
        }
      } catch {
        // Offline: stay signed in as the last known account.
        if (saved.user) {
          setToken(token);
          setUser(toUser(saved.user));
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const signIn = useCallback((nextToken: string, data: AuthResponseUser) => {
    writeStored(nextToken, data);
    setToken(nextToken);
    setUser(toUser(data));
  }, []);

  const signOut = useCallback(async () => {
    const current = token;
    writeStored(null, null);
    setToken(null);
    setUser(null);
    if (!current) return;
    try {
      await fetch(authApiUrl("/api/auth/logout"), {
        headers: { Authorization: `Bearer ${current}` },
        method: "POST",
      });
    } catch {
      // The local session is already cleared; the server row expires on its own.
    }
  }, [token]);

  const getToken = useCallback(async () => token, [token]);

  const value = useMemo<SanctuaryAuthContextType>(
    () => ({ getToken, isLoaded, isSignedIn: user !== null, signIn, signOut, user }),
    [getToken, isLoaded, signIn, signOut, user]
  );

  return <SanctuaryAuthContext.Provider value={value}>{children}</SanctuaryAuthContext.Provider>;
}

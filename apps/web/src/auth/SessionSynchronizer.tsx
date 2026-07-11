import { useEffect } from "react";

import { useSessionStore } from "../store/useSessionStore";
import { useSanctuaryAuth } from "./useSanctuaryAuth";

export function SessionSynchronizer() {
  const { isLoaded, isSignedIn, user } = useSanctuaryAuth();
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      setSession("authenticated", user.id);
    } else {
      // It stays initializing until explicit choice, handled in App.tsx
    }
  }, [isLoaded, isSignedIn, user, setSession]);

  return null;
}

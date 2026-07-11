import { type ReactNode } from "react";

import { SanctuaryAuthContext } from "./useSanctuaryAuth";

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  return (
    <SanctuaryAuthContext.Provider
      value={{
        isLoaded: true,
        isSignedIn: false,
        user: null,
        getToken: async () => null,
        signOut: async () => {},
      }}
    >
      {children}
    </SanctuaryAuthContext.Provider>
  );
}

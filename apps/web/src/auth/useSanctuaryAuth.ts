import { createContext, useContext } from "react";

export interface SanctuaryUser {
  displayName: string | null;
  email: string | null;
  id: string;
  imageUrl: string | null;
}

export interface SanctuaryAuthContextType {
  getToken: () => Promise<string | null>;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  user: SanctuaryUser | null;
}

export const SanctuaryAuthContext = createContext<SanctuaryAuthContextType | null>(null);

export function useSanctuaryAuth(): SanctuaryAuthContextType {
  const context = useContext(SanctuaryAuthContext);
  if (!context) {
    throw new Error("useSanctuaryAuth must be used within a SanctuaryAuthProvider");
  }
  return context;
}

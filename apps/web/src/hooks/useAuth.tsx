import React, { createContext, useContext } from "react";
import type { ReactNode } from "react";
import {
  ClerkProvider,
  SignIn as ClerkSignIn,
  SignUp as ClerkSignUp,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from "@clerk/clerk-react";

type AuthUser = {
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  imageUrl?: string | null;
} | null;

type AuthContextValue = {
  enabled: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthUser;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const fallbackAuth: AuthContextValue = {
  enabled: false,
  isLoaded: true,
  isSignedIn: false,
  user: null,
  getToken: async () => null,
  signOut: async () => undefined,
};

const AuthContext = createContext<AuthContextValue>(fallbackAuth);

function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded: authLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { isLoaded: userLoaded, user } = useClerkUser();

  const value: AuthContextValue = {
    enabled: true,
    isLoaded: authLoaded && userLoaded,
    isSignedIn: !!isSignedIn,
    user: (user as AuthUser) ?? null,
    getToken,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
  if (!publishableKey) {
    return <AuthContext.Provider value={fallbackAuth}>{children}</AuthContext.Provider>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}

export function useAuth() {
  const { getToken, signOut, enabled, isLoaded, isSignedIn } = useContext(AuthContext);
  return { getToken, signOut, enabled, isLoaded, isSignedIn };
}

export function useUser() {
  const { isLoaded, isSignedIn, user, enabled } = useContext(AuthContext);
  return { isLoaded, isSignedIn, user, enabled };
}

type AuthComponentProps = Record<string, unknown>;

export const SignIn = (props: AuthComponentProps) => {
  const { enabled } = useContext(AuthContext);
  if (!enabled) return null;
  return <ClerkSignIn {...props} />;
};

export const SignUp = (props: AuthComponentProps) => {
  const { enabled } = useContext(AuthContext);
  if (!enabled) return null;
  return <ClerkSignUp {...props} />;
};

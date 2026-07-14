import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { type ReactNode } from "react";

import { SanctuaryAuthContext, type SanctuaryAuthContextType, type SanctuaryUser } from "./useSanctuaryAuth";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkAuthAdapter({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();

  const sanctuaryUser: SanctuaryUser | null = user
    ? {
        id: user.id,
        displayName: user.fullName || user.firstName || null,
        email: user.primaryEmailAddress?.emailAddress || null,
        imageUrl: user.imageUrl,
      }
    : null;

  const authValue: SanctuaryAuthContextType = {
    isLoaded,
    isSignedIn: !!isSignedIn,
    user: sanctuaryUser,
    getToken: () => getToken(),
    signOut: () => signOut(),
  };

  return <SanctuaryAuthContext.Provider value={authValue}>{children}</SanctuaryAuthContext.Provider>;
}

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  if (!PUBLISHABLE_KEY) {
    return <div className="p-4 text-red-500">Missing Clerk Publishable Key in environment variables.</div>;
  }

  return (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        elements: {
          footer: "hidden", // Hides the "Secured by Clerk" footer in popovers
        },
        layout: {
          logoPlacement: "none",
        }
      }}
    >
      <ClerkAuthAdapter>{children}</ClerkAuthAdapter>
    </ClerkProvider>
  );
}

import { type ReactNode } from "react";

import { ClerkAuthProvider } from "./ClerkAuthProvider";
import { GuestAuthProvider } from "./GuestAuthProvider";

const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === "true";

export function SanctuaryAuthProvider({ children }: { children: ReactNode }) {
  if (DISABLE_AUTH) {
    return <GuestAuthProvider>{children}</GuestAuthProvider>;
  }

  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

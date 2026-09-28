import { type ReactNode } from "react";

import { AuthProvider } from "./AuthProvider";

export function SanctuaryAuthProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

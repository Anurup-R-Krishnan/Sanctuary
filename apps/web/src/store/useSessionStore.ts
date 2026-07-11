import { create } from "zustand";

export type SessionMode = "initializing" | "guest" | "authenticated";

interface SessionState {
  mode: SessionMode;
  reset: () => void;

  setSession: (mode: SessionMode, userId?: string | null) => void;
  userId: string | null;
}

export const useSessionStore = create<SessionState>((set) => ({
  mode: "initializing",
  userId: null,

  setSession: (mode, userId = null) => {
    set({ mode, userId });
  },

  reset: () => {
    set({ mode: "initializing", userId: null });
  },
}));

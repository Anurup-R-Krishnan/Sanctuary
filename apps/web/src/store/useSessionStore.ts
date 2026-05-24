import { create } from "zustand";

interface SessionState {
  isGuest: boolean;
  reset: () => void;
  setIsGuest: (value: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isGuest: false,
  setIsGuest: (value) => set({ isGuest: value }),
  reset: () => set({ isGuest: false })
}));

import { create } from "zustand";

interface SessionState {
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isGuest: true,
  setIsGuest: (value) => set({ isGuest: value }),
  reset: () => set({ isGuest: true })
}));

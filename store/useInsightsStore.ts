import { create } from "zustand";

interface InsightsState {
  lastViewed: Date | null;
  setLastViewed: (date: Date) => void;
}

export const useInsightsStore = create<InsightsState>((set) => ({
  lastViewed: null,
  setLastViewed: (date) => set({ lastViewed: date }),
}));
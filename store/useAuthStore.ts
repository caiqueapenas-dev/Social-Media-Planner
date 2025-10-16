import { create } from "zustand";
import { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  initializeUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  initializeUser: (user) => {
    const { user: currentUser } = get();
    if (!currentUser) {
      set({ user, isLoading: false });
    }
  },
  setLoading: (isLoading) => set({ isLoading }),
}));

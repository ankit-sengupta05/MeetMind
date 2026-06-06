// =============================================================================
// client/src/store/useAppStore.ts
// Zustand global store for lightweight client-side state
// (Heavy server state lives in React Query – this is UI/session state only)
// =============================================================================

import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  activeMeetingId: string | null;
  searchQuery: string;

  setSidebarOpen: (open: boolean) => void;
  setActiveMeetingId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  activeMeetingId: null,
  searchQuery: '',

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveMeetingId: (id) => set({ activeMeetingId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));

import { create } from "zustand";

interface HomeUiStoreState {
  showRawData: boolean;
  setShowRawData: (showRawData: boolean) => void;
}

/**
 * Shared Home UI preferences that must stay in sync across sections.
 */
export const useHomeUiStore = create<HomeUiStoreState>((set) => ({
  showRawData: false,
  setShowRawData: (showRawData) => set({ showRawData }),
}));

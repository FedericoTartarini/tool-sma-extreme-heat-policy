import { create } from "zustand";

interface HomeUiStoreState {
  showWeatherDetails: boolean;
  setShowWeatherDetails: (showWeatherDetails: boolean) => void;
}

/**
 * Shared Home UI preferences that must stay in sync across sections.
 */
export const useHomeUiStore = create<HomeUiStoreState>((set) => ({
  showWeatherDetails: false,
  setShowWeatherDetails: (showWeatherDetails) => set({ showWeatherDetails }),
}));

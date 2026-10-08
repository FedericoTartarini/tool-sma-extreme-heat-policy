import { create } from "zustand";
import {
  loadPersistedHomeUiPreferences,
  savePersistedHomeUiPreferences,
  type HomeUiPreferences,
} from "@/lib/homeUiPreferencesStorage";

export type { HomeUiPreferences } from "@/lib/homeUiPreferencesStorage";

interface HomeUiState extends HomeUiPreferences {
  setShowWeatherDetails: (showWeatherDetails: boolean) => void;
}

export const DEFAULT_HOME_UI_PREFERENCES: HomeUiPreferences = {
  showWeatherDetails: false,
};

export const useHomeUiStore = create<HomeUiState>((set) => ({
  ...DEFAULT_HOME_UI_PREFERENCES,
  ...loadPersistedHomeUiPreferences(),
  setShowWeatherDetails: (showWeatherDetails) => {
    set({ showWeatherDetails });
    savePersistedHomeUiPreferences({ showWeatherDetails });
  },
}));

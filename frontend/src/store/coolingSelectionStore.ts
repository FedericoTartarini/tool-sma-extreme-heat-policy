import { create } from "zustand";
import type { CoolingSelection } from "@/domain/activeCooling";
import {
  loadCoolingSelection,
  saveCoolingSelection,
} from "@/lib/coolingSelectionStorage";

interface CoolingSelectionState {
  selection: CoolingSelection;
  saveSelection: (selectedOptionIds: readonly string[]) => boolean;
}

/** Browser preference independent from Home's location and risk lifecycle. */
export const useCoolingSelectionStore = create<CoolingSelectionState>(
  (set) => ({
    selection: loadCoolingSelection(),
    saveSelection: (selectedOptionIds) => {
      const selection: CoolingSelection = {
        configured: true,
        selectedOptionIds: [...new Set(selectedOptionIds)],
      };

      if (!saveCoolingSelection(selection)) {
        return false;
      }

      set({ selection });
      return true;
    },
  }),
);

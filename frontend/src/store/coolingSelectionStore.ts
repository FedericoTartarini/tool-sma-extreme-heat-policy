import { create } from "zustand";
import type { CoolingOptionId, CoolingSelection } from "@/domain/activeCooling";
import {
  loadCoolingSelection,
  saveCoolingSelection,
} from "@/lib/coolingSelectionStorage";

interface CoolingSelectionState {
  selection: CoolingSelection<CoolingOptionId>;
  saveSelection: (selectedOptionIds: readonly CoolingOptionId[]) => boolean;
}

/** Browser preference independent from Home's location and risk lifecycle. */
export const useCoolingSelectionStore = create<CoolingSelectionState>(
  (set) => ({
    selection: loadCoolingSelection(),
    saveSelection: (selectedOptionIds) => {
      const selection: CoolingSelection<CoolingOptionId> = {
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

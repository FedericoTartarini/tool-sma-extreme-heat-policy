import {
  isCoolingOptionId,
  type CoolingOptionId,
  type CoolingSelection,
} from "@/domain/activeCooling";

const COOLING_SELECTION_STORAGE_KEY = "home-cooling-selection:v1";

/** Restores browser preferences using the approved option IDs. */
export function loadCoolingSelection(): CoolingSelection<CoolingOptionId> {
  if (typeof window === "undefined") {
    return { configured: false };
  }

  try {
    const raw = window.localStorage.getItem(COOLING_SELECTION_STORAGE_KEY);
    if (!raw) {
      return { configured: false };
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { configured: false };
    }

    if ("configured" in parsed && parsed.configured === false) {
      return { configured: false };
    }

    if (
      "configured" in parsed &&
      parsed.configured === true &&
      "selectedOptionIds" in parsed &&
      Array.isArray(parsed.selectedOptionIds) &&
      parsed.selectedOptionIds.every(
        (id): id is string => typeof id === "string",
      )
    ) {
      return {
        configured: true,
        selectedOptionIds: [
          ...new Set(parsed.selectedOptionIds.filter(isCoolingOptionId)),
        ],
      };
    }
  } catch {
    // Unreadable preferences must not prevent Home from rendering.
  }

  return { configured: false };
}

/** Writes only the preference contract; false lets the caller offer a retry. */
export function saveCoolingSelection(
  selection: CoolingSelection<CoolingOptionId>,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const payload: CoolingSelection<CoolingOptionId> = selection.configured
      ? { configured: true, selectedOptionIds: selection.selectedOptionIds }
      : { configured: false };

    window.localStorage.setItem(
      COOLING_SELECTION_STORAGE_KEY,
      JSON.stringify(payload),
    );
    return true;
  } catch {
    return false;
  }
}

import { savePersistedShowRawData } from "@/pages/home/browserState";
import { useHomeUiStore } from "@/store/homeUiStore";

/**
 * Updates the raw-data toggle in memory and persists it, matching Home filter IO.
 */
export function useSetShowRawData() {
  const setShowRawData = useHomeUiStore((state) => state.setShowRawData);

  return (showRawData: boolean) => {
    setShowRawData(showRawData);
    savePersistedShowRawData(showRawData);
  };
}

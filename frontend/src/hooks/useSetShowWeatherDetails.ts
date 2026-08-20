import { savePersistedShowWeatherDetails } from "@/pages/home/browserState";
import { useHomeUiStore } from "@/store/homeUiStore";

/**
 * Updates the weather-details toggle in memory and persists it, matching Home filter IO.
 */
export function useSetShowWeatherDetails() {
  const setShowWeatherDetails = useHomeUiStore(
    (state) => state.setShowWeatherDetails,
  );

  return (showWeatherDetails: boolean) => {
    setShowWeatherDetails(showWeatherDetails);
    savePersistedShowWeatherDetails(showWeatherDetails);
  };
}

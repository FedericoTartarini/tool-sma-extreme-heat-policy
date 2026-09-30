import { Switch } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useHomeUiStore } from "@/store/homeUiStore";

interface ShowWeatherDetailsSwitchProps {
  disabled?: boolean;
}

/**
 * Shared toggle control for showing forecast weather details.
 */
export function ShowWeatherDetailsSwitch({
  disabled = false,
}: ShowWeatherDetailsSwitchProps) {
  const { t } = useTranslation();
  const showWeatherDetails = useHomeUiStore(
    (state) => state.showWeatherDetails,
  );
  const setShowWeatherDetails = useHomeUiStore(
    (state) => state.setShowWeatherDetails,
  );

  return (
    <Switch
      label={t("home.sections.forecast.weatherDetails.title")}
      checked={showWeatherDetails}
      onChange={(event) => setShowWeatherDetails(event.currentTarget.checked)}
      disabled={disabled}
    />
  );
}

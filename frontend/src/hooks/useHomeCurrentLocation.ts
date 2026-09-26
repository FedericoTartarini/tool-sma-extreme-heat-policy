import { useCallback, useEffect, useMemo, useState } from "react";
import { isAbortApiError } from "@/api/apiErrors";
import { reverseGeocodeCoordinates } from "@/api/mapboxReverseGeocode";
import type { HomeCurrentLocationErrorReason } from "@/domain/homeErrorMap";
import { LOCATION_SUGGEST_TYPES_PARAM } from "@/domain/locationSearch";
import { createLatestAbortableRequestController } from "@/lib/latestAbortableRequest";
import { useHomeStore } from "@/store/homeStore";

interface UseHomeCurrentLocationResult {
  isDetecting: boolean;
  errorReason: HomeCurrentLocationErrorReason | null;
  requestCurrentLocation: () => void;
}

export function toCurrentLocationErrorReason(
  error: GeolocationPositionError,
): HomeCurrentLocationErrorReason {
  if (error.code === error.PERMISSION_DENIED) {
    return "geolocation_permission_denied";
  }

  if (error.code === error.TIMEOUT) {
    return "geolocation_timeout";
  }

  return "geolocation_unavailable";
}

function getLanguagePreference(): string | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages.join(",");
  }

  return navigator.language || undefined;
}

/**
 * Resolves the user's location only after an explicit button click.
 */
export function useHomeCurrentLocation(): UseHomeCurrentLocationResult {
  const mapboxAccessToken = (
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""
  ).trim();
  const hasMapboxToken = mapboxAccessToken.length > 0;
  const selectLocation = useHomeStore((state) => state.selectLocation);
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorReason, setErrorReason] =
    useState<HomeCurrentLocationErrorReason | null>(null);
  const requestController = useMemo(
    () => createLatestAbortableRequestController(),
    [],
  );
  const language = useMemo(() => getLanguagePreference(), []);

  useEffect(() => () => requestController.cancel(), [requestController]);

  const requestCurrentLocation = useCallback(() => {
    requestController.cancel();
    setIsDetecting(false);

    if (!hasMapboxToken) {
      setErrorReason("missing_token");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorReason("geolocation_unavailable");
      return;
    }

    const request = requestController.start();
    setErrorReason(null);
    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          try {
            const suggestions = await reverseGeocodeCoordinates({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accessToken: mapboxAccessToken,
              types: LOCATION_SUGGEST_TYPES_PARAM,
              limit: 5,
              language,
              signal: request.signal,
            });

            if (!request.isCurrent()) {
              return;
            }

            const selectedLocation = suggestions[0];
            if (!selectedLocation) {
              setErrorReason("reverse_geocode_failed");
              return;
            }

            selectLocation(selectedLocation);
          } catch (error) {
            if (!request.isCurrent() || isAbortApiError(error)) {
              return;
            }

            setErrorReason("reverse_geocode_failed");
          } finally {
            if (request.isCurrent()) {
              setIsDetecting(false);
            }
            request.finish();
          }
        })();
      },
      (error) => {
        if (!request.isCurrent()) {
          return;
        }

        setIsDetecting(false);
        setErrorReason(toCurrentLocationErrorReason(error));
        request.finish();
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60_000,
      },
    );
  }, [
    hasMapboxToken,
    language,
    mapboxAccessToken,
    requestController,
    selectLocation,
  ]);

  return {
    isDetecting,
    errorReason,
    requestCurrentLocation,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAbortApiError } from "@/api/apiErrors";
import { reverseGeocodeCoordinates } from "@/api/mapboxReverseGeocode";
import type { HomeCurrentLocationErrorReason } from "@/domain/homeErrorMap";
import { LOCATION_SUGGEST_TYPES_PARAM } from "@/domain/locationSearch";
import { createLatestAbortableRequestController } from "@/lib/latestAbortableRequest";
import { useHomeStore } from "@/store/homeStore";

/**
 * A distinct error event emitted by the current-location hook.
 *
 * Wrapping the reason with a monotonically increasing `eventId` ensures that
 * repeated clicks that fail for the same reason (e.g. missing Mapbox token
 * or a browser without geolocation support) still produce a fresh React
 * state update, so downstream toast effects run on every failed click.
 */
export interface CurrentLocationErrorEvent {
  reason: HomeCurrentLocationErrorReason;
  eventId: number;
}

interface UseHomeCurrentLocationResult {
  isDetecting: boolean;
  error: CurrentLocationErrorEvent | null;
  requestCurrentLocation: () => void;
}

/**
 * Maps a raw browser `GeolocationPositionError` code to the typed reason union.
 *
 * This function is pure so it can be unit-tested without mounting hooks.
 */
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

/**
 * Returns the best-effort browser language list for Mapbox reverse geocoding.
 *
 * Matches the existing `suggestLocations` behaviour so detected and searched
 * place names are presented in the same language the user already sees.
 */
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
 *
 * Scope:
 * - Click-only. Never runs on page load.
 * - Browser `navigator.geolocation` only. No IP fallback.
 * - Results are reverse-geocoded into the same `LocationSuggestion` shape the
 *   existing combobox search produces, so saved-location identity and risk
 *   calculation work identically for detected and searched places.
 */
export function useHomeCurrentLocation(): UseHomeCurrentLocationResult {
  const mapboxAccessToken = (
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""
  ).trim();
  const hasMapboxToken = mapboxAccessToken.length > 0;
  const selectLocation = useHomeStore((state) => state.selectLocation);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<CurrentLocationErrorEvent | null>(null);
  const requestController = useMemo(
    () => createLatestAbortableRequestController(),
    [],
  );
  const language = useMemo(() => getLanguagePreference(), []);

  useEffect(() => () => requestController.cancel(), [requestController]);

  const emitError = useCallback((reason: HomeCurrentLocationErrorReason) => {
    setError((previous) => ({
      reason,
      eventId: (previous?.eventId ?? 0) + 1,
    }));
  }, []);

  const requestCurrentLocation = useCallback(() => {
    requestController.cancel();
    setIsDetecting(false);

    if (!hasMapboxToken) {
      emitError("missing_token");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      emitError("geolocation_unavailable");
      return;
    }

    const startingSessionToken = useHomeStore.getState().locationSessionToken;
    const request = requestController.start();
    setError(null);
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
              emitError("location_not_resolved");
              return;
            }

            const latestSessionToken =
              useHomeStore.getState().locationSessionToken;
            if (latestSessionToken !== startingSessionToken) {
              return;
            }

            selectLocation(selectedLocation);
          } catch (error) {
            if (!request.isCurrent() || isAbortApiError(error)) {
              return;
            }

            emitError("reverse_geocode_failed");
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
        emitError(toCurrentLocationErrorReason(error));
        request.finish();
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60_000,
      },
    );
  }, [
    emitError,
    hasMapboxToken,
    language,
    mapboxAccessToken,
    requestController,
    selectLocation,
  ]);

  return {
    isDetecting,
    error,
    requestCurrentLocation,
  };
}

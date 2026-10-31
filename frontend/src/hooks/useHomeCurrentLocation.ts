import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAbortApiError } from "@/api/apiErrors";
import { reverseGeocodeCoordinates } from "@/api/mapboxReverseGeocode";
import type { HomeCurrentLocationErrorReason } from "@/domain/homeErrorMap";
import { requestGeolocation } from "@/lib/requestGeolocation";
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
 * - A supported suburb/town identity is paired with the device coordinates.
 */
export function useHomeCurrentLocation(): UseHomeCurrentLocationResult {
  const mapboxAccessToken = (
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""
  ).trim();
  const hasMapboxToken = mapboxAccessToken.length > 0;
  const selectLocation = useHomeStore((state) => state.selectLocation);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<CurrentLocationErrorEvent | null>(null);
  const nextErrorId = useRef(0);
  const requestController = useHomeStore(
    (state) => state.locationRequestController,
  );
  const language = useMemo(() => getLanguagePreference(), []);

  useEffect(() => () => requestController.cancel(), [requestController]);

  const emitError = useCallback((reason: HomeCurrentLocationErrorReason) => {
    nextErrorId.current += 1;
    setError({
      reason,
      eventId: nextErrorId.current,
    });
  }, []);

  const requestCurrentLocation = useCallback(() => {
    requestController.cancel();
    useHomeStore.getState().finishPrefilledLocationResolve();
    setIsDetecting(false);

    if (!hasMapboxToken) {
      emitError("missing_token");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      emitError("geolocation_unavailable");
      return;
    }

    const request = requestController.start();
    setError(null);
    setIsDetecting(true);
    const onCancel = () => setIsDetecting(false);
    request.signal.addEventListener("abort", onCancel, { once: true });
    const finish = () => {
      request.signal.removeEventListener("abort", onCancel);
      if (request.isCurrent()) {
        setIsDetecting(false);
      }
      request.finish();
    };

    requestGeolocation({
      geolocation: navigator.geolocation,
      signal: request.signal,
      onTimeout: () => {
        if (!request.isCurrent()) {
          return;
        }
        requestController.cancel();
        setIsDetecting(false);
        emitError("geolocation_timeout");
      },
      onSuccess: (position) => {
        if (!request.isCurrent()) {
          return;
        }
        const lookupTimeout = setTimeout(() => {
          if (request.isCurrent()) {
            requestController.cancel();
            emitError("reverse_geocode_failed");
          }
        }, 15_000);
        const clearLookupTimeout = () => clearTimeout(lookupTimeout);
        request.signal.addEventListener("abort", clearLookupTimeout, {
          once: true,
        });
        void (async () => {
          try {
            const suggestions = await reverseGeocodeCoordinates({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accessToken: mapboxAccessToken,
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

            selectLocation(selectedLocation);
          } catch (error) {
            if (!request.isCurrent() || isAbortApiError(error)) {
              return;
            }

            emitError("reverse_geocode_failed");
          } finally {
            clearLookupTimeout();
            request.signal.removeEventListener("abort", clearLookupTimeout);
            finish();
          }
        })();
      },
      onError: (error) => {
        if (!request.isCurrent()) {
          return;
        }

        setIsDetecting(false);
        emitError(toCurrentLocationErrorReason(error));
        finish();
      },
    });
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

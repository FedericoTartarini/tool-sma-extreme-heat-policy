import { isAbortApiError } from "@/api/apiErrors";
import {
  mapboxRetrieveRetryPolicy,
  retryApiRequest,
} from "@/api/apiRetryPolicy";
import { retrieveLocationCoordinates } from "@/api/mapboxRetrieve";
import type { LocationSuggestion } from "@/domain/location";
import type { AbortableRequestHandle } from "@/lib/latestAbortableRequest";

export interface RetrieveAndSelectLocationParams {
  selectedSuggestion: LocationSuggestion;
  hasMapboxToken: boolean;
  mapboxAccessToken: string;
  request: AbortableRequestHandle;
  selectLocation: (suggestion: LocationSuggestion) => void;
  setHasRetrieveError: (hasError: boolean) => void;
}

/**
 * Retrieves coordinates for a Mapbox suggestion and commits only current results.
 */
export async function retrieveAndSelectLocation({
  selectedSuggestion,
  hasMapboxToken,
  mapboxAccessToken,
  request,
  selectLocation,
  setHasRetrieveError,
}: RetrieveAndSelectLocationParams): Promise<void> {
  const mapboxId = selectedSuggestion.mapboxId;
  const sessionToken = selectedSuggestion.sessionToken;

  if (!mapboxId || !sessionToken || !hasMapboxToken) {
    if (request.isCurrent()) {
      setHasRetrieveError(true);
    }
    request.finish();
    return;
  }

  try {
    const coordinates = await retryApiRequest(
      () =>
        retrieveLocationCoordinates({
          mapboxId,
          accessToken: mapboxAccessToken,
          sessionToken,
          signal: request.signal,
        }),
      mapboxRetrieveRetryPolicy,
      {
        canContinue: request.isCurrent,
      },
    );

    if (!request.isCurrent()) {
      return;
    }

    setHasRetrieveError(false);
    selectLocation({
      ...selectedSuggestion,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
  } catch (error) {
    if (!request.isCurrent() || isAbortApiError(error)) {
      return;
    }

    setHasRetrieveError(true);
  } finally {
    request.finish();
  }
}

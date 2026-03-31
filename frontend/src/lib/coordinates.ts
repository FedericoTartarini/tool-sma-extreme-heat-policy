export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Converts unknown values into a finite number when possible.
 */
export function toFiniteNumberOrUndefined(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

/**
 * Normalizes unknown latitude/longitude values into coordinates.
 */
export function toCoordinatesOrNull(payload: {
  latitude?: unknown;
  longitude?: unknown;
}): Coordinates | null {
  const latitude = toFiniteNumberOrUndefined(payload.latitude);
  const longitude = toFiniteNumberOrUndefined(payload.longitude);

  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

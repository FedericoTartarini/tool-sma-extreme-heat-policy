import type { SportType } from "@/domain/sport";

export interface SportImageFailure {
  readonly sport: SportType;
  readonly url: string;
}

/**
 * Returns the failed image URL only while the sport whose image failed is
 * still selected, so a sport change from any source clears the failure.
 */
export function getSportImageFailureUrl(
  failure: SportImageFailure | null,
  sport: SportType,
): string | null {
  return failure?.sport === sport ? failure.url : null;
}

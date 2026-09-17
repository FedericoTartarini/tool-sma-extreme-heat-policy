import {
  createResponsiveImageAsset,
  type ResponsiveImageAsset,
} from "@/lib/responsiveImage";

export const SportType = {
  Abseiling: "ABSEILING",
  Archery: "ARCHERY",
  AustralianFootball: "AUSTRALIAN_FOOTBALL",
  Baseball: "BASEBALL",
  Basketball: "BASKETBALL",
  Bowls: "BOWLS",
  Canoeing: "CANOEING",
  Cricket: "CRICKET",
  Croquet: "CROQUET",
  Cycling: "CYCLING",
  Equestrian: "EQUESTRIAN",
  FieldAthletics: "FIELD_ATHLETICS",
  FieldHockey: "FIELD_HOCKEY",
  Fishing: "FISHING",
  Golf: "GOLF",
  Horseback: "HORSEBACK",
  Kayaking: "KAYAKING",
  Running: "RUNNING",
  Mtb: "MTB",
  Netball: "NETBALL",
  Oztag: "OZTAG",
  Pickleball: "PICKLEBALL",
  Climbing: "CLIMBING",
  Rowing: "ROWING",
  RugbyLeague: "RUGBY_LEAGUE",
  RugbyUnion: "RUGBY_UNION",
  Sailing: "SAILING",
  Shooting: "SHOOTING",
  Soccer: "SOCCER",
  Softball: "SOFTBALL",
  Tennis: "TENNIS",
  Touch: "TOUCH",
  Volleyball: "VOLLEYBALL",
  Walking: "WALKING",
} as const;

export type SportType = (typeof SportType)[keyof typeof SportType];

export const DEFAULT_SPORT_TYPE = SportType.Soccer;

/**
 * Maps an enum value into an asset/translation-friendly name.
 */
export function toSportAssetName(type: SportType): string {
  return type.toLowerCase();
}

export interface SportMeta {
  type: SportType;
  assetName: string;
  labelKey: string;
  image: ResponsiveImageAsset;
}

const STANDARD_SPORT_IMAGE_WIDTHS = [320, 640, 816] as const;
const COMPACT_SPORT_IMAGE_WIDTHS = [320, 522] as const;

function getSportImageWidths(type: SportType): readonly number[] {
  return type === SportType.Soccer || type === SportType.Walking
    ? COMPACT_SPORT_IMAGE_WIDTHS
    : STANDARD_SPORT_IMAGE_WIDTHS;
}

export const sports: readonly SportMeta[] = Object.values(SportType).map(
  (type) => {
    const assetName = toSportAssetName(type);

    return {
      type,
      assetName,
      labelKey: `sports.${assetName}`,
      image: createResponsiveImageAsset({
        assetPath: `sports/${assetName}`,
        widths: getSportImageWidths(type),
      }),
    };
  },
);

export const SPORT_TYPE_VALUES: SportType[] = sports.map((sport) => sport.type);

/**
 * Runtime guard to validate sport values coming from the URL/UI.
 */
export function isSportType(value: string): value is SportType {
  return SPORT_TYPE_VALUES.includes(value as SportType);
}

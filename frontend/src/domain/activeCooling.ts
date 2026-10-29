/**
 * Stable identifiers for the five Active Cooling methods in policy order.
 * This order mirrors `recommendations.detailed.high.suggestions` and is also
 * the approved display order for the selectable options.
 */
export const ACTIVE_COOLING_METHOD_IDS = [
  "cold-fluids-or-slushies",
  "arm-or-foot-immersion",
  "water-dousing",
  "ice-packs-or-towels",
  "fans",
] as const;

export type ActiveCoolingMethodId = (typeof ACTIVE_COOLING_METHOD_IDS)[number];

/**
 * The approved options are the five policy methods themselves. Keeping the
 * option ids identical to the method ids avoids a second, drifting identity.
 */
export const ACTIVE_COOLING_OPTION_IDS = ACTIVE_COOLING_METHOD_IDS;

export type CoolingOptionId = ActiveCoolingMethodId;

const ACTIVE_COOLING_OPTION_ID_SET: ReadonlySet<string> = new Set(
  ACTIVE_COOLING_OPTION_IDS,
);

/** Validates persisted or otherwise untrusted values at runtime. */
export function isCoolingOptionId(value: unknown): value is CoolingOptionId {
  return typeof value === "string" && ACTIVE_COOLING_OPTION_ID_SET.has(value);
}

/**
 * Browser-owned Active Cooling preference shared by the domain and Home UI.
 *
 * The discriminant keeps "not configured" distinct from "configured with no
 * options available". Option identifiers must be stable domain identifiers,
 * never translated labels.
 */
export type CoolingSelection<OptionId extends string = string> =
  | Readonly<{
      configured: false;
    }>
  | Readonly<{
      configured: true;
      selectedOptionIds: readonly OptionId[];
    }>;

/**
 * Maps selectable option identifiers to the policy methods they enable.
 * The generic shape remains useful for resolver tests and future adapters.
 */
export type ActiveCoolingOptionMap<OptionId extends string = string> = Readonly<
  Partial<Record<OptionId, readonly ActiveCoolingMethodId[]>>
>;

/**
 * Production mapping approved for the first release. Each selectable policy
 * method enables only its matching recommendation method.
 */
export const ACTIVE_COOLING_OPTION_TO_METHOD_IDS = {
  "cold-fluids-or-slushies": ["cold-fluids-or-slushies"],
  "arm-or-foot-immersion": ["arm-or-foot-immersion"],
  "water-dousing": ["water-dousing"],
  "ice-packs-or-towels": ["ice-packs-or-towels"],
  fans: ["fans"],
} as const satisfies Readonly<
  Record<CoolingOptionId, readonly ActiveCoolingMethodId[]>
>;

/**
 * Domain result consumed by Home recommendation components.
 *
 * Method identifiers remain independent from user-facing copy. The UI owns
 * translation and decides how to render the preparation reminder.
 */
export interface ActiveCoolingResolution<
  MethodId extends string = ActiveCoolingMethodId,
> {
  readonly visibleMethodIds: readonly MethodId[];
  readonly showPrepareReminder: boolean;
}

/**
 * Generic boundary used to resolve Home advice from an option-to-method map.
 * The Home integration can bind the approved production mapping above.
 */
export type ActiveCoolingAdviceResolver<OptionId extends string = string> = (
  selection: CoolingSelection<OptionId>,
  optionToMethodIds: ActiveCoolingOptionMap<OptionId>,
) => ActiveCoolingResolution;

/**
 * Resolves the policy methods visible for the current browser preference.
 */
export function resolveActiveCoolingAdvice<OptionId extends string = string>(
  selection: CoolingSelection<OptionId>,
  optionToMethodIds: ActiveCoolingOptionMap<OptionId>,
): ActiveCoolingResolution {
  if (!selection.configured) {
    return {
      visibleMethodIds: ACTIVE_COOLING_METHOD_IDS,
      showPrepareReminder: false,
    };
  }

  if (selection.selectedOptionIds.length === 0) {
    return {
      visibleMethodIds: ACTIVE_COOLING_METHOD_IDS,
      showPrepareReminder: true,
    };
  }

  const mappedMethodIds = new Set<ActiveCoolingMethodId>();
  let hasValidOption = false;

  for (const optionId of selection.selectedOptionIds) {
    if (!Object.hasOwn(optionToMethodIds, optionId)) {
      continue;
    }

    const methodIds = optionToMethodIds[optionId];
    if (!Array.isArray(methodIds)) {
      continue;
    }

    hasValidOption = true;
    for (const methodId of methodIds) {
      mappedMethodIds.add(methodId);
    }
  }

  if (!hasValidOption) {
    return {
      visibleMethodIds: ACTIVE_COOLING_METHOD_IDS,
      showPrepareReminder: true,
    };
  }

  return {
    visibleMethodIds: ACTIVE_COOLING_METHOD_IDS.filter((methodId) =>
      mappedMethodIds.has(methodId),
    ),
    showPrepareReminder: false,
  };
}

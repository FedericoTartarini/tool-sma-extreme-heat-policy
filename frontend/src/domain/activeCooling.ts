/**
 * Stable identifiers for the five Active Cooling methods in policy order.
 * This order mirrors `recommendations.detailed.high.suggestions` and is
 * independent from the product's eventual list of selectable options.
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
 * The concrete mapping will be supplied after the product decision is final.
 */
export type ActiveCoolingOptionMap<OptionId extends string = string> = Readonly<
  Partial<Record<OptionId, readonly ActiveCoolingMethodId[]>>
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
 * Generic boundary used to resolve Home advice independently from the final
 * product option list. A concrete domain adapter can bind the approved map
 * before the Home UI consumes it.
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

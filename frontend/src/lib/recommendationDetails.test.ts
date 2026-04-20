import { describe, expect, it } from "vitest";
import type { RiskLevel } from "@/domain/riskRegistry";
import enTranslations from "@/i18n/locales/en/translation.json";
import { getRecommendationDetailContent } from "@/lib/recommendationDetails";

function translate(key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (value, segment) =>
        value !== null && typeof value === "object" && segment in value
          ? (value as Record<string, unknown>)[segment]
          : undefined,
      enTranslations,
    );
}

describe("getRecommendationDetailContent", () => {
  it.each<[RiskLevel, string, string[], string[]]>([
    [
      "low",
      "Low",
      ["Stay hydrated", "Wear light clothing"],
      [
        "Ensure pre-exercise hydration by consuming 6 ml of water per kilogram of body weight every 2-3 hours before exercise. For a 70kg individual, this equates to 420ml of fluid every 2-3 hours (a standard sports drink bottle contains 500ml).",
        "Drink regularly throughout exercise. You should aim to drink enough to offset sweat losses, but it is important to avoid over-drinking because this can also have negative health effects. To familiarise yourself with how much you typically sweat, become accustomed to weighing yourself before and after practice or competition.",
        "Where possible, select light-weight and breathable clothing with extra ventilation.",
        "Remove unnecessary clothing/equipment and/or excess clothing layers.",
        "Reduce the amount of skin that is covered by clothing - this will help increase your sweat evaporation, which will help you dissipate heat.",
      ],
    ],
    [
      "moderate",
      "Moderate",
      ["Stay hydrated", "Wear light clothing", "Rest Breaks"],
      [
        "During training sessions, provide a minimum of 15 minutes of rest for every 45 minutes of practice.",
        "Extend scheduled rest breaks that naturally occur during match-play of a particular sport (e.g. half-time) by ~10 minutes. This is effective for sports such as soccer/football and rugby and can be implemented across other sports such as field hockey.",
        "Implement additional rest breaks that are not normally scheduled to occur. For example, 3 to 5-min “quarter-time” breaks can be introduced mid-way through each half of a football or rugby match, or an extended 10-min drinks break can be introduced every hour of a cricket match or after the second set of a tennis match.",
        "For sports with continuous play without any scheduled breaks, courses or play duration can be shortened.",
        "During all breaks in play or practice, everyone should seek shade - if natural shade is not available, portable sun shelters should be provided, and water freely available.",
      ],
    ],
    [
      "high",
      "High",
      ["Stay hydrated", "Wear light clothing", "Rest Breaks", "Active Cooling"],
      [
        "Drinking cold fluids and/or ice slushies before exercise commences. Note that cold water and ice slushy ingestion during exercise is less effective for cooling.",
        "Submerging your arms/feet in cold water.",
        "Water dousing - wetting your skin with cool water using a sponge or a spray bottle helps increase evaporation, which is the most effective cooling mechanism in the heat.",
        "Ice packs/towels - placing an ice pack or damp towel filled with crushed ice around your neck.",
        "Electric (misting) fans - outdoor fans can help keep your body cool, especially when combined with a water misting system.",
      ],
    ],
    [
      "extreme",
      "Extreme",
      ["Consider Suspending Play"],
      [
        "All players should seek shade or cool refuge in an air-conditioned space if available.",
        "Active cooling strategies should be applied.",
      ],
    ],
  ])(
    "returns translated recommendation details for %s risk",
    (level, expectedLabel, expectedItems, expectedSuggestions) => {
      const content = getRecommendationDetailContent(level, translate);

      expect(content.level).toBe(level);
      expect(content.levelLabel).toBe(expectedLabel);
      expect(content.items.map((item) => item.label)).toEqual(expectedItems);
      expect(content.items).toHaveLength(expectedItems.length);
      expect(content.items.every((item) => item.src.length > 0)).toBe(true);
      expect(content.description.length).toBeGreaterThan(0);
      expect(content.suggestions).toEqual(expectedSuggestions);
    },
  );
});

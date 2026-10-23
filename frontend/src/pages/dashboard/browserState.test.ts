import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_DASHBOARD_CARDS,
  type SavedDashboardCard,
} from "@/domain/dashboard";
import {
  DASHBOARD_VIEW_MODES,
  DEFAULT_DASHBOARD_VIEW_MODE,
} from "@/domain/dashboardViewMode";
import { SportType, SPORT_TYPE_VALUES } from "@/domain/sport";
import {
  loadPersistedDashboardState,
  loadPersistedDashboardViewMode,
  savePersistedDashboardState,
  savePersistedDashboardViewMode,
} from "@/pages/dashboard/browserState";

const DASHBOARD_STORAGE_KEY = "dashboard-cards:v1";
const DASHBOARD_VIEW_MODE_STORAGE_KEY = "dashboard-view-mode:v1";

const SYDNEY_CARD: SavedDashboardCard = {
  id: "card-sydney",
  sport: SportType.Soccer,
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  latitude: -33.847,
  longitude: 151.067,
  mapboxId: "mapbox-sydney",
};

const MELBOURNE_CARD: SavedDashboardCard = {
  id: "card-melbourne",
  sport: SportType.Running,
  displayLabel: "Melbourne, Victoria, Australia",
  name: "Melbourne",
  regionName: "Victoria",
  countryName: "Australia",
  latitude: -37.813,
  longitude: 144.963,
  mapboxId: "mapbox-melbourne",
};

const SCHEDULED_SYDNEY_CARD: SavedDashboardCard = {
  ...SYDNEY_CARD,
  schedule: { weekdays: [2, 4], startMinutes: 1080, endMinutes: 1200 },
};

function installWindowMock(): Map<string, string> {
  const storage = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  });

  return storage;
}

function persistRawCards(storage: Map<string, string>, cards: unknown): void {
  storage.set(DASHBOARD_STORAGE_KEY, JSON.stringify({ cards }));
}

describe("dashboard browserState", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the cards it previously saved", () => {
    savePersistedDashboardState({ cards: [SYDNEY_CARD, MELBOURNE_CARD] });

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toEqual({
      cards: [SYDNEY_CARD, MELBOURNE_CARD],
    });
  });

  it("keeps the valid cards when one card is invalid", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    persistRawCards(storage, [
      SYDNEY_CARD,
      { ...MELBOURNE_CARD, latitude: "not-a-number" },
      MELBOURNE_CARD,
    ]);

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toEqual({
      cards: [SYDNEY_CARD, MELBOURNE_CARD],
    });
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("drops a card whose sport is no longer supported", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    persistRawCards(storage, [
      SYDNEY_CARD,
      { ...MELBOURNE_CARD, sport: "removed-sport" },
    ]);

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toEqual({
      cards: [SYDNEY_CARD],
    });
  });

  it("does not warn when every card is valid", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    persistRawCards(storage, [SYDNEY_CARD]);

    loadPersistedDashboardState(SPORT_TYPE_VALUES);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("loads a card with its saved schedule", () => {
    savePersistedDashboardState({
      cards: [SCHEDULED_SYDNEY_CARD, MELBOURNE_CARD],
    });

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toEqual({
      cards: [SCHEDULED_SYDNEY_CARD, MELBOURNE_CARD],
    });
  });

  it("drops a card whose schedule has the wrong shape", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    persistRawCards(storage, [
      {
        ...SYDNEY_CARD,
        schedule: { weekdays: "Tuesday", startMinutes: 1080, endMinutes: 1200 },
      },
      MELBOURNE_CARD,
    ]);

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toEqual({
      cards: [MELBOURNE_CARD],
    });
  });

  it("returns null when the saved cards are not a list", () => {
    persistRawCards(storage, { id: "card-sydney" });

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toBeNull();
  });

  it("returns null when nothing has been saved", () => {
    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toBeNull();
  });

  it("caps the loaded cards at the dashboard limit", () => {
    const cards = Array.from(
      { length: MAX_DASHBOARD_CARDS + 1 },
      (_, index) => ({ ...SYDNEY_CARD, id: `card-${index}` }),
    );
    persistRawCards(storage, cards);

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)?.cards).toHaveLength(
      MAX_DASHBOARD_CARDS,
    );
  });
});

describe("dashboard other period storage", () => {
  beforeEach(() => {
    installWindowMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads and saves the other-period draft", async () => {
    const {
      loadPersistedDashboardOtherPeriodDraft,
      savePersistedDashboardOtherPeriodDraft,
    } = await import("@/pages/dashboard/browserState");

    savePersistedDashboardOtherPeriodDraft({
      weekday: 2,
      startMinutes: 540,
      endMinutes: 660,
    });

    expect(loadPersistedDashboardOtherPeriodDraft()).toEqual({
      weekday: 2,
      startMinutes: 540,
      endMinutes: 660,
    });
  });

  it("falls back when a saved draft is not restorable", async () => {
    const { createDefaultDashboardOtherPeriodDraft } =
      await import("@/domain/dashboardOtherPeriod");
    const {
      loadPersistedDashboardOtherPeriodDraft,
      savePersistedDashboardOtherPeriodDraft,
    } = await import("@/pages/dashboard/browserState");

    savePersistedDashboardOtherPeriodDraft({
      weekday: 2,
      startMinutes: 90,
      endMinutes: 180,
    });

    expect(loadPersistedDashboardOtherPeriodDraft()).toEqual(
      createDefaultDashboardOtherPeriodDraft(),
    );
  });
});

describe("dashboard view mode storage", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(DASHBOARD_VIEW_MODES)("loads the saved %s mode", (viewMode) => {
    savePersistedDashboardViewMode(viewMode);

    expect(loadPersistedDashboardViewMode()).toBe(viewMode);
  });

  it("falls back to the default mode when nothing has been saved", () => {
    expect(loadPersistedDashboardViewMode()).toBe(DEFAULT_DASHBOARD_VIEW_MODE);
  });

  it("falls back to the default mode when the saved value is unknown", () => {
    storage.set(DASHBOARD_VIEW_MODE_STORAGE_KEY, "yesterday");

    expect(loadPersistedDashboardViewMode()).toBe(DEFAULT_DASHBOARD_VIEW_MODE);
  });

  it("replaces a previously saved mode", () => {
    savePersistedDashboardViewMode("my_schedule");
    savePersistedDashboardViewMode("other_time_period");

    expect(loadPersistedDashboardViewMode()).toBe("other_time_period");
  });
});

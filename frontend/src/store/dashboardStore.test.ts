import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DashboardCardSchedule,
  isDuplicateSavedDashboardCard,
  MAX_DASHBOARD_CARDS,
  validateAddSavedDashboardCard,
} from "@/domain/dashboard";
import type { LocationSuggestion } from "@/domain/location";
import { SportType } from "@/domain/sport";
import { createDefaultDashboardOtherPeriodDraft } from "@/domain/dashboardOtherPeriod";
import { DEFAULT_DASHBOARD_VIEW_MODE } from "@/domain/dashboardViewMode";
import {
  loadPersistedDashboardOtherPeriodDraft,
  loadPersistedDashboardViewMode,
  savePersistedDashboardOtherPeriodDraft,
  savePersistedDashboardViewMode,
} from "@/pages/dashboard/browserState";
import { useDashboardStore } from "@/store/dashboardStore";

const SYDNEY_LOCATION: LocationSuggestion = {
  id: "suggestion-sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  mapboxId: "mapbox-sydney",
  latitude: -33.847,
  longitude: 151.067,
};

const MELBOURNE_LOCATION: LocationSuggestion = {
  id: "suggestion-melbourne",
  displayLabel: "Melbourne, Victoria, Australia",
  name: "Melbourne",
  regionName: "Victoria",
  countryName: "Australia",
  mapboxId: "mapbox-melbourne",
  latitude: -37.813,
  longitude: 144.963,
};

const TUESDAY_THURSDAY_EVENING: DashboardCardSchedule = {
  weekdays: [2, 4],
  startMinutes: 1080,
  endMinutes: 1200,
};

const MONDAY_MORNING: DashboardCardSchedule = {
  weekdays: [1],
  startMinutes: 540,
  endMinutes: 660,
};

const DASHBOARD_VIEW_MODE_STORAGE_KEY = "dashboard-view-mode:v1";

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

function resetDashboardStore() {
  useDashboardStore.setState({
    isBootstrapped: false,
    viewMode: DEFAULT_DASHBOARD_VIEW_MODE,
    otherPeriodDraft: createDefaultDashboardOtherPeriodDraft(
      new Date("2026-09-15T00:00:00Z"),
    ),
    draftSport: SportType.Soccer,
    draftLocation: null,
    cards: [],
    locationSearchInput: "",
    locationSessionToken: "session-initial",
  });
}

describe("dashboardStore", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
    resetDashboardStore();
  });

  afterEach(() => {
    resetDashboardStore();
    vi.unstubAllGlobals();
  });

  it("bootstraps with persisted cards", () => {
    useDashboardStore.getState().bootstrap({
      cards: [
        {
          id: "card-1",
          sport: SportType.Cricket,
          displayLabel: SYDNEY_LOCATION.displayLabel,
          name: SYDNEY_LOCATION.name,
          regionName: SYDNEY_LOCATION.regionName,
          countryName: SYDNEY_LOCATION.countryName,
          latitude: SYDNEY_LOCATION.latitude as number,
          longitude: SYDNEY_LOCATION.longitude as number,
        },
      ],
    });

    expect(useDashboardStore.getState()).toMatchObject({
      isBootstrapped: true,
      cards: [
        expect.objectContaining({
          name: "Sydney",
          sport: SportType.Cricket,
        }),
      ],
    });
  });

  it("bootstraps with the saved view mode instead of the default", () => {
    savePersistedDashboardViewMode("my_schedule");

    useDashboardStore.getState().bootstrap({
      cards: [],
    });

    expect(useDashboardStore.getState().viewMode).toBe("my_schedule");
    expect(loadPersistedDashboardViewMode()).toBe("my_schedule");
  });

  it("bootstraps with an explicit view mode when provided", () => {
    savePersistedDashboardViewMode("my_schedule");

    useDashboardStore.getState().bootstrap({
      cards: [],
      viewMode: "other_time_period",
    });

    expect(useDashboardStore.getState().viewMode).toBe("other_time_period");
  });

  it("bootstraps with the saved other-period draft instead of the default", () => {
    savePersistedDashboardOtherPeriodDraft({
      weekday: 4,
      startMinutes: 540,
      endMinutes: 660,
    });

    useDashboardStore.getState().bootstrap({
      cards: [],
    });

    expect(useDashboardStore.getState().otherPeriodDraft).toEqual({
      weekday: 4,
      startMinutes: 540,
      endMinutes: 660,
    });
    expect(loadPersistedDashboardOtherPeriodDraft()).toEqual({
      weekday: 4,
      startMinutes: 540,
      endMinutes: 660,
    });
  });

  it("bootstraps with an explicit other-period draft when provided", () => {
    savePersistedDashboardOtherPeriodDraft({
      weekday: 4,
      startMinutes: 540,
      endMinutes: 660,
    });

    useDashboardStore.getState().bootstrap({
      cards: [],
      otherPeriodDraft: {
        weekday: 1,
        startMinutes: 1080,
        endMinutes: 1200,
      },
    });

    expect(useDashboardStore.getState().otherPeriodDraft).toEqual({
      weekday: 1,
      startMinutes: 1080,
      endMinutes: 1200,
    });
  });

  it("adds, reorders, and removes saved cards", () => {
    expect(
      useDashboardStore
        .getState()
        .addCard(SportType.Soccer, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING),
    ).toEqual({
      ok: true,
    });
    expect(
      useDashboardStore
        .getState()
        .addCard(
          SportType.Soccer,
          MELBOURNE_LOCATION,
          TUESDAY_THURSDAY_EVENING,
        ),
    ).toEqual({
      ok: true,
    });

    const [firstCard] = useDashboardStore.getState().cards;
    useDashboardStore.getState().moveCardDown(firstCard.id);

    expect(useDashboardStore.getState().cards.map((card) => card.name)).toEqual(
      ["Melbourne", "Sydney"],
    );

    useDashboardStore.getState().removeCard(firstCard.id);

    expect(useDashboardStore.getState().cards).toHaveLength(1);
    expect(useDashboardStore.getState().cards[0]?.name).toBe("Melbourne");
  });

  it("saves the schedule on a new card", () => {
    expect(
      useDashboardStore
        .getState()
        .addCard(SportType.Soccer, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING),
    ).toEqual({ ok: true });

    expect(useDashboardStore.getState().cards[0]?.schedule).toEqual(
      TUESDAY_THURSDAY_EVENING,
    );
  });

  it("allows the same location for different sports", () => {
    expect(
      useDashboardStore
        .getState()
        .addCard(SportType.Soccer, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING),
    ).toEqual({
      ok: true,
    });
    expect(
      useDashboardStore
        .getState()
        .addCard(SportType.Cricket, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING),
    ).toEqual({
      ok: true,
    });

    expect(useDashboardStore.getState().cards).toHaveLength(2);
  });

  it("updates dashboard view mode and persists the selection", () => {
    useDashboardStore.getState().setViewMode("my_schedule");

    expect(useDashboardStore.getState().viewMode).toBe("my_schedule");
    expect(storage.get(DASHBOARD_VIEW_MODE_STORAGE_KEY)).toBe("my_schedule");
    expect(loadPersistedDashboardViewMode()).toBe("my_schedule");
  });

  it("updates the other-period draft and persists the selection", () => {
    useDashboardStore.getState().setOtherPeriodWeekday(4);
    useDashboardStore.getState().setOtherPeriodStartMinutes(540);
    useDashboardStore.getState().setOtherPeriodEndMinutes(660);

    expect(useDashboardStore.getState().otherPeriodDraft).toEqual({
      weekday: 4,
      startMinutes: 540,
      endMinutes: 660,
    });
    expect(loadPersistedDashboardOtherPeriodDraft()).toEqual({
      weekday: 4,
      startMinutes: 540,
      endMinutes: 660,
    });
  });

  it("rejects duplicate cards for the same sport and location", () => {
    expect(
      validateAddSavedDashboardCard(
        [],
        SportType.Soccer,
        SYDNEY_LOCATION,
        TUESDAY_THURSDAY_EVENING,
      ),
    ).toEqual({
      ok: true,
    });

    useDashboardStore
      .getState()
      .addCard(SportType.Soccer, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING);

    expect(
      isDuplicateSavedDashboardCard(useDashboardStore.getState().cards, {
        sport: SportType.Soccer,
        latitude: SYDNEY_LOCATION.latitude as number,
        longitude: SYDNEY_LOCATION.longitude as number,
        mapboxId: SYDNEY_LOCATION.mapboxId,
        schedule: {
          ...TUESDAY_THURSDAY_EVENING,
          weekdays: [4, 2],
        },
      }),
    ).toBe(true);

    expect(
      useDashboardStore
        .getState()
        .addCard(SportType.Soccer, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING),
    ).toEqual({
      ok: false,
      reason: "duplicate",
    });
  });

  it("rejects a new card once the dashboard is full", () => {
    for (let index = 0; index < MAX_DASHBOARD_CARDS; index += 1) {
      expect(
        useDashboardStore
          .getState()
          .addCard(SportType.Soccer, SYDNEY_LOCATION, {
            weekdays: [1],
            startMinutes: index * 60,
            endMinutes: index * 60 + 60,
          }),
      ).toEqual({ ok: true });
    }

    expect(
      useDashboardStore
        .getState()
        .addCard(SportType.Soccer, MELBOURNE_LOCATION, MONDAY_MORNING),
    ).toEqual({ ok: false, reason: "max_reached" });
    expect(useDashboardStore.getState().cards).toHaveLength(
      MAX_DASHBOARD_CARDS,
    );
  });

  it("allows the same sport and location with a different schedule", () => {
    expect(
      useDashboardStore
        .getState()
        .addCard(SportType.Soccer, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING),
    ).toEqual({ ok: true });
    expect(
      useDashboardStore
        .getState()
        .addCard(SportType.Soccer, SYDNEY_LOCATION, MONDAY_MORNING),
    ).toEqual({ ok: true });

    expect(useDashboardStore.getState().cards).toHaveLength(2);
  });

  it("updates a saved card schedule", () => {
    useDashboardStore
      .getState()
      .addCard(SportType.Soccer, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING);
    const cardId = useDashboardStore.getState().cards[0]!.id;

    expect(
      useDashboardStore.getState().updateCardSchedule(cardId, MONDAY_MORNING),
    ).toEqual({ ok: true });
    expect(useDashboardStore.getState().cards[0]?.schedule).toEqual(
      MONDAY_MORNING,
    );
  });

  it("rejects a schedule update that duplicates another saved card", () => {
    useDashboardStore
      .getState()
      .addCard(SportType.Soccer, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING);
    useDashboardStore
      .getState()
      .addCard(SportType.Soccer, SYDNEY_LOCATION, MONDAY_MORNING);
    const secondCardId = useDashboardStore.getState().cards[1]!.id;

    expect(
      useDashboardStore
        .getState()
        .updateCardSchedule(secondCardId, TUESDAY_THURSDAY_EVENING),
    ).toEqual({ ok: false, reason: "duplicate" });
    expect(useDashboardStore.getState().cards[1]?.schedule).toEqual(
      MONDAY_MORNING,
    );
  });

  it("rejects invalid and unknown-card schedule updates", () => {
    useDashboardStore
      .getState()
      .addCard(SportType.Soccer, SYDNEY_LOCATION, TUESDAY_THURSDAY_EVENING);
    const cardId = useDashboardStore.getState().cards[0]!.id;

    expect(
      useDashboardStore.getState().updateCardSchedule(cardId, {
        weekdays: [2],
        startMinutes: 1200,
        endMinutes: 1080,
      }),
    ).toEqual({ ok: false, reason: "invalid_schedule" });
    expect(
      useDashboardStore
        .getState()
        .updateCardSchedule("missing-card", MONDAY_MORNING),
    ).toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects an invalid schedule at the store boundary", () => {
    expect(
      useDashboardStore.getState().addCard(SportType.Soccer, SYDNEY_LOCATION, {
        weekdays: [2],
        startMinutes: 1200,
        endMinutes: 1080,
      }),
    ).toEqual({ ok: false, reason: "invalid_schedule" });
  });
});

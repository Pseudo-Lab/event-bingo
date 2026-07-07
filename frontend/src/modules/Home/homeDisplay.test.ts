import { describe, expect, it } from "vitest";

import type { EventProfile } from "../../config/eventProfiles";
import { resolvePublicEventFallbackProfile } from "../../config/eventProfiles";
import {
  HOME_EVENT_DISPLAY_FALLBACKS,
  resolveHomeEventSummary,
} from "./homeDisplay";

const buildEventProfile = (overrides: Partial<EventProfile> = {}): EventProfile => ({
  slug: "dev-factory-summit-2026",
  title: "빙고 네트워킹",
  subTitle: "DevFactory Summit 2026",
  startAt: "2026-10-09T13:30:00+09:00",
  endAt: "2026-10-09T16:30:00+09:00",
  place: "성수 이벤트홀",
  eventTeam: "행사 운영팀",
  boardSize: 5,
  exchangeKeywordCount: 3,
  bingoMissionCount: 3,
  restrictBeforeStart: true,
  englishSupportEnabled: false,
  keywords: Array.from({ length: 25 }, (_, index) => `키워드 ${index + 1}`),
  keywordTranslations: {},
  ...overrides,
});

describe("resolveHomeEventSummary", () => {
  it("keeps the first paint neutral while the public event profile is loading", () => {
    const display = resolveHomeEventSummary(
      resolvePublicEventFallbackProfile("global-connect-2027"),
      false
    );

    expect(display.eventName).toBe(HOME_EVENT_DISPLAY_FALLBACKS.ko.loadingEventName);
    expect(display.date).toBe(HOME_EVENT_DISPLAY_FALLBACKS.ko.loadingDate);
    expect(display.place).toBe(HOME_EVENT_DISPLAY_FALLBACKS.ko.loadingPlace);
  });

  it("shows the resolved event details when the profile has loaded", () => {
    const display = resolveHomeEventSummary(buildEventProfile(), true);

    expect(display.eventName).toBe("DevFactory Summit 2026");
    expect(display.eventTeam).toBe("행사 운영팀");
    expect(display.date).toBe("2026년 10월 9일 13:30");
    expect(display.place).toBe("성수 이벤트홀");
  });

  it("replaces slug-derived fallback names with generic copy after resolution", () => {
    const display = resolveHomeEventSummary(
      resolvePublicEventFallbackProfile("global-connect-2027"),
      true
    );

    expect(display.eventName).toBe(HOME_EVENT_DISPLAY_FALLBACKS.ko.eventName);
    expect(display.eventTeam).toBe(HOME_EVENT_DISPLAY_FALLBACKS.ko.eventTeam);
    expect(display.date).toBe(HOME_EVENT_DISPLAY_FALLBACKS.ko.date);
    expect(display.place).toBe(HOME_EVENT_DISPLAY_FALLBACKS.ko.place);
  });

  it("uses English fallback copy and date formatting when English is selected", () => {
    const loadingDisplay = resolveHomeEventSummary(
      resolvePublicEventFallbackProfile("global-connect-2027"),
      false,
      "en"
    );
    const resolvedDisplay = resolveHomeEventSummary(buildEventProfile(), true, "en");
    const fallbackDisplay = resolveHomeEventSummary(
      resolvePublicEventFallbackProfile("global-connect-2027"),
      true,
      "en"
    );

    expect(loadingDisplay.eventName).toBe(HOME_EVENT_DISPLAY_FALLBACKS.en.loadingEventName);
    expect(resolvedDisplay.date).toBe("October 9, 2026 at 13:30");
    expect(fallbackDisplay.eventName).toBe(HOME_EVENT_DISPLAY_FALLBACKS.en.eventName);
    expect(fallbackDisplay.eventTeam).toBe(HOME_EVENT_DISPLAY_FALLBACKS.en.eventTeam);
    expect(fallbackDisplay.date).toBe(HOME_EVENT_DISPLAY_FALLBACKS.en.date);
    expect(fallbackDisplay.place).toBe(HOME_EVENT_DISPLAY_FALLBACKS.en.place);
  });
});

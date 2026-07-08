import {
  formatEventDateLabel,
  humanizeEventSlug,
  type EventProfile,
} from "../../config/eventProfiles";
import type { BingoGameLanguage } from "../Bingo/bingoGameLanguage";

export const HOME_EVENT_DISPLAY_FALLBACKS = {
  ko: {
    title: "Bingo Networking",
    subtitle: "빙고로 즐기는 새로운 네트워킹",
    eventName: "현장 네트워킹 이벤트",
    loadingEventName: "행사 정보를 불러오는 중입니다",
    date: "일정 추후 안내",
    loadingDate: "일정 확인 중",
    place: "행사 장소",
    loadingPlace: "장소 확인 중",
    eventTeam: "행사 운영팀",
  },
  en: {
    title: "Bingo Networking",
    subtitle: "A new way to network through bingo",
    eventName: "On-site Networking Event",
    loadingEventName: "Loading event information",
    date: "Schedule to be announced",
    loadingDate: "Checking schedule",
    place: "Event venue",
    loadingPlace: "Checking venue",
    eventTeam: "Event Team",
  },
} as const;

const isPlaceholderValue = (value: string | undefined, placeholders: string[]) => {
  if (!value) {
    return true;
  }

  return placeholders.includes(value.trim());
};

const isSlugDerivedFallbackSubtitle = (eventProfile: EventProfile) => {
  const slugLabel = humanizeEventSlug(eventProfile.slug);
  return eventProfile.subTitle.trim() === `${slugLabel}\nNetworking Event`;
};

export const resolveHomeEventSummary = (
  eventProfile: EventProfile,
  isResolved: boolean,
  language: BingoGameLanguage = "ko"
) => {
  const usesSlugFallback = isSlugDerivedFallbackSubtitle(eventProfile);
  const fallback = HOME_EVENT_DISPLAY_FALLBACKS[language];
  const formattedDate = formatEventDateLabel(
    eventProfile.startAt,
    language === "en" ? "en-US" : "ko-KR"
  );

  if (!isResolved) {
    return {
      eventName: fallback.loadingEventName,
      eventTeam: fallback.eventTeam,
      date: fallback.loadingDate,
      place: fallback.loadingPlace,
    };
  }

  return {
    eventName:
      usesSlugFallback || isPlaceholderValue(eventProfile.subTitle, ["YYYY 행사 이름"])
        ? fallback.eventName
        : eventProfile.subTitle,
    eventTeam:
      usesSlugFallback ||
      isPlaceholderValue(eventProfile.eventTeam, ["행사 주최자", "Event Team"])
        ? fallback.eventTeam
        : eventProfile.eventTeam,
    date:
      usesSlugFallback || isPlaceholderValue(formattedDate, ["MM월 DD일"])
        ? fallback.date
        : formattedDate,
    place:
      usesSlugFallback || isPlaceholderValue(eventProfile.place, ["장소", "행사 장소"])
        ? fallback.place
        : eventProfile.place,
  };
};

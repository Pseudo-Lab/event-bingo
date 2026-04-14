import {
  formatEventDateLabel,
  humanizeEventSlug,
  type EventProfile,
} from "../../config/eventProfiles";

export const HOME_EVENT_DISPLAY_FALLBACKS = {
  title: "Bingo Networking",
  subtitle: "빙고로 즐기는 새로운 네트워킹",
  eventName: "현장 네트워킹 이벤트",
  loadingEventName: "행사 정보를 불러오는 중입니다",
  date: "일정 추후 안내",
  loadingDate: "일정 확인 중",
  place: "행사 장소",
  loadingPlace: "장소 확인 중",
  eventTeam: "행사 운영팀",
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
  isResolved: boolean
) => {
  const usesSlugFallback = isSlugDerivedFallbackSubtitle(eventProfile);
  const formattedDate = formatEventDateLabel(eventProfile.startAt);

  if (!isResolved) {
    return {
      eventName: HOME_EVENT_DISPLAY_FALLBACKS.loadingEventName,
      eventTeam: HOME_EVENT_DISPLAY_FALLBACKS.eventTeam,
      date: HOME_EVENT_DISPLAY_FALLBACKS.loadingDate,
      place: HOME_EVENT_DISPLAY_FALLBACKS.loadingPlace,
    };
  }

  return {
    eventName:
      usesSlugFallback || isPlaceholderValue(eventProfile.subTitle, ["YYYY 행사 이름"])
        ? HOME_EVENT_DISPLAY_FALLBACKS.eventName
        : eventProfile.subTitle,
    eventTeam:
      usesSlugFallback ||
      isPlaceholderValue(eventProfile.eventTeam, ["행사 주최자", "Event Team"])
        ? HOME_EVENT_DISPLAY_FALLBACKS.eventTeam
        : eventProfile.eventTeam,
    date:
      usesSlugFallback || isPlaceholderValue(formattedDate, ["MM월 DD일"])
        ? HOME_EVENT_DISPLAY_FALLBACKS.date
        : formattedDate,
    place:
      usesSlugFallback || isPlaceholderValue(eventProfile.place, ["장소", "행사 장소"])
        ? HOME_EVENT_DISPLAY_FALLBACKS.place
        : eventProfile.place,
  };
};

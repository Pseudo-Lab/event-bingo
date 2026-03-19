import {
  normalizeEventSlug,
  renameEventProfileSettings,
  resolveEventProfile,
  updateEventProfileSettings,
} from "../../config/eventProfiles";
import type { AdminEvent, AdminEventStatus, AdminSession } from "./adminTypes";

const STORAGE_KEY = "event-bingo.admin-events.v2";
const RESERVED_SLUGS = new Set(["admin", "login", "bingo", "api", "assets"]);

const hasWindow = () => typeof window !== "undefined";

const createSeedEvents = (): AdminEvent[] => {
  const defaultProfile = resolveEventProfile("bingo-networking");

  return [
    {
      id: 4,
      slug: defaultProfile.slug,
      name: defaultProfile.subTitle.replace(/\n/g, " "),
      createdById: 4,
      createdByEmail: "uni@laivdata.com",
      createdByName: "김길동",
      eventDate: defaultProfile.startAt,
      adminEmail: "uni@laivdata.com",
      boardSize: defaultProfile.boardSize,
      bingoMissionCount: defaultProfile.bingoMissionCount,
      keywords: [...defaultProfile.keywords],
      participantCount: 150,
      progressCurrent: 150,
      progressTotal: 150,
      status: "ended",
      publishState: "published",
      isPublished: true,
      canEdit: true,
    },
    {
      id: 3,
      slug: "festival-naming-nnnnn",
      name: "축제 네이밍 NNNNN",
      createdById: 1,
      createdByEmail: "manager@laivdata.com",
      createdByName: "김철수",
      eventDate: "2026-06-10T09:00:00+09:00",
      adminEmail: "manager@laivdata.com",
      boardSize: 5,
      bingoMissionCount: 4,
      keywords: Array.from({ length: 25 }, (_, index) => `키워드 ${index + 1}`),
      participantCount: 150,
      progressCurrent: 100,
      progressTotal: 150,
      status: "in_progress",
      publishState: "published",
      isPublished: true,
      canEdit: true,
    },
    {
      id: 2,
      slug: "campus-sprint-2026",
      name: "캠퍼스 스프린트 2026",
      createdById: 1,
      createdByEmail: "manager@laivdata.com",
      createdByName: "김철수",
      eventDate: "2026-07-10T09:00:00+09:00",
      adminEmail: "manager@laivdata.com",
      boardSize: 5,
      bingoMissionCount: 4,
      keywords: Array.from({ length: 25 }, (_, index) => `캠퍼스 키워드 ${index + 1}`),
      participantCount: 150,
      progressCurrent: 10,
      progressTotal: 150,
      status: "scheduled",
      publishState: "draft",
      isPublished: false,
      canEdit: true,
    },
    {
      id: 1,
      slug: "team-builder-beta",
      name: "팀 빌더 베타",
      createdById: 2,
      createdByEmail: "ops@laivdata.com",
      createdByName: "이준호",
      eventDate: "2026-08-24T10:00:00+09:00",
      adminEmail: "ops@laivdata.com",
      boardSize: 3,
      bingoMissionCount: 3,
      keywords: Array.from({ length: 9 }, (_, index) => `베타 키워드 ${index + 1}`),
      participantCount: 70,
      progressCurrent: 0,
      progressTotal: 70,
      status: "scheduled",
      publishState: "draft",
      isPublished: false,
      canEdit: true,
    },
  ];
};

const readEvents = () => {
  if (!hasWindow()) {
    return createSeedEvents();
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return createSeedEvents();
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) {
      return createSeedEvents();
    }

    return parsedValue as AdminEvent[];
  } catch (error) {
    console.warn("Failed to parse admin event store. Resetting it.", error);
    window.localStorage.removeItem(STORAGE_KEY);
    return createSeedEvents();
  }
};

const writeEvents = (events: AdminEvent[]) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};

const sortEvents = (events: AdminEvent[]) => {
  return [...events].sort((left, right) => right.id - left.id);
};

export const listAdminEvents = () => {
  const events = sortEvents(readEvents());
  writeEvents(events);
  return events;
};

export const getAdminEventById = (eventId: number | string) => {
  return listAdminEvents().find((eventItem) => String(eventItem.id) === String(eventId)) ?? null;
};

export const canEditAdminEvent = (session: AdminSession, eventItem: AdminEvent) => {
  if (session.role === "admin") {
    return true;
  }

  return session.id === eventItem.createdById;
};

export const validateAdminSlug = (value: string, existingEventId?: number) => {
  const trimmedValue = value.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(trimmedValue)) {
    return "slug는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.";
  }

  const normalizedSlug = normalizeEventSlug(trimmedValue);

  if (normalizedSlug.length < 3 || normalizedSlug.length > 50) {
    return "slug는 3자 이상 50자 이하로 입력해 주세요.";
  }

  if (RESERVED_SLUGS.has(normalizedSlug)) {
    return "예약된 slug는 사용할 수 없습니다.";
  }

  const duplicateEvent = listAdminEvents().find((eventItem) => {
    return eventItem.slug === normalizedSlug && eventItem.id !== existingEventId;
  });

  if (duplicateEvent) {
    return "이미 사용 중인 slug입니다.";
  }

  return "";
};

const resolveNextStatus = (
  inputStatus: AdminEventStatus | null,
  eventDate: string,
  progressCurrent: number,
  progressTotal: number
): AdminEventStatus => {
  if (inputStatus) {
    return inputStatus;
  }

  if (progressCurrent >= progressTotal) {
    return "ended";
  }

  return new Date(eventDate).getTime() > Date.now() ? "scheduled" : "in_progress";
};

export const saveAdminEvent = (
  actor: AdminSession,
  input: {
    id?: number;
    slug: string;
    name: string;
    eventDate: string;
    adminEmail: string;
    boardSize: 3 | 5;
    bingoMissionCount: number;
    keywords: string[];
    participantCount: number;
    progressCurrent: number;
    progressTotal: number;
    status?: AdminEventStatus | null;
    isPublished: boolean;
  }
) => {
  const existingEvents = listAdminEvents();
  const existingEvent = input.id
    ? existingEvents.find((eventItem) => eventItem.id === input.id) ?? null
    : null;

  if (existingEvent && !canEditAdminEvent(actor, existingEvent)) {
    throw new Error("이 이벤트는 읽기 전용입니다.");
  }

  const nextSlug = normalizeEventSlug(input.slug || input.name);
  const slugError = validateAdminSlug(nextSlug, existingEvent?.id);
  if (slugError) {
    throw new Error(slugError);
  }

  if (existingEvent?.isPublished && existingEvent.slug !== nextSlug) {
    throw new Error("공개된 이후에는 slug를 변경할 수 없습니다.");
  }

  const nextStatus = resolveNextStatus(
    input.status ?? null,
    input.eventDate,
    input.progressCurrent,
    input.progressTotal
  );
  const nextEvent: AdminEvent = {
    id:
      input.id ??
      existingEvents.reduce((maxId, eventItem) => Math.max(maxId, eventItem.id), 0) + 1,
    slug: nextSlug,
    name: input.name.trim(),
    createdById: existingEvent?.createdById ?? actor.id,
    createdByEmail: existingEvent?.createdByEmail ?? actor.email,
    createdByName: existingEvent?.createdByName ?? actor.name,
    eventDate: input.eventDate,
    adminEmail: input.adminEmail.trim().toLowerCase(),
    boardSize: input.boardSize,
    bingoMissionCount: input.bingoMissionCount,
    keywords: [...input.keywords],
    participantCount: input.participantCount,
    progressCurrent: input.progressCurrent,
    progressTotal: input.progressTotal,
    status: nextStatus,
    publishState: input.isPublished ? "published" : "draft",
    isPublished: input.isPublished,
    canEdit: true,
  };

  const nextEvents = sortEvents([
    ...existingEvents.filter((eventItem) => eventItem.id !== nextEvent.id),
    nextEvent,
  ]);
  writeEvents(nextEvents);

  const baseProfile = resolveEventProfile(existingEvent?.slug ?? nextSlug);
  const profileUpdates = {
    title: baseProfile.title,
    subTitle: input.name.trim(),
    startAt: new Date(input.eventDate).toISOString(),
    host: baseProfile.host,
    place: baseProfile.place,
    boardSize: input.boardSize,
    bingoMissionCount: input.bingoMissionCount,
    exchangeKeywordCount: Math.min(baseProfile.exchangeKeywordCount, input.boardSize * input.boardSize),
    keywords: input.keywords,
  };

  if (existingEvent && existingEvent.slug !== nextSlug) {
    renameEventProfileSettings(existingEvent.slug, nextSlug, profileUpdates);
  } else {
    updateEventProfileSettings(nextSlug, profileUpdates);
  }

  return nextEvents;
};

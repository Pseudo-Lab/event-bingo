const ADMIN_EVENT_TIME_ZONE = "Asia/Seoul";

export type AdminEventDateParts = {
  yearLabel: string;
  monthLabel: string;
  day: string;
  weekday: string;
};

export const getEventDateParts = (value: string): AdminEventDateParts => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return { yearLabel: "", monthLabel: "", day: "--", weekday: "" };
  }

  return {
    yearLabel: new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      timeZone: ADMIN_EVENT_TIME_ZONE,
    }).format(parsedDate),
    monthLabel: new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      timeZone: ADMIN_EVENT_TIME_ZONE,
    }).format(parsedDate),
    day: new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      timeZone: ADMIN_EVENT_TIME_ZONE,
    }).format(parsedDate),
    weekday: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: ADMIN_EVENT_TIME_ZONE,
    }).format(parsedDate),
  };
};

const getEventTimeText = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone: ADMIN_EVENT_TIME_ZONE,
  }).formatToParts(parsedDate);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
};

export const getEventTimeRangeLabel = (startAt: string, endAt: string) => {
  const startLabel = getEventTimeText(startAt);
  const endLabel = getEventTimeText(endAt);

  if (!startLabel || !endLabel) {
    return startAt;
  }

  return `${startLabel} - ${endLabel}`;
};

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

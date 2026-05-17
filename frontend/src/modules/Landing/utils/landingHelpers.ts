/* ── Date Formatting ─────────────────────────────────────── */

export const formatLandingDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const formatEventCaseDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dow = days[d.getDay()];
  return `${y}.${m}.${dd} (${dow})`;
};

/* ── Poster Themes ───────────────────────────────────────── */

export const POSTER_THEMES = [
  { bg: "from-green-50 to-emerald-50", accent: "bg-green-200/40", text: "text-slate-900", sub: "text-green-700", date: "text-slate-500", badge: "bg-green-700 text-white" },
  { bg: "from-sky-50 to-blue-50", accent: "bg-sky-200/40", text: "text-slate-900", sub: "text-sky-700", date: "text-slate-500", badge: "bg-sky-700 text-white" },
  { bg: "from-violet-50 to-purple-50", accent: "bg-violet-200/40", text: "text-slate-900", sub: "text-violet-700", date: "text-slate-500", badge: "bg-violet-700 text-white" },
  { bg: "from-amber-50 to-orange-50", accent: "bg-amber-200/40", text: "text-slate-900", sub: "text-amber-700", date: "text-slate-500", badge: "bg-amber-700 text-white" },
] as const;

export type PosterTheme = (typeof POSTER_THEMES)[number];

/* ── Fixed Event Cases ───────────────────────────────────── */

export type EventCaseAttendeeScale = "50" | "100" | "200" | "200+";

export const EVENT_CASE_ATTENDEE_SCALE_LABELS: Record<EventCaseAttendeeScale, string> = {
  "50": "50명 규모",
  "100": "100명 규모",
  "200": "200명 규모",
  "200+": "200명+ 규모",
};

export type EventCase = {
  id: string;
  name: string;
  startAt: string;
  place: string;
  attendeeScale: EventCaseAttendeeScale;
  tags: string[];
};

export const EVENT_CASES: EventCase[] = [
  {
    id: "3rd-product-dna-open-forum",
    name: "2025 Product DNA Open Forum",
    startAt: "2025-10-25T00:00:00+09:00",
    place: "한빛미디어 리더스홀",
    attendeeScale: "100",
    tags: ["인과추론", "프로덕트 분석", "데이터 분석가"],
  },
  {
    id: "korea-business-experimentation-symposium-2025",
    name: "Korea Business Experimentation Symposium 2025",
    startAt: "2025-07-12T00:00:00+09:00",
    place: "고려대학교 LG-POSCO 경영관",
    attendeeScale: "100",
    tags: ["비즈니스 실험", "데이터 분석", "연구자"],
  },
  {
    id: "10th-pseudocon",
    name: "PseudoCon 2025",
    startAt: "2025-05-17T00:00:00+09:00",
    place: "서울창업허브 공덕 10층",
    attendeeScale: "200+",
    tags: ["AI/DS", "오픈소스", "개발자"],
  },
  {
    id: "8th-pseudocon",
    name: "8th PseudoCon",
    startAt: "2024-06-15T00:00:00+09:00",
    place: "마이크로소프트 광화문 본사 13층",
    attendeeScale: "200",
    tags: ["AI 엔지니어", "연구개발자", "GenAI"],
  },
];

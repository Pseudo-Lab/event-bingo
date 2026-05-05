import type { PublicLandingEvent } from "../../../api/public_event_api";

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

export const formatPosterDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dow = days[d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${dd} (${dow}) ${hh}:${mm}`;
};

/* ── Poster Themes ───────────────────────────────────────── */

export const POSTER_THEMES = [
  { bg: "from-green-50 to-emerald-50", accent: "bg-green-200/40", text: "text-slate-900", sub: "text-green-700", date: "text-slate-500", badge: "bg-green-700 text-white" },
  { bg: "from-sky-50 to-blue-50", accent: "bg-sky-200/40", text: "text-slate-900", sub: "text-sky-700", date: "text-slate-500", badge: "bg-sky-700 text-white" },
  { bg: "from-violet-50 to-purple-50", accent: "bg-violet-200/40", text: "text-slate-900", sub: "text-violet-700", date: "text-slate-500", badge: "bg-violet-700 text-white" },
  { bg: "from-amber-50 to-orange-50", accent: "bg-amber-200/40", text: "text-slate-900", sub: "text-amber-700", date: "text-slate-500", badge: "bg-amber-700 text-white" },
] as const;

export type PosterTheme = (typeof POSTER_THEMES)[number];

/* ── Poster Meta (keyword-based fallback) ────────────────── */

export type PosterMeta = {
  tagline: string;
  tags: string[];
  desc: string;
};

export const generatePosterMeta = (event: PublicLandingEvent): PosterMeta => {
  const n = event.name.toLowerCase();
  if (n.includes("networking") || n.includes("네트워킹")) {
    return { tagline: "연결로 시작하는 성장", tags: ["네트워킹", "컨퍼런스"], desc: "개발자와 함께 만드는 연결의 하루" };
  }
  if (n.includes("community") || n.includes("커뮤니티") || n.includes("meetup") || n.includes("밋업")) {
    return { tagline: "함께 성장하는 커뮤니티", tags: ["커뮤니티", "밋업"], desc: "함께 성장하는 개발자 커뮤니티" };
  }
  if (n.includes("tech") || n.includes("talk") || n.includes("토크") || n.includes("세미나")) {
    return { tagline: "기술로 연결되는 우리", tags: ["토크", "세미나"], desc: "기술과 사람을 잇는 토크 세션" };
  }
  if (n.includes("ai") || n.includes("data") || n.includes("데이터")) {
    return { tagline: "데이터와 AI의 미래", tags: ["AI", "데이터"], desc: "AI와 데이터 분야의 네트워킹" };
  }
  return { tagline: "빙고로 시작하는 만남", tags: ["네트워킹", "빙고"], desc: `${event.boardSize}x${event.boardSize} 빙고로 만드는 새로운 연결` };
};

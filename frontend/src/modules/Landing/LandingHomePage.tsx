import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  getPublicEventCatalog,
  submitEventManagerApplication,
  type PublicLandingEvent,
} from "../../api/public_event_api";
import { getAdminPath } from "../../config/eventProfiles";

type ApplicationFormState = {
  name: string;
  email: string;
  eventName: string;
  eventPurpose: string;
};

const initialFormState: ApplicationFormState = {
  name: "",
  email: "",
  eventName: "",
  eventPurpose: "",
};

const formatLandingDate = (value: string) => {
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

const formatPosterDate = (dateStr: string) => {
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

const POSTER_THEMES = [
  { bg: "from-green-50 to-emerald-50", accent: "bg-green-200/40", text: "text-slate-900", sub: "text-green-700", date: "text-slate-500", badge: "bg-green-700 text-white" },
  { bg: "from-sky-50 to-blue-50", accent: "bg-sky-200/40", text: "text-slate-900", sub: "text-sky-700", date: "text-slate-500", badge: "bg-sky-700 text-white" },
  { bg: "from-violet-50 to-purple-50", accent: "bg-violet-200/40", text: "text-slate-900", sub: "text-violet-700", date: "text-slate-500", badge: "bg-violet-700 text-white" },
  { bg: "from-amber-50 to-orange-50", accent: "bg-amber-200/40", text: "text-slate-900", sub: "text-amber-700", date: "text-slate-500", badge: "bg-amber-700 text-white" },
];

const generatePosterMeta = (event: PublicLandingEvent) => {
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

const PosterDecoration = ({ accent }: { accent: string }) => (
  <>
    <div className={`absolute -top-8 -right-8 w-36 h-36 rounded-full ${accent}`} />
    <div className={`absolute bottom-12 -left-6 w-20 h-20 rounded-full ${accent}`} />
    <div className={`absolute top-16 right-12 w-10 h-10 rounded-full ${accent}`} />
  </>
);

const LandingHomePage = () => {
  const [events, setEvents] = useState<PublicLandingEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [form, setForm] = useState<ApplicationFormState>(initialFormState);
  const [formError, setFormError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      try {
        const nextEvents = await getPublicEventCatalog();
        if (!cancelled) setEvents(nextEvents);
      } catch {
        // silent
      } finally {
        if (!cancelled) setIsLoadingEvents(false);
      }
    };
    void loadEvents();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) { setFormError("이름을 입력해 주세요."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim().toLowerCase())) {
      setFormError("올바른 이메일 주소를 입력해 주세요."); return;
    }
    if (!form.eventName.trim()) { setFormError("행사명을 입력해 주세요."); return; }
    try {
      setIsSubmitting(true);
      setFormError("");
      setSubmitMessage("");
      await submitEventManagerApplication({
        name: form.name,
        email: form.email,
        eventName: form.eventName,
        eventPurpose: form.eventPurpose || "미입력",
      });
      setSubmitMessage("신청을 접수했습니다. 입력하신 이메일로 검토 결과를 안내드릴게요.");
      setForm(initialFormState);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "신청을 접수하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayEvents = useMemo(() => events.slice(0, 4), [events]);
  const gridCols = displayEvents.length <= 2 ? "lg:grid-cols-2" : displayEvents.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";

  return (
    <div className="min-h-screen bg-[#f3f8f4] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(29,172,121,0.18),transparent_22%),radial-gradient(circle_at_88%_12%,rgba(14,88,63,0.14),transparent_18%),linear-gradient(180deg,#f3f8f4_0%,#e8f1ed_100%)]"
      />
      {/* Skip to main content */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-brand-700 focus:font-bold">
        본문 바로가기
      </a>
      {/* Navbar */}
      <nav aria-label="메인 네비게이션" className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-white/70">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-700 flex items-center justify-center">
              <span className="text-white text-xs font-black">B</span>
            </div>
            <span className="font-black text-lg tracking-tight text-slate-900">
              Bingo <span className="text-brand-700">Networking</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#events" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              이벤트 사례
            </a>
            <Link to="/experience" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              사용법 알아보기
            </Link>
            <a href="#apply" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              이용방법
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={getAdminPath()}
              className="hidden sm:inline-flex rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2 transition-colors"
            >
              관리자 로그인
            </Link>
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/70 bg-white/90 backdrop-blur">
            <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-3">
              <a href="#events" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 py-2">
                이벤트 사례
              </a>
              <Link to="/experience" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 py-2">
                사용법 알아보기
              </Link>
              <a href="#apply" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 py-2">
                이용방법
              </a>
              <Link
                to={getAdminPath()}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 text-center transition-colors mt-1"
              >
                관리자 로그인
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main id="main-content">
      {/* Hero */}
      <section className="relative border-b border-slate-100 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero-networking.jpg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/70 to-slate-900/30" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10 py-16 lg:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
          {/* Left */}
          <div className="space-y-6">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black tracking-[-0.03em] text-white leading-[1.15]">
              개발자 네트워킹을<br />
              더 쉽고 재밌게
            </h1>
            <p className="text-base lg:text-lg text-slate-200 leading-7 max-w-md">
              행사 목적에 맞는 키워드로 참가자 대화를 유도하고,
              운영자는 결과와 참여 현황을 한 화면에서 관리합니다.
            </p>
            <a
              href="#events"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 text-sm font-bold transition-colors"
            >
              이벤트 사례 보기 <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          {/* Right: Application Form */}
          <div id="apply" className="bg-white/85 backdrop-blur rounded-[2rem] border border-white/70 shadow-soft p-7 sm:p-8">
            <p className="text-sm font-semibold text-brand-700 mb-1">이벤트 관리자 신청</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              행사 운영 권한이 필요하신가요?
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              신청 검토 후 관리자 계정을 발급해드립니다.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="app-name" className="block text-xs font-semibold text-slate-700 mb-1">이름</label>
                  <input
                    id="app-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="김행사"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="app-email" className="block text-xs font-semibold text-slate-700 mb-1">이메일</label>
                  <input
                    id="app-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="organizer@example.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="app-event" className="block text-xs font-semibold text-slate-700 mb-1">행사명</label>
                <input
                  id="app-event"
                  type="text"
                  value={form.eventName}
                  onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))}
                  placeholder="2026 Bingo Networking Day"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="app-purpose" className="block text-xs font-semibold text-slate-700 mb-1">행사 목적 (선택)</label>
                <textarea
                  id="app-purpose"
                  value={form.eventPurpose}
                  onChange={(e) => setForm((p) => ({ ...p, eventPurpose: e.target.value }))}
                  rows={2}
                  placeholder="예: 참가자 간 아이스브레이킹, 기술 네트워킹, 후원사 부스 유입 유도 등"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                />
              </div>

              {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}
              {submitMessage && <p className="text-sm font-semibold text-brand-700">{submitMessage}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-brand-700 hover:bg-brand-800 active:scale-[0.98] disabled:opacity-60 text-white font-bold py-3 text-sm transition-all"
              >
                {isSubmitting ? "접수 중..." : "관리자 권한 신청"}
              </button>
              <p className="text-xs text-slate-400 text-center">개인정보 수집 후 검토 안내</p>
            </form>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="relative py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700 mb-3">Event Cases</p>
            <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950 mb-3">이벤트 사례</h2>
            <p className="text-slate-500 text-base">다양한 개발자 네트워킹 행사에서 Bingo Networking이 함께했습니다.</p>
          </div>

          {isLoadingEvents ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-[420px]" />
              ))}
            </div>
          ) : displayEvents.length > 0 ? (
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-6`}>
              {displayEvents.map((eventItem, index) => {
                const theme = POSTER_THEMES[index % POSTER_THEMES.length];
                const meta = generatePosterMeta(eventItem);
                return (
                  <div
                    key={eventItem.id}
                    className="group block rounded-[2rem] overflow-hidden border border-white/70 shadow-soft"
                  >
                    {/* Poster */}
                    <div className={`relative overflow-hidden bg-gradient-to-br ${theme.bg} aspect-[3/2] sm:aspect-square p-5 flex flex-col justify-between`}>
                      <div aria-hidden="true"><PosterDecoration accent={theme.accent} /></div>
                      <div className="relative z-10">
                        <h3 className={`text-xl font-bold leading-tight tracking-tight ${theme.text}`}>
                          {eventItem.name}
                        </h3>
                        <p className={`text-sm mt-2 font-medium ${theme.sub}`}>{meta.tagline}</p>
                      </div>
                      <div className="relative z-10 space-y-2">
                        <p className={`text-xs ${theme.date}`}>{formatPosterDate(eventItem.startAt)}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {meta.tags.map((tag) => (
                            <span key={tag} className={`text-xs font-bold px-2.5 py-1 rounded-full ${theme.badge}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="bg-white/85 backdrop-blur border-t border-white/70 p-5">
                      <h4 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-brand-700 transition-colors">
                        {eventItem.name}
                      </h4>
                      <p className="text-xs text-slate-500 mb-3">{meta.desc}</p>
                      <p className="text-xs text-slate-400">{formatLandingDate(eventItem.startAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              아직 공개된 행사가 없습니다.
            </div>
          )}
          <div className="text-center mt-12">
            <p className="text-slate-600 mb-4">우리 행사에서도 빙고 네트워킹을 시작해 보세요.</p>
            <a
              href="#apply"
              className="inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white px-6 py-3 text-sm font-semibold transition-colors"
            >
              관리자 신청하기 <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      </main>
      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black text-lg mb-2">DevFactory</p>
            <div className="flex gap-4 text-sm text-slate-400">
              <span>이용약관</span>
              <span>개인정보처리방침</span>
              <span>문의하기</span>
            </div>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>contact@devfactory.kr</p>
            <p>copyright © DevFactory</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingHomePage;

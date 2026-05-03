import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  getPublicEventCatalog,
  submitEventManagerApplication,
  type PublicLandingEvent,
} from "../../api/public_event_api";
import { getAdminPath, getEventHomePath } from "../../config/eventProfiles";

type ApplicationFormState = {
  name: string;
  email: string;
  organization: string;
  eventName: string;
  eventPurpose: string;
  expectedEventDate: string;
  expectedAttendeeCount: string;
  notes: string;
};

const initialFormState: ApplicationFormState = {
  name: "",
  email: "",
  organization: "",
  eventName: "",
  eventPurpose: "",
  expectedEventDate: "",
  expectedAttendeeCount: "",
  notes: "",
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

const getStatusLabel = (status: PublicLandingEvent["status"]) => {
  if (status === "in_progress") return "진행 중";
  if (status === "ended") return "종료";
  return "예정";
};

const getCategoryColor = (index: number) => {
  const colors = ["bg-blue-500", "bg-purple-500", "bg-brand-600", "bg-orange-500"];
  return colors[index % colors.length];
};

const BINGO_KEYWORDS = [
  "AI", "백엔드", "iOS", "프론트엔드",
  "DevOps", "클라우드", "교육", "메개변",
  "데이터", "커뮤니티", "채용", "오픈소스",
];

const PROFILE_KEYWORDS = ["프론트엔드", "TypeScript", "React", "UX", "오픈소스"];

const BingoPreview = () => (
  <div className="rounded-2xl bg-white shadow-lg p-4 w-full">
    <div className="grid grid-cols-4 gap-1.5 mb-3">
      {BINGO_KEYWORDS.map((kw, i) => (
        <div
          key={kw}
          className={`rounded-lg text-xs font-bold text-center py-2 px-1 ${
            i === 0 || i === 4
              ? "bg-brand-100 text-brand-800 border border-brand-200"
              : "bg-slate-50 text-slate-700 border border-slate-200"
          }`}
        >
          {kw}
        </div>
      ))}
    </div>
    <button className="w-full rounded-lg bg-brand-700 text-white text-xs font-bold py-2">
      빙고 연동하기
    </button>
  </div>
);

const ProfileCard = () => (
  <div className="rounded-2xl bg-white shadow-lg p-4 w-64">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold">
        김
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">김빙고님</p>
        <p className="text-xs text-slate-500">프론트엔드 개발자</p>
        <p className="text-xs text-slate-400">서울 · 2년차</p>
      </div>
    </div>
    <p className="text-xs font-semibold text-slate-500 mb-2">관심 키워드</p>
    <div className="flex flex-wrap gap-1.5 mb-3">
      {PROFILE_KEYWORDS.map((kw) => (
        <span key={kw} className="rounded-full bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1">
          {kw}
        </span>
      ))}
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">매칭된 키워드 8개</span>
      <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full w-2/3 rounded-full bg-brand-500" />
      </div>
    </div>
  </div>
);

const LandingHomePage = () => {
  const [events, setEvents] = useState<PublicLandingEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
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
    if (form.eventPurpose.trim().length < 10) { setFormError("행사 목적은 10자 이상 입력해 주세요."); return; }
    try {
      setIsSubmitting(true);
      setFormError("");
      setSubmitMessage("");
      await submitEventManagerApplication({
        name: form.name,
        email: form.email,
        organization: form.organization,
        eventName: form.eventName,
        eventPurpose: form.eventPurpose,
        expectedEventDate: form.expectedEventDate ? `${form.expectedEventDate}T09:00:00+09:00` : undefined,
        expectedAttendeeCount: form.expectedAttendeeCount ? Number(form.expectedAttendeeCount) : undefined,
        notes: form.notes,
      });
      setSubmitMessage("신청을 접수했습니다. 검토 후 관리자 계정 발급 여부를 안내드릴게요.");
      setForm(initialFormState);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "신청을 접수하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayEvents = useMemo(() => events.slice(0, 4), [events]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100">
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
              튜토리얼
            </Link>
            <a href="#apply" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              이용방법
            </a>
          </div>
          <Link
            to={getAdminPath()}
            className="rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2 transition-colors"
          >
            관리자 로그인
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 to-green-50/40 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 lg:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
          {/* Left */}
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-4 py-1.5 text-sm font-semibold text-brand-800">
              🎯 개발자 네트워킹을 위한 빙고 플랫폼
            </span>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black tracking-[-0.05em] text-slate-950 leading-[1.1]">
              개발자 행사를<br />
              더 <span className="text-brand-700">자연스럽게</span><br />
              연결하는<br />
              빙고 네트워킹
            </h1>
            <p className="text-base lg:text-lg text-slate-600 leading-7 max-w-md">
              키워드 빙고 게임으로 대화의 시작을 만들고
              개발자들이 행사에서 더 가까워질 수 있도록 도와줍니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#events"
                className="inline-flex items-center justify-center rounded-xl border-2 border-brand-700 text-brand-700 hover:bg-brand-50 px-6 py-3 text-sm font-bold transition-colors"
              >
                이벤트 사례 보기
              </a>
              <Link
                to="/experience"
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3 text-sm font-bold transition-colors"
              >
                샘플 체험하기
              </Link>
            </div>

            <div className="relative mt-4">
              <div className="max-w-xs">
                <BingoPreview />
              </div>
              <div className="absolute -bottom-4 left-48 hidden sm:block">
                <ProfileCard />
              </div>
            </div>
            <div className="h-16 sm:h-24" />
          </div>

          {/* Right: Application Form */}
          <div id="apply" className="bg-white rounded-3xl border border-slate-200 shadow-xl p-7 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-brand-700 text-lg">👥</span>
              <span className="text-sm font-bold text-brand-700">이벤트 관리자 신청</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">
              행사 운영 권한이 필요하신가요?
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              신청 검토 후 관리자 계정을 발급해드립니다.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">이름</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="김빙고"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="organizer@example.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">소속</label>
                  <input
                    type="text"
                    value={form.organization}
                    onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                    placeholder="DevFactory"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">행사명</label>
                  <input
                    type="text"
                    value={form.eventName}
                    onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))}
                    placeholder="2026 Bingo Networking Day"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">예상 행사 날짜</label>
                  <input
                    type="date"
                    value={form.expectedEventDate}
                    onChange={(e) => setForm((p) => ({ ...p, expectedEventDate: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">예상 참가자 수</label>
                  <input
                    type="number"
                    min="1"
                    value={form.expectedAttendeeCount}
                    onChange={(e) => setForm((p) => ({ ...p, expectedAttendeeCount: e.target.value }))}
                    placeholder="120"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">행사 목적</label>
                <textarea
                  value={form.eventPurpose}
                  onChange={(e) => setForm((p) => ({ ...p, eventPurpose: e.target.value }))}
                  rows={3}
                  placeholder="예: 참가자 간 아이스브레이킹, 기술 주제 네트워킹, 후원사 부스 유입 유도 등"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">추가 메모 (선택)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="운영 기간, 팀 기능 필요 여부, 결과 리포트 필요 여부 등을 자유롭게 작성해주세요."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                />
              </div>

              {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}
              {submitMessage && <p className="text-sm font-semibold text-brand-700">{submitMessage}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-bold py-3 text-sm transition-colors"
                >
                  {isSubmitting ? "접수 중..." : "관리자 권한 신청"}
                </button>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  🔒 개인정보 수집 후 검토 안내
                </span>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 mb-3">이벤트 사례</h2>
            <p className="text-slate-500 text-base">실제 행사에서 Bingo Networking이 만들어낸 연결의 순간들</p>
          </div>

          {isLoadingEvents ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-72" />
              ))}
            </div>
          ) : displayEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {displayEvents.map((eventItem, index) => (
                <Link
                  key={eventItem.id}
                  to={getEventHomePath(eventItem.slug)}
                  className="group block rounded-2xl bg-slate-900 overflow-hidden hover:scale-[1.02] transition-transform"
                >
                  <div className="p-6 h-full flex flex-col min-h-[280px]">
                    <div className="mb-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold text-white ${getCategoryColor(index)}`}>
                        {getStatusLabel(eventItem.status)}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white leading-tight mb-2">
                      {eventItem.name}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed flex-1">
                      {eventItem.boardSize}×{eventItem.boardSize} 빙고 · 목표 {eventItem.bingoMissionCount}줄
                    </p>
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <span>📅</span>
                        <span>{formatLandingDate(eventItem.startAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              아직 공개된 행사가 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black text-lg mb-2">DevFactory</p>
            <div className="flex gap-4 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">이용약관</a>
              <a href="#" className="hover:text-white transition-colors">개인정보처리방침</a>
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

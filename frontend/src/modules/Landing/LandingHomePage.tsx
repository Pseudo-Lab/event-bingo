import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  getPublicEventCatalog,
  submitEventManagerApplication,
  type PublicLandingEvent,
} from "../../api/public_event_api";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { getAdminPath, getEventHomePath } from "../../config/eventProfiles";

const primaryLinkClassName =
  "inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800";
const outlineLinkClassName =
  "inline-flex items-center justify-center rounded-full border border-brand-700 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50";
const ghostLinkClassName =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50";

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

const FEATURE_CARDS = [
  {
    title: "행사별 빙고 설정",
    description: "행사 성격에 맞게 보드 크기, 목표 줄 수, 키워드를 손쉽게 조정할 수 있습니다.",
  },
  {
    title: "행사 현황 한눈에",
    description: "참가자 수, 진행률, 키워드 선택 흐름을 관리자 화면에서 빠르게 살펴볼 수 있습니다.",
  },
  {
    title: "자연스러운 대화 유도",
    description: "참가자가 사람을 만나며 키워드를 채워 나가도록 설계해 현장 대화를 자연스럽게 만듭니다.",
  },
] as const;

const DEMO_KEYWORDS = [
  "AI",
  "디자인",
  "커뮤니티",
  "창업",
  "프로덕트",
  "데이터",
  "협업",
  "교육",
  "마케팅",
];

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
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const getStatusLabel = (status: PublicLandingEvent["status"]) => {
  if (status === "in_progress") {
    return "진행 중";
  }
  if (status === "ended") {
    return "종료";
  }
  return "예정";
};

const getStatusClassName = (status: PublicLandingEvent["status"]) => {
  if (status === "in_progress") {
    return "bg-brand-700 text-white";
  }
  if (status === "ended") {
    return "bg-slate-200 text-slate-700";
  }
  return "bg-brand-100 text-brand-800";
};

const PreviewBoard = () => {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-[2rem] bg-[#0d5f45] p-4 shadow-[0_20px_50px_rgba(9,79,57,0.18)]">
      {DEMO_KEYWORDS.map((keyword, index) => (
        <div
          key={keyword}
          className={`flex aspect-square items-center justify-center rounded-[1.35rem] border text-center text-sm font-bold leading-5 ${
            index % 3 === 0
              ? "border-brand-200 bg-brand-100 text-brand-900"
              : "border-white/15 bg-white text-slate-700"
          }`}
        >
          {keyword}
        </div>
      ))}
    </div>
  );
};

const LandingHomePage = () => {
  const [events, setEvents] = useState<PublicLandingEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [form, setForm] = useState<ApplicationFormState>(initialFormState);
  const [formError, setFormError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      try {
        setIsLoadingEvents(true);
        setEventsError("");
        const nextEvents = await getPublicEventCatalog();
        if (!cancelled) {
          setEvents(nextEvents);
        }
      } catch (error) {
        if (!cancelled) {
          setEventsError(error instanceof Error ? error.message : "공개 이벤트를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEvents(false);
        }
      }
    };

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const publishedEventCount = events.length;
  const activeEventCount = useMemo(
    () => events.filter((eventItem) => eventItem.status === "in_progress").length,
    [events]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError("이름을 입력해 주세요.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim().toLowerCase())) {
      setFormError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }

    if (!form.eventName.trim()) {
      setFormError("행사명을 입력해 주세요.");
      return;
    }

    if (form.eventPurpose.trim().length < 10) {
      setFormError("행사 목적은 10자 이상 입력해 주세요.");
      return;
    }

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
        expectedEventDate: form.expectedEventDate
          ? `${form.expectedEventDate}T09:00:00+09:00`
          : undefined,
        expectedAttendeeCount: form.expectedAttendeeCount
          ? Number(form.expectedAttendeeCount)
          : undefined,
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

  return (
    <div className="min-h-screen bg-[#f4f8f2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,172,121,0.18),transparent_26%),radial-gradient(circle_at_90%_15%,rgba(12,73,53,0.12),transparent_18%),linear-gradient(180deg,#f4f8f2_0%,#edf5f0_100%)]"
      />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-white/60 bg-white/70 px-7 py-6 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.26em] text-brand-700">
              Bingo Networking
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-900 sm:text-3xl">
              행사를 더 빠르게 준비하고, 현장 네트워킹은 더 자연스럽게
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/experience" className={primaryLinkClassName}>
              경험해보기
            </Link>
            <a href="#apply" className={outlineLinkClassName}>
              이벤트 관리자 신청
            </a>
            <Link to={getAdminPath()} className={ghostLinkClassName}>
              관리자 로그인
            </Link>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex rounded-full bg-brand-100 px-4 py-2 text-sm font-bold text-brand-800">
              행사 운영팀을 위한 빙고 네트워킹
            </div>
            <div className="space-y-5">
              <h2 className="max-w-3xl text-4xl font-black tracking-[-0.07em] text-slate-950 sm:text-5xl lg:text-6xl">
                행사 네트워킹을
                <br />
                더 쉽고 재미있게 만드는 빙고 플랫폼
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                참가자는 행사 페이지에 입장해 키워드를 고르고, 현장에서 사람을 만나며 빙고를
                완성합니다. 운영팀은 행사별 설정, 진행 현황, 결과 데이터를 한 화면에서 관리할 수
                있습니다.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[0.9fr_0.9fr_1.15fr]">
              {[
                { label: "공개 행사", value: `${publishedEventCount}개` },
                { label: "진행 중 행사", value: `${activeEventCount}개` },
                { label: "즉시 체험", value: "로그인 없이 가능" },
              ].map((metric) => (
                <Card key={metric.label} className="rounded-[1.6rem] border-white/70 bg-white/80 shadow-soft">
                  <CardContent className="space-y-3 p-6 pt-7">
                    <p className="pt-0.5 text-sm font-semibold text-slate-500">{metric.label}</p>
                    <p className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                      {metric.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden rounded-[2.4rem] border-[#d3eadf] bg-[#e9f7f0] shadow-soft">
            <CardContent className="grid gap-7 p-7 sm:p-9">
              <div className="grid gap-4 sm:grid-cols-[1.05fr_0.95fr] sm:items-center">
                <div className="space-y-4">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700">
                    빠르게 경험해보기
                  </p>
                  <h3 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                    키워드 선택부터 빙고 완성까지
                  </h3>
                  <p className="text-base leading-7 text-slate-600">
                    키워드를 고르고, 랜덤 참가자를 만나며, 보드가 어떻게 채워지는지 바로
                    확인할 수 있습니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_KEYWORDS.slice(0, 6).map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mx-auto w-full max-w-[18rem]">
                  <PreviewBoard />
                </div>
              </div>

              <div className="rounded-[1.7rem] bg-brand-900 px-6 py-6 text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/70">
                      예시 빙고판과 랜덤 만남 시뮬레이션
                    </p>
                    <p className="mt-1 text-xl font-black tracking-[-0.04em]">
                      로그인 없이 30초 안에 체험 가능합니다.
                    </p>
                  </div>
                  <Link
                    to="/experience"
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-white/90"
                  >
                    경험해보기
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {FEATURE_CARDS.map((feature, index) => (
            <Card key={feature.title} className="rounded-[1.9rem] border-white/70 bg-white/80 shadow-soft">
              <CardContent className="space-y-5 p-7 pt-8">
                <div className="mt-0.5 inline-flex items-center justify-center rounded-full bg-brand-100 px-3.5 py-1.5 text-sm font-black text-brand-800">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[2rem] border-white/70 bg-white/85 shadow-soft">
            <CardContent className="space-y-6 p-7 sm:p-9">
              <div className="space-y-2">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700">
                  현재 열려 있는 행사
                </p>
                <h3 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                  지금 참여할 수 있는 행사를 확인해 보세요
                </h3>
                <p className="text-sm leading-7 text-slate-600">
                  행사 페이지에서 바로 입장하고 빙고를 시작할 수 있습니다.
                </p>
              </div>

              {isLoadingEvents ? (
                <div className="rounded-[1.5rem] bg-[#f6f9f5] px-5 py-8 text-center text-sm font-semibold text-slate-400">
                  공개 행사 목록을 불러오는 중입니다.
                </div>
              ) : eventsError ? (
                <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 px-5 py-5 text-sm font-semibold text-rose-600">
                  {eventsError}
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-4">
                  {events.slice(0, 4).map((eventItem) => (
                    <div
                      key={eventItem.id}
                      className="rounded-[1.5rem] border border-slate-100 bg-[#fbfcf8] px-6 py-6"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(eventItem.status)}`}
                            >
                              {getStatusLabel(eventItem.status)}
                            </span>
                          </div>
                          <p className="text-xl font-black tracking-[-0.04em] text-slate-950">
                            {eventItem.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatLandingDate(eventItem.startAt)} · {eventItem.boardSize}x
                            {eventItem.boardSize} · 목표 {eventItem.bingoMissionCount}줄
                          </p>
                        </div>

                        <Link to={getEventHomePath(eventItem.slug)} className={outlineLinkClassName}>
                          행사 홈 보기
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.5rem] bg-[#f6f9f5] px-5 py-8 text-center text-sm font-semibold text-slate-400">
                  아직 공개된 행사가 없습니다. 곧 참가할 수 있는 행사가 열리면 여기에서 확인할 수 있습니다.
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            id="apply"
            className="rounded-[2rem] border-brand-100 bg-gradient-to-br from-white to-brand-50 shadow-soft"
          >
            <CardContent className="space-y-6 p-7 sm:p-9">
              <div className="space-y-2">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700">
                  이벤트 관리자 신청
                </p>
                <h3 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                  행사 운영 권한이 필요하신가요?
                </h3>
                <p className="text-sm leading-7 text-slate-600">
                  이름과 행사 정보를 남겨주시면 검토 후 운영 계정 발급 여부를 안내드릴게요.
                </p>
              </div>

              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="landing-name">이름</Label>
                  <Input
                    id="landing-name"
                    value={form.name}
                    onChange={(event) => setForm((previousValue) => ({ ...previousValue, name: event.target.value }))}
                    placeholder="김행사"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landing-email">이메일</Label>
                  <Input
                    id="landing-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((previousValue) => ({ ...previousValue, email: event.target.value }))}
                    placeholder="organizer@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landing-organization">소속</Label>
                  <Input
                    id="landing-organization"
                    value={form.organization}
                    onChange={(event) =>
                      setForm((previousValue) => ({ ...previousValue, organization: event.target.value }))
                    }
                    placeholder="가짜연구소"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landing-event-name">행사명</Label>
                  <Input
                    id="landing-event-name"
                    value={form.eventName}
                    onChange={(event) =>
                      setForm((previousValue) => ({ ...previousValue, eventName: event.target.value }))
                    }
                    placeholder="2026 Bingo Networking Day"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landing-date">예상 행사 날짜</Label>
                  <Input
                    id="landing-date"
                    type="date"
                    value={form.expectedEventDate}
                    onChange={(event) =>
                      setForm((previousValue) => ({ ...previousValue, expectedEventDate: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landing-attendees">예상 참가자 수</Label>
                  <Input
                    id="landing-attendees"
                    type="number"
                    min="1"
                    value={form.expectedAttendeeCount}
                    onChange={(event) =>
                      setForm((previousValue) => ({
                        ...previousValue,
                        expectedAttendeeCount: event.target.value,
                      }))
                    }
                    placeholder="120"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="landing-purpose">행사 목적</Label>
                  <Textarea
                    id="landing-purpose"
                    value={form.eventPurpose}
                    onChange={(event) =>
                      setForm((previousValue) => ({ ...previousValue, eventPurpose: event.target.value }))
                    }
                    placeholder="어떤 참가자들이 만나고, 빙고를 통해 어떤 행동을 유도하고 싶은지 적어 주세요."
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="landing-notes">추가 메모</Label>
                  <Textarea
                    id="landing-notes"
                    value={form.notes}
                    onChange={(event) => setForm((previousValue) => ({ ...previousValue, notes: event.target.value }))}
                    className="min-h-[120px]"
                    placeholder="운영 기간, 팀 기능 필요 여부, 결과 리포트 필요 여부 등을 남겨 주세요."
                  />
                </div>

                {formError ? (
                  <p className="sm:col-span-2 text-sm font-semibold text-rose-600">{formError}</p>
                ) : null}
                {submitMessage ? (
                  <p className="sm:col-span-2 text-sm font-semibold text-brand-700">{submitMessage}</p>
                ) : null}

                <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={isSubmitting} className="rounded-full px-6">
                    {isSubmitting ? "접수 중..." : "관리자 권한 신청 보내기"}
                  </Button>
                  <p className="text-sm text-slate-500">
                    접수 후 순차적으로 검토해 연락드립니다.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default LandingHomePage;

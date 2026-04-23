import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  getPublicEventCatalog,
  submitEventManagerApplication,
  type PublicLandingEvent,
} from "../../api/public_event_api";
import topIllustration from "../../assets/illustrations/top.svg";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { getAdminPath, getEventHomePath } from "../../config/eventProfiles";

const primaryLinkClassName =
  "inline-flex items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-800";
const secondaryLinkClassName =
  "inline-flex items-center justify-center rounded-full border border-brand-700 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50";
const textLinkClassName =
  "inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white/70 hover:text-slate-900";
const navSecondaryLinkClassName =
  "inline-flex items-center justify-center rounded-full border border-brand-700 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50";
const navTextLinkClassName =
  "inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-white/70 hover:text-slate-900";

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

type CaseStudyPosterProps = {
  accentClassName: string;
  title: string;
  description: string;
  meta: string;
  badgeLabel: string;
  badgeClassName: string;
  actionLabel: string;
  href?: string;
};

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

const CASE_STUDY_POSTER_STYLES = [
  "bg-[linear-gradient(160deg,#0e6d4d_0%,#1dac79_55%,#d7f7ea_100%)] text-white",
  "bg-[linear-gradient(160deg,#f5faf7_0%,#d9f2e7_52%,#95d6ba_100%)] text-slate-900",
  "bg-[linear-gradient(160deg,#0f172a_0%,#1d4f5d_50%,#8be0d1_100%)] text-white",
  "bg-[linear-gradient(160deg,#eff7f3_0%,#ffffff_54%,#d7efe4_100%)] text-slate-900",
] as const;

const CASE_STUDY_PLACEHOLDERS = [
  {
    title: "행사 사례 준비 중",
    description: "추후 실제 행사 포스터나 현장 이미지를 교체할 자리입니다.",
    meta: "Poster Slot",
  },
  {
    title: "커뮤니티 밋업",
    description: "참가자 톤에 맞는 행사 포스터 스타일을 빠르게 맞출 수 있습니다.",
    meta: "Community Meetup",
  },
  {
    title: "데모데이 / 컨퍼런스",
    description: "행사명과 일정, 보드 규칙만 바꿔도 사례 섹션으로 바로 활용됩니다.",
    meta: "Conference",
  },
  {
    title: "워크숍 / 내부 이벤트",
    description: "현재는 플레이스홀더로 두고, 나중에 실제 사례로 교체하면 됩니다.",
    meta: "Workshop",
  },
] as const;

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
  return "bg-white/85 text-slate-800";
};

const PreviewBoard = () => {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-[2rem] bg-[#0d5f45] p-4 shadow-[0_20px_50px_rgba(9,79,57,0.18)]">
      {DEMO_KEYWORDS.map((keyword, index) => (
        <div
          key={keyword}
          className={`flex aspect-square items-center justify-center rounded-[1.35rem] border px-2 text-center text-sm font-bold leading-5 ${
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

const CaseStudyPoster = ({
  accentClassName,
  title,
  description,
  meta,
  badgeLabel,
  badgeClassName,
  actionLabel,
  href,
}: CaseStudyPosterProps) => {
  const content = (
    <Card className="group h-full overflow-hidden rounded-[1.9rem] border-white/70 bg-white shadow-soft transition-transform duration-200 hover:-translate-y-1">
      <CardContent className="flex h-full flex-col p-0">
        <div className={`flex min-h-[11rem] flex-col justify-between p-5 ${accentClassName}`}>
          <div className="flex items-start justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur ${badgeClassName}`}>
              {badgeLabel}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
              {meta}
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-black tracking-[-0.05em]">{title}</p>
            <p className="max-w-[16rem] text-sm leading-6 opacity-90">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm font-semibold text-slate-500">{meta}</p>
          <span className="text-sm font-bold text-brand-700">{actionLabel}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return content;
  }

  return <Link to={href}>{content}</Link>;
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
          setEventsError(error instanceof Error ? error.message : "이벤트 목록을 불러오지 못했습니다.");
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

  const caseStudyEvents = events.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f5f3ec] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,172,121,0.14),transparent_28%),radial-gradient(circle_at_92%_14%,rgba(15,23,42,0.08),transparent_18%),linear-gradient(180deg,#f5f3ec_0%,#edf3ef_100%)]"
      />

      <div className="relative flex min-h-screen flex-col">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-5 py-3 sm:px-8 sm:py-4 lg:gap-6 lg:px-10 lg:py-4">
          <header className="border-b border-slate-900/10 pb-2 lg:pb-3">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <Link to="/" className="w-fit">
                <img
                  src={topIllustration}
                  alt="Bingo Networking"
                  className="h-9 w-auto sm:h-10 lg:h-[3rem]"
                />
              </Link>

              <div className="flex flex-wrap gap-1.5 lg:justify-end">
                <Link to="/experience" className={navTextLinkClassName}>
                  체험해보기
                </Link>
                <Link to={getAdminPath()} className={navSecondaryLinkClassName}>
                  관리자 페이지
                </Link>
                <Link to="/privacy" className={navTextLinkClassName}>
                  개인정보 처리 안내
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-3 xl:grid-cols-[1.12fr_0.88fr] xl:items-stretch">
            <Card className="h-full overflow-hidden rounded-[2.4rem] border-slate-900/10 bg-white shadow-soft">
              <CardContent className="flex h-full min-h-[20rem] flex-col p-0">
                <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#effaf5_0%,#d9f2e7_55%,#fbfdfc_100%)] p-4 sm:p-5 lg:p-5">
                  <div
                    aria-hidden="true"
                    className="absolute -right-16 top-10 h-48 w-48 rounded-full bg-white/55 blur-3xl"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-brand-200/60 blur-3xl"
                  />

                  <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <span className="inline-flex rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
                        Experience Slot
                      </span>
                      <div className="space-y-1.5">
                        <h1 className="text-3xl font-black tracking-[-0.06em] text-slate-950 sm:text-[2.2rem] lg:text-[2.7rem]">
                          체험해보기
                        </h1>
                        <p className="max-w-lg text-sm leading-6 text-slate-600">
                          지금은 데모로 두고, 나중에는 실제 사용 장면 영상으로 바꿔 쓸 수 있습니다.
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex w-fit rounded-full border border-white/80 bg-white/60 px-3 py-1 text-[11px] font-semibold text-slate-600 backdrop-blur">
                      추후 영상 교체 가능
                    </span>
                  </div>

                  <div className="relative mt-4 grid gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {[
                          "로그인 없이 빠르게 체험",
                          "랜덤 매칭과 보드 흐름 미리보기",
                        ].map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-3 rounded-[1.2rem] bg-white/72 px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_rgba(12,73,53,0.08)] backdrop-blur"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-black text-white">
                              ✓
                            </span>
                            {item}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {DEMO_KEYWORDS.slice(0, 4).map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-full border border-white/80 bg-white/75 px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                        <Link to="/experience" className={primaryLinkClassName}>
                          체험해보기
                        </Link>
                      </div>
                    </div>

                    <div className="mx-auto w-full max-w-[16.5rem] rounded-[2rem] border border-white/80 bg-white/80 p-3 shadow-[0_24px_50px_rgba(7,69,49,0.12)] backdrop-blur">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          demo preview
                        </span>
                      </div>
                      <div className="relative">
                        <PreviewBoard />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700/88 text-lg font-black text-white shadow-[0_18px_35px_rgba(14,109,77,0.3)]">
                            ▶
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full rounded-[2.2rem] border-slate-900/10 bg-white/95 shadow-soft">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700">
                    이벤트 관리자 신청
                  </p>
                  <h2 className="text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-[1.7rem]">
                    행사 운영 권한이 필요하신가요?
                  </h2>
                  <p className="text-sm leading-5 text-slate-600">
                    행사 정보만 남겨주시면 검토 후 안내드립니다.
                  </p>
                </div>

                <form className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="landing-name">이름</Label>
                    <Input
                      id="landing-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((previousValue) => ({ ...previousValue, name: event.target.value }))
                      }
                      placeholder="김행사"
                      className="bg-[#f8fbf9]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landing-email">이메일</Label>
                    <Input
                      id="landing-email"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((previousValue) => ({ ...previousValue, email: event.target.value }))
                      }
                      placeholder="organizer@example.com"
                      className="bg-[#f8fbf9]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landing-organization">소속</Label>
                    <Input
                      id="landing-organization"
                      value={form.organization}
                      onChange={(event) =>
                        setForm((previousValue) => ({
                          ...previousValue,
                          organization: event.target.value,
                        }))
                      }
                      placeholder="가짜연구소"
                      className="bg-[#f8fbf9]"
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
                      className="bg-[#f8fbf9]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landing-date">예상 행사 날짜</Label>
                    <Input
                      id="landing-date"
                      type="date"
                      value={form.expectedEventDate}
                      onChange={(event) =>
                        setForm((previousValue) => ({
                          ...previousValue,
                          expectedEventDate: event.target.value,
                        }))
                      }
                      className="bg-[#f8fbf9]"
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
                      className="bg-[#f8fbf9]"
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-3">
                    <Label htmlFor="landing-purpose">행사 목적</Label>
                    <Textarea
                      id="landing-purpose"
                      value={form.eventPurpose}
                      onChange={(event) =>
                        setForm((previousValue) => ({
                          ...previousValue,
                          eventPurpose: event.target.value,
                        }))
                      }
                      placeholder="어떤 참가자들이 만나고, 빙고를 통해 어떤 행동을 유도하고 싶은지 적어 주세요."
                      className="min-h-[72px] bg-[#f8fbf9]"
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-3">
                    <Label htmlFor="landing-notes">추가 메모 (선택)</Label>
                    <Input
                      id="landing-notes"
                      value={form.notes}
                      onChange={(event) =>
                        setForm((previousValue) => ({ ...previousValue, notes: event.target.value }))
                      }
                      className="bg-[#f8fbf9]"
                      placeholder="운영 기간, 팀 기능, 리포트 요청 등"
                    />
                  </div>

                  {formError ? (
                    <p className="text-sm font-semibold text-rose-600 sm:col-span-2 xl:col-span-3">{formError}</p>
                  ) : null}
                  {submitMessage ? (
                    <p className="text-sm font-semibold text-brand-700 sm:col-span-2 xl:col-span-3">
                      {submitMessage}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:col-span-2 xl:col-span-3">
                    <Button type="submit" disabled={isSubmitting} className="rounded-full px-6">
                      {isSubmitting ? "접수 중..." : "관리자 권한 신청 보내기"}
                    </Button>
                    <Link to={getAdminPath()} className={secondaryLinkClassName}>
                      관리자 페이지
                    </Link>
                    <p className="text-sm text-slate-500">접수 후 순차 검토됩니다.</p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700">
                  이벤트 사례
                </p>
                <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                  이벤트 목록
                </h2>
              </div>
              {eventsError ? (
                <p className="text-sm font-semibold text-rose-600">{eventsError}</p>
              ) : isLoadingEvents ? (
                <p className="text-sm font-semibold text-slate-400">행사 사례를 불러오는 중입니다.</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {caseStudyEvents.length > 0
                ? caseStudyEvents.map((eventItem, index) => (
                    <CaseStudyPoster
                      key={eventItem.id}
                      accentClassName={
                        CASE_STUDY_POSTER_STYLES[index % CASE_STUDY_POSTER_STYLES.length]
                      }
                      title={eventItem.name}
                      description={`${eventItem.boardSize}x${eventItem.boardSize} 보드 · 목표 ${eventItem.bingoMissionCount}줄`}
                      meta={formatLandingDate(eventItem.startAt)}
                      badgeLabel={getStatusLabel(eventItem.status)}
                      badgeClassName={getStatusClassName(eventItem.status)}
                      actionLabel="행사 보기"
                      href={getEventHomePath(eventItem.slug)}
                    />
                  ))
                : CASE_STUDY_PLACEHOLDERS.map((item, index) => (
                    <CaseStudyPoster
                      key={item.meta}
                      accentClassName={
                        CASE_STUDY_POSTER_STYLES[index % CASE_STUDY_POSTER_STYLES.length]
                      }
                      title={item.title}
                      description={item.description}
                      meta={item.meta}
                      badgeLabel="Poster"
                      badgeClassName="bg-black/10 text-current"
                      actionLabel="교체 예정"
                    />
                  ))}
            </div>
          </section>
        </main>

        <footer className="relative mt-12 w-full bg-[#0f172a] text-white">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10">
            <div className="space-y-3">
              <p className="text-2xl font-black tracking-[-0.04em]">DevFactory</p>
              <div className="flex flex-wrap gap-3 text-sm text-white/70">
                <Link to="/privacy" className="hover:text-white">
                  이용약관
                </Link>
                <Link to="/privacy" className="hover:text-white">
                  개인정보 처리방침
                </Link>
              </div>
            </div>

            <div className="space-y-1 text-sm text-white/70 lg:text-right">
              <p>문의는 관리자 신청 폼을 통해 접수해 주세요.</p>
              <p>copyright © DevFactory</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingHomePage;

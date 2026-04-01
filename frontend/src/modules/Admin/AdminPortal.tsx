import {
  Fragment,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import {
  createAdminEvent,
  createAdminMember,
  deleteAdminMember,
  getAdminEventDetail,
  getAdminEventManagerRequests,
  getAdminEvents,
  getAdminMe,
  getAdminMembers,
  getAdminPolicyTemplate,
  loginAdmin,
  resetAdminEventData,
  reviewAdminEventManagerRequest,
  updateAdminPolicyTemplate,
  updateAdminEvent,
  validateAdminSlugInput,
} from "../../api/admin_api";
import {
  formatEventDateLabel,
  getAdminPath,
  getEventHomePath,
} from "../../config/eventProfiles";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import GoogleSignInButton from "../Auth/GoogleSignInButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { cn } from "../../lib/utils";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  maybeGetSupabaseClient,
} from "../../lib/supabaseClient";
import { isGoogleIdentityConfigured } from "../../lib/googleIdentity";
import {
  clearAdminSession,
  getAdminSession,
  hasAdminSession,
  setAdminSession,
} from "../../utils/adminSession";
import { clearLegacyLocalLoginStorage } from "../../utils/legacyAuthStorage";
import type {
  AdminEventManagerRequest,
  AdminEvent,
  AdminEventManagerRequestReviewResult,
  AdminEventStatus,
  AdminMember,
  AdminPolicyTemplate,
  AdminRole,
  AdminSession,
} from "./adminTypes";
import { getEventDateParts } from "./adminEventDate";
import {
  buildAutoFilledKeywordList,
  clampKeywordList,
  describeKeywordAutofill,
} from "./adminKeywordUtils";
import {
  normalizeSlugDraftInput,
  normalizeSlugForSave,
  recommendEnglishSlugFromName,
} from "./adminSlugUtils";

type AdminSection = "dashboard" | "members" | "applications" | "event-settings" | "policies";
type EventDetailTab = "overview" | "dashboard" | "participants";

type EventFormState = {
  id?: number;
  slug: string;
  slugEdited: boolean;
  isPublished: boolean;
  wasPublished: boolean;
  name: string;
  location: string;
  eventTeam: string;
  boardSize: "3" | "5";
  bingoMissionCount: string;
  keywords: string[];
  keywordDraft: string;
  date: string;
  startTime: string;
  endTime: string;
  adminEmail: string;
  participantCount: string;
  progressCurrent: string;
  progressTotal: string;
  canEdit: boolean;
};

const ITEMS_PER_PAGE = 4;
const DETAIL_PARTICIPANTS_PER_PAGE = 8;
const DEFAULT_MEMBER_PASSWORD = "Admin1234!";
const DEFAULT_SUPERADMIN_EMAIL = "superadmin@laivdata.com";
const POLICY_PREVIEW_HOST = "샘플 행사 운영팀";
const EVENT_DETAIL_TABS: Array<{ key: EventDetailTab; label: string }> = [
  { key: "overview", label: "개요" },
  { key: "dashboard", label: "대시보드" },
  { key: "participants", label: "참가자" },
];
const canUseGoogleAdminAuth = () =>
  isSupabaseConfigured() && isGoogleIdentityConfigured();

const formatAdminDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatEventRowDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatTimeText = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const toDateInputValue = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).formatToParts(parsedDate);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).formatToParts(parsedDate);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
};

const getRoleLabel = (role: AdminRole) => {
  return role === "admin" ? "Admin" : "Event Manager";
};

const getApplicationStatusLabel = (status: AdminEventManagerRequest["status"]) => {
  if (status === "approved") {
    return "승인";
  }
  if (status === "rejected") {
    return "반려";
  }
  return "대기";
};

const getApplicationStatusClassName = (status: AdminEventManagerRequest["status"]) => {
  if (status === "approved") {
    return "bg-brand-100 text-brand-800";
  }
  if (status === "rejected") {
    return "bg-rose-100 text-rose-600";
  }
  return "bg-amber-100 text-amber-700";
};

const getProgressPercent = (current: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / total) * 100));
};

const sortAdminEvents = (items: AdminEvent[]) => {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.startAt).getTime();
    const rightTime = new Date(right.startAt).getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.name.localeCompare(right.name, "ko-KR");
  });
};

const upsertAdminEvent = (items: AdminEvent[], nextItem: AdminEvent) => {
  return sortAdminEvents([...items.filter((item) => item.id !== nextItem.id), nextItem]);
};

const getAdminEventDetailPath = (eventId: number | string, tab: EventDetailTab = "overview") => {
  const basePath = `${getAdminPath("event-settings")}/${eventId}`;
  return tab === "overview" ? basePath : `${basePath}/${tab}`;
};

const getTimeRangeLabel = (startAt: string, endAt: string) => {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return startAt;
  }

  const formatTime = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Seoul",
    }).formatToParts(date);

    const hour = parts.find((part) => part.type === "hour")?.value ?? "";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "";
    const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value ?? "";

    return {
      label: `${hour}.${minute}`,
      dayPeriod,
    };
  };

  const startLabel = formatTime(startDate);
  const endLabel = formatTime(endDate);

  if (startLabel.dayPeriod === endLabel.dayPeriod) {
    return `${startLabel.label} - ${endLabel.label} ${endLabel.dayPeriod}`;
  }

  return `${startLabel.label} ${startLabel.dayPeriod} - ${endLabel.label} ${endLabel.dayPeriod}`;
};

const formatDurationLabel = (minutes: number) => {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${remainingMinutes}분`;
};

const createEventFormState = (adminEmail: string, eventItem?: AdminEvent): EventFormState => {
  if (eventItem) {
    return {
      id: eventItem.id,
      slug: eventItem.slug,
      slugEdited: false,
      isPublished: eventItem.isPublished,
      wasPublished: eventItem.isPublished,
      name: eventItem.name,
      location: eventItem.location,
      eventTeam: eventItem.eventTeam,
      boardSize: String(eventItem.boardSize) as "3" | "5",
      bingoMissionCount: String(eventItem.bingoMissionCount),
      keywords: [...eventItem.keywords],
      keywordDraft: "",
      date: toDateInputValue(eventItem.startAt),
      startTime: toTimeInputValue(eventItem.startAt),
      endTime: toTimeInputValue(eventItem.endAt),
      adminEmail: eventItem.adminEmail,
      participantCount: String(eventItem.participantCount),
      progressCurrent: String(eventItem.progressCurrent),
      progressTotal: String(eventItem.progressTotal),
      canEdit: eventItem.canEdit,
    };
  }

  return {
    slug: "",
    slugEdited: false,
    isPublished: false,
    wasPublished: false,
    name: "",
    location: "",
    eventTeam: "",
    boardSize: "5",
    bingoMissionCount: "4",
    keywords: [],
    keywordDraft: "",
    date: "",
    startTime: "15:00",
    endTime: "18:00",
    adminEmail,
    participantCount: "0",
    progressCurrent: "0",
    progressTotal: "0",
    canEdit: true,
  };
};

const combineDateAndTimeToIso = (date: string, time: string) => {
  return `${date}T${time}:00+09:00`;
};

const IconBase = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
};

const DashboardIcon = () => (
  <IconBase>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="5" rx="1.5" />
    <rect x="13" y="10" width="8" height="11" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
  </IconBase>
);

const UsersIcon = () => (
  <IconBase>
    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9.5" cy="7" r="3.5" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.86" />
    <path d="M16 3.13a3.5 3.5 0 0 1 0 6.75" />
  </IconBase>
);

const EventIcon = () => (
  <IconBase>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 14h3" />
    <path d="M13 14h3" />
  </IconBase>
);

const FileIcon = () => (
  <IconBase>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h6" />
  </IconBase>
);

const EyeIcon = () => (
  <IconBase>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </IconBase>
);

const EyeOffIcon = () => (
  <IconBase>
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a18.9 18.9 0 0 1-4.11 4.88" />
    <path d="M6.61 6.61A18.48 18.48 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 5.11-1.17" />
  </IconBase>
);

const LogoutIcon = () => (
  <IconBase>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </IconBase>
);

const PlusIcon = () => (
  <IconBase>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </IconBase>
);

const CloseIcon = () => (
  <IconBase>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </IconBase>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </IconBase>
);

const ChevronRightIcon = () => (
  <IconBase>
    <path d="m9 18 6-6-6-6" />
  </IconBase>
);

const ChevronLeftIcon = () => (
  <IconBase>
    <path d="m15 18-6-6 6-6" />
  </IconBase>
);

const ChevronDownIcon = () => (
  <IconBase>
    <path d="m6 9 6 6 6-6" />
  </IconBase>
);

const ExternalLinkIcon = () => (
  <IconBase>
    <path d="M14 5h5v5" />
    <path d="M10 14 19 5" />
    <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
  </IconBase>
);

const InfoIcon = () => (
  <IconBase className="h-4 w-4">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6" />
    <path d="M12 7h.01" />
  </IconBase>
);

const navigationItems: Array<{
  key: AdminSection;
  label: string;
  Icon: () => ReactNode;
  adminOnly?: boolean;
}> = [
  { key: "dashboard", label: "대시보드", Icon: DashboardIcon },
  { key: "members", label: "회원 관리", Icon: UsersIcon, adminOnly: true },
  { key: "applications", label: "신청 관리", Icon: UsersIcon, adminOnly: true },
  { key: "event-settings", label: "이벤트 관리", Icon: EventIcon },
  { key: "policies", label: "이용약관 및 개인정보", Icon: FileIcon },
];

const AdminBrand = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className={cn("relative text-center", compact && "text-left")}>
      <div
        className={cn(
          "relative inline-flex flex-col items-center px-6 py-4",
          compact && "origin-top-left scale-90 items-start px-0 py-0"
        )}
      >
        <span className="absolute left-0 top-10 h-16 w-16 rounded-[1.6rem] bg-white/25 blur-[1px]" />
        <span className="absolute right-2 top-3 h-8 w-8 rounded-2xl bg-white/20 blur-[1px]" />
        <span className="relative text-5xl font-black tracking-[-0.08em] text-[#73e4bd] sm:text-6xl">
          Bingo
        </span>
        <span className="relative -mt-2 text-4xl font-black tracking-[-0.08em] text-white sm:text-5xl">
          Networking
        </span>
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold text-slate-500",
          compact && "ml-3 mt-0 text-lg text-brand-900/70"
        )}
      >
        Admin
      </p>
    </div>
  );
};

const SectionHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-brand-800">{title}</h1>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
};

const LoginField = ({
  id,
  type,
  placeholder,
  value,
  onChange,
  trailing,
}: {
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  trailing?: ReactNode;
}) => {
  return (
    <div className="relative">
      <Label htmlFor={id} className="sr-only">
        {placeholder}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-14 rounded-2xl border-slate-300 bg-white px-5 text-base",
          trailing ? "pr-14" : ""
        )}
      />
      {trailing ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">{trailing}</div>
      ) : null}
    </div>
  );
};

const EventStatusBadge = ({ status }: { status: AdminEventStatus }) => {
  const label =
    status === "ended" ? "종료" : status === "in_progress" ? "진행 중" : "예정";

  return (
    <span
      className={cn(
        "inline-flex min-w-[4.2rem] items-center justify-center rounded-md px-3 py-1 text-sm font-bold",
        status === "ended" && "bg-slate-600 text-white",
        status === "in_progress" && "bg-brand-500 text-white",
        status === "scheduled" && "bg-brand-50 text-brand-600"
      )}
    >
      {label}
    </span>
  );
};

const EventProgress = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const progress = getProgressPercent(current, total);

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="whitespace-nowrap text-right">
        <span className="text-xl font-black tracking-tight text-slate-800">{progress}%</span>
        <span className="ml-2 text-sm text-slate-400">({current}/{total})</span>
      </div>
    </div>
  );
};

const EmptyPanelState = ({
  message,
  className,
}: {
  message: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex min-h-[12rem] items-center justify-center rounded-[1.4rem] border border-dashed border-brand-100 bg-white/70 px-6 text-center text-sm font-semibold leading-6 text-slate-400",
        className
      )}
    >
      {message}
    </div>
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shouldUseGoogleAdminAuth = canUseGoogleAdminAuth();

  useEffect(() => {
    let cancelled = false;

    const redirectAuthenticatedAdmin = async () => {
      if (!shouldUseGoogleAdminAuth) {
        if (hasAdminSession()) {
          navigate(getAdminPath("event-settings"), { replace: true });
        }
        return;
      }

      const supabase = maybeGetSupabaseClient();
      if (!supabase) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session?.access_token) {
        return;
      }

      try {
        const nextSession = await getAdminMe(session.access_token);
        if (cancelled) {
          return;
        }

        clearLegacyLocalLoginStorage();
        setAdminSession(nextSession);
        navigate(getAdminPath("event-settings"), { replace: true });
      } catch {
        await supabase.auth.signOut();
        clearAdminSession();
      }
    };

    void redirectAuthenticatedAdmin();

    return () => {
      cancelled = true;
    };
  }, [navigate, shouldUseGoogleAdminAuth]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const nextSession = await loginAdmin(email, password);
      setAdminSession(nextSession);
      navigate(getAdminPath("event-settings"), { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "이메일 또는 비밀번호를 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async ({
    credential,
    nonce,
  }: {
    credential: string;
    nonce: string;
  }) => {
    const supabase = getSupabaseClient();

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
        nonce,
      });

      if (error) {
        throw error;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Supabase 관리자 세션을 확인하지 못했습니다.");
      }

      const nextSession = await getAdminMe(accessToken);
      clearLegacyLocalLoginStorage();
      setAdminSession(nextSession);
      navigate(getAdminPath("event-settings"), { replace: true });
    } catch (error) {
      clearAdminSession();
      await supabase.auth.signOut();
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Google 관리자 로그인 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-10">
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-xl space-y-10">
          <AdminBrand />

          {shouldUseGoogleAdminAuth ? (
            <div className="space-y-5 rounded-[2rem] border border-white/60 bg-white/85 p-7 shadow-soft">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Google 계정으로 관리자 로그인
                </h2>
                <p className="text-sm leading-6 text-slate-500">
                  Google 계정 인증 후 관리자 권한이 확인되면 콘솔로 이동합니다.
                </p>
              </div>

              <GoogleSignInButton
                className="mx-auto max-w-[360px]"
                context="signin"
                onError={(message) => setErrorMessage(message)}
                onSuccess={handleGoogleLogin}
                text="signin_with"
              />
            </div>
          ) : (
            <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem]" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <LoginField
                  id="admin-email"
                  type="email"
                  value={email}
                  placeholder="이메일 주소"
                  onChange={(nextValue) => {
                    setEmail(nextValue);
                    setErrorMessage("");
                  }}
                />

                <LoginField
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="비밀번호"
                  onChange={(nextValue) => {
                    setPassword(nextValue);
                    setErrorMessage("");
                  }}
                  trailing={
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                      onClick={() => setShowPassword((previousValue) => !previousValue)}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-full min-h-[122px] rounded-2xl bg-gradient-to-b from-[#5fd0a8] to-[#45bc90] text-2xl font-black tracking-tight text-white hover:from-[#55c79f] hover:to-[#39b081] md:min-w-[8rem]"
              >
                {isSubmitting ? "확인 중" : "로그인"}
              </Button>
            </form>
          )}

          {errorMessage ? (
            <p className="text-center text-sm font-semibold text-rose-600">{errorMessage}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
};

const AdminConsolePage = ({
  section,
  eventDetailTab,
}: {
  section: AdminSection;
  eventDetailTab?: EventDetailTab;
}) => {
  const navigate = useNavigate();
  const { adminEventId } = useParams();
  const initialSession = getAdminSession();
  const shouldUseGoogleAdminAuth = canUseGoogleAdminAuth();
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const [session, setSession] = useState<AdminSession | null>(initialSession);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [applications, setApplications] = useState<AdminEventManagerRequest[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selectedEventDetail, setSelectedEventDetail] = useState<AdminEvent | null>(null);
  const [memberPage, setMemberPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [participantPage, setParticipantPage] = useState(1);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [addFormError, setAddFormError] = useState("");
  const [eventFormError, setEventFormError] = useState("");
  const [slugAssistMessage, setSlugAssistMessage] = useState("");
  const [slugAssistTone, setSlugAssistTone] = useState<"info" | "error">("info");
  const [pageError, setPageError] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [inviteReviewResult, setInviteReviewResult] =
    useState<AdminEventManagerRequestReviewResult | null>(null);
  const [policyTemplate, setPolicyTemplate] = useState<AdminPolicyTemplate | null>(null);
  const [policyDraft, setPolicyDraft] = useState("");
  const [policyNotice, setPolicyNotice] = useState("");
  const [policyError, setPolicyError] = useState("");
  const [isConsoleLoading, setIsConsoleLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);
  const [isPolicySaving, setIsPolicySaving] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);
  const [reviewingApplicationId, setReviewingApplicationId] = useState<number | null>(null);
  const [resettingEventId, setResettingEventId] = useState<number | null>(null);
  const [newAdminForm, setNewAdminForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "admin" as AdminRole,
  });
  const [eventForm, setEventForm] = useState<EventFormState>(() =>
    createEventFormState(initialSession?.email ?? "")
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        let accessToken = "";

        if (shouldUseGoogleAdminAuth) {
          const supabase = getSupabaseClient();
          const {
            data: { session: supabaseSession },
          } = await supabase.auth.getSession();
          accessToken = supabaseSession?.access_token ?? "";
        } else {
          accessToken = getAdminSession()?.accessToken ?? "";
        }

        if (!accessToken) {
          navigate(getAdminPath(), { replace: true });
          return;
        }

        const verifiedSession = await getAdminMe(accessToken);
        if (cancelled) {
          return;
        }

        clearLegacyLocalLoginStorage();
        setAdminSession(verifiedSession);
        setSession(verifiedSession);
        setEventForm(createEventFormState(verifiedSession.email));
      } catch (error) {
        clearAdminSession();
        if (shouldUseGoogleAdminAuth) {
          await maybeGetSupabaseClient()?.auth.signOut();
        }
        if (!cancelled) {
          navigate(getAdminPath(), { replace: true });
        }
      }
    };

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [navigate, shouldUseGoogleAdminAuth]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    const loadConsoleData = async () => {
      try {
        setIsConsoleLoading(true);
        setPageError("");

        const [eventItems, memberItems, applicationPayload] = await Promise.all([
          getAdminEvents(session.accessToken),
          session.role === "admin" ? getAdminMembers(session.accessToken) : Promise.resolve([]),
          session.role === "admin"
            ? getAdminEventManagerRequests(session.accessToken)
            : Promise.resolve({ requests: [], pendingCount: 0 }),
        ]);

        if (cancelled) {
          return;
        }

        setEvents(sortAdminEvents(eventItems));
        setMembers(memberItems);
        setApplications(applicationPayload.requests);
      } catch (error) {
        if (!cancelled) {
          setPageError(error instanceof Error ? error.message : "관리자 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsConsoleLoading(false);
        }
      }
    };

    void loadConsoleData();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (section !== "policies" || !session) {
      return;
    }

    let cancelled = false;

    const loadPolicy = async () => {
      try {
        setIsPolicyLoading(true);
        setPolicyError("");
        setPolicyNotice("");
        const template = await getAdminPolicyTemplate(session.accessToken);
        if (!cancelled) {
          setPolicyTemplate(template);
          setPolicyDraft(template.content);
        }
      } catch (error) {
        if (!cancelled) {
          setPolicyError(
            error instanceof Error
              ? error.message
              : "이용약관 및 개인정보 템플릿을 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setIsPolicyLoading(false);
        }
      }
    };

    void loadPolicy();

    return () => {
      cancelled = true;
    };
  }, [section, session]);

  const visibleMembers = useMemo(() => {
    const startIndex = (memberPage - 1) * ITEMS_PER_PAGE;
    return members.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [memberPage, members]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = eventSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return events;
    }

    return events.filter((eventItem) => {
      return (
        eventItem.name.toLowerCase().includes(normalizedQuery) ||
        eventItem.adminEmail.toLowerCase().includes(normalizedQuery) ||
        formatEventRowDate(eventItem.eventDate).toLowerCase().includes(normalizedQuery)
      );
    });
  }, [eventSearchQuery, events]);

  const visibleEvents = useMemo(() => {
    const startIndex = (eventPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [eventPage, filteredEvents]);

  const selectedEvent = useMemo(() => {
    if (!eventDetailTab || !adminEventId) {
      return null;
    }

    if (selectedEventDetail && String(selectedEventDetail.id) === adminEventId) {
      return selectedEventDetail;
    }

    return events.find((eventItem) => String(eventItem.id) === adminEventId) ?? null;
  }, [adminEventId, eventDetailTab, events, selectedEventDetail]);

  const featuredEvent = selectedEvent ?? events[0] ?? null;
  const canManageApplications = session?.role === "admin";
  const canEditSelectedEvent = !!selectedEvent?.canEdit;
  const pendingApplicationCount = useMemo(
    () => applications.filter((requestItem) => requestItem.status === "pending").length,
    [applications]
  );

  const selectedEventInsights = useMemo(() => {
    if (!selectedEvent?.analytics) {
      return null;
    }

    return {
      ...selectedEvent.analytics,
      participants: selectedEvent.participants ?? [],
    };
  }, [selectedEvent]);

  const visibleParticipants = useMemo(() => {
    if (!selectedEventInsights) {
      return [];
    }

    const startIndex = (participantPage - 1) * DETAIL_PARTICIPANTS_PER_PAGE;
    return selectedEventInsights.participants.slice(
      startIndex,
      startIndex + DETAIL_PARTICIPANTS_PER_PAGE
    );
  }, [participantPage, selectedEventInsights]);

  const memberTotalPages = Math.max(1, Math.ceil(members.length / ITEMS_PER_PAGE));
  const eventTotalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const participantTotalPages = Math.max(
    1,
    Math.ceil((selectedEventInsights?.participants.length ?? 0) / DETAIL_PARTICIPANTS_PER_PAGE)
  );

  useEffect(() => {
    if (memberPage > memberTotalPages) {
      setMemberPage(memberTotalPages);
    }
  }, [memberPage, memberTotalPages]);

  useEffect(() => {
    if (eventPage > eventTotalPages) {
      setEventPage(eventTotalPages);
    }
  }, [eventPage, eventTotalPages]);

  useEffect(() => {
    if (participantPage > participantTotalPages) {
      setParticipantPage(participantTotalPages);
    }
  }, [participantPage, participantTotalPages]);

  useEffect(() => {
    setEventPage(1);
  }, [eventSearchQuery]);

  useEffect(() => {
    setParticipantPage(1);
  }, [adminEventId, eventDetailTab]);

  useEffect(() => {
    if (!session || !eventDetailTab || !adminEventId) {
      setSelectedEventDetail(null);
      return;
    }

    let cancelled = false;

    const loadSelectedEvent = async () => {
      try {
        setIsDetailLoading(true);
        setPageError("");
        const detail = await getAdminEventDetail(session.accessToken, adminEventId);
        if (cancelled) {
          return;
        }

        setSelectedEventDetail(detail);
        setEvents((previousValue) => upsertAdminEvent(previousValue, detail));
      } catch (error) {
        if (!cancelled) {
          setPageError(error instanceof Error ? error.message : "이벤트 상세를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    };

    void loadSelectedEvent();

    return () => {
      cancelled = true;
    };
  }, [adminEventId, eventDetailTab, session]);

  useEffect(() => {
    if (session?.role === "event_manager" && (section === "members" || section === "applications")) {
      navigate(getAdminPath("event-settings"), { replace: true });
    }
  }, [navigate, section, session?.role]);

  const goToSection = (nextSection: AdminSection) => {
    if ((nextSection === "members" || nextSection === "applications") && session?.role !== "admin") {
      navigate(getAdminPath("event-settings"));
      return;
    }

    if (nextSection !== "applications") {
      setPageNotice("");
      setInviteReviewResult(null);
    }
    navigate(getAdminPath(nextSection));
  };

  const goToEventDetail = (eventId: number, tab: EventDetailTab = "overview") => {
    navigate(getAdminEventDetailPath(eventId, tab));
  };

  const goBackToEventList = () => {
    navigate(getAdminPath("event-settings"));
  };

  const handleLogout = () => {
    clearAdminSession();
    if (shouldUseGoogleAdminAuth) {
      void maybeGetSupabaseClient()?.auth.signOut();
    }
    navigate(getAdminPath(), { replace: true });
  };

  const openEventModal = (eventItem?: AdminEvent) => {
    setEventFormError("");
    setSlugAssistMessage("");
    setSlugAssistTone("info");
    setEventForm(createEventFormState(session?.email ?? "", eventItem));
    setShowEventModal(true);
  };

  const handleEventNameChange = (value: string) => {
    setSlugAssistMessage("");
    setSlugAssistTone("info");
    setEventForm((previousValue) => {
      const nextSlug =
        previousValue.isPublished || previousValue.slugEdited
          ? previousValue.slug
          : recommendEnglishSlugFromName(value) || previousValue.slug;

      return {
        ...previousValue,
        name: value,
        slug: nextSlug,
      };
    });
  };

  const handleEventSlugChange = (value: string) => {
    setSlugAssistMessage("");
    setSlugAssistTone("info");
    setEventForm((previousValue) => ({
      ...previousValue,
      slug: normalizeSlugDraftInput(value),
      slugEdited: true,
    }));
  };

  const handleRegenerateEventSlug = () => {
    const recommendedSlug = recommendEnglishSlugFromName(eventForm.name);
    if (!recommendedSlug) {
      setSlugAssistTone("error");
      setSlugAssistMessage(
        "행사명에서 영문 slug 추천을 만들지 못했습니다. slug를 직접 입력해 주세요."
      );
      return;
    }

    setEventForm((previousValue) => ({
      ...previousValue,
      slug: recommendedSlug,
      slugEdited: false,
    }));
    setSlugAssistTone("info");
    setSlugAssistMessage(`행사명 기준 영문 slug 추천을 적용했습니다: /${recommendedSlug}`);
  };

  const addKeyword = (keyword: string) => {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      return;
    }

    setEventForm((previousValue) => {
      if (previousValue.keywords.includes(normalizedKeyword)) {
        return {
          ...previousValue,
          keywordDraft: "",
        };
      }

      const nextKeywords = clampKeywordList(
        [...previousValue.keywords, normalizedKeyword],
        previousValue.boardSize
      );

      return {
        ...previousValue,
        keywords: nextKeywords,
        keywordDraft: "",
      };
    });
  };

  const handleKeywordDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    addKeyword(eventForm.keywordDraft);
  };

  const handleCreateAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) {
      return;
    }

    const normalizedEmail = newAdminForm.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAddFormError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }

    if (newAdminForm.password.length < 8 || !/[A-Z]/.test(newAdminForm.password)) {
      setAddFormError("비밀번호는 영어 대문자를 포함해 8자 이상이어야 합니다.");
      return;
    }

    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      setAddFormError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!newAdminForm.name.trim()) {
      setAddFormError("이름을 입력해 주세요.");
      return;
    }

    try {
      const nextMember = await createAdminMember(session.accessToken, {
        email: normalizedEmail,
        password: newAdminForm.password,
        name: newAdminForm.name,
        role: newAdminForm.role,
      });

      setMembers((previousValue) => [nextMember, ...previousValue]);
      setMemberPage(1);
      setShowAddModal(false);
      setAddFormError("");
      setNewAdminForm({
        email: "",
        password: "",
        confirmPassword: "",
        name: "",
        role: "admin",
      });
    } catch (error) {
      setAddFormError(error instanceof Error ? error.message : "관리자를 추가하지 못했습니다.");
    }
  };

  const handleDeleteMember = async (member: AdminMember) => {
    if (!session || session.role !== "admin") {
      return;
    }

    if (member.id === session.id) {
      setPageError("현재 로그인한 본인 계정은 삭제할 수 없습니다.");
      return;
    }

    if (member.email === DEFAULT_SUPERADMIN_EMAIL) {
      setPageError("기본 최고 관리자 계정은 삭제할 수 없습니다.");
      return;
    }

    const isConfirmed = window.confirm(
      `${member.name} (${member.email}) 계정을 삭제할까요?`
    );
    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingMemberId(member.id);
      setPageError("");
      await deleteAdminMember(session.accessToken, member.id);
      setMembers((previousValue) => previousValue.filter((item) => item.id !== member.id));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "관리자 계정을 삭제하지 못했습니다.");
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleReviewApplication = async (
    request: AdminEventManagerRequest,
    nextStatus: "approved" | "rejected"
  ) => {
    if (!session || session.role !== "admin") {
      return;
    }

    const confirmed = window.confirm(
      `${request.name}님의 신청을 ${nextStatus === "approved" ? "승인" : "반려"}할까요?`
    );
    if (!confirmed) {
      return;
    }

    try {
      setReviewingApplicationId(request.id);
      setPageError("");
      const reviewResult = await reviewAdminEventManagerRequest(session.accessToken, request.id, {
        status: nextStatus,
      });
      setApplications((previousValue) =>
        [...previousValue.map((item) => (item.id === reviewResult.request.id ? reviewResult.request : item))].sort(
          (left, right) => {
            const priority = (value: AdminEventManagerRequest["status"]) =>
              value === "pending" ? 0 : value === "approved" ? 1 : 2;
            return (
              priority(left.status) - priority(right.status) ||
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
            );
          }
        )
      );
      if (nextStatus === "approved") {
        setInviteReviewResult(reviewResult);
        setPageNotice(reviewResult.message);
      } else {
        setInviteReviewResult(null);
        setPageNotice("신청을 반려했습니다.");
      }
      contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "신청 상태를 바꾸지 못했습니다.");
      setPageNotice("");
      setInviteReviewResult(null);
    } finally {
      setReviewingApplicationId(null);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteReviewResult?.inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteReviewResult.inviteLink);
      setPageNotice("초대 링크를 복사했습니다.");
    } catch {
      setPageError("초대 링크를 복사하지 못했습니다.");
    }
  };

  const handleResetEventData = async () => {
    if (!session || !selectedEvent || !canEditSelectedEvent) {
      return;
    }

    const isConfirmed = window.confirm(
      "이 행사에 연결된 참가자, 팀, 빙고판, 교환 기록을 초기화할까요?\n이 작업은 되돌릴 수 없습니다."
    );
    if (!isConfirmed) {
      return;
    }

    try {
      setResettingEventId(selectedEvent.id);
      setPageError("");

      const result = await resetAdminEventData(session.accessToken, selectedEvent.id);
      const [nextEvents, nextDetail] = await Promise.all([
        getAdminEvents(session.accessToken),
        getAdminEventDetail(session.accessToken, selectedEvent.id),
      ]);

      setEvents(sortAdminEvents(nextEvents));
      setSelectedEventDetail(nextDetail);

      const stats = result.stats;
      window.alert(
        stats
          ? `초기화 완료\n참가자 ${stats.deleted_attendees}명, 보드 ${stats.deleted_boards}개, 교환 ${stats.deleted_interactions}건을 삭제했습니다.`
          : "이벤트 데이터를 초기화했습니다."
      );
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "이벤트 데이터를 초기화하지 못했습니다.");
    } finally {
      setResettingEventId(null);
    }
  };

  const handleResetPolicyDraft = () => {
    setPolicyDraft(policyTemplate?.content ?? "");
    setPolicyError("");
    setPolicyNotice("");
  };

  const handleSavePolicyTemplate = async () => {
    if (!session || session.role !== "admin") {
      return;
    }

    const nextContent = policyDraft.trim();
    if (!nextContent) {
      setPolicyError("템플릿 내용은 비워둘 수 없습니다.");
      setPolicyNotice("");
      return;
    }

    try {
      setIsPolicySaving(true);
      setPolicyError("");
      const savedTemplate = await updateAdminPolicyTemplate(session.accessToken, {
        content: nextContent,
      });
      setPolicyTemplate(savedTemplate);
      setPolicyDraft(savedTemplate.content);
      setPolicyNotice("이용약관 및 개인정보 템플릿을 저장했습니다.");
    } catch (error) {
      setPolicyError(
        error instanceof Error
          ? error.message
          : "이용약관 및 개인정보 템플릿을 저장하지 못했습니다."
      );
      setPolicyNotice("");
    } finally {
      setIsPolicySaving(false);
    }
  };

  const handleSaveEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    if (!eventForm.name.trim()) {
      setEventFormError("행사 이름을 입력해 주세요.");
      return;
    }

    if (!eventForm.eventTeam.trim()) {
      setEventFormError("Event team을 입력해 주세요.");
      return;
    }

    if (!eventForm.location.trim()) {
      setEventFormError("행사 위치를 입력해 주세요.");
      return;
    }

    const normalizedSlug = normalizeSlugForSave(eventForm.slug);

    if (!normalizedSlug) {
      setEventFormError("URL에 사용할 slug를 입력해 주세요.");
      return;
    }

    const slugError = validateAdminSlugInput(normalizedSlug);
    if (slugError) {
      setEventFormError(slugError);
      return;
    }

    if (!eventForm.date) {
      setEventFormError("날짜를 입력해 주세요.");
      return;
    }

    if (!eventForm.startTime || !eventForm.endTime) {
      setEventFormError("시작 시간과 종료 시간을 입력해 주세요.");
      return;
    }

    const startAt = combineDateAndTimeToIso(eventForm.date, eventForm.startTime);
    const endAt = combineDateAndTimeToIso(eventForm.date, eventForm.endTime);

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setEventFormError("행사 종료 시각은 시작 시각보다 늦어야 합니다.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eventForm.adminEmail.trim().toLowerCase())) {
      setEventFormError("관리자 이메일을 확인해 주세요.");
      return;
    }

    if (keywordAutofillSummary.currentCount === 0) {
      setEventFormError("키워드를 한 개 이상 추가해 주세요.");
      return;
    }

    const keywordsForSave = buildAutoFilledKeywordList(
      eventForm.keywords,
      eventForm.boardSize
    );

    if (keywordAutofillSummary.missingCount > 0) {
      const firstGeneratedKeyword = keywordAutofillSummary.generatedKeywords[0] ?? "키워드";
      const confirmed = window.confirm(
        [
          `현재 입력한 키워드는 ${keywordAutofillSummary.currentCount}개입니다.`,
          `${Number(eventForm.boardSize)}x${Number(eventForm.boardSize)} 행사에는 ${keywordAutofillSummary.goalCount}개가 필요합니다.`,
          `부족한 ${keywordAutofillSummary.missingCount}개는 "${firstGeneratedKeyword}"부터 자동으로 채워 저장할까요?`,
        ].join("\n")
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      const savedEvent = eventForm.id
        ? await updateAdminEvent(session.accessToken, eventForm.id, {
            slug: normalizedSlug,
            name: eventForm.name,
            location: eventForm.location,
            eventTeam: eventForm.eventTeam,
            startAt,
            endAt,
            adminEmail: eventForm.adminEmail,
            boardSize: Number(eventForm.boardSize) === 3 ? 3 : 5,
            bingoMissionCount: Number(eventForm.bingoMissionCount),
            keywords: keywordsForSave,
            publishState: eventForm.isPublished ? "published" : "draft",
          })
        : await createAdminEvent(session.accessToken, {
            slug: normalizedSlug,
            name: eventForm.name,
            location: eventForm.location,
            eventTeam: eventForm.eventTeam,
            startAt,
            endAt,
            adminEmail: eventForm.adminEmail,
            boardSize: Number(eventForm.boardSize) === 3 ? 3 : 5,
            bingoMissionCount: Number(eventForm.bingoMissionCount),
            keywords: keywordsForSave,
            publishState: eventForm.isPublished ? "published" : "draft",
          });

      setEvents((previousValue) => upsertAdminEvent(previousValue, savedEvent));
      setSelectedEventDetail(savedEvent);
      setEventPage(1);
      setShowEventModal(false);
      setEventFormError("");
      if (!eventForm.id) {
        navigate(getAdminEventDetailPath(savedEvent.id), { replace: true });
      }
    } catch (error) {
      setEventFormError(error instanceof Error ? error.message : "행사를 저장하지 못했습니다.");
    }
  };

  const selectedEventDateParts = selectedEvent
    ? getEventDateParts(selectedEvent.startAt)
    : null;
  const selectedEventHomePath = selectedEvent
    ? selectedEvent.publicPath || getEventHomePath(selectedEvent.slug)
    : "";
  const selectedEventTimeRange = selectedEvent
    ? getTimeRangeLabel(selectedEvent.startAt, selectedEvent.endAt)
    : "";
  const slugPreview = normalizeSlugForSave(eventForm.slug) || normalizeSlugDraftInput(eventForm.slug);
  const keywordAutofillSummary = describeKeywordAutofill(
    eventForm.keywords,
    eventForm.boardSize
  );
  const canEditPolicyTemplate = session?.role === "admin";
  const hasPolicyChanges = policyTemplate !== null && policyDraft.trim() !== policyTemplate.content.trim();
  const policyPreviewContent = useMemo(() => {
    return policyDraft
      .replace(/{eventTeam}/g, POLICY_PREVIEW_HOST)
      .replace(/{host}/g, POLICY_PREVIEW_HOST);
  }, [policyDraft]);

  if (!session) {
    return null;
  }

  if (section === "members" && session.role !== "admin") {
    return null;
  }

  if (section === "applications" && session.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-500 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[21rem_minmax(0,1fr)]">
      <aside className="flex flex-col justify-between gap-8 px-4 py-7 text-white lg:px-5 lg:py-8">
        <div>
          <AdminBrand compact />

          <div className="my-7 h-px bg-white/25" />

          <nav className="grid gap-2" aria-label="admin navigation">
            {navigationItems
              .filter(({ adminOnly }) => !adminOnly || session.role === "admin")
              .map(({ key, label, Icon }) => (
              <Button
                key={key}
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start rounded-2xl px-5 py-4 text-left text-[1.05rem] font-bold text-white/90 hover:bg-white/15 hover:text-white",
                  section === key && "bg-white/30 text-brand-900 hover:bg-white/30"
                )}
                onClick={() => goToSection(key)}
              >
                <span className="flex items-center gap-3">
                  <Icon />
                  <span>{label}</span>
                  {key === "applications" && pendingApplicationCount > 0 ? (
                    <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-white px-2 py-0.5 text-xs font-black text-brand-700">
                      {pendingApplicationCount}
                    </span>
                  ) : null}
                </span>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex w-full flex-col items-center gap-2 pb-2 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/65 text-xl font-black text-slate-500">
            {session.name.trim().charAt(0)}
          </span>
          <p className="text-sm font-medium text-white/95">{session.email}</p>
          <Badge variant={session.role === "admin" ? "default" : "destructive"} className="min-w-[3.5rem] justify-center bg-slate-900 px-2 py-1 text-[0.72rem] font-semibold">
            {getRoleLabel(session.role)}
          </Badge>
          <Button
            variant="ghost"
            className="mt-1 h-auto px-0 py-0 text-sm font-bold text-white hover:bg-transparent hover:text-white/90"
            onClick={handleLogout}
          >
            <LogoutIcon />
            <span>로그아웃</span>
          </Button>
        </div>
      </aside>

      <main className="p-5 sm:p-7 lg:p-9 xl:p-10">
        <Card className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-[2rem] border-white/40 shadow-soft xl:h-[calc(100vh-6rem)]">
          <CardContent className="min-h-0 flex-1 p-0">
            <div ref={contentScrollRef} className="min-h-0 h-full overflow-y-auto space-y-8 p-6 pt-6 pr-5 sm:p-8 sm:pt-8 sm:pr-6 md:p-9 md:pt-9 md:pr-7 xl:p-10 xl:pt-10 xl:pr-8 [scrollbar-gutter:stable_both-edges]">
              {pageError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                  {pageError}
                </div>
              ) : null}
              {isConsoleLoading ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  관리자 데이터를 불러오는 중입니다.
                </div>
              ) : null}

            {section === "dashboard" ? (
              <>
                <SectionHeader
                  title="대시보드"
                  description="이벤트 현황과 현재 라우팅, 관리자 구성, 빙고 설정을 한 화면에서 빠르게 확인할 수 있습니다."
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    {
                      label: "대표 이벤트",
                      value: featuredEvent ? featuredEvent.name : "이벤트 없음",
                    },
                    {
                      label: "관리자 수",
                      value: `${members.length}명`,
                    },
                    {
                      label: "총 이벤트 수",
                      value: `${events.length}개`,
                    },
                    {
                      label: "공개 이벤트 수",
                      value: `${events.filter((eventItem) => eventItem.isPublished).length}개`,
                    },
                    ...(canManageApplications
                      ? [
                          {
                            label: "승인 대기 신청",
                            value: `${pendingApplicationCount}건`,
                          },
                        ]
                      : []),
                  ].map((item) => (
                    <Card
                      key={item.label}
                      className="rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none"
                    >
                      <CardContent className="flex min-h-[7.9rem] flex-col justify-between gap-4 px-6 pb-6 pt-7">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {item.label}
                        </p>
                        <p className="text-[1.45rem] font-black tracking-tight leading-tight text-slate-900 xl:text-[1.6rem]">
                          {item.value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <Card className="rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none">
                    <CardHeader className="space-y-2 p-7 pb-0">
                      <CardTitle>이벤트 개요</CardTitle>
                      <CardDescription>대표 이벤트의 핵심 운영 정보를 빠르게 확인할 수 있습니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 p-7 pt-6">
                      {featuredEvent ? (
                        [
                          ["행사명", featuredEvent.name],
                          ["Event team", featuredEvent.eventTeam],
                          ["행사 위치", featuredEvent.location],
                          ["행사 일정", `${formatEventDateLabel(featuredEvent.startAt)} - ${formatTimeText(featuredEvent.endAt)}`],
                          ["담당 관리자", featuredEvent.adminEmail],
                          ["빙고 크기", `${featuredEvent.boardSize}X${featuredEvent.boardSize}`],
                          ["성공 조건", `${featuredEvent.bingoMissionCount}줄`],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="grid gap-2 rounded-[1.4rem] border border-white/90 bg-white/90 px-4 py-4"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {label}
                            </p>
                            <p className="text-sm font-semibold leading-6 text-slate-700">{value}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyPanelState
                          className="min-h-[16rem]"
                          message="아직 등록된 이벤트가 없습니다."
                        />
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none">
                    <CardHeader className="space-y-2 p-7 pb-0">
                      <CardTitle>라우팅 안내</CardTitle>
                      <CardDescription>관리자 URL은 고정되고, 공개 페이지는 이벤트 slug로 분기됩니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-7 pt-6">
                      {[
                        ["이벤트 홈", featuredEvent ? getEventHomePath(featuredEvent.slug) : "/{eventSlug}"],
                        ["관리자 로그인", getAdminPath()],
                        ["이벤트 관리", getAdminPath("event-settings")],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="space-y-2 rounded-[1.4rem] border border-white/90 bg-white/90 px-4 py-4"
                        >
                          <p className="text-sm font-semibold text-slate-500">{label}</p>
                          <code className="block break-all rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold leading-6 text-brand-700">
                            {value}
                          </code>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}

            {section === "members" ? (
              <>
                <SectionHeader
                  title="관리자"
                  action={
                    <Button className="rounded-full px-5" onClick={() => setShowAddModal(true)}>
                      관리자 추가
                      <PlusIcon />
                    </Button>
                  }
                />

                <div className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-[#fbfcf8]">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[760px]">
                      <TableHeader className="bg-[#f6f8ef]">
                        <TableRow className="border-none hover:bg-transparent">
                          <TableHead>번호</TableHead>
                          <TableHead>이름</TableHead>
                          <TableHead>계정</TableHead>
                          <TableHead>전화번호</TableHead>
                          <TableHead>생성일</TableHead>
                          <TableHead>권한</TableHead>
                          <TableHead className="text-left">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-bold text-slate-900">{member.id}</TableCell>
                            <TableCell className="font-semibold text-slate-800">{member.name}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>{member.phone}</TableCell>
                            <TableCell>{formatAdminDate(member.createdAt)}</TableCell>
                            <TableCell>
                              <Badge variant={member.role === "admin" ? "default" : "destructive"}>
                                {getRoleLabel(member.role)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-left">
                              {member.id === session.id || member.email === DEFAULT_SUPERADMIN_EMAIL ? (
                                <span className="text-xs font-semibold text-slate-400">보호됨</span>
                              ) : (
                                <div className="flex justify-start">
                                  <Button
                                    variant="ghost"
                                    className="h-9 rounded-full px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    disabled={deletingMemberId === member.id}
                                    onClick={() => void handleDeleteMember(member)}
                                  >
                                    {deletingMemberId === member.id ? "삭제 중" : "삭제"}
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  {Array.from({ length: memberTotalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={memberPage === pageNumber ? "secondary" : "ghost"}
                      size="icon"
                      className="rounded-full"
                      onClick={() => setMemberPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                </div>
              </>
            ) : null}

            {section === "applications" ? (
              <>
                <SectionHeader
                  title="신청 관리"
                  description="이벤트 관리자 권한 요청을 검토하고 승인 상태를 관리합니다."
                  action={
                    <div className="self-start rounded-full bg-brand-100 px-4 py-2 text-sm font-bold text-brand-800 md:self-auto">
                      승인 대기 {pendingApplicationCount}건
                    </div>
                  }
                />

                {pageNotice ? (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4 text-sm font-semibold text-brand-800">
                    <p>{pageNotice}</p>
                    {inviteReviewResult?.inviteLink ? (
                      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                            초대 링크
                          </p>
                          <code className="block break-all rounded-2xl bg-white px-4 py-3 text-xs font-semibold leading-6 text-brand-700">
                            {inviteReviewResult.inviteLink}
                          </code>
                          <p className="text-xs text-brand-700/80">
                            {inviteReviewResult.invitedAdmin
                              ? `생성 계정: ${inviteReviewResult.invitedAdmin.email}`
                              : "기존 관리자 계정을 사용합니다."}
                            {inviteReviewResult.inviteExpiresAt
                              ? ` · 만료 ${formatAdminDate(inviteReviewResult.inviteExpiresAt)}`
                              : ""}
                            {inviteReviewResult.inviteEmailSent
                              ? " · 초대 메일 발송 완료"
                              : " · 메일 설정이 없거나 발송에 실패해 링크를 직접 전달해 주세요."}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full px-5"
                          onClick={() => void handleCopyInviteLink()}
                        >
                          링크 복사
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {applications.length > 0 ? (
                  <div className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-[#fbfcf8]">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[1060px]">
                        <TableHeader className="bg-[#f6f8ef]">
                          <TableRow className="border-none hover:bg-transparent">
                            <TableHead>신청일</TableHead>
                            <TableHead>신청자</TableHead>
                            <TableHead>행사명</TableHead>
                            <TableHead>행사 목적</TableHead>
                            <TableHead>예상 일정</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead className="w-[13rem] text-center">관리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.map((requestItem) => (
                            <TableRow key={requestItem.id}>
                              <TableCell className="whitespace-nowrap text-sm text-slate-500">
                                {formatAdminDate(requestItem.createdAt)}
                              </TableCell>
                              <TableCell className="min-w-[10rem]">
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-900">{requestItem.name}</p>
                                  <p className="text-sm text-slate-500">{requestItem.email}</p>
                                  {requestItem.organization ? (
                                    <p className="text-xs font-semibold text-brand-700">
                                      {requestItem.organization}
                                    </p>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className="min-w-[11rem] font-semibold text-slate-800 break-words">
                                {requestItem.eventName}
                              </TableCell>
                              <TableCell className="min-w-[14rem] text-sm leading-6 text-slate-600">
                                {requestItem.eventPurpose.length > 110
                                  ? `${requestItem.eventPurpose.slice(0, 110)}...`
                                  : requestItem.eventPurpose}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm text-slate-500">
                                {requestItem.expectedEventDate
                                  ? formatAdminDate(requestItem.expectedEventDate)
                                  : "미정"}
                                {requestItem.expectedAttendeeCount ? (
                                  <p className="mt-1 text-xs font-semibold text-brand-700">
                                    예상 {requestItem.expectedAttendeeCount}명
                                  </p>
                                ) : null}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getApplicationStatusClassName(requestItem.status)}`}
                                  >
                                    {getApplicationStatusLabel(requestItem.status)}
                                  </span>
                                  {requestItem.reviewedByName ? (
                                    <p className="text-xs text-slate-400">
                                      {requestItem.reviewedByName}
                                      {requestItem.reviewedAt
                                        ? ` · ${formatAdminDate(requestItem.reviewedAt)}`
                                        : ""}
                                    </p>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className="w-[13rem] text-center">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="min-w-[4.75rem] whitespace-nowrap rounded-full px-4"
                                    disabled={
                                      requestItem.status !== "pending" ||
                                      reviewingApplicationId === requestItem.id
                                    }
                                    onClick={() => void handleReviewApplication(requestItem, "approved")}
                                  >
                                    {reviewingApplicationId === requestItem.id &&
                                    requestItem.status === "pending"
                                      ? "처리 중"
                                      : "승인"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="min-w-[4.75rem] whitespace-nowrap rounded-full px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    disabled={
                                      requestItem.status !== "pending" ||
                                      reviewingApplicationId === requestItem.id
                                    }
                                    onClick={() => void handleReviewApplication(requestItem, "rejected")}
                                  >
                                    반려
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <EmptyPanelState
                    className="min-h-[18rem]"
                    message="아직 접수된 이벤트 관리자 신청이 없습니다."
                  />
                )}
              </>
            ) : null}

            {section === "event-settings" ? (
              eventDetailTab ? (
                selectedEvent ? (
                  <div className="space-y-8">
                    <div className="space-y-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-300">이벤트 관리</p>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50"
                              aria-label="이벤트 목록으로 돌아가기"
                              onClick={goBackToEventList}
                            >
                              <ChevronLeftIcon />
                            </button>
                            <h1 className="text-[2.1rem] font-black tracking-tight text-brand-800">
                              {selectedEvent.name}
                            </h1>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {!canEditSelectedEvent ? (
                            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                              읽기 전용
                            </span>
                          ) : null}
                          <a
                            href={selectedEventHomePath}
                            target="_blank"
                            rel="noreferrer"
                            title={selectedEventHomePath}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-brand-700 bg-white px-5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                          >
                            이벤트 홈
                            <ExternalLinkIcon />
                          </a>
                          <Button
                            variant="destructive"
                            className="rounded-full px-5"
                            disabled={!canEditSelectedEvent || resettingEventId === selectedEvent.id}
                            onClick={() => void handleResetEventData()}
                          >
                            {resettingEventId === selectedEvent.id ? "초기화 중" : "데이터 초기화"}
                          </Button>
                          <Button
                            className="rounded-full px-5"
                            disabled={!canEditSelectedEvent}
                            onClick={() => openEventModal(selectedEvent)}
                          >
                            행사 수정
                          </Button>
                        </div>
                      </div>

                      <div className="border-b border-slate-200">
                        <div className="flex flex-wrap gap-4 sm:gap-12">
                          {EVENT_DETAIL_TABS.map((tabItem) => (
                            <button
                              key={tabItem.key}
                              type="button"
                              className={cn(
                                "border-b-[3px] px-2 pb-5 text-base font-semibold text-slate-400 transition-colors",
                                eventDetailTab === tabItem.key
                                  ? "border-brand-400 text-slate-900"
                                  : "border-transparent hover:text-slate-700"
                              )}
                              onClick={() => goToEventDetail(selectedEvent.id, tabItem.key)}
                            >
                              {tabItem.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {eventDetailTab === "overview" ? (
                      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                        <div className="rounded-[1.5rem] bg-[#f7fbf2] p-6">
                          <div className="mb-6 text-center text-base font-black text-brand-700">
                            행사 정보
                          </div>
                          <div className="flex flex-col gap-5 md:flex-row md:items-center">
                            <div className="shrink-0 rounded-[1.25rem] bg-white px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 max-md:w-full md:w-[8.5rem]">
                              <div className="flex items-center justify-between gap-4 md:flex-col md:justify-center md:gap-3">
                                <div className="flex flex-wrap items-center gap-2 md:justify-center">
                                  <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[0.7rem] font-bold text-slate-500">
                                    {selectedEventDateParts?.yearLabel}
                                  </span>
                                  <span className="whitespace-nowrap rounded-full bg-brand-100 px-2.5 py-1 text-[0.7rem] font-bold text-brand-700">
                                    {selectedEventDateParts?.monthLabel}
                                  </span>
                                </div>
                                <div className="text-right md:text-center">
                                  <div className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                                    {selectedEventDateParts?.day}
                                  </div>
                                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
                                    {selectedEventDateParts?.weekday}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex-1">
                              <p className="text-lg font-semibold text-slate-300">
                                {selectedEventTimeRange}
                              </p>
                              <p className="mt-1 text-[2rem] font-black tracking-tight text-slate-900">
                                {selectedEvent.name}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700">
                                  {selectedEvent.eventTeam}
                                </span>
                                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-600">
                                  {selectedEvent.location}
                                </span>
                              </div>
                            </div>

                            <div className="self-start md:self-center">
                              <EventStatusBadge status={selectedEvent.status} />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] bg-[#f7fbf2] p-6">
                          <div className="mb-6 flex items-center justify-center gap-3 text-base font-black text-brand-700">
                            <span>빙고 정보</span>
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-brand-700">
                              {selectedEvent.boardSize}X{selectedEvent.boardSize}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {selectedEvent.keywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-xl bg-brand-100 px-4 py-2 text-base font-semibold text-brand-700"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {eventDetailTab === "dashboard" ? (
                      selectedEventInsights ? (
                      <div className="space-y-7">
                        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                          {[
                            {
                              label: "참여자 수",
                              value: selectedEvent.participantCount.toLocaleString("en-US"),
                              unit: "명",
                            },
                            {
                              label: "총 키워드 교환 횟수",
                              value: selectedEventInsights.totalKeywordSelections.toLocaleString("en-US"),
                              unit: "회",
                            },
                            {
                              label: "리뷰 참여자",
                              value: selectedEventInsights.reviewParticipants.toLocaleString("en-US"),
                              unit: "명",
                            },
                            {
                              label: "리뷰 평균 점수",
                              value: selectedEventInsights.averageReviewScore.toFixed(1),
                              unit: "/5",
                            },
                            {
                              label: "리뷰 참여율",
                              value: selectedEventInsights.participationRate.toFixed(1),
                              unit: "%",
                            },
                            {
                              label: "운영 시간",
                              value: formatDurationLabel(selectedEventInsights.operatingMinutes),
                            },
                          ].map((metricItem) => (
                            <div
                              key={metricItem.label}
                              className="rounded-[1.5rem] bg-[#f7fbf2] px-6 py-7"
                            >
                              <p className="text-sm font-black text-brand-700">
                                {metricItem.label}
                              </p>
                              <div className="mt-8 flex items-end gap-2">
                                <span className="text-[2.2rem] font-black tracking-tight text-slate-900">
                                  {metricItem.value}
                                </span>
                                {metricItem.unit ? (
                                  <span className="pb-1 text-xl font-black text-brand-700">
                                    {metricItem.unit}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <div className="flex h-[24rem] flex-col rounded-[1.6rem] bg-[#f7fbf2] p-6">
                            <div className="text-center text-base font-black text-brand-700">
                              빙고 정보
                            </div>
                            <div className="mt-7 grid grid-cols-[1.2fr_0.8fr_0.7fr] gap-x-4 border-b border-white/80 pb-3">
                              <p className="text-lg font-black text-brand-700">달성 줄 수</p>
                              <p className="text-lg font-black text-brand-700">인원 수</p>
                              <p className="text-lg font-black text-brand-700">비율</p>
                            </div>
                            {selectedEventInsights.bingoRows.length > 0 ? (
                              <div className="-mr-2 mt-4 flex-1 overflow-y-auto pr-4 [scrollbar-gutter:stable_both-edges]">
                                <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr] gap-x-4 gap-y-4 pb-1">
                                  {selectedEventInsights.bingoRows.map((bingoRow) => (
                                    <Fragment key={bingoRow.lineLabel}>
                                      <div className="flex items-center gap-3 text-base leading-6 text-slate-600">
                                        <span>{bingoRow.lineLabel}</span>
                                        {bingoRow.isComplete ? (
                                          <span className="rounded-full bg-brand-300 px-3 py-1 text-xs font-bold text-white">
                                            빙고 완성
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="text-base text-slate-600">
                                        {bingoRow.count.toLocaleString("en-US")}명
                                      </p>
                                      <p className="text-base text-slate-600">{bingoRow.rate}%</p>
                                    </Fragment>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <EmptyPanelState
                                className="mt-4 flex-1"
                                message="아직 집계된 빙고 데이터가 없습니다."
                              />
                            )}
                          </div>

                          <div className="flex h-[24rem] flex-col rounded-[1.6rem] bg-[#f7fbf2] p-6">
                            <div className="text-center text-base font-black text-brand-700">
                              키워드 별 선택 횟수
                            </div>
                            <div className="mt-7 grid grid-cols-[0.6fr_1.5fr_1fr] gap-x-4 border-b border-white/80 pb-3">
                              <p className="text-lg font-black text-brand-700">순위</p>
                              <p className="text-lg font-black text-brand-700">키워드</p>
                              <p className="text-lg font-black text-brand-700">선택한 사람 수</p>
                            </div>
                            {selectedEventInsights.keywordRows.length > 0 ? (
                              <div className="-mr-2 mt-4 flex-1 overflow-y-auto pr-4 [scrollbar-gutter:stable_both-edges]">
                                <div className="grid grid-cols-[0.6fr_1.5fr_1fr] gap-x-4 gap-y-4 pb-1">
                                  {selectedEventInsights.keywordRows.map((keywordRow) => (
                                    <Fragment key={keywordRow.keyword}>
                                      <p className="text-base text-slate-600">
                                        {keywordRow.rank}
                                      </p>
                                      <p className="break-words text-base leading-6 text-slate-600">
                                        {keywordRow.keyword}
                                      </p>
                                      <p className="text-base text-slate-600">
                                        {keywordRow.count.toLocaleString("en-US")}명
                                      </p>
                                    </Fragment>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <EmptyPanelState
                                className="mt-4 flex-1"
                                message="아직 집계된 키워드 데이터가 없습니다."
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      ) : (
                        <div className="flex min-h-[20rem] items-center justify-center rounded-[1.6rem] bg-[#f7fbf2] text-base font-semibold text-slate-400">
                          {isDetailLoading ? "이벤트 데이터를 불러오는 중입니다." : "표시할 대시보드 데이터가 없습니다."}
                        </div>
                      )
                    ) : null}

                    {eventDetailTab === "participants" ? (
                      selectedEventInsights ? (
                      <div className="space-y-6">
                        <div className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-[#fbfcf8]">
                          <div className="overflow-x-auto">
                            <Table className="min-w-[980px]">
                              <TableHeader className="bg-[#f6f8ef]">
                                <TableRow className="border-none hover:bg-transparent">
                                  <TableHead>이름</TableHead>
                                  <TableHead>유저코드</TableHead>
                                  <TableHead>상태</TableHead>
                                  <TableHead>키워드</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {visibleParticipants.map((participant) => (
                                  <TableRow key={participant.id}>
                                    <TableCell className="text-[1.65rem] font-black tracking-tight text-slate-900">
                                      {participant.name}
                                    </TableCell>
                                    <TableCell className="text-[1.05rem] text-slate-800">
                                      {participant.userCode}
                                    </TableCell>
                                    <TableCell className="min-w-[24rem]">
                                      <div className="flex items-center gap-3">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                          <div
                                            className="h-full rounded-full bg-brand-500"
                                            style={{ width: `${participant.progressPercent}%` }}
                                          />
                                        </div>
                                        <span className="text-[1.05rem] font-semibold text-slate-900">
                                          {participant.progressPercent}%
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-3">
                                        {participant.keywords.length > 0 ? (
                                          participant.keywords.map((keyword) => (
                                            <span
                                              key={`${participant.id}-${keyword}`}
                                              className="rounded-xl bg-brand-100 px-4 py-2 text-base font-semibold text-brand-700"
                                            >
                                              {keyword}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                                            키워드 선택 전
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-1 text-slate-400">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30"
                            disabled={participantPage === 1}
                            onClick={() =>
                              setParticipantPage((previousValue) => Math.max(1, previousValue - 1))
                            }
                          >
                            <ChevronLeftIcon />
                          </button>

                          {Array.from(
                            { length: participantTotalPages },
                            (_, index) => index + 1
                          ).map((pageNumber) => (
                            <button
                              key={pageNumber}
                              type="button"
                              className={cn(
                                "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-brand-50 hover:text-brand-600",
                                participantPage === pageNumber &&
                                  "bg-brand-100 font-bold text-brand-700"
                              )}
                              onClick={() => setParticipantPage(pageNumber)}
                            >
                              {pageNumber}
                            </button>
                          ))}

                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30"
                            disabled={participantPage === participantTotalPages}
                            onClick={() =>
                              setParticipantPage((previousValue) =>
                                Math.min(participantTotalPages, previousValue + 1)
                              )
                            }
                          >
                            <ChevronRightIcon />
                          </button>
                        </div>
                      </div>
                      ) : (
                        <div className="flex min-h-[20rem] items-center justify-center rounded-[1.6rem] bg-[#f7fbf2] text-base font-semibold text-slate-400">
                          {isDetailLoading ? "참가자 목록을 불러오는 중입니다." : "표시할 참가자 데이터가 없습니다."}
                        </div>
                      )
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-h-[28rem] items-center justify-center">
                    <div className="space-y-4 text-center">
                      <p className="text-2xl font-black tracking-tight text-slate-900">
                        {isDetailLoading ? "이벤트를 불러오는 중입니다." : "선택한 이벤트를 찾을 수 없습니다."}
                      </p>
                      {!isDetailLoading ? (
                        <p className="text-sm text-slate-500">
                          목록으로 돌아가 다시 선택해 주세요.
                        </p>
                      ) : null}
                      <Button className="rounded-full px-5" onClick={goBackToEventList}>
                        이벤트 목록으로 이동
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <h1 className="text-3xl font-black tracking-tight text-brand-800">
                      이벤트 관리
                    </h1>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative w-full sm:w-[19rem]">
                        <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={eventSearchQuery}
                          onChange={(event) => setEventSearchQuery(event.target.value)}
                          placeholder="Search"
                          className="h-10 rounded-2xl border-0 bg-slate-100 pl-11 shadow-none"
                        />
                      </div>

                      <Button
                        className="rounded-full bg-brand-700 px-5 hover:bg-brand-800"
                        onClick={() => openEventModal()}
                      >
                        새 행사 등록
                        <PlusIcon />
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-[#fbfcf8]">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[920px]">
                        <TableHeader className="bg-[#f6f8ef]">
                          <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="w-[6rem]">번호</TableHead>
                            <TableHead>행사명</TableHead>
                            <TableHead>날짜</TableHead>
                            <TableHead>참여자수</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead>진행도</TableHead>
                            <TableHead className="w-[4rem]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleEvents.map((eventItem, index) => (
                            <TableRow
                              key={eventItem.id}
                              className="cursor-pointer"
                              onClick={() => goToEventDetail(eventItem.id)}
                            >
                              <TableCell className="font-bold text-slate-900">
                                {(eventPage - 1) * ITEMS_PER_PAGE + index + 1}
                              </TableCell>
                              <TableCell className="font-semibold text-slate-800">
                                <div className="space-y-2">
                                  <p>{eventItem.name}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-500">
                                      /{eventItem.slug}
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded-full px-2.5 py-1 font-semibold",
                                        eventItem.canEdit
                                          ? "bg-brand-100 text-brand-700"
                                          : "bg-slate-100 text-slate-500"
                                      )}
                                    >
                                      {eventItem.canEdit
                                        ? "수정 가능"
                                        : "읽기 전용"}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-700">
                                  {formatEventRowDate(eventItem.startAt)}
                                </span>
                              </TableCell>
                              <TableCell className="text-lg font-medium text-slate-800">
                                {eventItem.participantCount}
                              </TableCell>
                              <TableCell>
                                <EventStatusBadge status={eventItem.status} />
                              </TableCell>
                              <TableCell className="min-w-[20rem]">
                                <EventProgress
                                  current={eventItem.progressCurrent}
                                  total={eventItem.progressTotal}
                                />
                              </TableCell>
                              <TableCell>
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-500 hover:bg-brand-50"
                                  aria-label={`${eventItem.name} 상세 보기`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    goToEventDetail(eventItem.id);
                                  }}
                                >
                                  <ChevronRightIcon />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1 text-slate-400">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30"
                      disabled={eventPage === 1}
                      onClick={() =>
                        setEventPage((previousValue) => Math.max(1, previousValue - 1))
                      }
                    >
                      <ChevronLeftIcon />
                    </button>

                    {Array.from({ length: eventTotalPages }, (_, index) => index + 1).map(
                      (pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-brand-50 hover:text-brand-600",
                            eventPage === pageNumber && "bg-brand-100 font-bold text-brand-700"
                          )}
                          onClick={() => setEventPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30"
                      disabled={eventPage === eventTotalPages}
                      onClick={() =>
                        setEventPage((previousValue) =>
                          Math.min(eventTotalPages, previousValue + 1)
                        )
                      }
                    >
                      <ChevronRightIcon />
                    </button>
                  </div>
                </>
              )
            ) : null}

            {section === "policies" ? (
              <>
                <SectionHeader
                  title="이용약관 및 개인정보"
                  description="서비스 홈 동의 팝업과 같은 원본 템플릿을 이 화면에서 확인하고, Admin만 수정할 수 있습니다."
                  action={
                    canEditPolicyTemplate ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          variant="outline"
                          className="rounded-full px-5"
                          disabled={!hasPolicyChanges || isPolicySaving}
                          onClick={handleResetPolicyDraft}
                        >
                          되돌리기
                        </Button>
                        <Button
                          className="rounded-full px-5"
                          disabled={!hasPolicyChanges || isPolicySaving}
                          onClick={() => void handleSavePolicyTemplate()}
                        >
                          {isPolicySaving ? "저장 중" : "템플릿 저장"}
                        </Button>
                      </div>
                    ) : (
                      <span className="self-start rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500 md:self-auto">
                        조회 전용
                      </span>
                    )
                  }
                />

                {policyError ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                    {policyError}
                  </div>
                ) : null}
                {policyNotice ? (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">
                    {policyNotice}
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)] xl:min-h-[calc(100vh-16rem)]">
                  <Card className="overflow-hidden rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none">
                    <CardHeader className="space-y-2 p-7 pb-0">
                      <CardTitle>템플릿 안내</CardTitle>
                      <CardDescription>저장 즉시 서비스 홈 동의 팝업에도 같은 원본이 반영됩니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 p-7 pt-6">
                      <div className="rounded-[1.35rem] border border-white/90 bg-white/90 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          적용 위치
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                          서비스 홈 로그인 전 동의 팝업
                        </p>
                      </div>
                      <div className="rounded-[1.35rem] border border-white/90 bg-white/90 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          수정 권한
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                          Admin만 수정할 수 있고, Event Manager는 같은 문안을 읽기 전용으로 확인합니다.
                        </p>
                      </div>
                      <div className="rounded-[1.35rem] border border-white/90 bg-white/90 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          치환 변수
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                            {"{host}"}
                          </code>
                          와
                          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                            {"{eventTeam}"}
                          </code>
                          는 실제 행사 팀명으로 치환됩니다.
                        </p>
                      </div>
                      <div className="rounded-[1.35rem] border border-white/90 bg-white/90 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          마지막 수정
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                          {policyTemplate
                            ? `${policyTemplate.updatedByName ?? "시스템 기본값"} · ${formatAdminDate(
                                policyTemplate.updatedAt
                              )}`
                            : "아직 불러오지 않았습니다."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid min-h-0 gap-4">
                    {canEditPolicyTemplate ? (
                      <Card className="overflow-hidden rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none">
                        <CardHeader className="space-y-2 p-7 pb-0">
                          <CardTitle>템플릿 편집</CardTitle>
                          <CardDescription>마크다운 원문을 저장하면 홈 동의 팝업도 같은 문안을 사용합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-7 pt-6">
                          {isPolicyLoading ? (
                            <EmptyPanelState
                              className="min-h-[16rem]"
                              message="이용약관 및 개인정보 템플릿을 불러오는 중입니다."
                            />
                          ) : (
                            <div className="space-y-3">
                              <Label htmlFor="policy-template-editor">마크다운 원문</Label>
                              <Textarea
                                id="policy-template-editor"
                                value={policyDraft}
                                onChange={(event) => {
                                  setPolicyDraft(event.target.value);
                                  if (policyNotice) {
                                    setPolicyNotice("");
                                  }
                                }}
                                className="min-h-[20rem] rounded-[1.25rem] border-white/90 bg-white/90 font-mono text-xs leading-6 shadow-none"
                                placeholder="# [필수] 개인정보 수집 및 이용 동의서"
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : null}

                    <Card className="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none">
                      <CardHeader className="space-y-2 p-7 pb-0">
                        <CardTitle>미리보기</CardTitle>
                        <CardDescription>
                          치환 변수는 미리보기에서 `{POLICY_PREVIEW_HOST}` 기준으로 표시됩니다.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex min-h-0 flex-1 flex-col p-7 pt-6">
                        {isPolicyLoading ? (
                          <EmptyPanelState
                            className="min-h-[24rem]"
                            message="이용약관 및 개인정보 템플릿을 불러오는 중입니다."
                          />
                        ) : policyDraft ? (
                          <div className="min-h-0 flex-1 overflow-y-auto rounded-[1.5rem] border border-white/90 bg-white/90 p-6 pr-7 md:p-8 md:pr-9 [scrollbar-gutter:stable_both-edges]">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => (
                                  <h1 className="mb-6 text-3xl font-black tracking-tight text-brand-800">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="mb-4 mt-10 text-xl font-black text-slate-900">{children}</h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="mb-3 mt-7 text-lg font-bold text-slate-900">{children}</h3>
                                ),
                                p: ({ children }) => (
                                  <p className="mb-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                    {children}
                                  </p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="mb-5 list-disc space-y-3 pl-5 text-sm leading-7 text-slate-600">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="mb-5 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-600">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => <li className="pl-1">{children}</li>,
                                strong: ({ children }) => (
                                  <strong className="font-bold text-slate-900">{children}</strong>
                                ),
                              }}
                            >
                              {policyPreviewContent}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <EmptyPanelState
                            className="min-h-[24rem]"
                            message="아직 표시할 템플릿 내용이 없습니다."
                          />
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            ) : null}
            </div>
          </CardContent>
        </Card>
      </main>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 p-4 sm:p-6">
          <div className="mx-auto my-4 flex max-h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-soft sm:my-6 sm:max-h-[calc(100dvh-5rem)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-brand-800">관리자 추가</h2>
                <p className="mt-2 text-sm text-slate-500">
                  기본 데모 비밀번호는 `{DEFAULT_MEMBER_PASSWORD}` 입니다.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  setShowAddModal(false);
                  setAddFormError("");
                }}
              >
                <CloseIcon />
              </Button>
            </div>

            <form className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleCreateAdmin}>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-4 [scrollbar-gutter:stable_both-edges]">
                <div className="space-y-2">
                  <Label htmlFor="new-admin-email">이메일</Label>
                  <Input
                    id="new-admin-email"
                    type="email"
                    value={newAdminForm.email}
                    onChange={(event) =>
                      setNewAdminForm((previousValue) => ({
                        ...previousValue,
                        email: event.target.value,
                      }))
                    }
                    placeholder="abcd@gmail.com"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-admin-password">비밀번호</Label>
                    <div className="relative">
                      <Input
                        id="new-admin-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newAdminForm.password}
                        onChange={(event) =>
                          setNewAdminForm((previousValue) => ({
                            ...previousValue,
                            password: event.target.value,
                          }))
                        }
                        placeholder="영어 대문자 포함 8자 이상"
                        className="pr-12"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label={showNewPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                        onClick={() => setShowNewPassword((previousValue) => !previousValue)}
                      >
                        {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-admin-password-confirm">비밀번호 확인</Label>
                    <div className="relative">
                      <Input
                        id="new-admin-password-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        value={newAdminForm.confirmPassword}
                        onChange={(event) =>
                          setNewAdminForm((previousValue) => ({
                            ...previousValue,
                            confirmPassword: event.target.value,
                          }))
                        }
                        placeholder="영어 대문자 포함 8자 이상"
                        className="pr-12"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                        onClick={() => setShowConfirmPassword((previousValue) => !previousValue)}
                      >
                        {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-admin-name">이름</Label>
                  <Input
                    id="new-admin-name"
                    value={newAdminForm.name}
                    onChange={(event) =>
                      setNewAdminForm((previousValue) => ({
                        ...previousValue,
                        name: event.target.value,
                      }))
                    }
                    placeholder="김철수"
                  />
                </div>

                <div className="space-y-2">
                  <Label>권한</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ["admin", "Admin"],
                      ["event_manager", "Event manager"],
                    ] as const).map(([value, label]) => (
                      <Button
                        key={value}
                        variant={newAdminForm.role === value ? "outline" : "secondary"}
                        className={cn(
                          "rounded-2xl border-brand-600 bg-white text-base text-brand-700 hover:bg-brand-50",
                          newAdminForm.role !== value &&
                            "border-transparent bg-brand-50 text-slate-500 hover:bg-brand-100"
                        )}
                        onClick={() =>
                          setNewAdminForm((previousValue) => ({
                            ...previousValue,
                            role: value,
                          }))
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 shrink-0 space-y-4 border-t border-slate-100 pt-4">
                {addFormError ? <p className="text-sm font-semibold text-rose-600">{addFormError}</p> : null}

                <Button type="submit" className="w-full rounded-xl">
                  확인
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showEventModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 p-4 sm:p-6">
          <div className="mx-auto my-5 flex max-h-[calc(100dvh-7rem)] w-full max-w-[38rem] flex-col overflow-hidden rounded-[1.5rem] bg-white p-5 shadow-soft sm:my-7 sm:max-h-[calc(100dvh-8rem)] sm:p-[1.375rem]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[2rem] font-black tracking-tight text-brand-800">
                  {eventForm.id ? "이벤트 수정" : "새 이벤트 등록"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  행사명, 위치, 시간, Event team, 키워드를 행사별로 설정할 수 있습니다.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  setShowEventModal(false);
                  setEventFormError("");
                  setSlugAssistMessage("");
                  setSlugAssistTone("info");
                }}
              >
                <CloseIcon />
              </Button>
            </div>

            <form className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSaveEvent}>
              <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-4 [scrollbar-gutter:stable_both-edges]">
                <div className="space-y-2">
                  <Label htmlFor="event-modal-name">행사 이름</Label>
                  <Input
                    id="event-modal-name"
                    value={eventForm.name}
                    onChange={(event) => handleEventNameChange(event.target.value)}
                    placeholder="행사이름을 적어주세요."
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="event-modal-team">Event team</Label>
                    <Input
                      id="event-modal-team"
                      value={eventForm.eventTeam}
                      onChange={(event) =>
                        setEventForm((previousValue) => ({
                          ...previousValue,
                          eventTeam: event.target.value,
                        }))
                      }
                      placeholder="PseudoLab"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-modal-location">행사 위치</Label>
                    <Input
                      id="event-modal-location"
                      value={eventForm.location}
                      onChange={(event) =>
                        setEventForm((previousValue) => ({
                          ...previousValue,
                          location: event.target.value,
                        }))
                      }
                      placeholder="서울 성수 XYZ홀"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="event-modal-slug">slug</Label>
                    {eventForm.isPublished ? (
                      <span className="text-xs font-semibold text-slate-400">
                        공개 후 잠금
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand-700"
                        onClick={handleRegenerateEventSlug}
                      >
                        행사명 기준으로 다시 생성
                      </button>
                    )}
                  </div>
                  <Input
                    id="event-modal-slug"
                    value={eventForm.slug}
                    onChange={(event) => handleEventSlugChange(event.target.value)}
                    placeholder="festival-networking-2026"
                    disabled={eventForm.isPublished}
                    className="h-12 rounded-xl font-mono"
                  />
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400">
                      한글, 영문 소문자, 숫자, 하이픈(-)만 사용합니다.
                    </p>
                    <p className="text-slate-400">
                      입력 중 하이픈은 유지되고, 저장 시 앞뒤 하이픈은 자동으로 정리됩니다.
                    </p>
                    {slugAssistMessage ? (
                      <p
                        className={cn(
                          "font-semibold",
                          slugAssistTone === "error" ? "text-rose-500" : "text-brand-700"
                        )}
                      >
                        {slugAssistMessage}
                      </p>
                    ) : (
                      <p className="text-slate-400">
                        행사명 기준 자동 생성은 가능하면 영문 slug를 추천합니다.
                      </p>
                    )}
                    <p className="font-semibold text-brand-700">
                      공개 URL: {slugPreview ? getEventHomePath(slugPreview) : "/{slug}"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>공개 상태</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      [false, "Draft"],
                      [true, "Published"],
                    ] as const).map(([value, label]) => (
                      <Button
                        key={label}
                        disabled={eventForm.wasPublished && !value}
                        variant={eventForm.isPublished === value ? "outline" : "secondary"}
                        className={cn(
                          "h-12 rounded-xl border-brand-600 bg-white text-base font-semibold text-slate-700 hover:bg-brand-50",
                          eventForm.isPublished !== value &&
                            "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                        )}
                        onClick={() =>
                          setEventForm((previousValue) => ({
                            ...previousValue,
                            isPublished: value,
                          }))
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <span className="mt-0.5 shrink-0">
                      <InfoIcon />
                    </span>
                    <p className="font-semibold leading-5">
                      {eventForm.wasPublished
                        ? "한 번 Published로 저장된 이벤트는 Draft로 되돌릴 수 없고 slug도 변경할 수 없습니다."
                        : "Published로 저장하면 slug가 즉시 고정되며, 이후에는 Draft로 되돌리거나 slug를 변경할 수 없습니다."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr_0.9fr]">
                  <div className="space-y-2">
                    <Label htmlFor="event-modal-date">날짜</Label>
                    <div className="relative">
                      <Input
                        id="event-modal-date"
                        type="date"
                        value={eventForm.date}
                        onChange={(event) =>
                          setEventForm((previousValue) => ({
                            ...previousValue,
                            date: event.target.value,
                          }))
                        }
                        className="h-12 rounded-xl pr-11"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-700">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-modal-start-time">시작 시간</Label>
                    <Input
                      id="event-modal-start-time"
                      type="time"
                      value={eventForm.startTime}
                      onChange={(event) =>
                        setEventForm((previousValue) => ({
                          ...previousValue,
                          startTime: event.target.value,
                        }))
                      }
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-modal-end-time">종료 시간</Label>
                    <Input
                      id="event-modal-end-time"
                      type="time"
                      value={eventForm.endTime}
                      onChange={(event) =>
                        setEventForm((previousValue) => ({
                          ...previousValue,
                          endTime: event.target.value,
                        }))
                      }
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>빙고 크기</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["3", "5"] as const).map((size) => (
                      <Button
                        key={size}
                        variant={eventForm.boardSize === size ? "outline" : "secondary"}
                        className={cn(
                          "h-12 rounded-xl border-brand-600 bg-white text-base font-semibold text-slate-700 hover:bg-brand-50",
                          eventForm.boardSize !== size &&
                            "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                        )}
                        onClick={() =>
                          setEventForm((previousValue) => {
                            const nextGoal =
                              size === "3" ? "3" : previousValue.bingoMissionCount;

                            return {
                              ...previousValue,
                              boardSize: size,
                              bingoMissionCount:
                                Number(nextGoal) > Number(size) ? size : nextGoal,
                              keywords: clampKeywordList(previousValue.keywords, size),
                            };
                          })
                        }
                      >
                        {size}X{size}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="event-modal-bingo-mission">
                      성공 조건(완성해야하는 빙고 수)
                    </Label>
                    <span className="text-brand-700">
                      <InfoIcon />
                    </span>
                  </div>
                  <Input
                    id="event-modal-bingo-mission"
                    type="number"
                    min="1"
                    max={eventForm.boardSize}
                    value={eventForm.bingoMissionCount}
                    onChange={(event) =>
                      setEventForm((previousValue) => ({
                        ...previousValue,
                        bingoMissionCount: event.target.value,
                      }))
                    }
                    placeholder="4줄"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Label>키워드 관리</Label>
                      <p className="mt-1 text-xs text-brand-700">
                        현재 키워드: {keywordAutofillSummary.currentCount}개, 필요 키워드 {keywordAutofillSummary.goalCount}개
                      </p>
                      {keywordAutofillSummary.missingCount > 0 ? (
                        <p className="mt-1 text-xs text-amber-700">
                          저장 시 부족한 {keywordAutofillSummary.missingCount}개는 &quot;
                          {keywordAutofillSummary.generatedKeywords[0]}&quot;부터 자동으로 채워집니다.
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-emerald-700">
                          저장 시 현재 키워드 목록이 그대로 사용됩니다.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 rounded-md bg-brand-100 px-3 text-[0.72rem] font-bold text-brand-800 hover:bg-brand-200"
                        onClick={() => {
                          const sourceEvent = events.find((eventItem) => eventItem.id !== eventForm.id);
                          if (!sourceEvent) {
                            return;
                          }

                          setEventForm((previousValue) => ({
                            ...previousValue,
                            keywords: clampKeywordList(sourceEvent.keywords, previousValue.boardSize),
                          }));
                        }}
                      >
                        + 기존 행사에서 가져오기
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 rounded-md bg-brand-700 px-3 text-[0.72rem] font-bold hover:bg-brand-800"
                        onClick={() =>
                          setEventForm((previousValue) => ({
                            ...previousValue,
                            keywords: [],
                            keywordDraft: "",
                          }))
                        }
                      >
                        전체 삭제
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {eventForm.keywords.map((keyword) => (
                        <button
                          key={keyword}
                          type="button"
                          className="rounded-md bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700"
                          onClick={() =>
                            setEventForm((previousValue) => ({
                              ...previousValue,
                              keywords: previousValue.keywords.filter((item) => item !== keyword),
                            }))
                          }
                        >
                          {keyword}
                        </button>
                      ))}

                      <input
                        aria-label="행사 키워드 입력"
                        value={eventForm.keywordDraft}
                        onChange={(event) =>
                          setEventForm((previousValue) => ({
                            ...previousValue,
                            keywordDraft: event.target.value,
                          }))
                        }
                        onBlur={() => addKeyword(eventForm.keywordDraft)}
                        onKeyDown={handleKeywordDraftKeyDown}
                        placeholder={eventForm.keywords.length === 0 ? "키워드를 입력하고 Enter를 누르세요." : ""}
                        className="min-w-[10rem] flex-1 border-0 bg-transparent px-2 py-1 text-sm text-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  {keywordAutofillSummary.missingCount > 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                        Auto-Filled Preview
                      </p>
                      <p className="mt-1 text-xs text-amber-800">
                        확인을 누르면 아래 placeholder 키워드가 함께 저장됩니다.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {keywordAutofillSummary.generatedKeywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-md border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-modal-email">관리자 이메일</Label>
                  <Input
                    id="event-modal-email"
                    type="email"
                    value={eventForm.adminEmail}
                    onChange={(event) =>
                      setEventForm((previousValue) => ({
                        ...previousValue,
                        adminEmail: event.target.value,
                      }))
                    }
                    placeholder="abcde@gmail.com"
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="mt-4 shrink-0 space-y-3 border-t border-slate-100 pt-4">
                {eventFormError ? (
                  <p className="text-sm font-semibold text-rose-600">{eventFormError}</p>
                ) : null}

                <Button type="submit" className="h-12 w-full rounded-xl text-lg font-bold">
                  확인
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const AdminRoutesLoginPage = LoginPage;
export const AdminDashboardPage = () => <AdminConsolePage section="dashboard" />;
export const AdminMembersPage = () => <AdminConsolePage section="members" />;
export const AdminApplicationsPage = () => <AdminConsolePage section="applications" />;
export const AdminEventSettingsPage = () => <AdminConsolePage section="event-settings" />;
export const AdminEventOverviewPage = () => (
  <AdminConsolePage section="event-settings" eventDetailTab="overview" />
);
export const AdminEventDashboardPage = () => (
  <AdminConsolePage section="event-settings" eventDetailTab="dashboard" />
);
export const AdminEventParticipantsPage = () => (
  <AdminConsolePage section="event-settings" eventDetailTab="participants" />
);
export const AdminPoliciesPage = () => <AdminConsolePage section="policies" />;

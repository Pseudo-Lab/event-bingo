import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import QRCode from "qrcode";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AdminApiError,
  createAdminEvent,
  createAdminMember,
  deleteAdminEvent,
  deleteAdminMember,
  getAdminEventDetail,
  getAdminEventManagerRequests,
  getAdminEvents,
  getAdminMe,
  getAdminMembers,
  getAdminPolicyTemplate,
  resetAdminEventData,
  reviewAdminEventManagerRequest,
  updateAdminPolicyTemplate,
  updateAdminEvent,
} from "../../api/admin_api";
import {
  getAdminPath,
  getEventHomePath,
} from "../../config/eventProfiles";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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
import {
  clearAdminSession,
  getAdminSession,
  setAdminSession,
} from "../../utils/adminSession";
import { clearLegacyLocalLoginStorage } from "../../utils/legacyAuthStorage";
import adminLoginLogo from "../../assets/brand/admin-logo-login.svg";
import adminSidebarLogo from "../../assets/brand/admin-logo-sidebar.svg";
import type {
  AdminEventManagerRequest,
  AdminEvent,
  AdminEventManagerRequestReviewResult,
  AdminEventParticipant,
  AdminEventStatus,
  AdminMember,
  AdminPolicyTemplate,
  AdminPolicyTemplateKey,
  AdminRole,
  AdminSession,
} from "./adminTypes";
import {
  normalizeAdminEventId,
  shouldLoadAdminApplications,
  shouldLoadAdminEvents,
  shouldLoadAdminMembers,
  shouldLoadAdminPolicyTemplates,
  type AdminConsoleSection,
} from "./adminConsoleLoaders";
import { getEventDateParts, getEventTimeRangeLabel } from "./adminEventDate";
import {
  ADMIN_DASHBOARD_STATUS_FILTERS,
  buildAdminDashboardSummary,
  filterAdminDashboardEventsByStatus,
  sortAdminDashboardEventsByRecency,
  type AdminDashboardStatusFilter,
} from "./adminDashboardUtils";
import {
  sortBingoRows,
  sortKeywordRows,
  type BingoSortKey,
  type KeywordSortKey,
  type SortDirection,
  type SortState,
} from "./adminDetailSortUtils";
import {
  buildAutoFilledKeywordList,
  buildEventKeywordPresetKeywords,
  clampKeywordList,
  describeKeywordAutofill,
  getEventKeywordPresetDefinitions,
  type EventKeywordPresetId,
} from "./adminKeywordUtils";
import { interpolateConsentTemplate } from "../../utils/consentTemplate";

type AdminSection = AdminConsoleSection;
type EventDetailTab = "overview" | "dashboard" | "participants" | "share";
type AdminLayoutVariant = "before" | "after";
type ParticipantSortKey = "name" | "email" | "progress" | "keywords";

type EventFormState = {
  id?: number;
  name: string;
  location: string;
  eventTeam: string;
  boardSize: "3" | "4" | "5";
  bingoMissionCount: string;
  keywords: string[];
  keywordDraft: string;
  date: string;
  startTime: string;
  endTime: string;
  adminEmail: string;
  expectedAttendeeCount: string;
  restrictBeforeStart: boolean;
  participantCount: string;
  progressCurrent: string;
  progressTotal: string;
  canEdit: boolean;
};

const ITEMS_PER_PAGE = 4;
const DETAIL_PARTICIPANTS_PER_PAGE = 8;
const POLICY_PREVIEW_HOST = "샘플 행사 운영팀";
const POLICY_PREVIEW_CONTACT_EMAIL = "event-team@example.com";
const POLICY_PREVIEW_PLATFORM_HOST = "DevFactory 서비스 운영팀";
const ADMIN_MOBILE_NOTICE_STORAGE_KEY = "bingo_admin_mobile_notice_dismissed";
const POLICY_TEMPLATE_OPTIONS: Array<{
  key: AdminPolicyTemplateKey;
  label: string;
  description: string;
}> = [
  {
    key: "consent_markdown",
    label: "행사 참가자 안내",
    description:
      "행사 로그인 전 모달과 /event/:slug/privacy 페이지에 노출됩니다.",
  },
];
const POLICY_PREVIEW_VARIABLES: Record<
  AdminPolicyTemplateKey,
  Record<string, string>
> = {
  consent_markdown: {
    eventName: "샘플 네트워킹 데이",
    eventTeam: POLICY_PREVIEW_HOST,
    host: POLICY_PREVIEW_HOST,
    eventContactEmail: POLICY_PREVIEW_CONTACT_EMAIL,
    platformHost: POLICY_PREVIEW_PLATFORM_HOST,
    platformPrivacyPath: "/privacy",
  },
};
const EVENT_DETAIL_TABS: Array<{ key: EventDetailTab; label: string }> = [
  { key: "overview", label: "개요" },
  { key: "dashboard", label: "대시보드" },
  { key: "participants", label: "참가자" },
  { key: "share", label: "공유" },
];
const canUseGoogleAdminAuth = () => isSupabaseConfigured();
const getAdminOAuthRedirectUrl = () => {
  if (typeof window === "undefined") {
    return getAdminPath();
  }

  return new URL(getAdminPath(), window.location.origin).toString();
};

const getAbsolutePublicUrl = (path: string) => {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
};

const shouldShowAdminMobileNotice = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const isNarrowViewport = window.matchMedia("(max-width: 1279px)").matches;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const cannotHover = window.matchMedia("(hover: none)").matches;
  const hasTouchPoints = window.navigator.maxTouchPoints > 0;

  return (
    isNarrowViewport &&
    (isCoarsePointer || cannotHover || hasTouchPoints) &&
    window.sessionStorage.getItem(ADMIN_MOBILE_NOTICE_STORAGE_KEY) !== "true"
  );
};
const EVENT_KEYWORD_PRESET_OPTIONS = getEventKeywordPresetDefinitions();

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

const getApplicationStatusLabel = (
  status: AdminEventManagerRequest["status"],
) => {
  if (status === "approved") {
    return "승인";
  }
  if (status === "rejected") {
    return "반려";
  }
  return "대기";
};

const getApplicationStatusClassName = (
  status: AdminEventManagerRequest["status"],
) => {
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
      return rightTime - leftTime;
    }
    return left.name.localeCompare(right.name, "ko-KR");
  });
};

const upsertAdminEvent = (items: AdminEvent[], nextItem: AdminEvent) => {
  return sortAdminEvents([
    ...items.filter((item) => item.id !== nextItem.id),
    nextItem,
  ]);
};

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "ko-KR", { numeric: true, sensitivity: "base" });

const applySortDirection = (result: number, direction: SortDirection) =>
  direction === "asc" ? result : -result;

const getDefaultSortDirection = (key: string): SortDirection =>
  ["keyword", "name", "email"].includes(key) ? "asc" : "desc";

const getNextSortDirection = <Key extends string>(
  previousValue: SortState<Key>,
  key: Key,
): SortDirection =>
  previousValue.key === key
    ? previousValue.direction === "desc"
      ? "asc"
      : "desc"
    : getDefaultSortDirection(key);

const sortParticipants = (
  participants: AdminEventParticipant[],
  sortState: SortState<ParticipantSortKey>,
) => {
  return [...participants].sort((left, right) => {
    let result = 0;
    if (sortState.key === "name") {
      result = compareText(left.name, right.name);
    }
    if (sortState.key === "email") {
      result = compareText(left.email, right.email);
    }
    if (sortState.key === "progress") {
      result =
        left.progressPercent - right.progressPercent ||
        compareText(left.name, right.name);
    }
    if (sortState.key === "keywords") {
      result =
        left.keywords.length - right.keywords.length ||
        compareText(left.name, right.name);
    }

    return applySortDirection(result, sortState.direction);
  });
};

const getAdminEventDetailPath = (
  eventId: number | string,
  tab: EventDetailTab = "overview",
) => {
  const basePath = `${getAdminPath("event-settings")}/${eventId}`;
  return tab === "overview" ? basePath : `${basePath}/${tab}`;
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

const createEventFormState = (
  adminEmail: string,
  eventItem?: AdminEvent,
): EventFormState => {
  if (eventItem) {
    return {
      id: eventItem.id,
      name: eventItem.name,
      location: eventItem.location,
      eventTeam: eventItem.eventTeam,
      boardSize: String(eventItem.boardSize) as "3" | "4" | "5",
      bingoMissionCount: String(eventItem.bingoMissionCount),
      keywords: [...eventItem.keywords],
      keywordDraft: "",
      date: toDateInputValue(eventItem.startAt),
      startTime: toTimeInputValue(eventItem.startAt),
      endTime: toTimeInputValue(eventItem.endAt),
      adminEmail: eventItem.adminEmail,
      expectedAttendeeCount: eventItem.expectedAttendeeCount
        ? String(eventItem.expectedAttendeeCount)
        : "",
      restrictBeforeStart: eventItem.restrictBeforeStart,
      participantCount: String(eventItem.participantCount),
      progressCurrent: String(eventItem.progressCurrent),
      progressTotal: String(eventItem.progressTotal),
      canEdit: eventItem.canEdit,
    };
  }

  return {
    name: "",
    location: "",
    eventTeam: "",
    boardSize: "5",
    bingoMissionCount: "3",
    keywords: [],
    keywordDraft: "",
    date: "",
    startTime: "15:00",
    endTime: "18:00",
    adminEmail,
    expectedAttendeeCount: "",
    restrictBeforeStart: true,
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
  { key: "policies", label: "개인정보 처리 안내", Icon: FileIcon, adminOnly: true },
];

const AdminBrand = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className="text-center">
      <img
        src={compact ? adminSidebarLogo : adminLoginLogo}
        alt="Bingo Networking Admin"
        className={cn(
          "mx-auto block h-auto max-w-full",
          compact ? "w-[19.25rem]" : "w-[23rem]",
        )}
      />
    </div>
  );
};

const SectionHeader = ({
  title,
  description,
  action,
  layoutVariant = "after",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  layoutVariant?: AdminLayoutVariant;
}) => {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1
          className={cn(
            "font-black tracking-tight text-brand-800",
            layoutVariant === "before" ? "text-3xl" : "text-2xl",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {action}
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
        status === "scheduled" && "bg-brand-50 text-brand-600",
      )}
    >
      {label}
    </span>
  );
};

const EventProgress = ({
  current,
  total,
  compact = false,
}: {
  current: number;
  total: number;
  compact?: boolean;
}) => {
  const progress = getProgressPercent(current, total);

  return (
    <div
      className={cn(
        "min-w-0",
        compact ? "space-y-1.5" : "flex items-center gap-3",
      )}
    >
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className={cn(
          "whitespace-nowrap text-right",
          compact && "flex items-center justify-between gap-2 text-left",
        )}
      >
        <span
          className={cn(
            "font-black tracking-tight text-slate-800",
            compact ? "text-sm" : "text-xl",
          )}
        >
          {progress}%
        </span>
        <span
          className={cn(
            "text-slate-400",
            compact ? "text-xs" : "ml-2 text-sm",
          )}
        >
          완료 {current.toLocaleString("en-US")}명 / 참여{" "}
          {total.toLocaleString("en-US")}명
        </span>
      </div>
    </div>
  );
};

const SortHeaderButton = ({
  children,
  active,
  direction,
  onClick,
  className,
}: {
  children: ReactNode;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-left font-black text-brand-700 transition-colors hover:bg-white/70",
      active &&
        "bg-white text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.06)]",
      className,
    )}
    onClick={onClick}
  >
    <span>{children}</span>
    <span
      className={cn("text-xs", active ? "text-brand-600" : "text-slate-300")}
    >
      {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
    </span>
  </button>
);

const EventQrShareCard = ({
  eventName,
  shareUrl,
}: {
  eventName: string;
  shareUrl: string;
}) => {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let isMounted = true;
    setFeedback("");
    setQrDataUrl("");

    void QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((nextDataUrl) => {
        if (isMounted) {
          setQrDataUrl(nextDataUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFeedback(
            "QR 코드를 생성하지 못했습니다. URL을 직접 공유해 주세요.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shareUrl]);

  const handleCopyUrl = async () => {
    if (!navigator.clipboard) {
      setFeedback(
        "브라우저에서 클립보드를 지원하지 않습니다. URL을 직접 복사해 주세요.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback("이벤트 URL을 복사했습니다.");
    } catch {
      setFeedback("URL을 복사하지 못했습니다. 직접 선택해 복사해 주세요.");
    }
  };

  return (
    <div className="rounded-[1.5rem] bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-6">
        <div className="flex justify-start">
          <div className="flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-[1.25rem] bg-[#f7fbf2] p-2.5 shadow-inner ring-1 ring-brand-100 sm:h-40 sm:w-40 sm:p-3 lg:h-64 lg:w-64 lg:rounded-[1.5rem] lg:p-4">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`${eventName} 참가 QR 코드`}
                className="h-full w-full"
              />
            ) : (
              <span className="text-sm font-semibold text-slate-400">
                QR 생성 중
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <p className="text-xl font-black text-slate-900 sm:text-2xl">
              참가 링크 공유
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              참가자가 빙고에 참여할 수 있는 행사 페이지를 QR 또는 URL로
              공유할 수 있습니다.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              참가자 페이지 URL
            </p>
            <code className="block break-all rounded-2xl bg-[#f7fbf2] px-4 py-3 text-sm font-semibold leading-6 text-brand-700 ring-1 ring-brand-100">
              {shareUrl}
            </code>
          </div>

          <div className="flex flex-wrap gap-2">
            {qrDataUrl ? (
              <a
                href={qrDataUrl}
                download={`${eventName.replace(/[^a-z0-9가-힣_-]+/gi, "-")}-qr.png`}
                aria-label={`${eventName} 참가 QR PNG 저장`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-brand-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                QR 저장
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="whitespace-nowrap rounded-full px-5"
              onClick={() => void handleCopyUrl()}
            >
              URL 복사
            </Button>
          </div>

          {feedback ? (
            <p
              className="text-sm font-semibold text-brand-700"
              role="status"
              aria-live="polite"
            >
              {feedback}
            </p>
          ) : null}

          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-500 ring-1 ring-slate-100 max-sm:hidden">
            <p>· 참가자는 QR을 스캔하거나 URL을 열어 행사 빙고 페이지로 이동합니다.</p>
            <p>· 현장 안내 화면에는 QR을 크게 띄워 참가자가 바로 입장할 수 있게 하세요.</p>
            <p>
              · 인쇄물과 안내 메시지에는 QR 저장 또는 URL 복사를 사용하세요.
            </p>
          </div>
        </div>
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
        className,
      )}
    >
      {message}
    </div>
  );
};

const GoogleLogoIcon = () => (
  <svg
    aria-hidden="true"
    className="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.47a5.53 5.53 0 0 1-2.4 3.63v2.96h3.89c2.28-2.1 3.53-5.2 3.53-8.61Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.89-2.96c-1.08.72-2.45 1.14-4.06 1.14-3.12 0-5.77-2.1-6.72-4.93H1.26v3.05A11.99 11.99 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.34A7.23 7.23 0 0 1 4.9 12c0-.81.14-1.6.38-2.34V6.61H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.02-3.05Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.73c1.76 0 3.34.6 4.59 1.8l3.44-3.44C17.95 1.15 15.23 0 12 0A11.99 11.99 0 0 0 1.26 6.61l4.02 3.05C6.23 6.83 8.88 4.73 12 4.73Z"
    />
  </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shouldUseGoogleAdminAuth = canUseGoogleAdminAuth();

  useEffect(() => {
    let cancelled = false;

    const redirectAuthenticatedAdmin = async () => {
      if (!shouldUseGoogleAdminAuth) {
        return;
      }

      if (getAdminSession()) {
        navigate(getAdminPath("event-settings"), { replace: true });
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

  const handleGoogleLogin = async () => {
    const supabase = getSupabaseClient();

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAdminOAuthRedirectUrl(),
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      clearAdminSession();
      await supabase.auth.signOut();
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Google 관리자 로그인 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-10">
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-xl space-y-0">
          <AdminBrand />

          {shouldUseGoogleAdminAuth ? (
            <div className="-mt-px space-y-5 rounded-[2rem] border border-white/60 bg-white/85 p-7 shadow-soft">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Google 계정으로 관리자 로그인
                </h2>
                <p className="text-sm leading-6 text-slate-500">
                  Google 계정 인증 후 관리자 권한이 확인되면 콘솔로 이동합니다.
                </p>
              </div>

              <div className="flex w-full justify-center">
                <div className="w-full max-w-[360px]">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full rounded-full border-[#dadce0] bg-white px-6 text-[15px] font-semibold text-[#3c4043] shadow-none hover:bg-[#f8fafd] hover:text-[#202124] focus-visible:ring-slate-300"
                    disabled={isSubmitting}
                    onClick={handleGoogleLogin}
                  >
                    <GoogleLogoIcon />
                    <span>
                      {isSubmitting
                        ? "Google로 이동 중..."
                        : "Google 계정으로 로그인"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="-mt-px space-y-5 rounded-[2rem] border border-amber-100 bg-amber-50/90 p-7 shadow-soft">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black tracking-tight text-amber-900">
                  Google 관리자 로그인이 필요합니다
                </h2>
                <p className="text-sm leading-6 text-amber-800/80">
                  현재 환경에는 관리자용 Google/Supabase 설정이 없어 로그인할 수
                  없습니다.
                </p>
              </div>
            </div>
          )}

          {errorMessage ? (
            <p className="text-center text-sm font-semibold text-rose-600">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
};

const AdminConsolePage = ({
  section,
  eventDetailTab,
  layoutVariant = "after",
}: {
  section: AdminSection;
  eventDetailTab?: EventDetailTab;
  layoutVariant?: AdminLayoutVariant;
}) => {
  const navigate = useNavigate();
  const { adminEventId } = useParams();
  const initialSession = getAdminSession();
  const normalizedAdminEventId = normalizeAdminEventId(adminEventId);
  const shouldUseGoogleAdminAuth = canUseGoogleAdminAuth();
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const [session, setSession] = useState<AdminSession | null>(initialSession);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [applications, setApplications] = useState<AdminEventManagerRequest[]>(
    [],
  );
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selectedEventDetail, setSelectedEventDetail] =
    useState<AdminEvent | null>(null);
  const [memberPage, setMemberPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [participantPage, setParticipantPage] = useState(1);
  const [bingoSort, setBingoSort] = useState<SortState<BingoSortKey>>({
    key: "line",
    direction: "desc",
  });
  const [keywordSort, setKeywordSort] = useState<SortState<KeywordSortKey>>({
    key: "count",
    direction: "desc",
  });
  const [participantSort, setParticipantSort] = useState<
    SortState<ParticipantSortKey>
  >({
    key: "progress",
    direction: "desc",
  });
  const [dashboardStatusFilter, setDashboardStatusFilter] =
    useState<AdminDashboardStatusFilter>("all");
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [addFormError, setAddFormError] = useState("");
  const [eventFormError, setEventFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [inviteReviewResult, setInviteReviewResult] =
    useState<AdminEventManagerRequestReviewResult | null>(null);
  const [selectedPolicyKey, setSelectedPolicyKey] =
    useState<AdminPolicyTemplateKey>("consent_markdown");
  const [policyTemplates, setPolicyTemplates] = useState<
    Partial<Record<AdminPolicyTemplateKey, AdminPolicyTemplate>>
  >({});
  const [policyDrafts, setPolicyDrafts] = useState<
    Partial<Record<AdminPolicyTemplateKey, string>>
  >({});
  const [policyNotice, setPolicyNotice] = useState("");
  const [policyError, setPolicyError] = useState("");
  const [isSessionBootstrapped, setIsSessionBootstrapped] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);
  const [isPolicySaving, setIsPolicySaving] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);
  const [reviewingApplicationId, setReviewingApplicationId] = useState<
    number | null
  >(null);
  const [resettingEventId, setResettingEventId] = useState<number | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [newAdminForm, setNewAdminForm] = useState({
    email: "",
    name: "",
    role: "admin" as AdminRole,
  });
  const [selectedKeywordPresetId, setSelectedKeywordPresetId] = useState<
    EventKeywordPresetId | ""
  >("");
  const [isImportEventPanelOpen, setIsImportEventPanelOpen] = useState(false);
  const [importSourceEventId, setImportSourceEventId] = useState("");
  const [keywordRecommendationNotice, setKeywordRecommendationNotice] =
    useState("");
  const [keywordRecommendationError, setKeywordRecommendationError] =
    useState("");
  const [showMobileNotice, setShowMobileNotice] = useState(
    shouldShowAdminMobileNotice,
  );
  const isKeywordDraftComposingRef = useRef(false);
  const skipKeywordDraftBlurRef = useRef(false);
  const [eventForm, setEventForm] = useState<EventFormState>(() =>
    createEventFormState(initialSession?.email ?? ""),
  );

  useEffect(() => {
    document.body.classList.add("admin-console-mobile-preview");

    return () => {
      document.body.classList.remove("admin-console-mobile-preview");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQueries = [
      window.matchMedia("(max-width: 1279px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(hover: none)"),
    ];
    const handleChange = () => {
      setShowMobileNotice(shouldShowAdminMobileNotice());
    };

    handleChange();
    mediaQueries.forEach((mediaQuery) => {
      mediaQuery.addEventListener("change", handleChange);
    });

    return () => {
      mediaQueries.forEach((mediaQuery) => {
        mediaQuery.removeEventListener("change", handleChange);
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        if (!shouldUseGoogleAdminAuth) {
          clearAdminSession();
          setSession(null);
          navigate(getAdminPath(), { replace: true });
          return;
        }

        const supabase = getSupabaseClient();
        const {
          data: { session: supabaseSession },
        } = await supabase.auth.getSession();
        const accessToken = supabaseSession?.access_token ?? "";

        if (!accessToken) {
          clearAdminSession();
          setSession(null);
          navigate(getAdminPath(), { replace: true });
          return;
        }

        if (session) {
          clearLegacyLocalLoginStorage();
          if (session.accessToken !== accessToken) {
            const nextSession = { ...session, accessToken };
            if (cancelled) {
              return;
            }

            setAdminSession(nextSession);
            setSession(nextSession);
          }
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
        setSession(null);
        if (shouldUseGoogleAdminAuth) {
          await maybeGetSupabaseClient()?.auth.signOut();
        }
        if (!cancelled) {
          navigate(getAdminPath(), { replace: true });
        }
      } finally {
        if (!cancelled) {
          setIsSessionBootstrapped(true);
        }
      }
    };

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [navigate, session, shouldUseGoogleAdminAuth]);

  useEffect(() => {
    if (!session || !isSessionBootstrapped) {
      return;
    }

    const needsEvents = shouldLoadAdminEvents(section) && events.length === 0;
    const needsMembers =
      shouldLoadAdminMembers(section, session.role) && members.length === 0;
    const needsApplications =
      shouldLoadAdminApplications(section, session.role) &&
      applications.length === 0;

    if (!needsEvents && !needsMembers && !needsApplications) {
      return;
    }

    let cancelled = false;

    const loadConsoleData = async () => {
      try {
        setPageError("");

        const [eventItems, memberItems, applicationPayload] = await Promise.all(
          [
            needsEvents
              ? getAdminEvents(session.accessToken)
              : Promise.resolve(null),
            needsMembers
              ? getAdminMembers(session.accessToken)
              : Promise.resolve(null),
            needsApplications
              ? getAdminEventManagerRequests(session.accessToken)
              : Promise.resolve(null),
          ],
        );

        if (cancelled) {
          return;
        }

        if (eventItems) {
          setEvents(sortAdminEvents(eventItems));
        }
        if (memberItems) {
          setMembers(memberItems);
        }
        if (applicationPayload) {
          setApplications(applicationPayload.requests);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof AdminApiError && error.status === 401) {
            clearAdminSession();
            setSession(null);
            if (shouldUseGoogleAdminAuth) {
              await maybeGetSupabaseClient()?.auth.signOut();
            }
            navigate(getAdminPath(), { replace: true });
            return;
          }
          setPageError(
            error instanceof Error
              ? error.message
              : "관리자 데이터를 불러오지 못했습니다.",
          );
        }
      }
    };

    void loadConsoleData();

    return () => {
      cancelled = true;
    };
  }, [
    applications.length,
    events.length,
    isSessionBootstrapped,
    members.length,
    navigate,
    section,
    session,
    shouldUseGoogleAdminAuth,
  ]);

  useEffect(() => {
    if (
      !session ||
      !isSessionBootstrapped ||
      !shouldLoadAdminPolicyTemplates(section, session.role)
    ) {
      return;
    }

    let cancelled = false;

    const loadPolicy = async () => {
      try {
        setIsPolicyLoading(true);
        setPolicyError("");
        setPolicyNotice("");
        const templates = await Promise.all(
          POLICY_TEMPLATE_OPTIONS.map(async (option) => ({
            key: option.key,
            template: await getAdminPolicyTemplate(
              session.accessToken,
              option.key,
            ),
          })),
        );
        if (!cancelled) {
          const nextTemplates = Object.fromEntries(
            templates.map(({ key, template }) => [key, template]),
          ) as Partial<Record<AdminPolicyTemplateKey, AdminPolicyTemplate>>;
          const nextDrafts = Object.fromEntries(
            templates.map(({ key, template }) => [key, template.content]),
          ) as Partial<Record<AdminPolicyTemplateKey, string>>;
          setPolicyTemplates(nextTemplates);
          setPolicyDrafts(nextDrafts);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof AdminApiError && error.status === 401) {
            clearAdminSession();
            setSession(null);
            if (shouldUseGoogleAdminAuth) {
              await maybeGetSupabaseClient()?.auth.signOut();
            }
            navigate(getAdminPath(), { replace: true });
            return;
          }
          setPolicyError(
            error instanceof Error
              ? error.message
              : "개인정보 처리 문안을 불러오지 못했습니다.",
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
  }, [
    isSessionBootstrapped,
    navigate,
    section,
    session,
    shouldUseGoogleAdminAuth,
  ]);

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
        formatEventRowDate(eventItem.eventDate)
          .toLowerCase()
          .includes(normalizedQuery)
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

    if (
      selectedEventDetail &&
      String(selectedEventDetail.id) === adminEventId
    ) {
      return selectedEventDetail;
    }

    return (
      events.find((eventItem) => String(eventItem.id) === adminEventId) ?? null
    );
  }, [adminEventId, eventDetailTab, events, selectedEventDetail]);

  const canManageApplications = session?.role === "admin";
  const canEditSelectedEvent = !!selectedEvent?.canEdit;
  const pendingApplicationCount = useMemo(
    () =>
      applications.filter((requestItem) => requestItem.status === "pending")
        .length,
    [applications],
  );
  const dashboardSummary = useMemo(
    () => buildAdminDashboardSummary(events),
    [events],
  );
  const dashboardFilteredEvents = useMemo(
    () => filterAdminDashboardEventsByStatus(events, dashboardStatusFilter),
    [dashboardStatusFilter, events],
  );
  const dashboardRecentEvents = useMemo(
    () => sortAdminDashboardEventsByRecency(dashboardFilteredEvents).slice(0, 6),
    [dashboardFilteredEvents],
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

  const sortedBingoRows = useMemo(() => {
    return selectedEventInsights
      ? sortBingoRows(selectedEventInsights.bingoRows, bingoSort)
      : [];
  }, [bingoSort, selectedEventInsights]);

  const sortedKeywordRows = useMemo(() => {
    return selectedEventInsights
      ? sortKeywordRows(selectedEventInsights.keywordRows, keywordSort)
      : [];
  }, [keywordSort, selectedEventInsights]);

  const sortedParticipants = useMemo(() => {
    return selectedEventInsights
      ? sortParticipants(selectedEventInsights.participants, participantSort)
      : [];
  }, [participantSort, selectedEventInsights]);

  const visibleParticipants = useMemo(() => {
    const startIndex = (participantPage - 1) * DETAIL_PARTICIPANTS_PER_PAGE;
    return sortedParticipants.slice(
      startIndex,
      startIndex + DETAIL_PARTICIPANTS_PER_PAGE,
    );
  }, [participantPage, sortedParticipants]);

  const availableImportEvents = useMemo(() => {
    return events.filter(
      (eventItem) =>
        eventItem.id !== eventForm.id && eventItem.keywords.length > 0,
    );
  }, [eventForm.id, events]);
  const selectedKeywordPreset = useMemo(() => {
    return (
      EVENT_KEYWORD_PRESET_OPTIONS.find(
        (item) => item.id === selectedKeywordPresetId,
      ) ?? null
    );
  }, [selectedKeywordPresetId]);

  const memberTotalPages = Math.max(
    1,
    Math.ceil(members.length / ITEMS_PER_PAGE),
  );
  const eventTotalPages = Math.max(
    1,
    Math.ceil(filteredEvents.length / ITEMS_PER_PAGE),
  );
  const participantTotalPages = Math.max(
    1,
    Math.ceil(sortedParticipants.length / DETAIL_PARTICIPANTS_PER_PAGE),
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
    if (!isImportEventPanelOpen) {
      return;
    }

    if (availableImportEvents.length === 0) {
      if (importSourceEventId) {
        setImportSourceEventId("");
      }
      return;
    }

    const hasSelectedEvent = availableImportEvents.some(
      (eventItem) => String(eventItem.id) === importSourceEventId,
    );

    if (!hasSelectedEvent) {
      setImportSourceEventId(String(availableImportEvents[0].id));
    }
  }, [availableImportEvents, importSourceEventId, isImportEventPanelOpen]);

  useEffect(() => {
    setEventPage(1);
  }, [eventSearchQuery]);

  useEffect(() => {
    setParticipantPage(1);
  }, [adminEventId, eventDetailTab]);

  useEffect(() => {
    setParticipantPage(1);
  }, [participantSort]);

  useEffect(() => {
    if (!session || !isSessionBootstrapped || normalizedAdminEventId === null) {
      setSelectedEventDetail(null);
      return;
    }

    if (selectedEventDetail?.id === normalizedAdminEventId) {
      return;
    }

    let cancelled = false;

    const loadSelectedEvent = async () => {
      try {
        setIsDetailLoading(true);
        setPageError("");
        const detail = await getAdminEventDetail(
          session.accessToken,
          normalizedAdminEventId,
        );
        if (cancelled) {
          return;
        }

        setSelectedEventDetail(detail);
        setEvents((previousValue) => upsertAdminEvent(previousValue, detail));
      } catch (error) {
        if (!cancelled) {
          if (error instanceof AdminApiError && error.status === 401) {
            clearAdminSession();
            setSession(null);
            if (shouldUseGoogleAdminAuth) {
              await maybeGetSupabaseClient()?.auth.signOut();
            }
            navigate(getAdminPath(), { replace: true });
            return;
          }
          setPageError(
            error instanceof Error
              ? error.message
              : "이벤트 상세를 불러오지 못했습니다.",
          );
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
  }, [
    isSessionBootstrapped,
    navigate,
    normalizedAdminEventId,
    selectedEventDetail?.id,
    session,
    shouldUseGoogleAdminAuth,
  ]);

  useEffect(() => {
    if (
      session?.role === "event_manager" &&
      (section === "members" || section === "applications")
    ) {
      navigate(getAdminPath("event-settings"), { replace: true });
    }
  }, [navigate, section, session?.role]);

  const goToSection = (nextSection: AdminSection) => {
    if (
      (nextSection === "members" || nextSection === "applications") &&
      session?.role !== "admin"
    ) {
      navigate(getAdminPath("event-settings"));
      return;
    }

    if (nextSection !== "applications") {
      setPageNotice("");
      setInviteReviewResult(null);
    }
    navigate(getAdminPath(nextSection));
  };

  const goToEventDetail = (
    eventId: number,
    tab: EventDetailTab = "overview",
  ) => {
    navigate(getAdminEventDetailPath(eventId, tab));
  };

  const goBackToEventList = () => {
    navigate(getAdminPath("event-settings"));
  };

  const toggleBingoSort = (key: BingoSortKey) => {
    setBingoSort((previousValue) => ({
      key,
      direction: getNextSortDirection(previousValue, key),
    }));
  };

  const toggleKeywordSort = (key: KeywordSortKey) => {
    setKeywordSort((previousValue) => ({
      key,
      direction: getNextSortDirection(previousValue, key),
    }));
  };

  const toggleParticipantSort = (key: ParticipantSortKey) => {
    setParticipantSort((previousValue) => ({
      key,
      direction: getNextSortDirection(previousValue, key),
    }));
  };

  const handleLogout = async () => {
    clearAdminSession();
    setSession(null);
    if (shouldUseGoogleAdminAuth) {
      await maybeGetSupabaseClient()?.auth.signOut();
    }
    navigate(getAdminPath(), { replace: true });
  };

  const handleDismissMobileNotice = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ADMIN_MOBILE_NOTICE_STORAGE_KEY, "true");
    }

    setShowMobileNotice(false);
  };

  const openEventModal = (eventItem?: AdminEvent) => {
    setEventFormError("");
    setSelectedKeywordPresetId("");
    setIsImportEventPanelOpen(false);
    setImportSourceEventId("");
    setKeywordRecommendationNotice("");
    setKeywordRecommendationError("");
    setEventForm(createEventFormState(session?.email ?? "", eventItem));
    setShowEventModal(true);
  };

  const handleEventNameChange = (value: string) => {
    setEventForm((previousValue) => {
      return {
        ...previousValue,
        name: value,
      };
    });
  };

  const addKeyword = (keyword: string) => {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      return;
    }

    setSelectedKeywordPresetId("");
    setEventForm((previousValue) => {
      if (previousValue.keywords.includes(normalizedKeyword)) {
        return {
          ...previousValue,
          keywordDraft: "",
        };
      }

      const nextKeywords = clampKeywordList(
        [...previousValue.keywords, normalizedKeyword],
        previousValue.boardSize,
      );

      return {
        ...previousValue,
        keywords: nextKeywords,
        keywordDraft: "",
      };
    });
  };

  const handleKeywordDraftKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (isKeywordDraftComposingRef.current || event.nativeEvent.isComposing) {
      return;
    }

    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    skipKeywordDraftBlurRef.current = true;
    addKeyword(event.currentTarget.value);
  };

  const handleApplyKeywordPreset = (presetId: EventKeywordPresetId) => {
    const selectedPreset = EVENT_KEYWORD_PRESET_OPTIONS.find(
      (item) => item.id === presetId,
    );
    if (!selectedPreset) {
      return;
    }

    if (eventForm.keywords.length > 0 && selectedKeywordPresetId !== presetId) {
      const confirmed = window.confirm(
        `현재 키워드를 "${selectedPreset.label}" 카테고리 키워드로 바꿀까요?`,
      );
      if (!confirmed) {
        return;
      }
    }

    setSelectedKeywordPresetId(presetId);
    setKeywordRecommendationNotice(
      `"${selectedPreset.label}" 카테고리 키워드를 적용했습니다.`,
    );
    setKeywordRecommendationError("");
    setEventForm((previousValue) => ({
      ...previousValue,
      keywords: buildEventKeywordPresetKeywords(
        presetId,
        previousValue.boardSize,
      ),
      keywordDraft: "",
    }));
  };

  const handleImportKeywordsFromEvent = () => {
    const sourceEvent = availableImportEvents.find(
      (eventItem) => String(eventItem.id) === importSourceEventId,
    );

    if (!sourceEvent) {
      setKeywordRecommendationError("가져올 기존 행사를 먼저 선택해 주세요.");
      setKeywordRecommendationNotice("");
      return;
    }

    if (eventForm.keywords.length > 0) {
      const confirmed = window.confirm(
        `현재 키워드를 "${sourceEvent.name}" 행사 키워드로 바꿀까요?`,
      );
      if (!confirmed) {
        return;
      }
    }

    setSelectedKeywordPresetId("");
    setEventForm((previousValue) => ({
      ...previousValue,
      keywords: clampKeywordList(sourceEvent.keywords, previousValue.boardSize),
      keywordDraft: "",
    }));
    setKeywordRecommendationError("");
    setKeywordRecommendationNotice(
      `"${sourceEvent.name}" 행사 키워드를 가져왔습니다.`,
    );
    setIsImportEventPanelOpen(false);
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

    if (!newAdminForm.name.trim()) {
      setAddFormError("이름을 입력해 주세요.");
      return;
    }

    try {
      const nextMember = await createAdminMember(session.accessToken, {
        email: normalizedEmail,
        name: newAdminForm.name,
        role: newAdminForm.role,
      });

      setMembers((previousValue) => [nextMember, ...previousValue]);
      setMemberPage(1);
      setShowAddModal(false);
      setAddFormError("");
      setNewAdminForm({
        email: "",
        name: "",
        role: "admin",
      });
    } catch (error) {
      setAddFormError(
        error instanceof Error
          ? error.message
          : "관리자를 추가하지 못했습니다.",
      );
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

    const isConfirmed = window.confirm(
      `${member.name} (${member.email}) 계정을 삭제할까요?`,
    );
    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingMemberId(member.id);
      setPageError("");
      await deleteAdminMember(session.accessToken, member.id);
      setMembers((previousValue) =>
        previousValue.filter((item) => item.id !== member.id),
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "관리자 계정을 삭제하지 못했습니다.",
      );
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleReviewApplication = async (
    request: AdminEventManagerRequest,
    nextStatus: "approved" | "rejected",
  ) => {
    if (!session || session.role !== "admin") {
      return;
    }

    const confirmed = window.confirm(
      `${request.name}님의 신청을 ${nextStatus === "approved" ? "승인" : "반려"}할까요?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setReviewingApplicationId(request.id);
      setPageError("");
      const reviewResult = await reviewAdminEventManagerRequest(
        session.accessToken,
        request.id,
        {
          status: nextStatus,
        },
      );
      setApplications((previousValue) =>
        [
          ...previousValue.map((item) =>
            item.id === reviewResult.request.id ? reviewResult.request : item,
          ),
        ].sort((left, right) => {
          const priority = (value: AdminEventManagerRequest["status"]) =>
            value === "pending" ? 0 : value === "approved" ? 1 : 2;
          return (
            priority(left.status) - priority(right.status) ||
            new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime()
          );
        }),
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
      setPageError(
        error instanceof Error
          ? error.message
          : "신청 상태를 바꾸지 못했습니다.",
      );
      setPageNotice("");
      setInviteReviewResult(null);
    } finally {
      setReviewingApplicationId(null);
    }
  };

  const handleResetEventData = async () => {
    if (!session || !selectedEvent || !canEditSelectedEvent) {
      return;
    }

    const isConfirmed = window.confirm(
      "이 행사에 연결된 참가자, 팀, 빙고판, 교환 기록을 초기화할까요?\n이 작업은 되돌릴 수 없습니다.",
    );
    if (!isConfirmed) {
      return;
    }

    try {
      setResettingEventId(selectedEvent.id);
      setPageError("");

      const result = await resetAdminEventData(
        session.accessToken,
        selectedEvent.id,
      );
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
          : "이벤트 데이터를 초기화했습니다.",
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "이벤트 데이터를 초기화하지 못했습니다.",
      );
    } finally {
      setResettingEventId(null);
    }
  };

  const handleDeleteSelectedEvent = async () => {
    if (!session || !selectedEvent || !selectedEvent.canDelete) {
      return;
    }

    const isConfirmed = window.confirm(
      `"${selectedEvent.name}" 행사를 삭제할까요?\n행사 소유자는 참가자 데이터가 없는 행사만 삭제할 수 있으며, 이 작업은 되돌릴 수 없습니다.`,
    );
    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingEventId(selectedEvent.id);
      setPageError("");

      await deleteAdminEvent(session.accessToken, selectedEvent.id);
      setEvents((currentEvents) =>
        currentEvents.filter((eventItem) => eventItem.id !== selectedEvent.id),
      );
      setSelectedEventDetail(null);
      setPageNotice("행사를 삭제했습니다.");
      navigate(getAdminPath("event-settings"), { replace: true });
      contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "행사를 삭제하지 못했습니다.",
      );
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleResetPolicyDraft = () => {
    setPolicyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [selectedPolicyKey]: activePolicyTemplate?.content ?? "",
    }));
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
      const savedTemplate = await updateAdminPolicyTemplate(
        session.accessToken,
        {
          templateKey: selectedPolicyKey,
          content: nextContent,
        },
      );
      setPolicyTemplates((currentTemplates) => ({
        ...currentTemplates,
        [selectedPolicyKey]: savedTemplate,
      }));
      setPolicyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [selectedPolicyKey]: savedTemplate.content,
      }));
      setPolicyNotice(`${selectedPolicyOption.label} 템플릿을 저장했습니다.`);
    } catch (error) {
      setPolicyError(
        error instanceof Error
          ? error.message
          : "개인정보 처리 문안을 저장하지 못했습니다.",
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

    if (!eventForm.date) {
      setEventFormError("날짜를 입력해 주세요.");
      return;
    }

    if (!eventForm.startTime || !eventForm.endTime) {
      setEventFormError("시작 시간과 종료 시간을 입력해 주세요.");
      return;
    }

    const startAt = combineDateAndTimeToIso(
      eventForm.date,
      eventForm.startTime,
    );
    const endAt = combineDateAndTimeToIso(eventForm.date, eventForm.endTime);

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setEventFormError("행사 종료 시각은 시작 시각보다 늦어야 합니다.");
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        eventForm.adminEmail.trim().toLowerCase(),
      )
    ) {
      setEventFormError("행사 문의 이메일을 확인해 주세요.");
      return;
    }

    const expectedAttendeeCount = eventForm.expectedAttendeeCount.trim()
      ? Number(eventForm.expectedAttendeeCount)
      : undefined;
    if (
      expectedAttendeeCount !== undefined &&
      (!Number.isInteger(expectedAttendeeCount) ||
        expectedAttendeeCount < 1 ||
        expectedAttendeeCount > 100000)
    ) {
      setEventFormError("예상 참가자 수는 1명 이상 100,000명 이하로 입력해 주세요.");
      return;
    }

    if (keywordAutofillSummary.currentCount === 0) {
      setEventFormError("키워드를 한 개 이상 추가해 주세요.");
      return;
    }

    const keywordsForSave = buildAutoFilledKeywordList(
      eventForm.keywords,
      eventForm.boardSize,
    );

    if (keywordAutofillSummary.missingCount > 0) {
      const firstGeneratedKeyword =
        keywordAutofillSummary.generatedKeywords[0] ?? "키워드";
      const confirmed = window.confirm(
        [
          `현재 입력한 키워드는 ${keywordAutofillSummary.currentCount}개입니다.`,
          `${Number(eventForm.boardSize)}x${Number(eventForm.boardSize)} 행사에는 ${keywordAutofillSummary.goalCount}개가 필요합니다.`,
          `부족한 ${keywordAutofillSummary.missingCount}개는 "${firstGeneratedKeyword}"부터 자동으로 채워 저장할까요?`,
        ].join("\n"),
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      const savedEvent = eventForm.id
        ? await updateAdminEvent(session.accessToken, eventForm.id, {
            name: eventForm.name,
            location: eventForm.location,
            eventTeam: eventForm.eventTeam,
            startAt,
            endAt,
            adminEmail: eventForm.adminEmail,
            boardSize: Number(eventForm.boardSize) as 3 | 4 | 5,
            bingoMissionCount: Number(eventForm.bingoMissionCount),
            expectedAttendeeCount,
            restrictBeforeStart: eventForm.restrictBeforeStart,
            keywords: keywordsForSave,
          })
        : await createAdminEvent(session.accessToken, {
            name: eventForm.name,
            location: eventForm.location,
            eventTeam: eventForm.eventTeam,
            startAt,
            endAt,
            adminEmail: eventForm.adminEmail,
            boardSize: Number(eventForm.boardSize) as 3 | 4 | 5,
            bingoMissionCount: Number(eventForm.bingoMissionCount),
            expectedAttendeeCount,
            restrictBeforeStart: eventForm.restrictBeforeStart,
            keywords: keywordsForSave,
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
      setEventFormError(
        error instanceof Error ? error.message : "행사를 저장하지 못했습니다.",
      );
    }
  };

  const selectedEventDateParts = selectedEvent
    ? getEventDateParts(selectedEvent.startAt)
    : null;
  const selectedEventHomePath = selectedEvent
    ? selectedEvent.publicPath || getEventHomePath(selectedEvent.slug)
    : "";
  const selectedEventShareUrl = selectedEventHomePath
    ? getAbsolutePublicUrl(selectedEventHomePath)
    : "";
  const selectedEventTimeRange = selectedEvent
    ? getEventTimeRangeLabel(selectedEvent.startAt, selectedEvent.endAt)
    : "";
  const keywordAutofillSummary = describeKeywordAutofill(
    eventForm.keywords,
    eventForm.boardSize,
  );
  const canEditPolicyTemplate = session?.role === "admin";
  const activePolicyTemplate = policyTemplates[selectedPolicyKey] ?? null;
  const policyDraft = policyDrafts[selectedPolicyKey] ?? "";
  const selectedPolicyOption =
    POLICY_TEMPLATE_OPTIONS.find(
      (option) => option.key === selectedPolicyKey,
    ) ?? POLICY_TEMPLATE_OPTIONS[0];
  const hasPolicyChanges =
    activePolicyTemplate !== null &&
    policyDraft.trim() !== activePolicyTemplate.content.trim();
  const policyPreviewContent = useMemo(() => {
    return interpolateConsentTemplate(
      policyDraft,
      POLICY_PREVIEW_VARIABLES[selectedPolicyKey],
    );
  }, [policyDraft, selectedPolicyKey]);

  if (!session) {
    return null;
  }

  if (section === "members" && session.role !== "admin") {
    return null;
  }

  if (section === "applications" && session.role !== "admin") {
    return null;
  }

  if (section === "policies" && session.role !== "admin") {
    return null;
  }

  return (
    <div className="max-xl:h-[100dvh] max-xl:w-[1152px] max-xl:overflow-hidden xl:contents">
    <div
      className={cn(
        "relative grid min-h-screen w-full min-w-[1280px] origin-top-left bg-brand-500 max-xl:h-[111.111dvh] max-xl:min-h-0 max-xl:scale-90",
        layoutVariant === "before"
          ? "grid-cols-[21rem_minmax(0,1fr)]"
          : "grid-cols-[22.125rem_minmax(0,1fr)]",
      )}
    >
      {showMobileNotice ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 px-4 py-6 xl:hidden">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-white/70 bg-white px-5 py-5 text-center shadow-[0_22px_60px_rgba(15,23,42,0.28)]">
            <p className="text-lg font-black text-slate-900">
              관리자 페이지는 모바일을 정식 지원하지 않습니다
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              PC 환경에서 이용하는 것을 권장합니다. 모바일에서는 화면을 좌우로
              이동해 PC 레이아웃을 확인할 수 있습니다.
            </p>
            <Button
              className="mt-5 w-full rounded-full bg-brand-700 hover:bg-brand-800"
              onClick={handleDismissMobileNotice}
            >
              확인하고 계속 보기
            </Button>
          </div>
        </div>
      ) : null}

      <aside className="flex flex-col justify-between gap-8 px-5 py-8 text-white">
        <div>
          <button
            type="button"
            className="block w-full rounded-2xl transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="대시보드로 이동"
            onClick={() => goToSection("dashboard")}
          >
            <AdminBrand compact />
          </button>

          <nav className="grid gap-2" aria-label="admin navigation">
            {navigationItems
              .filter(({ adminOnly }) => !adminOnly || session.role === "admin")
              .map(({ key, label, Icon }) => (
                <Button
                  key={key}
                  variant="ghost"
                  className={cn(
                    "h-auto w-full justify-start rounded-2xl px-5 py-4 text-left text-[1.05rem] font-bold text-white/90 hover:bg-white/15 hover:text-white",
                    section === key &&
                      "bg-white/30 text-brand-900 hover:bg-white/30",
                  )}
                  onClick={() => goToSection(key)}
                >
                  <span className="flex items-center gap-2.5">
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

          <div className="mt-8 border-t border-white/20 pt-5">
            <p className="px-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">
              바로가기
            </p>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-11 w-full items-center justify-between rounded-xl px-4 text-sm font-bold text-white/75 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white hover:ring-white/25"
            >
              <span>서비스 홈 열기</span>
              <ExternalLinkIcon />
            </a>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-2 pb-2 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/65 text-xl font-black text-slate-500">
            {session.name.trim().charAt(0)}
          </span>
          <p className="text-sm font-medium text-white/95">{session.email}</p>
          <Badge
            variant={session.role === "admin" ? "default" : "destructive"}
            className="min-w-[3.5rem] justify-center bg-slate-900 px-2 py-1 text-[0.72rem] font-semibold"
          >
            {getRoleLabel(session.role)}
          </Badge>
          <Button
            variant="ghost"
            className="mt-1 h-auto px-0 py-0 text-sm font-bold text-white hover:bg-transparent hover:text-white/90"
            onClick={() => void handleLogout()}
          >
            <LogoutIcon />
            <span>로그아웃</span>
          </Button>
        </div>
      </aside>

      <main
        className={cn(
          layoutVariant === "before" ? "p-10" : "py-10 pl-0 pr-[66px]",
        )}
      >
        <Card
          className={cn(
            "flex w-full flex-col overflow-hidden border-white/40 shadow-soft",
            layoutVariant === "before"
              ? "h-[calc(100vh-6rem)] rounded-[2rem] max-xl:h-[calc(100dvh-80px)]"
              : "h-[calc(100vh-5rem)] rounded-[30px] max-xl:h-[calc(100dvh-80px)]",
          )}
        >
          <CardContent className="min-h-0 flex-1 p-0">
            <div
              ref={contentScrollRef}
              className={cn(
                "min-h-0 h-full overflow-y-auto",
                layoutVariant === "before"
                  ? "space-y-8 p-10 pt-10 pr-8 [scrollbar-gutter:stable_both-edges]"
                  : "space-y-6 px-12 pb-10 pt-16",
              )}
            >
              {pageError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                  {pageError}
                </div>
              ) : null}
              {section === "dashboard" ? (
                <>
                  <SectionHeader
                    title="대시보드"
                    description="권한 내 전체 행사 운영 현황과 최근 행사 진행 상태를 한 화면에서 확인할 수 있습니다."
                    layoutVariant={layoutVariant}
                    action={
                      <Button
                        variant="outline"
                        className="rounded-full px-5"
                        onClick={() => navigate(getAdminPath("event-settings"))}
                      >
                        전체 행사 보기
                        <ChevronRightIcon />
                      </Button>
                    }
                  />

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "총 행사 수",
                        value: `${dashboardSummary.totalEventCount.toLocaleString("en-US")}개`,
                        helper: "권한 내 전체 행사",
                      },
                      {
                        label: "진행 중",
                        value: `${dashboardSummary.statusCounts.in_progress.toLocaleString("en-US")}개`,
                        helper: "현재 운영 중인 행사",
                      },
                      {
                        label: "예정 행사",
                        value: `${dashboardSummary.statusCounts.scheduled.toLocaleString("en-US")}개`,
                        helper: "시작 전 행사",
                      },
                      {
                        label: "종료 행사",
                        value: `${dashboardSummary.statusCounts.ended.toLocaleString("en-US")}개`,
                        helper: "결과 확인 대상",
                      },
                      {
                        label: "총 참가자 수",
                        value: `${dashboardSummary.totalParticipantCount.toLocaleString("en-US")}명`,
                        helper: "행사별 참가자 합계",
                      },
                      {
                        label: "빙고 달성 인원",
                        value: `${dashboardSummary.totalBingoCompletionCount.toLocaleString("en-US")}명`,
                        helper: "전체 참가자 기준",
                      },
                      {
                        label: "전체 완료율",
                        value: `${dashboardSummary.completionRate}%`,
                        helper: "빙고 달성 인원 / 참가자",
                      },
                      ...(canManageApplications
                        ? [
                            {
                              label: "승인 대기 신청",
                              value: `${pendingApplicationCount.toLocaleString("en-US")}건`,
                              helper: "관리자 검토 필요",
                            },
                          ]
                        : []),
                    ].map((item) => (
                      <Card
                        key={item.label}
                        className="rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none"
                      >
                        <CardContent className="flex min-h-[8.4rem] flex-col justify-between gap-3 px-6 pb-6 pt-7">
                          <div className="space-y-2">
                            <p className="text-sm font-black tracking-tight text-slate-700">
                              {item.label}
                            </p>
                            <p className="text-[0.72rem] font-semibold leading-5 text-slate-400">
                              {item.helper}
                            </p>
                          </div>
                          <p className="text-[1.8rem] font-black leading-none tracking-tight text-slate-950 xl:text-[2rem]">
                            {item.value}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none">
                    <CardHeader className="flex flex-col gap-4 p-7 pb-0 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <CardTitle>최근 행사 현황</CardTitle>
                        <CardDescription>
                          상태별로 최근 행사를 확인하고 상세 리포트로 이동할 수
                          있습니다.
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ADMIN_DASHBOARD_STATUS_FILTERS.map((filterItem) => {
                          const filterCount =
                            filterItem.key === "all"
                              ? dashboardSummary.totalEventCount
                              : dashboardSummary.statusCounts[filterItem.key];

                          return (
                            <button
                              key={filterItem.key}
                              type="button"
                              className={cn(
                                "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                                dashboardStatusFilter === filterItem.key
                                  ? "bg-brand-700 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                                  : "bg-white text-slate-500 ring-1 ring-slate-100 hover:bg-brand-50 hover:text-brand-700",
                              )}
                              onClick={() =>
                                setDashboardStatusFilter(filterItem.key)
                              }
                            >
                              <span>{filterItem.label}</span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs",
                                  dashboardStatusFilter === filterItem.key
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-100 text-slate-400",
                                )}
                              >
                                {filterCount.toLocaleString("en-US")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-7 pt-6">
                      {dashboardRecentEvents.length > 0 ? (
                        <>
                          <div className="rounded-[1.25rem] bg-white px-5 py-4 ring-1 ring-slate-100">
                            <p className="text-sm font-semibold leading-6 text-slate-500">
                              선택한 상태의 행사{" "}
                              <span className="font-black text-slate-900">
                                {dashboardFilteredEvents.length.toLocaleString(
                                  "en-US",
                                )}
                                개
                              </span>{" "}
                              중 최근{" "}
                              {dashboardRecentEvents.length.toLocaleString(
                                "en-US",
                              )}
                              개를 표시합니다.
                            </p>
                          </div>

                          <div className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white">
                            <Table className="table-fixed">
                              <TableHeader className="bg-[#f6f8ef]">
                                <TableRow className="border-none hover:bg-transparent">
                                  <TableHead className="w-[36%]">
                                    행사명
                                  </TableHead>
                                  <TableHead className="w-[17%] whitespace-nowrap">
                                    일정
                                  </TableHead>
                                  <TableHead className="w-[12%] whitespace-nowrap text-center">
                                    참여자수
                                  </TableHead>
                                  <TableHead className="w-[11%]">
                                    상태
                                  </TableHead>
                                  <TableHead className="w-[24%]">
                                    완료율
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dashboardRecentEvents.map((eventItem) => (
                                  <TableRow
                                    key={eventItem.id}
                                    className="cursor-pointer hover:bg-[#fbfcf8]"
                                    onClick={() =>
                                      goToEventDetail(eventItem.id, "dashboard")
                                    }
                                  >
                                    <TableCell>
                                      <div className="space-y-2">
                                        <p className="truncate font-black leading-6 text-slate-900">
                                          {eventItem.name}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                          <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
                                            {eventItem.eventTeam}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <span className="inline-flex rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-700">
                                        {formatEventRowDate(eventItem.startAt)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-center">
                                      <span className="text-base font-black tracking-tight text-slate-900">
                                        {eventItem.participantCount.toLocaleString(
                                          "en-US",
                                        )}
                                      </span>
                                      <span className="ml-0.5 text-sm font-bold text-slate-500">
                                        명
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <EventStatusBadge
                                        status={eventItem.status}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <EventProgress
                                        current={eventItem.progressCurrent}
                                        total={eventItem.progressTotal}
                                        compact
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <EmptyPanelState
                          className="min-h-[18rem]"
                          message={
                            events.length === 0
                              ? "아직 등록된 이벤트가 없습니다."
                              : "선택한 상태에 해당하는 이벤트가 없습니다."
                          }
                        />
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : null}

              {section === "members" ? (
                <>
                  <SectionHeader
                    title="관리자"
                    layoutVariant={layoutVariant}
                    action={
                      <Button
                        className="rounded-full px-5"
                        onClick={() => setShowAddModal(true)}
                      >
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
                              <TableCell className="font-bold text-slate-900">
                                {member.id}
                              </TableCell>
                              <TableCell className="font-semibold text-slate-800">
                                {member.name}
                              </TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>{member.phone}</TableCell>
                              <TableCell>
                                {formatAdminDate(member.createdAt)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    member.role === "admin"
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {getRoleLabel(member.role)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-left">
                                {member.id === session.id ? (
                                  <span className="text-xs font-semibold text-slate-400">
                                    보호됨
                                  </span>
                                ) : (
                                  <div className="flex justify-start">
                                    <Button
                                      variant="ghost"
                                      className="h-9 rounded-full px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                      disabled={deletingMemberId === member.id}
                                      onClick={() =>
                                        void handleDeleteMember(member)
                                      }
                                    >
                                      {deletingMemberId === member.id
                                        ? "삭제 중"
                                        : "삭제"}
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
                    {Array.from(
                      { length: memberTotalPages },
                      (_, index) => index + 1,
                    ).map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        variant={
                          memberPage === pageNumber ? "secondary" : "ghost"
                        }
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
                    layoutVariant={layoutVariant}
                    action={
                      <div className="self-start rounded-full bg-brand-100 px-4 py-2 text-sm font-bold text-brand-800 md:self-auto">
                        승인 대기 {pendingApplicationCount}건
                      </div>
                    }
                  />

                  {pageNotice ? (
                    <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4 text-sm font-semibold text-brand-800">
                      <p>{pageNotice}</p>
                      {inviteReviewResult ? (
                        <div className="mt-3 space-y-2 rounded-2xl bg-white px-4 py-3 text-xs font-semibold leading-6 text-brand-700">
                          <p>
                            {inviteReviewResult.invitedAdmin
                              ? `권한 부여 계정: ${inviteReviewResult.invitedAdmin.email}`
                              : "기존 관리자 계정 권한을 유지합니다."}
                          </p>
                          <p>
                            {inviteReviewResult.inviteEmailSent
                              ? "승인 안내 메일 발송 완료 · 승인된 이메일로 Google 로그인하면 관리자 페이지에 접속할 수 있습니다."
                              : "메일 발송에 실패했거나 설정이 없어 수동 안내가 필요합니다. 승인된 이메일로 Google 로그인하면 관리자 페이지에 접속할 수 있습니다."}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {applications.length > 0 ? (
                    <div className="space-y-3">
                      {applications.map((requestItem) => (
                        <article
                          key={requestItem.id}
                          className="grid gap-4 rounded-[1.35rem] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-100 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.4fr)_10rem_10.5rem] xl:items-center"
                        >
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${getApplicationStatusClassName(requestItem.status)}`}
                              >
                                {getApplicationStatusLabel(requestItem.status)}
                              </span>
                              <span className="text-xs font-semibold text-slate-400">
                                {formatAdminDate(requestItem.createdAt)}
                              </span>
                            </div>
                            <div>
                              <p className="truncate text-base font-black text-slate-900">
                                {requestItem.eventName}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                {requestItem.name} · {requestItem.email}
                              </p>
                              {requestItem.organization ? (
                                <p className="mt-1 text-xs font-bold text-brand-700">
                                  {requestItem.organization}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="min-w-0 space-y-3 rounded-2xl bg-[#f7fbf2] px-4 py-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                행사 목적
                              </p>
                              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
                                {requestItem.eventPurpose}
                              </p>
                            </div>
                            {requestItem.notes ? (
                              <div className="border-t border-lime-100 pt-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                  요청 메모
                                </p>
                                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
                                  {requestItem.notes}
                                </p>
                              </div>
                            ) : null}
                          </div>

                          <div className="text-sm font-semibold text-slate-500">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                              예상 일정
                            </p>
                            <p className="mt-2 whitespace-nowrap">
                              {requestItem.expectedEventDate
                                ? formatAdminDate(requestItem.expectedEventDate)
                                : "미정"}
                            </p>
                            {requestItem.expectedAttendeeCount ? (
                              <p className="mt-1 text-xs font-bold text-brand-700">
                                예상 {requestItem.expectedAttendeeCount}명
                              </p>
                            ) : null}
                            {requestItem.reviewedByName ? (
                              <p className="mt-2 text-xs text-slate-400">
                                {requestItem.reviewedByName}
                                {requestItem.reviewedAt
                                  ? ` · ${formatAdminDate(requestItem.reviewedAt)}`
                                  : ""}
                              </p>
                            ) : null}
                            {requestItem.reviewNote ? (
                              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                                검토 메모: {requestItem.reviewNote}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex gap-2 xl:justify-end">
                            <Button
                              size="sm"
                              className="min-w-[4.5rem] whitespace-nowrap rounded-full px-4"
                              disabled={
                                requestItem.status !== "pending" ||
                                reviewingApplicationId === requestItem.id
                              }
                              onClick={() =>
                                void handleReviewApplication(
                                  requestItem,
                                  "approved",
                                )
                              }
                            >
                              {reviewingApplicationId === requestItem.id &&
                              requestItem.status === "pending"
                                ? "처리 중"
                                : "승인"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-w-[4.5rem] whitespace-nowrap rounded-full border-rose-100 px-4 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              disabled={
                                requestItem.status !== "pending" ||
                                reviewingApplicationId === requestItem.id
                              }
                              onClick={() =>
                                void handleReviewApplication(
                                  requestItem,
                                  "rejected",
                                )
                              }
                            >
                              반려
                            </Button>
                          </div>
                        </article>
                      ))}
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
                            <p className="text-sm font-bold text-slate-300">
                              이벤트 관리
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50"
                                aria-label="이벤트 목록으로 돌아가기"
                                onClick={goBackToEventList}
                              >
                                <ChevronLeftIcon />
                              </button>
                              <h1 className="text-[1.85rem] font-black leading-tight tracking-tight text-brand-800 sm:text-[2rem]">
                                {selectedEvent.name}
                              </h1>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
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
                              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                            >
                              참가 페이지 열기
                              <ExternalLinkIcon />
                            </a>
                            {canEditSelectedEvent ? (
                              <>
                                <Button
                                  className="h-10 rounded-full px-5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                                  onClick={() => openEventModal(selectedEvent)}
                                >
                                  행사 수정
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-10 rounded-full border-rose-100 bg-white px-4 text-sm font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                  disabled={
                                    resettingEventId === selectedEvent.id
                                  }
                                  onClick={() => void handleResetEventData()}
                                >
                                  {resettingEventId === selectedEvent.id
                                    ? "초기화 중"
                                    : "데이터 초기화"}
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-10 rounded-full border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:border-slate-100 disabled:text-slate-300"
                                  disabled={
                                    !selectedEvent.canDelete ||
                                    deletingEventId === selectedEvent.id
                                  }
                                  title={
                                    selectedEvent.canDelete
                                      ? "참가자가 없는 행사를 삭제합니다."
                                      : "참가자 데이터가 있는 행사는 데이터 초기화 후 삭제할 수 있습니다."
                                  }
                                  onClick={() =>
                                    void handleDeleteSelectedEvent()
                                  }
                                >
                                  {deletingEventId === selectedEvent.id
                                    ? "삭제 중"
                                    : "행사 삭제"}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="border-b border-slate-200">
                          <div className="flex flex-wrap gap-3 sm:gap-8">
                            {EVENT_DETAIL_TABS.map((tabItem) => (
                              <button
                                key={tabItem.key}
                                type="button"
                                className={cn(
                                  "border-b-[3px] px-2 pb-4 text-sm font-bold text-slate-400 transition-colors",
                                  eventDetailTab === tabItem.key
                                    ? "border-brand-400 text-slate-900"
                                    : "border-transparent hover:text-slate-700",
                                )}
                                onClick={() =>
                                  goToEventDetail(selectedEvent.id, tabItem.key)
                                }
                              >
                                {tabItem.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {eventDetailTab === "overview" ? (
                        <div className="space-y-4">
                          <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
                                행사 정보
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                <h2 className="break-words text-[1.8rem] font-black leading-tight tracking-tight text-slate-900 sm:text-[2.1rem]">
                                  {selectedEvent.name}
                                </h2>
                                <EventStatusBadge status={selectedEvent.status} />
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                  {selectedEventDateParts?.yearLabel}{" "}
                                  {selectedEventDateParts?.monthLabel}{" "}
                                  {selectedEventDateParts?.day}일{" "}
                                  {selectedEventDateParts?.weekday}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                  {selectedEventTimeRange}
                                </span>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-3">
                              <div className="rounded-2xl bg-[#f7fbf2] px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                  운영팀
                                </p>
                                <p className="mt-2 truncate text-sm font-bold text-brand-700">
                                  {selectedEvent.eventTeam}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-[#f7fbf2] px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                  장소
                                </p>
                                <p className="mt-2 truncate text-sm font-bold text-slate-700">
                                  {selectedEvent.location}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-[#f7fbf2] px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                  예상 인원
                                </p>
                                <p className="mt-2 text-sm font-bold text-slate-700">
                                  {selectedEvent.expectedAttendeeCount
                                    ? `${selectedEvent.expectedAttendeeCount.toLocaleString("en-US")}명`
                                    : "미설정"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
                              <p className="mr-1 text-sm font-black text-slate-900">
                                운영 설정
                              </p>
                              {[
                                {
                                  label: "보드",
                                  value: `${selectedEvent.boardSize}x${selectedEvent.boardSize}`,
                                },
                                {
                                  label: "미션",
                                  value: `${selectedEvent.bingoMissionCount}줄`,
                                },
                                {
                                  label: "키워드",
                                  value: `${selectedEvent.keywords.length}개`,
                                },
                                {
                                  label: "현재 참가자",
                                  value: `${selectedEvent.participantCount.toLocaleString("en-US")}명`,
                                },
                                {
                                  label: "행사 전 참가",
                                  value: selectedEvent.restrictBeforeStart
                                    ? "제한"
                                    : "허용",
                                },
                              ].map((settingItem) => (
                                <div
                                  key={settingItem.label}
                                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-slate-50 px-3 py-2 ring-1 ring-slate-100"
                                >
                                  <span className="text-xs font-bold text-slate-400">
                                    {settingItem.label}
                                  </span>
                                  <span className="text-sm font-black text-brand-700">
                                    {settingItem.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-base font-black text-slate-900">
                                  키워드 요약
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  참가자가 선택할 수 있는 전체 빙고 키워드입니다.
                                </p>
                              </div>
                              <span className="whitespace-nowrap rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
                                {selectedEvent.keywords.length}개
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedEvent.keywords.map((keyword) => (
                                <span
                                  key={keyword}
                                  className="max-w-full truncate rounded-xl bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-700"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {eventDetailTab === "share" ? (
                        <EventQrShareCard
                          eventName={selectedEvent.name}
                          shareUrl={selectedEventShareUrl}
                        />
                      ) : null}

                      {eventDetailTab === "dashboard" ? (
                        selectedEventInsights ? (
                          <div className="space-y-7">
                            <div className="grid gap-4 md:grid-cols-3">
                              {[
                                {
                                  label: "참여자 수",
                                  value:
                                    selectedEvent.participantCount.toLocaleString(
                                      "en-US",
                                    ),
                                  unit: "명",
                                },
                                {
                                  label: "총 키워드 교환 횟수",
                                  value:
                                    selectedEventInsights.totalKeywordSelections.toLocaleString(
                                      "en-US",
                                    ),
                                  unit: "회",
                                },
                                {
                                  label: "운영 시간",
                                  value: formatDurationLabel(
                                    selectedEventInsights.operatingMinutes,
                                  ),
                                },
                              ].map((metricItem) => (
                                <div
                                  key={metricItem.label}
                                  className="rounded-[1rem] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] ring-1 ring-slate-100"
                                >
                                  <p className="min-h-10 text-sm font-black leading-5 text-brand-700">
                                    {metricItem.label}
                                  </p>
                                  <div className="mt-3 flex items-end gap-1.5">
                                    <span className="text-[1.8rem] font-black tracking-tight text-slate-900">
                                      {metricItem.value}
                                    </span>
                                    {metricItem.unit ? (
                                      <span className="pb-1 text-xs font-black text-brand-700">
                                        {metricItem.unit}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="grid gap-5 xl:grid-cols-2">
                                <div className="rounded-[1.35rem] bg-[#f7fbf2] px-8 py-7 ring-1 ring-white/70">
                                  <div className="text-center">
                                    <p className="text-base font-black text-brand-700">
                                      빙고 정보
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                      달성 줄 수별 완료 분포
                                    </p>
                                  </div>
                                <div className="mt-6 grid grid-cols-[1.2fr_0.8fr_0.7fr] gap-x-4 rounded-2xl bg-white/70 px-3 py-2">
                                  <SortHeaderButton
                                    active={bingoSort.key === "line"}
                                    direction={bingoSort.direction}
                                    onClick={() => toggleBingoSort("line")}
                                    className="text-sm"
                                  >
                                    달성 줄 수
                                  </SortHeaderButton>
                                  <SortHeaderButton
                                    active={bingoSort.key === "count"}
                                    direction={bingoSort.direction}
                                    onClick={() => toggleBingoSort("count")}
                                    className="text-sm"
                                  >
                                    인원 수
                                  </SortHeaderButton>
                                  <SortHeaderButton
                                    active={bingoSort.key === "rate"}
                                    direction={bingoSort.direction}
                                    onClick={() => toggleBingoSort("rate")}
                                    className="text-sm"
                                  >
                                    비율
                                  </SortHeaderButton>
                                </div>
                                {sortedBingoRows.length > 0 ? (
                                  <div className="mt-3">
                                    <div className="space-y-1.5 pb-1">
                                      {sortedBingoRows.map((bingoRow) => (
                                        <div
                                          key={bingoRow.lineLabel}
                                          className="grid grid-cols-[1.2fr_0.8fr_0.7fr] items-center gap-x-4 rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-white/70"
                                        >
                                          <div className="flex items-center gap-2 leading-6">
                                            <span>{bingoRow.lineLabel}</span>
                                            {bingoRow.isComplete ? (
                                              <span className="rounded-full bg-brand-300 px-2.5 py-1 text-[0.7rem] font-bold text-white">
                                                빙고 완성
                                              </span>
                                            ) : null}
                                          </div>
                                          <p>
                                            {bingoRow.count.toLocaleString(
                                              "en-US",
                                            )}
                                            명
                                          </p>
                                          <p>{bingoRow.rate}%</p>
                                        </div>
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

                                <div className="rounded-[1.35rem] bg-[#f7fbf2] px-8 py-7 ring-1 ring-white/70">
                                  <div className="text-center">
                                    <p className="text-base font-black text-brand-700">
                                      키워드 별 선택 횟수
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                      전체 키워드별 선택 현황
                                    </p>
                                  </div>
                                <div className="mt-6 grid grid-cols-[minmax(0,1fr)_9rem] gap-x-4 rounded-2xl bg-white/70 px-3 py-2">
                                  <SortHeaderButton
                                    active={keywordSort.key === "keyword"}
                                    direction={keywordSort.direction}
                                    onClick={() => toggleKeywordSort("keyword")}
                                    className="text-sm"
                                  >
                                    키워드
                                  </SortHeaderButton>
                                  <SortHeaderButton
                                    active={keywordSort.key === "count"}
                                    direction={keywordSort.direction}
                                    onClick={() => toggleKeywordSort("count")}
                                    className="text-sm"
                                  >
                                    선택한 사람 수
                                  </SortHeaderButton>
                                </div>
                                {sortedKeywordRows.length > 0 ? (
                                  <div className="mt-3">
                                    <div className="space-y-1.5 pb-1">
                                      {sortedKeywordRows.map((keywordRow) => (
                                        <div
                                          key={keywordRow.keyword}
                                          className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-x-4 rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-white/70"
                                        >
                                          <p className="break-words leading-6">
                                            {keywordRow.keyword}
                                          </p>
                                          <p>
                                            {keywordRow.count.toLocaleString(
                                              "en-US",
                                            )}
                                            명
                                          </p>
                                        </div>
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
                            {isDetailLoading
                              ? "이벤트 데이터를 불러오는 중입니다."
                              : "표시할 대시보드 데이터가 없습니다."}
                          </div>
                        )
                      ) : null}

                        {eventDetailTab === "participants" ? (
                          selectedEventInsights ? (
                            <div className="space-y-5">
                                <div className="overflow-hidden rounded-[1.35rem] border border-brand-50 bg-white">
                                <Table className="table-fixed">
                                  <TableHeader className="bg-[#f7fbf2]">
                                    <TableRow className="border-none hover:bg-transparent">
                                      <TableHead className="w-[13%]">
                                        <SortHeaderButton
                                          active={participantSort.key === "name"}
                                          direction={participantSort.direction}
                                          onClick={() => toggleParticipantSort("name")}
                                        >
                                          이름
                                        </SortHeaderButton>
                                      </TableHead>
                                      <TableHead className="w-[20%]">
                                        <SortHeaderButton
                                          active={participantSort.key === "email"}
                                          direction={participantSort.direction}
                                          onClick={() => toggleParticipantSort("email")}
                                        >
                                          이메일
                                        </SortHeaderButton>
                                      </TableHead>
                                      <TableHead className="w-[28%]">
                                        <SortHeaderButton
                                          active={participantSort.key === "progress"}
                                          direction={participantSort.direction}
                                          onClick={() =>
                                            toggleParticipantSort("progress")
                                          }
                                        >
                                          상태
                                        </SortHeaderButton>
                                      </TableHead>
                                      <TableHead className="w-[39%]">
                                        <SortHeaderButton
                                          active={participantSort.key === "keywords"}
                                          direction={participantSort.direction}
                                          onClick={() =>
                                            toggleParticipantSort("keywords")
                                          }
                                        >
                                          키워드
                                        </SortHeaderButton>
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {visibleParticipants.map((participant) => {
                                      const visibleKeywords =
                                        participant.keywords.slice(0, 4);
                                      const hiddenKeywordCount = Math.max(
                                        0,
                                        participant.keywords.length -
                                          visibleKeywords.length,
                                      );

                                      return (
                                        <TableRow
                                          key={participant.id}
                                          className="hover:bg-[#fbfcf8]"
                                        >
                                          <TableCell className="truncate text-base font-bold tracking-tight text-slate-900">
                                            {participant.name}
                                          </TableCell>
                                          <TableCell className="truncate text-sm text-slate-700">
                                            {participant.email}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex min-w-0 items-center gap-3">
                                              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                  className="h-full rounded-full bg-brand-500"
                                                  style={{
                                                    width: `${participant.progressPercent}%`,
                                                  }}
                                                />
                                              </div>
                                              <span className="w-11 text-right text-sm font-semibold text-slate-900">
                                                {participant.progressPercent}%
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex min-w-0 flex-wrap gap-2">
                                              {visibleKeywords.length > 0 ? (
                                                visibleKeywords.map((keyword) => (
                                                  <span
                                                    key={`${participant.id}-${keyword}`}
                                                    className="max-w-full truncate rounded-xl bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-700"
                                                  >
                                                    {keyword}
                                                  </span>
                                                ))
                                              ) : (
                                                <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-500">
                                                  키워드 선택 전
                                                </span>
                                              )}
                                              {hiddenKeywordCount > 0 ? (
                                                <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-500">
                                                  +{hiddenKeywordCount}
                                                </span>
                                              ) : null}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>

                            <div className="flex items-center justify-center gap-1 text-slate-400">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30"
                                disabled={participantPage === 1}
                                onClick={() =>
                                  setParticipantPage((previousValue) =>
                                    Math.max(1, previousValue - 1),
                                  )
                                }
                              >
                                <ChevronLeftIcon />
                              </button>

                              {Array.from(
                                { length: participantTotalPages },
                                (_, index) => index + 1,
                              ).map((pageNumber) => (
                                <button
                                  key={pageNumber}
                                  type="button"
                                  className={cn(
                                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-brand-50 hover:text-brand-600",
                                    participantPage === pageNumber &&
                                      "bg-brand-100 font-bold text-brand-700",
                                  )}
                                  onClick={() => setParticipantPage(pageNumber)}
                                >
                                  {pageNumber}
                                </button>
                              ))}

                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30"
                                disabled={
                                  participantPage === participantTotalPages
                                }
                                onClick={() =>
                                  setParticipantPage((previousValue) =>
                                    Math.min(
                                      participantTotalPages,
                                      previousValue + 1,
                                    ),
                                  )
                                }
                              >
                                <ChevronRightIcon />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-h-[20rem] items-center justify-center rounded-[1.6rem] bg-[#f7fbf2] text-base font-semibold text-slate-400">
                            {isDetailLoading
                              ? "참가자 목록을 불러오는 중입니다."
                              : "표시할 참가자 데이터가 없습니다."}
                          </div>
                        )
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex min-h-[28rem] items-center justify-center">
                      <div className="space-y-4 text-center">
                        <p className="text-2xl font-black tracking-tight text-slate-900">
                          {isDetailLoading
                            ? "이벤트를 불러오는 중입니다."
                            : "선택한 이벤트를 찾을 수 없습니다."}
                        </p>
                        {!isDetailLoading ? (
                          <p className="text-sm text-slate-500">
                            목록으로 돌아가 다시 선택해 주세요.
                          </p>
                        ) : null}
                        <Button
                          className="rounded-full px-5"
                          onClick={goBackToEventList}
                        >
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
                            onChange={(event) =>
                              setEventSearchQuery(event.target.value)
                            }
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
                      <Table className="table-fixed">
                        <TableHeader className="bg-[#f6f8ef]">
                          <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="w-[34%]">행사명</TableHead>
                            <TableHead className="w-[11rem] whitespace-nowrap">
                              날짜
                            </TableHead>
                            <TableHead className="w-[5.5rem] whitespace-nowrap text-center">
                              참여자수
                            </TableHead>
                            <TableHead className="w-[6.25rem]">상태</TableHead>
                            <TableHead className="w-[13rem] whitespace-nowrap">
                              진행도
                            </TableHead>
                            <TableHead className="w-[3rem]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleEvents.map((eventItem) => (
                            <TableRow
                              key={eventItem.id}
                              className="cursor-pointer"
                              onClick={() => goToEventDetail(eventItem.id)}
                            >
                              <TableCell className="font-semibold text-slate-800">
                                <div className="min-w-0 space-y-2">
                                  <p className="truncate text-base font-black text-slate-900">
                                    {eventItem.name}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-2 text-sm font-medium text-slate-700">
                                  {formatEventRowDate(eventItem.startAt)}
                                </span>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-center">
                                <span className="text-base font-black tracking-tight text-slate-900">
                                  {eventItem.participantCount.toLocaleString(
                                    "en-US",
                                  )}
                                </span>
                                <span className="ml-0.5 text-sm font-bold text-slate-500">
                                  명
                                </span>
                              </TableCell>
                              <TableCell>
                                <EventStatusBadge status={eventItem.status} />
                              </TableCell>
                              <TableCell>
                                <EventProgress
                                  current={eventItem.progressCurrent}
                                  total={eventItem.progressTotal}
                                  compact
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

                    <div className="flex items-center justify-center gap-1 text-slate-400">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30"
                        disabled={eventPage === 1}
                        onClick={() =>
                          setEventPage((previousValue) =>
                            Math.max(1, previousValue - 1),
                          )
                        }
                      >
                        <ChevronLeftIcon />
                      </button>

                      {Array.from(
                        { length: eventTotalPages },
                        (_, index) => index + 1,
                      ).map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-brand-50 hover:text-brand-600",
                            eventPage === pageNumber &&
                              "bg-brand-100 font-bold text-brand-700",
                          )}
                          onClick={() => setEventPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30"
                        disabled={eventPage === eventTotalPages}
                        onClick={() =>
                          setEventPage((previousValue) =>
                            Math.min(eventTotalPages, previousValue + 1),
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
                    title="개인정보 처리 안내"
                    description="행사 참가자 안내 템플릿을 관리합니다. 서비스 개인정보처리방침은 프론트 고정 문서로 관리합니다."
                    layoutVariant={layoutVariant}
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

                  <div className="flex flex-wrap gap-3">
                    {POLICY_TEMPLATE_OPTIONS.map((option) => {
                      const isSelected = option.key === selectedPolicyKey;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                            isSelected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700",
                          )}
                          onClick={() => {
                            setSelectedPolicyKey(option.key);
                            setPolicyError("");
                            setPolicyNotice("");
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)] xl:min-h-[calc(100vh-16rem)]">
                    <Card className="overflow-hidden rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none">
                      <CardHeader className="space-y-2 p-7 pb-0">
                        <CardTitle>템플릿 안내</CardTitle>
                        <CardDescription>
                          저장 즉시 로그인 전 안내 모달과 행사별 개인정보 안내
                          페이지에 반영됩니다. 서비스 개인정보처리방침은 프론트
                          고정 문서로 관리합니다.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 p-7 pt-6">
                        <div className="rounded-[1.35rem] border border-white/90 bg-white/90 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            현재 선택
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                            {selectedPolicyOption.label}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {selectedPolicyOption.description}
                          </p>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/90 bg-white/90 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            수정 권한
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                            Admin만 행사 참가자 안내 템플릿을 수정하고 게시할 수
                            있습니다.
                          </p>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/90 bg-white/90 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            치환 변수
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                            행사 참가자 안내는{" "}
                            {
                              "{eventName}, {eventTeam}, {eventContactEmail}, {platformHost}"
                            }
                            를 사용합니다.
                          </p>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/90 bg-white/90 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            마지막 수정
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                            {activePolicyTemplate
                              ? `${activePolicyTemplate.updatedByName ?? "시스템 기본값"} · ${formatAdminDate(
                                  activePolicyTemplate.updatedAt,
                                )}`
                              : "아직 불러오지 않았습니다."}
                          </p>
                        </div>
                        <div className="rounded-[1.35rem] border border-amber-100 bg-amber-50/80 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                            게시 전 점검
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
                            기본값은 개인식별정보 1년 이내 삭제·익명화와 익명
                            통계·행사 아카이브 장기 보관 기준입니다.
                            Google/Supabase의 위탁, 제3자 제공, 국외 이전 해당
                            여부는 실제 연동 방식과 계약관계, 데이터 저장 위치
                            확인 후 확정해 주세요.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid min-h-0 gap-4">
                      {canEditPolicyTemplate ? (
                        <Card className="overflow-hidden rounded-[1.75rem] border-[#e8efe0] bg-[#fbfcf8] shadow-none">
                          <CardHeader className="space-y-2 p-7 pb-0">
                            <CardTitle>템플릿 편집</CardTitle>
                            <CardDescription>
                              행사 참가자 안내 마크다운 원문을 저장하면 해당
                              공개 화면에 바로 반영됩니다.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-7 pt-6">
                            {isPolicyLoading ? (
                              <EmptyPanelState
                                className="min-h-[16rem]"
                                message="개인정보 처리 문안을 불러오는 중입니다."
                              />
                            ) : (
                              <div className="space-y-3">
                                <Label htmlFor="policy-template-editor">
                                  {selectedPolicyOption.label} 마크다운 원문
                                </Label>
                                <Textarea
                                  id="policy-template-editor"
                                  value={policyDraft}
                                  onChange={(event) => {
                                    setPolicyDrafts((currentDrafts) => ({
                                      ...currentDrafts,
                                      [selectedPolicyKey]: event.target.value,
                                    }));
                                    if (policyNotice) {
                                      setPolicyNotice("");
                                    }
                                  }}
                                  className="min-h-[20rem] rounded-[1.25rem] border-white/90 bg-white/90 font-mono text-xs leading-6 shadow-none"
                                  placeholder={`# ${selectedPolicyOption.label}`}
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
                            치환 변수는 미리보기에서 샘플 행사와 서비스 운영팀 기준
                            값으로 치환됩니다.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex min-h-0 flex-1 flex-col p-7 pt-6">
                          {isPolicyLoading ? (
                            <EmptyPanelState
                              className="min-h-[24rem]"
                              message="개인정보 처리 문안을 불러오는 중입니다."
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
                                    <h2 className="mb-4 mt-10 text-xl font-black text-slate-900">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="mb-3 mt-7 text-lg font-bold text-slate-900">
                                      {children}
                                    </h3>
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
                                  li: ({ children }) => (
                                    <li className="pl-1">{children}</li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-bold text-slate-900">
                                      {children}
                                    </strong>
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
                <h2 className="text-2xl font-black tracking-tight text-brand-800">
                  관리자 추가
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  승인된 이메일로 Google 로그인하면 바로 관리자 페이지에 접속할
                  수 있습니다. Gmail이 아니어도 Google 계정에 연결된 이메일이면
                  사용할 수 있습니다.
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

            <form
              className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden"
              onSubmit={handleCreateAdmin}
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-4 [scrollbar-gutter:stable_both-edges]">
                <div className="space-y-2">
                  <Label htmlFor="new-admin-email">
                    Google 로그인에 사용할 이메일
                  </Label>
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
                    placeholder="organizer@example.com"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    승인 후 이 이메일로 Google 로그인합니다. Gmail 주소가
                    아니어도 Google 계정에 연결되어 있으면 사용할 수 있습니다.
                  </p>
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
                    {(
                      [
                        ["admin", "Admin"],
                        ["event_manager", "Event manager"],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        variant={
                          newAdminForm.role === value ? "outline" : "secondary"
                        }
                        className={cn(
                          "rounded-2xl border-brand-600 bg-white text-base text-brand-700 hover:bg-brand-50",
                          newAdminForm.role !== value &&
                            "border-transparent bg-brand-50 text-slate-500 hover:bg-brand-100",
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
                {addFormError ? (
                  <p className="text-sm font-semibold text-rose-600">
                    {addFormError}
                  </p>
                ) : null}

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
                  행사명, 위치, 시간, 참가 설정, Event team, 키워드를 행사별로
                  설정할 수 있습니다.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  setShowEventModal(false);
                  setEventFormError("");
                }}
              >
                <CloseIcon />
              </Button>
            </div>

            <form
              className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden"
              onSubmit={handleSaveEvent}
            >
              <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-4 [scrollbar-gutter:stable_both-edges]">
                <div className="space-y-2">
                  <Label htmlFor="event-modal-name">행사 이름</Label>
                  <Input
                    id="event-modal-name"
                    value={eventForm.name}
                    onChange={(event) =>
                      handleEventNameChange(event.target.value)
                    }
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
                      placeholder="행사 운영팀"
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

                <div className="grid gap-4 rounded-2xl bg-[#f7fbf2] p-4 ring-1 ring-brand-100 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="event-modal-expected-attendee-count">
                      예상 참가자 수
                    </Label>
                    <Input
                      id="event-modal-expected-attendee-count"
                      type="number"
                      min="1"
                      max="100000"
                      value={eventForm.expectedAttendeeCount}
                      onChange={(event) =>
                        setEventForm((previousValue) => ({
                          ...previousValue,
                          expectedAttendeeCount: event.target.value,
                        }))
                      }
                      placeholder="예: 100"
                      className="h-12 rounded-xl bg-white"
                    />
                    <p className="text-xs font-semibold leading-5 text-slate-500">
                      운영 참고용 인원입니다. 현재 참가자 수는 자동 집계됩니다.
                    </p>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        시작 전 참가 제한
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        켜짐이면 행사 시작 전에는 카운트다운을 보여주고, 시작
                        시간이 되면 빙고 게임에 입장할 수 있습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={eventForm.restrictBeforeStart}
                      className={cn(
                        "inline-flex h-11 w-full items-center justify-between rounded-full px-4 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                        eventForm.restrictBeforeStart
                          ? "bg-brand-700 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                      onClick={() =>
                        setEventForm((previousValue) => ({
                          ...previousValue,
                          restrictBeforeStart: !previousValue.restrictBeforeStart,
                        }))
                      }
                    >
                      <span>
                        {eventForm.restrictBeforeStart
                          ? "제한 켜짐"
                          : "제한 꺼짐"}
                      </span>
                      <span
                        className={cn(
                          "h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
                          eventForm.restrictBeforeStart
                            ? "translate-x-1"
                            : "-translate-x-1",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    {!eventForm.restrictBeforeStart ? (
                      <p className="text-xs font-semibold leading-5 text-amber-700">
                        꺼짐이면 시작 전에도 참가자가 빙고 게임에 입장할 수
                        있습니다. 리허설 후에는 참가자 데이터 초기화를 권장합니다.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>빙고 크기</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["3", "4", "5"] as const).map((size) => (
                      <Button
                        key={size}
                        variant="outline"
                        className={cn(
                          "h-12 rounded-xl border-2 bg-white text-base font-semibold shadow-sm transition-colors",
                          eventForm.boardSize === size
                            ? "border-brand-700 text-slate-900 ring-1 ring-brand-200 hover:bg-brand-50"
                            : "border-slate-300 text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
                        )}
                        onClick={() =>
                          setEventForm((previousValue) => {
                            const nextGoal = previousValue.bingoMissionCount;
                            const nextKeywords = selectedKeywordPresetId
                              ? buildEventKeywordPresetKeywords(
                                  selectedKeywordPresetId,
                                  size,
                                )
                              : clampKeywordList(previousValue.keywords, size);

                            return {
                              ...previousValue,
                              boardSize: size,
                              bingoMissionCount:
                                Number(nextGoal) > Number(size)
                                  ? size
                                  : nextGoal,
                              keywords: nextKeywords,
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
                  <Label htmlFor="event-modal-bingo-mission">
                    성공 조건(완성해야하는 빙고 수)
                  </Label>
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
                    placeholder="3줄"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Label>키워드 관리</Label>
                      <p className="mt-1 text-xs text-brand-700">
                        현재 키워드: {keywordAutofillSummary.currentCount}개,
                        필요 키워드 {keywordAutofillSummary.goalCount}개
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        카테고리를 고르면 행사 분위기에 맞는 기본 키워드가 바로
                        채워집니다.
                      </p>
                      {keywordAutofillSummary.missingCount > 0 ? (
                        <p className="mt-1 text-xs text-amber-700">
                          저장 시 부족한 {keywordAutofillSummary.missingCount}
                          개는 &quot;
                          {keywordAutofillSummary.generatedKeywords[0]}
                          &quot;부터 자동으로 채워집니다.
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-emerald-700">
                          저장 시 현재 키워드 목록이 그대로 사용됩니다.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 rounded-md bg-brand-100 px-3 text-[0.72rem] font-bold text-brand-800 hover:bg-brand-200"
                        onClick={() =>
                          setIsImportEventPanelOpen(
                            (previousValue) => !previousValue,
                          )
                        }
                      >
                        {isImportEventPanelOpen
                          ? "가져오기 닫기"
                          : "기존 행사에서 가져오기"}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 rounded-md bg-brand-700 px-3 text-[0.72rem] font-bold hover:bg-brand-800"
                        onClick={() => {
                          setSelectedKeywordPresetId("");
                          setEventForm((previousValue) => ({
                            ...previousValue,
                            keywords: [],
                            keywordDraft: "",
                          }));
                        }}
                      >
                        전체 삭제
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="mr-1 text-xs font-black text-slate-500">
                        추천 카테고리
                      </p>
                      {EVENT_KEYWORD_PRESET_OPTIONS.map((preset) => {
                        const isSelected = selectedKeywordPresetId === preset.id;

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                              isSelected
                                ? "border-brand-700 bg-brand-700 text-white"
                                : "border-slate-200 bg-white text-brand-800 hover:border-brand-300 hover:bg-brand-50",
                            )}
                            onClick={() => handleApplyKeywordPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-2 text-xs text-slate-600">
                      {selectedKeywordPreset
                        ? selectedKeywordPreset.description
                        : "원하는 분위기 카테고리를 골라 키워드를 바로 채우세요."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {eventForm.keywords.map((keyword) => (
                        <button
                          key={keyword}
                          type="button"
                          className="rounded-md bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700"
                          onClick={() => {
                            setSelectedKeywordPresetId("");
                            setEventForm((previousValue) => ({
                              ...previousValue,
                              keywords: previousValue.keywords.filter(
                                (item) => item !== keyword,
                              ),
                            }));
                          }}
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
                        onCompositionStart={() => {
                          isKeywordDraftComposingRef.current = true;
                        }}
                        onCompositionEnd={() => {
                          isKeywordDraftComposingRef.current = false;
                        }}
                        onBlur={(event) => {
                          if (skipKeywordDraftBlurRef.current) {
                            skipKeywordDraftBlurRef.current = false;
                            return;
                          }

                          addKeyword(event.currentTarget.value);
                        }}
                        onKeyDown={handleKeywordDraftKeyDown}
                        placeholder={
                          eventForm.keywords.length === 0
                            ? "키워드를 입력하고 Enter를 누르세요."
                            : ""
                        }
                        className="min-w-[10rem] flex-1 border-0 bg-transparent px-2 py-1 text-sm text-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  {isImportEventPanelOpen ? (
                    <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 px-4 py-4">
                      <div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            기존 행사 키워드 가져오기
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            가져올 행사를 먼저 선택한 뒤 키워드를 불러오세요.
                          </p>
                        </div>
                      </div>

                      {availableImportEvents.length > 0 ? (
                        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="event-modal-import-source">
                              가져올 행사
                            </Label>
                            <select
                              id="event-modal-import-source"
                              value={importSourceEventId}
                              onChange={(event) =>
                                setImportSourceEventId(event.target.value)
                              }
                              className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500"
                            >
                              {availableImportEvents.map((eventItem) => (
                                <option
                                  key={eventItem.id}
                                  value={String(eventItem.id)}
                                >
                                  {`${eventItem.name} · ${formatEventRowDate(eventItem.startAt)} · ${eventItem.boardSize}x${eventItem.boardSize}`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <Button
                            size="sm"
                            className="h-12 rounded-xl bg-brand-700 px-4 text-sm font-bold hover:bg-brand-800"
                            onClick={handleImportKeywordsFromEvent}
                          >
                            키워드 가져오기
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                          가져올 수 있는 기존 행사가 없습니다.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {keywordRecommendationNotice ? (
                    <p className="text-xs font-semibold text-sky-700">
                      {keywordRecommendationNotice}
                    </p>
                  ) : null}

                  {keywordRecommendationError ? (
                    <p className="text-xs font-semibold text-rose-600">
                      {keywordRecommendationError}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-modal-email">행사 문의 이메일</Label>
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
                    placeholder="event-team@example.com"
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="mt-4 shrink-0 space-y-3 border-t border-slate-100 pt-4">
                {eventFormError ? (
                  <p className="text-sm font-semibold text-rose-600">
                    {eventFormError}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl text-lg font-bold"
                >
                  확인
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
};

export const AdminRoutesLoginPage = LoginPage;
export const AdminDashboardPage = () => (
  <AdminConsolePage section="dashboard" />
);
export const AdminMembersPage = () => <AdminConsolePage section="members" />;
export const AdminApplicationsPage = () => (
  <AdminConsolePage section="applications" />
);
export const AdminEventSettingsPage = () => (
  <AdminConsolePage section="event-settings" />
);
export const AdminEventDetailPage = () => {
  const { pathname } = useLocation();
  const eventDetailTab: EventDetailTab = pathname.endsWith("/dashboard")
    ? "dashboard"
    : pathname.endsWith("/participants")
      ? "participants"
      : pathname.endsWith("/share")
        ? "share"
        : "overview";

  return (
    <AdminConsolePage section="event-settings" eventDetailTab={eventDetailTab} />
  );
};
export const AdminPoliciesPage = () => <AdminConsolePage section="policies" />;

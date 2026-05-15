import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  clearLocalMockMode,
  getLocalMockTesterUsers,
  loginWithLocalMockTester,
  resetLocalMockTesterData,
} from "../../api/bingo_api";
import type { MockTesterUser } from "../../api/bingo_api";
import GoogleSignInButton from "../Auth/GoogleSignInButton";
import {
  getEventBingoPath,
  getEventHomePath,
  withSearch,
} from "../../config/eventProfiles";
import { useEventProfile } from "../../hooks/useEventProfile";
import { isGoogleIdentityConfigured } from "../../lib/googleIdentity";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  maybeGetSupabaseClient,
} from "../../lib/supabaseClient";
import {
  clearAuthSession,
  getAuthSession,
  normalizeAuthEmail,
  setAuthSession,
} from "../../utils/authSession";
import { ensureBingoGoogleBridge } from "../../utils/bingoGoogleBridge";
import { clearLegacyLocalLoginStorage } from "../../utils/legacyAuthStorage";
import { isTestModeEnabled, syncTestModeFromUrl } from "../../utils/testMode";
import bingoLoginCharacterIllustration from "../../assets/illustrations/bingo-login-character.svg";
import topIllustration from "../../assets/illustrations/top.svg";
import { Dialog } from "../../components/ui/dialog";
import ConsentDialog from "./ConsentDialog";
import {
  HOME_EVENT_DISPLAY_FALLBACKS,
  resolveHomeEventSummary,
} from "./homeDisplay";
import PublicEventStatePage from "../../components/PublicEventStatePage";
import "./Home.css";

const normalizeTesterCode = (value: string | undefined | null) => {
  return value?.trim().toUpperCase().replace(/\s/g, "") ?? "";
};

const CalendarIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="login-event-card__icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
};

const PlaceIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="login-event-card__icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
};

type HomeStatusToastProps = {
  message: string;
  severity: "error" | "success";
  onClose: () => void;
};

const HomeStatusToast = ({ message, severity, onClose }: HomeStatusToastProps) => {
  const toneClassName =
    severity === "success"
      ? "border-emerald-200 bg-white/95 text-emerald-950 shadow-[0_18px_40px_rgba(16,84,64,0.18)]"
      : "border-rose-200 bg-white/95 text-rose-950 shadow-[0_18px_40px_rgba(127,29,29,0.14)]";
  const badgeClassName =
    severity === "success"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-rose-100 text-rose-700";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-3xl border px-4 py-3 backdrop-blur ${toneClassName}`}
        role="status"
        aria-live="polite"
      >
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${badgeClassName}`}>
          {severity === "success" ? "완료" : "오류"}
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold leading-6">{message}</p>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventSlug } = useParams();
  const {
    eventProfile,
    loadState: eventProfileLoadState,
    errorMessage: eventProfileErrorMessage,
    isResolved: isEventProfileResolved,
    isAvailable: isEventProfileAvailable,
  } = useEventProfile(eventSlug);
  const eventHomePath = useMemo(
    () => withSearch(getEventHomePath(eventProfile.slug), location.search),
    [eventProfile.slug, location.search]
  );
  const eventBingoPath = useMemo(
    () => withSearch(getEventBingoPath(eventProfile.slug), location.search),
    [eventProfile.slug, location.search]
  );

  const [participantName, setParticipantName] = useState("");
  const [currentLoginId, setCurrentLoginId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyNoticeConfirmed, setPrivacyNoticeConfirmed] = useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<"error" | "success">(
    "error"
  );
  const [testModeEnabled, setTestModeEnabledState] = useState(() => isTestModeEnabled());
  const [mockTesterUsers, setMockTesterUsers] = useState<MockTesterUser[]>([]);
  const [mockTesterLoading, setMockTesterLoading] = useState(false);
  const [mockTesterResetting, setMockTesterResetting] = useState(false);
  const [activeTesterCode, setActiveTesterCode] = useState<string | null>(null);
  const [handledTestCode, setHandledTestCode] = useState<string | null>(null);
  const shouldUseGoogleAuth =
    !testModeEnabled && isSupabaseConfigured() && isGoogleIdentityConfigured();
  const hasParticipantName = participantName.trim().length > 0;
  const canStartGoogleLogin = termsAccepted && privacyNoticeConfirmed;
  const eventSummary = useMemo(
    () => resolveHomeEventSummary(eventProfile, isEventProfileResolved),
    [eventProfile, isEventProfileResolved]
  );

  useEffect(() => {
    setTestModeEnabledState(syncTestModeFromUrl(location.search));
  }, [location.search]);

  useEffect(() => {
    if (!alertOpen) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setAlertOpen(false);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [alertMessage, alertOpen]);

  useEffect(() => {
    const storedSession = getAuthSession();
    if (shouldUseGoogleAuth) {
      clearLegacyLocalLoginStorage();

      if (!storedSession) {
        return;
      }

      setParticipantName(storedSession.userName);
      setCurrentLoginId(storedSession.loginId);
      setGoogleAccountEmail(normalizeAuthEmail(storedSession.userEmail));
      setIsLoggedIn(true);
      return;
    }

    if (!storedSession) {
      return;
    }

    setParticipantName(storedSession.userName);
    setCurrentLoginId(storedSession.loginId);
    setIsLoggedIn(true);
  }, [shouldUseGoogleAuth]);

  const testCodeFromQuery = useMemo(() => {
    return normalizeTesterCode(new URLSearchParams(location.search).get("testCode"));
  }, [location.search]);

  const openAlert = useCallback((message: string, severity: "error" | "success" = "error") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  }, []);

  const loadMockTesterUsers = useCallback(async () => {
    if (!testModeEnabled) {
      setMockTesterUsers([]);
      return;
    }

    try {
      setMockTesterLoading(true);
      const users = await getLocalMockTesterUsers();
      setMockTesterUsers(users);
    } catch (error) {
      console.error("Failed to load local tester users", error);
      openAlert("테스트 계정 목록을 불러오지 못했습니다.");
    } finally {
      setMockTesterLoading(false);
    }
  }, [openAlert, testModeEnabled]);

  const applyLoginSession = useCallback(({
    userId,
    userName,
    loginId,
    userEmail,
  }: {
    userId: string;
    userName: string;
    loginId: string;
    userEmail?: string;
  }) => {
    setAuthSession({
      userId,
      userName,
      loginId,
      userEmail,
    });
    setParticipantName(userName);
    setCurrentLoginId(loginId);
    setIsLoggedIn(true);
  }, []);

  const applyGoogleBridgeState = useCallback(
    ({
      authSession,
      googleProfile,
    }: Awaited<ReturnType<typeof ensureBingoGoogleBridge>>) => {
      applyLoginSession(authSession);
      setGoogleAccountEmail(googleProfile.email);
    },
    [applyLoginSession]
  );

  const clearCurrentSessionState = useCallback(() => {
    clearAuthSession();
    clearLocalMockMode();
    setParticipantName("");
    setCurrentLoginId("");
    setIsLoggedIn(false);
    setGoogleAccountEmail("");
  }, []);

  useEffect(() => {
    if (!shouldUseGoogleAuth || googleAccountEmail || !isEventProfileAvailable) {
      return;
    }

    let cancelled = false;

    const restoreGoogleSession = async () => {
      const supabase = maybeGetSupabaseClient();
      if (!supabase) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session?.user) {
        return;
      }

      try {
        clearLegacyLocalLoginStorage();
        const bridgeResult = await ensureBingoGoogleBridge(session.user, eventProfile.slug);
        if (cancelled) {
          return;
        }

        applyGoogleBridgeState(bridgeResult);
        if (!bridgeResult.authSession.userName.trim()) {
          navigate(eventBingoPath, { replace: true });
        }
      } catch (error) {
        await supabase.auth.signOut();
        if (!cancelled) {
          openAlert(
            error instanceof Error
              ? error.message
              : "Google 로그인 정보를 복구하지 못했습니다."
          );
        }
      }
    };

    void restoreGoogleSession();

    return () => {
      cancelled = true;
    };
  }, [
    applyGoogleBridgeState,
    eventBingoPath,
    eventProfile.slug,
    googleAccountEmail,
    isEventProfileAvailable,
    navigate,
    openAlert,
    shouldUseGoogleAuth,
  ]);

  const handleGoogleBingoLogin = async ({
    credential,
    nonce,
  }: {
    credential: string;
    nonce: string;
  }) => {
    if (!isEventProfileAvailable) {
      openAlert("행사 정보를 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    const supabase = getSupabaseClient();

    try {
      clearLocalMockMode();

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
        nonce,
      });

      if (error) {
        throw error;
      }

      const user = data.user ?? data.session?.user;
      if (!user) {
        throw new Error("Google 로그인 세션을 확인하지 못했습니다.");
      }

      clearLegacyLocalLoginStorage();
      const bridgeResult = await ensureBingoGoogleBridge(user, eventProfile.slug);
      applyGoogleBridgeState(bridgeResult);
      navigate(eventBingoPath, { replace: true });
    } catch (error) {
      await supabase.auth.signOut();
      clearCurrentSessionState();
      openAlert(
        error instanceof Error ? error.message : "Google 로그인 중 오류가 발생했습니다."
      );
    }
  };

  const handleTesterLogin = useCallback(async (tester: MockTesterUser) => {
    if (!isEventProfileAvailable) {
      openAlert("유효한 행사 주소에서만 테스트 로그인을 진행할 수 있습니다.");
      return;
    }

    try {
      setActiveTesterCode(tester.accessCode);

      const result = await loginWithLocalMockTester(tester.accessCode, tester.userName);

      if (
        !result.ok ||
        result.user_id == null ||
        !result.user_name ||
        !result.login_id
      ) {
        openAlert(result.message || "테스트 계정 전환에 실패했습니다.");
        return;
      }

      applyLoginSession({
        userId: String(result.user_id),
        userName: result.user_name,
        loginId: result.login_id,
        userEmail: result.user_email ?? undefined,
      });
      openAlert(`"${result.user_name}" 계정으로 전환했습니다.`, "success");
      navigate(eventBingoPath, { replace: true });
    } catch (error) {
      console.error("Failed to switch tester session", error);
      openAlert("테스트 계정 전환 중 오류가 발생했습니다.");
    } finally {
      setActiveTesterCode(null);
    }
  }, [applyLoginSession, eventBingoPath, isEventProfileAvailable, navigate, openAlert]);

  const handleResetMockTesterData = useCallback(async () => {
    const shouldReset = window.confirm(
      "로컬 테스트 보드와 교환 기록을 처음 상태로 되돌릴까요?"
    );

    if (!shouldReset) {
      return;
    }

    try {
      setMockTesterResetting(true);
      setMockTesterUsers([]);
      resetLocalMockTesterData();
      clearCurrentSessionState();
      navigate(eventHomePath, { replace: true });
      await loadMockTesterUsers();
      openAlert("테스트 데이터를 처음 상태로 초기화했습니다.", "success");
    } catch (error) {
      console.error("Failed to reset local mock tester data", error);
      openAlert("테스트 데이터 초기화 중 오류가 발생했습니다.");
    } finally {
      setMockTesterResetting(false);
    }
  }, [clearCurrentSessionState, eventHomePath, loadMockTesterUsers, navigate, openAlert]);

  useEffect(() => {
    if (!testModeEnabled) {
      setMockTesterUsers([]);
      return;
    }

    void loadMockTesterUsers();
  }, [loadMockTesterUsers, testModeEnabled]);

  useEffect(() => {
    if (
      !isEventProfileAvailable ||
      !testModeEnabled ||
      !testCodeFromQuery ||
      handledTestCode === testCodeFromQuery
    ) {
      return;
    }

    setHandledTestCode(testCodeFromQuery);

    const targetTester =
      mockTesterUsers.find((tester) => normalizeTesterCode(tester.accessCode) === testCodeFromQuery) ?? {
        userId: "",
        userName: testCodeFromQuery,
        accessCode: testCodeFromQuery,
        hasBoard: true,
      };

    void handleTesterLogin(targetTester);
  }, [
    handledTestCode,
    handleTesterLogin,
    mockTesterUsers,
    testCodeFromQuery,
    testModeEnabled,
    isEventProfileAvailable,
  ]);

  const handleLogout = () => {
    clearCurrentSessionState();
    if (shouldUseGoogleAuth) {
      void maybeGetSupabaseClient()?.auth.signOut();
    }
  };

  const openTesterInNewTab = (tester: MockTesterUser) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.pathname = getEventHomePath(eventProfile.slug);
    nextUrl.search = "";
    nextUrl.searchParams.set("testMode", "1");
    nextUrl.searchParams.set("testCode", tester.accessCode);
    window.open(nextUrl.toString(), "_blank", "noopener,noreferrer");
  };

  const renderTesterPanel = () => {
    if (!testModeEnabled) {
      return null;
    }

    return (
      <section className="login-dev-panel" aria-label="local mock tester">
        <div className="login-dev-panel__header">
          <div>
            <p className="login-dev-panel__eyebrow">테스트 모드 계정</p>
            <h3>탭마다 다른 계정으로 바로 테스트</h3>
          </div>
          <div className="login-dev-panel__tools">
            <button
              type="button"
              className="login-dev-panel__refresh"
              onClick={() => {
                void loadMockTesterUsers();
              }}
              disabled={mockTesterLoading || mockTesterResetting}
            >
              {mockTesterLoading ? "불러오는 중..." : "새로고침"}
            </button>
            <button
              type="button"
              className="login-dev-panel__reset"
              onClick={() => {
                void handleResetMockTesterData();
              }}
              disabled={mockTesterLoading || mockTesterResetting}
            >
              {mockTesterResetting ? "초기화 중..." : "테스트 초기화"}
            </button>
          </div>
        </div>
        <p className="login-dev-panel__description">
          테스트 계정 로그인은 현재 탭의 `sessionStorage`를 쓰고, mock 보드와 교환
          기록은 브라우저 전체에서 공유합니다. 그래서 여러 탭을 열어 두면 서로 다른
          계정끼리 바로 교환 테스트를 할 수 있습니다.
        </p>

        <div className="login-dev-panel__list">
          {mockTesterUsers.map((tester) => {
            const isActive = normalizeTesterCode(currentLoginId) === normalizeTesterCode(tester.accessCode);

            return (
              <article
                key={`${tester.userId}-${tester.accessCode}`}
                className={`login-dev-user ${isActive ? "is-active" : ""}`}
              >
                <div className="login-dev-user__meta">
                  <strong>{tester.userName}</strong>
                  <span>ID {tester.userId}</span>
                  <span>{tester.hasBoard ? "보드 준비 완료" : "보드 미준비"}</span>
                </div>
                <div className="login-dev-user__actions">
                  <button
                    type="button"
                    className="login-dev-user__button"
                    onClick={() => {
                      void handleTesterLogin(tester);
                    }}
                    disabled={
                      mockTesterResetting || activeTesterCode === tester.accessCode
                    }
                  >
                    {activeTesterCode === tester.accessCode ? "전환 중..." : "이 탭으로"}
                  </button>
                  <button
                    type="button"
                    className="login-dev-user__button is-secondary"
                    onClick={() => openTesterInNewTab(tester)}
                    disabled={mockTesterResetting}
                  >
                    새 탭 열기
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  const renderGoogleLoginPanel = () => {
    return (
      <div className="login-google-panel">
        <div className="login-policy">
          <p className="login-policy__eyebrow">로그인 전 확인</p>
          <p className="login-policy__summary">
            Google로 계속하면 Google 계정의 이름, 이메일 주소, 계정 고유
            식별자를 사용해 이 행사 참가 계정을 만듭니다. 행사 중 선택한
            키워드, 빙고 보드, 진행률, 키워드 교환 기록은 빙고 진행과 행사
            운영을 위해 사용됩니다.
          </p>
        </div>

        <div className="login-google-panel__button-wrap">
          <div className="login-google-panel__button-slot">
            <div className="login-required-checks" aria-label="필수 확인 항목">
              <label className="login-required-check">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                />
                <span>
                  <span className="login-required-check__prefix">[필수]</span>{" "}
                  <Link to="/terms" target="_blank" rel="noreferrer">
                    서비스 이용약관
                  </Link>
                  에 동의합니다
                </span>
              </label>
              <label className="login-required-check">
                <input
                  type="checkbox"
                  checked={privacyNoticeConfirmed}
                  onChange={(event) =>
                    setPrivacyNoticeConfirmed(event.target.checked)
                  }
                />
                <span>
                  <span className="login-required-check__prefix">[필수]</span>{" "}
                  <Link to="/privacy" target="_blank" rel="noreferrer">
                    개인정보처리방침
                  </Link>{" "}
                  및{" "}
                  <button
                    type="button"
                    className="login-required-check__link"
                    onClick={() => setPolicyDialogOpen(true)}
                  >
                    행사별 개인정보 안내
                  </button>
                  를 확인했습니다
                </span>
              </label>
            </div>
            <GoogleSignInButton
              context="use"
              disabled={!canStartGoogleLogin}
              onError={(message) => openAlert(message)}
              onSuccess={handleGoogleBingoLogin}
              text="continue_with"
            />
            {!canStartGoogleLogin ? (
              <p className="login-required-checks__hint">
                필수 항목을 확인한 뒤 Google 로그인을 진행할 수 있습니다.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  if (eventProfileLoadState === "not_found") {
    return (
      <PublicEventStatePage
        eyebrow="Public Event"
        title="행사를 찾을 수 없습니다"
        description="입력한 행사 주소로는 공개 행사 페이지를 열 수 없습니다. 주최자에게 최신 링크를 다시 확인하거나 메인 화면에서 행사 목록을 확인해 주세요."
      />
    );
  }

  if (eventProfileLoadState === "error") {
    return (
      <PublicEventStatePage
        eyebrow="Public Event"
        title="행사 정보를 확인할 수 없습니다"
        description={
          eventProfileErrorMessage ??
          "행사 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
        }
        secondaryActionLabel="새로고침"
        onSecondaryAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="login-page">
      <div className="login-page__mesh" aria-hidden="true" />
      <main className="login-shell">
        <header className="login-hero">
          <img
            className="login-hero__image"
            src={topIllustration}
            alt={`${HOME_EVENT_DISPLAY_FALLBACKS.title} ${HOME_EVENT_DISPLAY_FALLBACKS.subtitle}`}
          />
        </header>

        <section
          className="login-event-card"
          aria-label="event summary"
          aria-busy={!isEventProfileResolved}
        >
          <div className="login-event-card__copy">
            <p className="login-event-card__eyebrow">{eventProfile.title}</p>
            {isEventProfileResolved ? (
              <>
                <h2>{eventSummary.eventName}</h2>
                <p className="login-event-card__team">{eventSummary.eventTeam}</p>
                <div className="login-event-card__meta">
                  <span>
                    <CalendarIcon />
                    {eventSummary.date}
                  </span>
                  <span>
                    <PlaceIcon />
                    {eventSummary.place}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="login-event-card__title-skeleton" aria-hidden="true">
                  <span className="login-event-card__skeleton login-event-card__skeleton--title" />
                  <span className="login-event-card__skeleton login-event-card__skeleton--title-short" />
                </div>
                <span
                  className="login-event-card__skeleton login-event-card__skeleton--team"
                  aria-hidden="true"
                />
                <div className="login-event-card__meta" aria-hidden="true">
                  <span className="login-event-card__skeleton login-event-card__skeleton--meta-wide" />
                  <span className="login-event-card__skeleton login-event-card__skeleton--meta" />
                </div>
              </>
            )}
          </div>

          <div className="login-event-card__art" aria-hidden="true">
            <img src={bingoLoginCharacterIllustration} alt="" />
          </div>
        </section>

        <section className="login-form-card" aria-label="login form">
          {isLoggedIn ? (
            <div className="login-session">
              <h3>{hasParticipantName ? participantName : "이름 설정 필요"}</h3>
              {shouldUseGoogleAuth && googleAccountEmail ? (
                <p className="login-session__account">{googleAccountEmail}</p>
              ) : null}
              {!hasParticipantName ? (
                <p className="login-session__description">
                  빙고에서 사용할 이름을 먼저 설정해 주세요.
                </p>
              ) : null}
              <div className="login-session__actions">
                <button
                  type="button"
                  className="login-submit"
                  onClick={() => navigate(eventBingoPath)}
                >
                  {hasParticipantName ? "빙고로 이동" : "이름 설정하기"}
                </button>
                <button
                  type="button"
                  className="login-secondary"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>

              {renderTesterPanel()}
            </div>
          ) : (
            <>
              {shouldUseGoogleAuth ? (
                renderGoogleLoginPanel()
              ) : !testModeEnabled ? (
                <div className="login-google-panel">
                  <p className="login-session__description">
                    Google 로그인 설정이 필요합니다.
                  </p>
                </div>
              ) : null}

              {renderTesterPanel()}
            </>
          )}
        </section>
      </main>

      <Dialog
        open={policyDialogOpen}
        onClose={() => setPolicyDialogOpen(false)}
        className="login-consent-dialog w-[min(92vw,48rem)]"
      >
        {policyDialogOpen ? (
          <ConsentDialog
            eventSlug={eventSlug ?? eventProfile.slug}
            eventName={eventSummary.eventName}
            onClose={() => setPolicyDialogOpen(false)}
          />
        ) : null}
      </Dialog>

      {alertOpen ? (
        <HomeStatusToast
          message={alertMessage}
          severity={alertSeverity}
          onClose={() => setAlertOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default Home;

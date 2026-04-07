import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import Snackbar from "@mui/material/Snackbar";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import {
  clearLocalMockMode,
  getLocalMockTesterUsers,
  loginWithLocalMockTester,
  resetLocalMockTesterData,
} from "../../api/bingo_api";
import type { MockTesterUser } from "../../api/bingo_api";
import GoogleSignInButton from "../Auth/GoogleSignInButton";
import {
  formatEventDateLabel,
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
  setAuthSession,
} from "../../utils/authSession";
import { ensureBingoGoogleBridge } from "../../utils/bingoGoogleBridge";
import { clearLegacyLocalLoginStorage } from "../../utils/legacyAuthStorage";
import { isTestModeEnabled, syncTestModeFromUrl } from "../../utils/testMode";
import bingoLoginCharacterIllustration from "../../assets/illustrations/bingo-login-character.svg";
import topIllustration from "../../assets/illustrations/top.svg";
import ConsentDialog from "./ConsentDialog";
import "./Home.css";

const DISPLAY_FALLBACKS = {
  title: "Bingo Networking",
  subtitle: "빙고로 즐기는 새로운 네트워킹",
  eventName: "가짜연구소 2025\nGrand Gathering",
  date: "2025년 11월 15일",
  place: "서울 컨벤션 센터",
  eventTeam: "행사 운영팀",
} as const;

const isPlaceholderValue = (value: string | undefined, placeholders: string[]) => {
  if (!value) {
    return true;
  }

  return placeholders.includes(value.trim());
};

const normalizeTesterCode = (value: string | undefined | null) => {
  return value?.trim().toUpperCase().replace(/\s/g, "") ?? "";
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventSlug } = useParams();
  const eventProfile = useEventProfile(eventSlug);
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
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
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

  useEffect(() => {
    setTestModeEnabledState(syncTestModeFromUrl(location.search));
  }, [location.search]);

  useEffect(() => {
    const storedSession = getAuthSession();
    if (shouldUseGoogleAuth) {
      clearLegacyLocalLoginStorage();

      if (!storedSession) {
        return;
      }

      setParticipantName(storedSession.userName);
      setCurrentLoginId(storedSession.loginId);
      setIsLoggedIn(true);
      setIsAgreed(true);
      return;
    }

    if (!storedSession) {
      return;
    }

    setParticipantName(storedSession.userName);
    setCurrentLoginId(storedSession.loginId);
    setIsLoggedIn(true);
    setIsAgreed(true);
  }, [shouldUseGoogleAuth]);

  const displayEventTeam = useMemo(() => {
    return isPlaceholderValue(eventProfile.eventTeam, ["행사 주최자", "Event Team"])
      ? DISPLAY_FALLBACKS.eventTeam
      : eventProfile.eventTeam;
  }, [eventProfile.eventTeam]);

  const displayEventName = useMemo(() => {
    return isPlaceholderValue(eventProfile.subTitle, ["YYYY 행사 이름"])
      ? DISPLAY_FALLBACKS.eventName
      : eventProfile.subTitle;
  }, [eventProfile.subTitle]);

  const displayDate = useMemo(() => {
    const formattedDate = formatEventDateLabel(eventProfile.startAt);
    return isPlaceholderValue(formattedDate, ["MM월 DD일"])
      ? DISPLAY_FALLBACKS.date
      : formattedDate;
  }, [eventProfile.startAt]);

  const displayPlace = useMemo(() => {
    return isPlaceholderValue(eventProfile.place, ["장소"])
      ? DISPLAY_FALLBACKS.place
      : eventProfile.place;
  }, [eventProfile.place]);

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
  }: {
    userId: string;
    userName: string;
    loginId: string;
  }) => {
    setAuthSession({
      userId,
      userName,
      loginId,
    });
    setParticipantName(userName);
    setCurrentLoginId(loginId);
    setIsLoggedIn(true);
    setIsAgreed(true);
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

  const handleConsentToggle = () => {
    if (isAgreed) {
      setIsAgreed(false);
      return;
    }

    setAgreeOpen(true);
  };

  const clearCurrentSessionState = useCallback(() => {
    clearAuthSession();
    clearLocalMockMode();
    setParticipantName("");
    setCurrentLoginId("");
    setIsLoggedIn(false);
    setIsAgreed(false);
    setGoogleAccountEmail("");
  }, []);

  useEffect(() => {
    if (!shouldUseGoogleAuth || isLoggedIn) {
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
  }, [applyGoogleBridgeState, eventProfile.slug, isLoggedIn, openAlert, shouldUseGoogleAuth]);

  const handleGoogleBingoLogin = async ({
    credential,
    nonce,
  }: {
    credential: string;
    nonce: string;
  }) => {
    if (!isAgreed) {
      openAlert("개인정보 처리 동의가 필요합니다.");
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
      });
      openAlert(`"${result.user_name}" 계정으로 전환했습니다.`, "success");
      navigate(eventBingoPath, { replace: true });
    } catch (error) {
      console.error("Failed to switch tester session", error);
      openAlert("테스트 계정 전환 중 오류가 발생했습니다.");
    } finally {
      setActiveTesterCode(null);
    }
  }, [applyLoginSession, eventBingoPath, navigate, openAlert]);

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
    if (!testModeEnabled || !testCodeFromQuery || handledTestCode === testCodeFromQuery) {
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
                  <span>테스트 코드 {tester.accessCode}</span>
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
        <div className="login-consent">
          <label className="login-consent__checkbox">
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={handleConsentToggle}
            />
            <span>개인정보 처리 동의(필수)</span>
          </label>
          <button
            type="button"
            className="login-consent__link"
            onClick={() => setAgreeOpen(true)}
          >
            내용 보기
          </button>
        </div>

        <GoogleSignInButton
          className="login-google-panel__button"
          context="use"
          disabled={!isAgreed}
          onError={(message) => openAlert(message)}
          onSuccess={handleGoogleBingoLogin}
          text="continue_with"
        />
      </div>
    );
  };

  return (
    <div className="login-page">
      <div className="login-page__mesh" aria-hidden="true" />
      <main className="login-shell">
        <header className="login-hero">
          <img
            className="login-hero__image"
            src={topIllustration}
            alt={`${DISPLAY_FALLBACKS.title} ${DISPLAY_FALLBACKS.subtitle}`}
          />
        </header>

        <section className="login-event-card" aria-label="event summary">
          <div className="login-event-card__copy">
            <p className="login-event-card__eyebrow">{eventProfile.title}</p>
            <h2>{displayEventName}</h2>
            <p className="login-event-card__team">{displayEventTeam}</p>
            <div className="login-event-card__meta">
              <span>
                <CalendarMonthOutlinedIcon fontSize="inherit" />
                {displayDate}
              </span>
              <span>
                <PlaceOutlinedIcon fontSize="inherit" />
                {displayPlace}
              </span>
            </div>
          </div>

          <div className="login-event-card__art" aria-hidden="true">
            <img src={bingoLoginCharacterIllustration} alt="" />
          </div>
        </section>

        <section className="login-form-card" aria-label="login form">
          {isLoggedIn ? (
            <div className="login-session">
              <h3>{participantName}</h3>
              {shouldUseGoogleAuth && googleAccountEmail ? (
                <p className="login-session__account">{googleAccountEmail}</p>
              ) : null}
              <div className="login-session__actions">
                <button
                  type="button"
                  className="login-submit"
                  onClick={() => navigate(eventBingoPath)}
                >
                  빙고로 이동
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
        open={agreeOpen}
        onClose={() => setAgreeOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: "login-consent-dialog" }}
      >
        {agreeOpen ? (
          <ConsentDialog
            eventTeam={displayEventTeam}
            onDecline={() => setAgreeOpen(false)}
            onAccept={() => {
              setIsAgreed(true);
              setAgreeOpen(false);
            }}
          />
        ) : null}
      </Dialog>

      <Snackbar
        open={alertOpen}
        autoHideDuration={5000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAlertOpen(false)}
          severity={alertSeverity}
          sx={{ width: "100%", textAlign: "left" }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Home;

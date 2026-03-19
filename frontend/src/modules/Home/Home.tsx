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
  loginBingoUser,
  loginWithLocalMockTester,
  registerBingoUser,
  resetLocalMockTesterData,
} from "../../api/bingo_api";
import type { MockTesterUser } from "../../api/bingo_api";
import {
  formatEventDateLabel,
  getEventBingoPath,
  getEventHomePath,
  withSearch,
} from "../../config/eventProfiles";
import { useEventProfile } from "../../hooks/useEventProfile";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../../utils/authSession";
import {
  getRecentBingoAccounts,
  saveRecentBingoAccount,
  type RecentBingoAccount,
} from "../../utils/recentBingoAccounts";
import { isTestModeEnabled, syncTestModeFromUrl } from "../../utils/testMode";
import ConsentDialog from "./ConsentDialog";
import "./Home.css";

type AuthMode = "register" | "login";

const PASSWORD_MIN_LENGTH = 4;

const DISPLAY_FALLBACKS = {
  brand: "PseudoLab",
  title: "Bingo Networking",
  subtitle: "빙고로 즐기는 새로운 네트워킹",
  eventName: "가짜연구소 2025\nGrand Gathering",
  date: "2025년 11월 15일",
  place: "서울 컨벤션 센터",
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

  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [participantName, setParticipantName] = useState("");
  const [loginIdInput, setLoginIdInput] = useState("");
  const [password, setPassword] = useState("");
  const [currentLoginId, setCurrentLoginId] = useState("");
  const [recentAccounts, setRecentAccounts] = useState<RecentBingoAccount[]>([]);
  const [issuedLoginId, setIssuedLoginId] = useState("");
  const [loginCodeDialogOpen, setLoginCodeDialogOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
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

  useEffect(() => {
    setTestModeEnabledState(syncTestModeFromUrl(location.search));
  }, [location.search]);

  const refreshRecentAccounts = useCallback(() => {
    const nextAccounts = getRecentBingoAccounts();
    setRecentAccounts(nextAccounts);

    if (!isLoggedIn && nextAccounts.length > 0) {
      setAuthMode("login");
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const storedSession = getAuthSession();
    const nextRecentAccounts = getRecentBingoAccounts();
    setRecentAccounts(nextRecentAccounts);

    if (!storedSession) {
      if (nextRecentAccounts.length > 0) {
        setAuthMode("login");
      }
      return;
    }

    setParticipantName(storedSession.userName);
    setLoginIdInput(storedSession.loginId);
    setCurrentLoginId(storedSession.loginId);
    setIsLoggedIn(true);
    setIsAgreed(true);
  }, []);

  const displayBrand = useMemo(() => {
    return isPlaceholderValue(eventProfile.host, ["행사 주최자"])
      ? DISPLAY_FALLBACKS.brand
      : eventProfile.host;
  }, [eventProfile.host]);

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

  const trimmedPassword = password.trim();
  const isPasswordValid =
    trimmedPassword.length === 0 || trimmedPassword.length >= PASSWORD_MIN_LENGTH;
  const requiresConsent = authMode === "register";

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
    setLoginIdInput(loginId);
    setCurrentLoginId(loginId);
    setPassword("");
    setIsLoggedIn(true);
    setIsAgreed(true);
  }, []);

  const persistRecentAccount = useCallback(({
    userName,
    loginId,
  }: {
    userName: string;
    loginId: string;
  }) => {
    saveRecentBingoAccount({
      userName,
      loginId,
    });
    refreshRecentAccounts();
  }, [refreshRecentAccounts]);

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
    setPassword("");
    setCurrentLoginId("");
    setIsLoggedIn(false);
    setIsAgreed(false);
    setAuthMode(recentAccounts.length > 0 ? "login" : "register");
  }, [recentAccounts.length]);

  const handleRegister = async () => {
    const trimmedName = participantName.trim();

    if (!trimmedName) {
      openAlert("이름을 입력해 주세요.");
      return;
    }

    if (trimmedPassword.length < PASSWORD_MIN_LENGTH) {
      openAlert(`비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해 주세요.`);
      return;
    }

    if (!isAgreed) {
      openAlert("개인정보 처리 동의가 필요합니다.");
      return;
    }

    try {
      clearLocalMockMode();
      const result = await registerBingoUser(trimmedName, trimmedPassword, eventProfile.slug);

      if (
        !result.ok ||
        result.user_id == null ||
        !result.user_name ||
        !result.login_id
      ) {
        openAlert(result.message || "계정 생성에 실패했습니다.");
        return;
      }

      const sessionPayload = {
        userId: String(result.user_id),
        userName: result.user_name,
        loginId: result.login_id,
      };

      applyLoginSession(sessionPayload);
      persistRecentAccount(sessionPayload);
      setIssuedLoginId(result.login_id);
      setLoginCodeDialogOpen(true);
    } catch (error) {
      console.error("Failed to register", error);
      openAlert("계정 생성 중 오류가 발생했습니다.");
    }
  };

  const handleLogin = async () => {
    const trimmedLoginId = loginIdInput.trim().toUpperCase();

    if (!trimmedLoginId) {
      openAlert("로그인 코드를 입력해 주세요.");
      return;
    }

    if (trimmedPassword.length < PASSWORD_MIN_LENGTH) {
      openAlert("비밀번호를 확인해 주세요.");
      return;
    }

    try {
      clearLocalMockMode();
      const result = await loginBingoUser(trimmedLoginId, trimmedPassword, eventProfile.slug);

      if (
        !result.ok ||
        result.user_id == null ||
        !result.user_name ||
        !result.login_id
      ) {
        openAlert(result.message || "로그인에 실패했습니다.");
        return;
      }

      const sessionPayload = {
        userId: String(result.user_id),
        userName: result.user_name,
        loginId: result.login_id,
      };

      applyLoginSession(sessionPayload);
      persistRecentAccount(sessionPayload);
      openAlert("로그인되었습니다.", "success");
      navigate(eventBingoPath, { replace: true });
    } catch (error) {
      console.error("Failed to login", error);
      openAlert("로그인 요청 중 오류가 발생했습니다.");
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
  };

  const handleSubmit = async () => {
    if (authMode === "register") {
      await handleRegister();
      return;
    }

    await handleLogin();
  };

  const handleSelectRecentAccount = (account: RecentBingoAccount) => {
    setAuthMode("login");
    setParticipantName(account.userName);
    setLoginIdInput(account.loginId);
  };

  const handleCloseLoginCodeDialog = () => {
    setLoginCodeDialogOpen(false);
    navigate(eventBingoPath, { replace: true });
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
            const isActive =
              normalizeTesterCode(currentLoginId || loginIdInput) ===
              normalizeTesterCode(tester.accessCode);

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

  const modeDescription =
    authMode === "register"
      ? "처음 참가라면 이름과 비밀번호로 계정을 만들고 로그인 코드를 발급받으세요."
      : "다시 로그인할 때는 로그인 코드와 비밀번호를 입력하세요.";

  return (
    <div className="login-page">
      <div className="login-page__mesh" aria-hidden="true" />
      <main className="login-shell">
        <header className="login-hero">
          <p className="login-brand">{displayBrand}</p>
          <div className="login-logo">
            <span className="login-logo__spark login-logo__spark--left" />
            <span className="login-logo__spark login-logo__spark--right" />
            <h1>{DISPLAY_FALLBACKS.title}</h1>
          </div>
          <p className="login-tagline">{DISPLAY_FALLBACKS.subtitle}</p>
        </header>

        <section className="login-event-card" aria-label="event summary">
          <div className="login-event-card__copy">
            <p className="login-event-card__eyebrow">{eventProfile.title}</p>
            <h2>{displayEventName}</h2>
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
            <div className="login-event-card__monitor">
              <span />
              <span />
              <span />
            </div>
            <div className="login-event-card__chair" />
            <div className="login-event-card__person">
              <div className="login-event-card__person-head" />
              <div className="login-event-card__person-body" />
              <div className="login-event-card__person-arm" />
              <div className="login-event-card__person-leg" />
            </div>
          </div>
        </section>

        <section className="login-form-card" aria-label="login form">
          {!isLoggedIn ? (
            <>
              <div className="login-mode-toggle" role="tablist" aria-label="auth mode">
                <button
                  type="button"
                  className={`login-mode-toggle__button ${authMode === "register" ? "is-active" : ""}`}
                  onClick={() => setAuthMode("register")}
                >
                  처음 참가예요
                </button>
                <button
                  type="button"
                  className={`login-mode-toggle__button ${authMode === "login" ? "is-active" : ""}`}
                  onClick={() => setAuthMode("login")}
                >
                  다시 로그인
                </button>
              </div>

              <p className="login-mode-toggle__description">{modeDescription}</p>

              <form
                className="login-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                {authMode === "register" ? (
                  <div className="login-form__row">
                    <label className="login-form__label" htmlFor="participantName">
                      이름
                    </label>
                    <div className="login-form__field">
                      <input
                        id="participantName"
                        className="login-input"
                        value={participantName}
                        onChange={(event) => setParticipantName(event.target.value)}
                        placeholder="이름을 입력해 주세요"
                        autoComplete="name"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="login-form__row">
                    <label className="login-form__label" htmlFor="loginId">
                      로그인 코드
                    </label>
                    <div className="login-form__field">
                      <input
                        id="loginId"
                        className="login-input"
                        value={loginIdInput}
                        onChange={(event) =>
                          setLoginIdInput(event.target.value.toUpperCase().replace(/\s/g, ""))
                        }
                        placeholder="발급받은 로그인 코드"
                        autoComplete="username"
                      />
                    </div>
                  </div>
                )}

                <div className="login-form__row">
                  <label className="login-form__label" htmlFor="password">
                    비밀번호
                  </label>
                  <div className="login-form__field">
                    <input
                      id="password"
                      type="password"
                      className={`login-input ${!isPasswordValid ? "is-invalid" : ""}`}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={`${PASSWORD_MIN_LENGTH}자 이상 입력해 주세요`}
                      autoComplete={
                        authMode === "register" ? "new-password" : "current-password"
                      }
                      aria-invalid={!isPasswordValid}
                    />
                    <p className="login-form__hint">
                      비밀번호는 {PASSWORD_MIN_LENGTH}자 이상 입력해 주세요.
                    </p>
                  </div>
                </div>

                {requiresConsent ? (
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
                ) : null}

                <button
                  type="submit"
                  className="login-submit"
                  disabled={
                    (authMode === "register"
                      ? !participantName.trim()
                      : !loginIdInput.trim()) ||
                    trimmedPassword.length < PASSWORD_MIN_LENGTH ||
                    (requiresConsent && !isAgreed)
                  }
                >
                  {authMode === "register" ? "계정 만들기" : "로그인"}
                </button>
              </form>

              {recentAccounts.length > 0 ? (
                <section className="login-account-panel" aria-label="recent accounts">
                  <div className="login-account-panel__header">
                    <div>
                      <p className="login-account-panel__eyebrow">최근 로그인</p>
                      <h3>같은 기기에서는 더 빠르게 들어갈 수 있어요</h3>
                    </div>
                  </div>
                  <p className="login-account-panel__description">
                    최근에 이 브라우저에서 로그인한 계정입니다. 선택하면 로그인 코드가
                    자동으로 채워집니다.
                  </p>
                  <div className="login-account-panel__list">
                    {recentAccounts.map((account) => (
                      <button
                        key={account.loginId}
                        type="button"
                        className={`login-account-card ${
                          loginIdInput.trim().toUpperCase() === account.loginId ? "is-active" : ""
                        }`}
                        onClick={() => handleSelectRecentAccount(account)}
                      >
                        <strong>{account.userName}</strong>
                        <span>코드 {account.loginId}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {renderTesterPanel()}
            </>
          ) : (
            <div className="login-session">
              <p className="login-session__eyebrow">로그인 상태</p>
              <h3>{participantName}</h3>
              <div className="login-session__code-block">
                <span>로그인 코드</span>
                <strong>{currentLoginId}</strong>
              </div>
              <p className="login-session__description">
                이 탭에는 이미 로그인 정보가 저장되어 있습니다. 바로 빙고 보드로
                이동하거나 로그아웃 후 최근 계정 목록에서 다시 로그인할 수 있습니다.
              </p>
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
            host={eventProfile.host}
            onDecline={() => setAgreeOpen(false)}
            onAccept={() => {
              setIsAgreed(true);
              setAgreeOpen(false);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={loginCodeDialogOpen}
        onClose={handleCloseLoginCodeDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ className: "login-code-dialog" }}
      >
        <div className="login-code-dialog__body">
          <p className="login-code-dialog__eyebrow">LOGIN CODE</p>
          <h2>계정이 준비됐어요</h2>
          <p className="login-code-dialog__description">
            다음 로그인부터는 아래 코드를 사용합니다. 같은 기기에서는 최근 로그인
            목록에서도 다시 들어올 수 있어요.
          </p>
          <div className="login-code-dialog__code">{issuedLoginId}</div>
          <button
            type="button"
            className="login-submit"
            onClick={handleCloseLoginCodeDialog}
          >
            빙고 시작하기
          </button>
        </div>
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

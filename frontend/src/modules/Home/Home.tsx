import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import Snackbar from "@mui/material/Snackbar";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import {
  clearLocalMockMode,
  getLocalMockTesterUsers,
  isLocalMockTesterEnabled,
  loginWithLocalMockTester,
  newSingUpUser,
  resetLocalMockTesterData,
} from "../../api/bingo_api";
import type { MockTesterUser } from "../../api/bingo_api";
import config from "../../config/settings.json";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../../utils/authSession";
import ConsentDialog from "./ConsentDialog";
import "./Home.css";

const ACCESS_CODE_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{1,8}$/;

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

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [participantName, setParticipantName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<"error" | "success">(
    "error"
  );
  const [mockTesterEnabled, setMockTesterEnabled] = useState(false);
  const [mockTesterUsers, setMockTesterUsers] = useState<MockTesterUser[]>([]);
  const [mockTesterLoading, setMockTesterLoading] = useState(false);
  const [mockTesterResetting, setMockTesterResetting] = useState(false);
  const [activeTesterCode, setActiveTesterCode] = useState<string | null>(null);
  const [handledTestCode, setHandledTestCode] = useState<string | null>(null);

  useEffect(() => {
    const storedSession = getAuthSession();
    if (storedSession) {
      setParticipantName(storedSession.userName);
      setAccessCode(storedSession.loginKey);
      setIsLoggedIn(true);
      setIsAgreed(true);
    }

    setMockTesterEnabled(isLocalMockTesterEnabled());
  }, []);

  const testCodeFromQuery = useMemo(() => {
    const testCode = new URLSearchParams(location.search).get("testCode");
    return testCode?.trim() ?? "";
  }, [location.search]);

  const displayBrand = useMemo(
    () =>
      isPlaceholderValue(config.host, ["행사 주최자"])
        ? DISPLAY_FALLBACKS.brand
        : config.host,
    []
  );

  const displayEventName = useMemo(
    () =>
      isPlaceholderValue(config.subTitle, ["YYYY 행사 이름"])
        ? DISPLAY_FALLBACKS.eventName
        : config.subTitle,
    []
  );

  const displayDate = useMemo(
    () =>
      isPlaceholderValue(config.date, ["MM월 DD일"])
        ? DISPLAY_FALLBACKS.date
        : config.date,
    []
  );

  const displayPlace = useMemo(
    () =>
      isPlaceholderValue(config.place, ["장소"])
        ? DISPLAY_FALLBACKS.place
        : config.place,
    []
  );

  const accessCodeValue = accessCode.trim();
  const isAccessCodeValid =
    accessCodeValue.length === 0 || ACCESS_CODE_PATTERN.test(accessCodeValue);

  const openAlert = useCallback((message: string, severity: "error" | "success" = "error") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  }, []);

  const applyLoginSession = useCallback(({
    userId,
    userEmail,
    userName,
    loginKey,
  }: {
    userId: string;
    userEmail: string;
    userName: string;
    loginKey: string;
  }) => {
    setAuthSession({
      userId,
      userEmail,
      userName,
      loginKey,
    });
    setParticipantName(userName);
    setAccessCode(loginKey);
    setIsLoggedIn(true);
    setIsAgreed(true);
  }, []);

  const loadMockTesterUsers = useCallback(async () => {
    if (!mockTesterEnabled) {
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
  }, [mockTesterEnabled, openAlert]);

  useEffect(() => {
    if (!mockTesterEnabled) {
      return;
    }

    void loadMockTesterUsers();
  }, [loadMockTesterUsers, mockTesterEnabled]);

  const handleConsentToggle = () => {
    if (isAgreed) {
      setIsAgreed(false);
      return;
    }

    setAgreeOpen(true);
  };

  const handleLogin = async () => {
    const trimmedName = participantName.trim();
    const trimmedAccessCode = accessCode.trim();

    if (!trimmedName) {
      openAlert("이름을 입력해 주세요.");
      return;
    }

    if (!ACCESS_CODE_PATTERN.test(trimmedAccessCode)) {
      openAlert("비밀번호는 영문과 숫자를 포함한 8자 이내로 입력해 주세요.");
      return;
    }

    if (!isAgreed) {
      openAlert("개인정보 처리 동의가 필요합니다.");
      return;
    }

    try {
      clearLocalMockMode();
      const result = await newSingUpUser(trimmedAccessCode, trimmedName);

      if (!result.ok) {
        openAlert(result.message);
        return;
      }

      applyLoginSession({
        userId: String(result.user_id),
        userEmail: result.user_email,
        userName: result.user_name,
        loginKey: trimmedAccessCode,
      });
      openAlert("로그인되었습니다.", "success");
      navigate("/bingo", { replace: true });
    } catch (error) {
      console.error("Failed to login", error);
      openAlert("로그인 요청 중 오류가 발생했습니다.");
    }
  };

  const clearCurrentSessionState = useCallback(() => {
    clearAuthSession();
    clearLocalMockMode();
    setParticipantName("");
    setAccessCode("");
    setIsLoggedIn(false);
    setIsAgreed(false);
    setActiveTesterCode(null);
  }, []);

  const handleLogout = () => {
    clearCurrentSessionState();
  };

  const handleTesterLogin = useCallback(async (tester: MockTesterUser) => {
    try {
      setActiveTesterCode(tester.accessCode);

      const result = await loginWithLocalMockTester(
        tester.accessCode,
        tester.userName
      );

      if (!result.ok) {
        openAlert(result.message);
        return;
      }

      applyLoginSession({
        userId: String(result.user_id),
        userEmail: result.user_email,
        userName: result.user_name,
        loginKey: tester.accessCode,
      });
      openAlert(`"${result.user_name}" 계정으로 전환했습니다.`, "success");
      navigate("/bingo", { replace: true });
    } catch (error) {
      console.error("Failed to switch tester session", error);
      openAlert("테스트 계정 전환 중 오류가 발생했습니다.");
    } finally {
      setActiveTesterCode(null);
    }
  }, [applyLoginSession, navigate, openAlert]);

  useEffect(() => {
    if (!mockTesterEnabled || !testCodeFromQuery || handledTestCode === testCodeFromQuery) {
      return;
    }

    setHandledTestCode(testCodeFromQuery);

    const targetTester =
      mockTesterUsers.find((tester) => tester.accessCode === testCodeFromQuery) ?? {
        accessCode: testCodeFromQuery,
        userName: testCodeFromQuery,
      };

    void handleTesterLogin({
      userId: "",
      userEmail: targetTester.accessCode,
      userName: targetTester.userName,
      accessCode: targetTester.accessCode,
      hasBoard: true,
    });
  }, [
    handledTestCode,
    handleTesterLogin,
    mockTesterEnabled,
    mockTesterUsers,
    testCodeFromQuery,
  ]);

  const openTesterInNewTab = (tester: MockTesterUser) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.pathname = "/";
    nextUrl.search = "";
    nextUrl.searchParams.set("testCode", tester.accessCode);
    window.open(nextUrl.toString(), "_blank", "noopener,noreferrer");
  };

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
      navigate("/", { replace: true });
      await loadMockTesterUsers();
      openAlert("테스트 데이터를 처음 상태로 초기화했습니다.", "success");
    } catch (error) {
      console.error("Failed to reset local mock tester data", error);
      openAlert("테스트 데이터 초기화 중 오류가 발생했습니다.");
    } finally {
      setMockTesterResetting(false);
    }
  }, [clearCurrentSessionState, loadMockTesterUsers, navigate, openAlert]);

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
            <p className="login-event-card__eyebrow">{config.title}</p>
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
            <form
              className="login-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
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

              <div className="login-form__row">
                <label className="login-form__label" htmlFor="accessCode">
                  비밀번호
                </label>
                <div className="login-form__field">
                  <input
                    id="accessCode"
                    type="password"
                    className={`login-input ${!isAccessCodeValid ? "is-invalid" : ""}`}
                    value={accessCode}
                    onChange={(event) =>
                      setAccessCode(
                        event.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 8)
                      )
                    }
                    placeholder="영어, 숫자 포함 8글자 이내"
                    autoComplete="current-password"
                    aria-invalid={!isAccessCodeValid}
                  />
                  <p className="login-form__hint">
                    영문과 숫자를 함께 포함해 8자 이내로 입력해 주세요.
                  </p>
                </div>
              </div>

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

              <button
                type="submit"
                className="login-submit"
                disabled={
                  !participantName.trim() ||
                  !ACCESS_CODE_PATTERN.test(accessCodeValue) ||
                  !isAgreed
                }
              >
                로그인
              </button>
            </form>
          ) : (
            <div className="login-session">
              <p className="login-session__eyebrow">로그인 상태</p>
              <h3>{participantName}</h3>
              <p className="login-session__description">
                이 탭에는 이미 로그인 정보가 저장되어 있습니다. 바로 빙고 보드로
                이동하거나 정보를 초기화할 수 있습니다.
              </p>
              <div className="login-session__actions">
                <button
                  type="button"
                  className="login-submit"
                  onClick={() => navigate("/bingo")}
                >
                  빙고로 이동
                </button>
                <button
                  type="button"
                  className="login-secondary"
                  onClick={handleLogout}
                >
                  다시 로그인
                </button>
              </div>
            </div>
          )}

          {mockTesterEnabled ? (
            <section className="login-dev-panel" aria-label="local mock tester">
              <div className="login-dev-panel__header">
                <div>
                  <p className="login-dev-panel__eyebrow">로컬 테스트 계정</p>
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
                로그인 계정은 탭별 `sessionStorage`를 쓰고, mock 데이터는 브라우저 전체에서
                공유합니다. 그래서 여러 탭을 열면 서로 다른 계정끼리 바로 주고받기 테스트를
                할 수 있습니다. `테스트 초기화`를 누르면 공유 보드와 교환 기록, 현재 탭
                로그인 정보가 처음 상태로 돌아갑니다.
              </p>

              <div className="login-dev-panel__list">
                {mockTesterUsers.map((tester) => {
                  const isActive = accessCode === tester.accessCode;

                  return (
                    <article
                      key={`${tester.userId}-${tester.accessCode}`}
                      className={`login-dev-user ${isActive ? "is-active" : ""}`}
                    >
                      <div className="login-dev-user__meta">
                        <strong>{tester.userName}</strong>
                        <span>ID {tester.userId}</span>
                        <span>접속 코드 {tester.accessCode}</span>
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
                          {activeTesterCode === tester.accessCode
                            ? "전환 중..."
                            : "이 탭으로"}
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
          ) : null}
        </section>
      </main>

      <Dialog
        open={agreeOpen}
        onClose={() => setAgreeOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: "login-consent-dialog" }}
      >
        <ConsentDialog
          host={config.host}
          onDecline={() => setAgreeOpen(false)}
          onAccept={() => {
            setIsAgreed(true);
            setAgreeOpen(false);
          }}
        />
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

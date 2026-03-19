import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import Snackbar from "@mui/material/Snackbar";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { loginBingoUser, registerBingoUser } from "../../api/bingo_api";
import config from "../../config/settings.json";
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

const Home = () => {
  const navigate = useNavigate();

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

  const trimmedPassword = password.trim();
  const isPasswordValid =
    trimmedPassword.length === 0 || trimmedPassword.length >= PASSWORD_MIN_LENGTH;
  const requiresConsent = authMode === "register";

  const openAlert = useCallback((message: string, severity: "error" | "success" = "error") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  }, []);

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
    userId,
    userName,
    loginId,
  }: {
    userId: string;
    userName: string;
    loginId: string;
  }) => {
    saveRecentBingoAccount({
      userId,
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
      const result = await registerBingoUser(trimmedName, trimmedPassword);

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
      const result = await loginBingoUser(trimmedLoginId, trimmedPassword);

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
      navigate("/bingo", { replace: true });
    } catch (error) {
      console.error("Failed to login", error);
      openAlert("로그인 요청 중 오류가 발생했습니다.");
    }
  };

  const clearCurrentSessionState = useCallback(() => {
    clearAuthSession();
    setParticipantName("");
    setPassword("");
    setCurrentLoginId("");
    setIsLoggedIn(false);
    setIsAgreed(false);
    setAuthMode(recentAccounts.length > 0 ? "login" : "register");
  }, [recentAccounts.length]);

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
    navigate("/bingo", { replace: true });
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
                  onClick={() => navigate("/bingo")}
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
        <ConsentDialog
          host={config.host}
          onDecline={() => setAgreeOpen(false)}
          onAccept={() => {
            setIsAgreed(true);
            setAgreeOpen(false);
          }}
        />
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

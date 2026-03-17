import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import Snackbar from "@mui/material/Snackbar";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { newSingUpUser } from "../../api/bingo_api";
import config from "../../config/settings.json";
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

  useEffect(() => {
    const storedId = localStorage.getItem("myID");
    const storedName = localStorage.getItem("myUserName");
    const storedAccessCode = localStorage.getItem("myLoginKey");

    if (storedName) {
      setParticipantName(storedName);
    }

    if (storedAccessCode) {
      setAccessCode(storedAccessCode);
    }

    if (storedId) {
      setIsLoggedIn(true);
      setIsAgreed(true);
    }
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

  const accessCodeValue = accessCode.trim();
  const isAccessCodeValid =
    accessCodeValue.length === 0 || ACCESS_CODE_PATTERN.test(accessCodeValue);

  const openAlert = (message: string, severity: "error" | "success" = "error") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

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
      const result = await newSingUpUser(trimmedAccessCode, trimmedName);

      if (!result.ok) {
        openAlert(result.message);
        return;
      }

      localStorage.setItem("myID", String(result.user_id));
      localStorage.setItem("myEmail", result.user_email);
      localStorage.setItem("myUserName", result.user_name);
      localStorage.setItem("myLoginKey", trimmedAccessCode);

      setIsLoggedIn(true);
      openAlert("로그인되었습니다.", "success");
      navigate("/bingo", { replace: true });
    } catch (error) {
      console.error("Failed to login", error);
      openAlert("로그인 요청 중 오류가 발생했습니다.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("myID");
    localStorage.removeItem("myEmail");
    localStorage.removeItem("myUserName");
    localStorage.removeItem("myLoginKey");

    setParticipantName("");
    setAccessCode("");
    setIsLoggedIn(false);
    setIsAgreed(false);
  };

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
                disabled={!participantName.trim() || !ACCESS_CODE_PATTERN.test(accessCodeValue) || !isAgreed}
              >
                로그인
              </button>
            </form>
          ) : (
            <div className="login-session">
              <p className="login-session__eyebrow">로그인 상태</p>
              <h3>{participantName || localStorage.getItem("myUserName")}</h3>
              <p className="login-session__description">
                이 기기에는 이미 로그인 정보가 저장되어 있습니다. 바로 빙고 보드로
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

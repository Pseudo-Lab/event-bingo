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
import bingoNetworkingWordmark from "../../assets/illustrations/Bingo Networking.svg";
import { Dialog } from "../../components/ui/dialog";
import ConsentDialog from "./ConsentDialog";
import {
  HOME_EVENT_DISPLAY_FALLBACKS,
  resolveHomeEventSummary,
} from "./homeDisplay";
import PublicEventStatePage from "../../components/PublicEventStatePage";
import {
  readBingoGameLanguage,
  writeBingoGameLanguage,
} from "../Bingo/bingoGameLanguage";
import type { BingoGameLanguage } from "../Bingo/bingoGameLanguage";
import "./Home.css";
import { getHomeEventCategoryLabel, homeCopy } from "./homeLanguage";

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
  closeLabel: string;
  message: string;
  severity: "error" | "success";
  statusLabels: {
    error: string;
    success: string;
  };
  onClose: () => void;
};

const HomeStatusToast = ({
  closeLabel,
  message,
  severity,
  statusLabels,
  onClose,
}: HomeStatusToastProps) => {
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
          {statusLabels[severity]}
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold leading-6">{message}</p>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
};

type HomeLanguageSwitchProps = {
  language: BingoGameLanguage;
  onChange: (language: BingoGameLanguage) => void;
};

const HomeLanguageSwitch = ({ language, onChange }: HomeLanguageSwitchProps) => {
  const copy = homeCopy[language];

  return (
    <div className="login-language-switch" aria-label={copy.languageSetting}>
      {copy.languageOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={language === option.value ? "is-active" : ""}
          onClick={() => onChange(option.value)}
          aria-pressed={language === option.value}
        >
          {option.label}
        </button>
      ))}
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
  const [language, setLanguage] = useState<BingoGameLanguage>(() =>
    readBingoGameLanguage(
      typeof window === "undefined" ? undefined : window.localStorage
    )
  );
  const copy = homeCopy[language];
  const shouldUseGoogleAuth =
    !testModeEnabled && isSupabaseConfigured() && isGoogleIdentityConfigured();
  const hasParticipantName = participantName.trim().length > 0;
  const canStartGoogleLogin = termsAccepted && privacyNoticeConfirmed;
  const eventSummary = useMemo(
    () => resolveHomeEventSummary(eventProfile, isEventProfileResolved, language),
    [eventProfile, isEventProfileResolved, language]
  );

  const handleLanguageChange = useCallback((nextLanguage: BingoGameLanguage) => {
    setLanguage(nextLanguage);
    writeBingoGameLanguage(
      typeof window === "undefined" ? undefined : window.localStorage,
      nextLanguage
    );
  }, []);

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
      openAlert(copy.loadingError);
    } finally {
      setMockTesterLoading(false);
    }
  }, [copy.loadingError, openAlert, testModeEnabled]);

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
              : copy.restoreError
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
    copy.restoreError,
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
      openAlert(copy.eventRequired);
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
        throw new Error(copy.googleSessionError);
      }

      clearLegacyLocalLoginStorage();
      const bridgeResult = await ensureBingoGoogleBridge(user, eventProfile.slug);
      applyGoogleBridgeState(bridgeResult);
      navigate(eventBingoPath, { replace: true });
    } catch (error) {
      await supabase.auth.signOut();
      clearCurrentSessionState();
      openAlert(
        error instanceof Error ? error.message : copy.googleLoginError
      );
    }
  };

  const handleTesterLogin = useCallback(async (tester: MockTesterUser) => {
    if (!isEventProfileAvailable) {
      openAlert(copy.testLoginInvalid);
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
        openAlert(result.message || copy.testLoginFailed);
        return;
      }

      applyLoginSession({
        userId: String(result.user_id),
        userName: result.user_name,
        loginId: result.login_id,
        userEmail: result.user_email ?? undefined,
      });
      openAlert(copy.testLoginSuccess(result.user_name), "success");
      navigate(eventBingoPath, { replace: true });
    } catch (error) {
      console.error("Failed to switch tester session", error);
      openAlert(copy.testLoginError);
    } finally {
      setActiveTesterCode(null);
    }
  }, [
    applyLoginSession,
    copy,
    eventBingoPath,
    isEventProfileAvailable,
    navigate,
    openAlert,
  ]);

  const handleResetMockTesterData = useCallback(async () => {
    const shouldReset = window.confirm(copy.testResetConfirm);

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
      openAlert(copy.testResetSuccess, "success");
    } catch (error) {
      console.error("Failed to reset local mock tester data", error);
      openAlert(copy.testResetError);
    } finally {
      setMockTesterResetting(false);
    }
  }, [
    clearCurrentSessionState,
    copy.testResetConfirm,
    copy.testResetError,
    copy.testResetSuccess,
    eventHomePath,
    loadMockTesterUsers,
    navigate,
    openAlert,
  ]);

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
      <section className="login-dev-panel" aria-label={copy.testerPanelAriaLabel}>
        <div className="login-dev-panel__header">
          <div>
            <p className="login-dev-panel__eyebrow">{copy.testerPanelEyebrow}</p>
            <h3>{copy.testerPanelTitle}</h3>
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
              {mockTesterLoading ? copy.testerRefreshLoading : copy.testerRefresh}
            </button>
            <button
              type="button"
              className="login-dev-panel__reset"
              onClick={() => {
                void handleResetMockTesterData();
              }}
              disabled={mockTesterLoading || mockTesterResetting}
            >
              {mockTesterResetting ? copy.testerResetting : copy.testerReset}
            </button>
          </div>
        </div>
        <p className="login-dev-panel__description">
          {copy.testerPanelDescription}
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
                  <span>{tester.hasBoard ? copy.testerBoardReady : copy.testerBoardPending}</span>
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
                      ? copy.testerSwitching
                      : copy.testerUseCurrentTab}
                  </button>
                  <button
                    type="button"
                    className="login-dev-user__button is-secondary"
                    onClick={() => openTesterInNewTab(tester)}
                    disabled={mockTesterResetting}
                  >
                    {copy.testerOpenNewTab}
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
          <p className="login-policy__eyebrow">{copy.loginPolicyTitle}</p>
          <p className="login-policy__summary">
            {copy.loginPolicySummary}
          </p>
        </div>

        <div className="login-google-panel__button-wrap">
          <div className="login-google-panel__button-slot">
            <div className="login-required-checks" aria-label={copy.requiredChecksLabel}>
              <label className="login-required-check">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                />
                <span>
                  <span className="login-required-check__prefix">{copy.required}</span>{" "}
                  {language === "en" ? `${copy.termsAgreement} ` : null}
                  <Link to="/terms" target="_blank" rel="noreferrer">
                    {copy.terms}
                  </Link>
                  {language === "ko" ? copy.termsAgreement : null}
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
                  <span className="login-required-check__prefix">{copy.required}</span>{" "}
                  {language === "en" ? `${copy.privacyConfirmation} ` : null}
                  <Link to="/privacy" target="_blank" rel="noreferrer">
                    {copy.privacy}
                  </Link>{" "}
                  {copy.and}{" "}
                  <button
                    type="button"
                    className="login-required-check__link"
                    onClick={() => setPolicyDialogOpen(true)}
                  >
                    {copy.eventPrivacy}
                  </button>
                  {language === "ko" ? copy.privacyConfirmation : null}
                </span>
              </label>
            </div>
            <GoogleSignInButton
              context="use"
              disabled={!canStartGoogleLogin}
              locale={language}
              onError={(message) => openAlert(message)}
              onSuccess={handleGoogleBingoLogin}
              text="continue_with"
            />
            <p
              className="login-required-checks__hint"
              data-visible={!canStartGoogleLogin}
              aria-hidden={canStartGoogleLogin}
            >
              {copy.loginHint}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (eventProfileLoadState === "not_found") {
    return (
      <PublicEventStatePage
        eyebrow={copy.notFoundEyebrow}
        title={copy.notFoundTitle}
        description={copy.notFoundDescription}
      />
    );
  }

  if (eventProfileLoadState === "error") {
    return (
      <PublicEventStatePage
        eyebrow={copy.notFoundEyebrow}
        title={copy.eventErrorTitle}
        description={
          eventProfileErrorMessage ??
          copy.eventErrorDescription
        }
        secondaryActionLabel={copy.reload}
        onSecondaryAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="login-page">
      <div className="login-page__mesh" aria-hidden="true" />
      <main className="login-shell">
        <HomeLanguageSwitch language={language} onChange={handleLanguageChange} />
        <header className="login-hero">
          <img
            className="login-hero__image"
            src={bingoNetworkingWordmark}
            alt={HOME_EVENT_DISPLAY_FALLBACKS.ko.title}
          />
        </header>

        <section
          className="login-event-card"
          aria-label={copy.eventSummaryAriaLabel}
          aria-busy={!isEventProfileResolved}
        >
          <div className="login-event-card__copy">
            <p className="login-event-card__eyebrow">
              {getHomeEventCategoryLabel(eventProfile.title, language)}
            </p>
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

        <section className="login-form-card" aria-label={copy.loginFormAriaLabel}>
          {isLoggedIn ? (
            <div className="login-session">
              <h3>{hasParticipantName ? participantName : copy.nameRequiredTitle}</h3>
              {shouldUseGoogleAuth && googleAccountEmail ? (
                <p className="login-session__account">{googleAccountEmail}</p>
              ) : null}
              {!hasParticipantName ? (
                <p className="login-session__description">
                  {copy.nameRequiredDescription}
                </p>
              ) : null}
              <div className="login-session__actions">
                <button
                  type="button"
                  className="login-submit"
                  onClick={() => navigate(eventBingoPath)}
                >
                  {hasParticipantName ? copy.goToBingo : copy.setName}
                </button>
                <button
                  type="button"
                  className="login-secondary"
                  onClick={handleLogout}
                >
                  {copy.logout}
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
                    {copy.googleSetupRequired}
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
            language={language}
            onClose={() => setPolicyDialogOpen(false)}
          />
        ) : null}
      </Dialog>

      {alertOpen ? (
        <HomeStatusToast
          closeLabel={copy.close}
          message={alertMessage}
          severity={alertSeverity}
          statusLabels={{
            error: copy.statusError,
            success: copy.statusComplete,
          }}
          onClose={() => setAlertOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default Home;

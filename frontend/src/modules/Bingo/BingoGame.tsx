import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createBingoBoard,
  createUserBingoInteraction,
  getBingoBoard,
  getUserAllInteraction,
  searchBingoParticipants,
  updateBingoDisplayName,
} from "../../api/bingo_api.ts";
import type { BingoParticipantItem } from "../../api/bingo_api.ts";
import {
  getEventHomePath,
  withSearch,
} from "../../config/eventProfiles";
import { useEventProfile } from "../../hooks/useEventProfile";
import { maybeGetSupabaseClient } from "../../lib/supabaseClient";
import {
  getAuthSession,
  normalizeAuthEmail,
  setAuthSession,
} from "../../utils/authSession";
import {
  ensureBingoGoogleBridge,
  syncBingoBridgeUserName,
} from "../../utils/bingoGoogleBridge";
import bingoNetworkingWordmark from "../../assets/illustrations/Bingo Networking.svg";
import {
  BingoAlertToast,
  BingoBoardSection,
  BingoCelebrationDialog,
  BingoCountdownScreen,
  BingoLoadingScreen,
  HistoryPanel,
  KeywordSetupScreen,
  NetworkingIllustration,
} from "./BingoView";
import PublicEventStatePage from "../../components/PublicEventStatePage";
import type {
  AlertPayload,
  AlertSeverity,
  BingoCell,
  CompletedLine,
  InteractionRecord,
} from "./bingoGameTypes";
import {
  buildIncomingKeywordAlert,
  buildExchangeHistory,
  buildPreviewBoard,
  BOARD_PREVIEW_OPTIONS,
  createBoardConnectionLines,
  getCellsInLine,
  getCompletedLines,
  getDefaultAlertTitle,
  getBingoMissionProgressPercent,
  getInteractionKeywords,
  getLatestIncomingBatch,
  getLatestInteractionId,
  getUniqueKeywords,
  mergeInteractionRecords,
  serializeInteractionKeywords,
  shuffleArray,
} from "./bingoGameUtils";
import type { BoardPreviewPreset } from "./bingoGameTypes";
import {
  bingoGameCopy,
  readBingoGameLanguage,
  writeBingoGameLanguage,
} from "./bingoGameLanguage";
import type { BingoGameLanguage } from "./bingoGameLanguage";
import { syncTestModeFromUrl } from "../../utils/testMode";
import {
  readGoalCelebrationFlag as readStoredGoalCelebrationFlag,
  writeGoalCelebrationFlag as writeStoredGoalCelebrationFlag,
} from "./bingoSessionState";
import "./BingoGame.css";

const resolveParticipantEmail = (authSession: ReturnType<typeof getAuthSession>) => {
  const userEmail = normalizeAuthEmail(authSession?.userEmail);
  if (userEmail) {
    return userEmail;
  }

  const loginId = authSession?.loginId?.trim() ?? "";
  if (!loginId) {
    return "";
  }

  if (loginId.includes("@")) {
    return loginId;
  }

  return "";
};

const getBoardReadyStorageKey = (eventSlug: string, userId: string) =>
  `event-bingo.board-ready.v1:${eventSlug}:${userId}`;

const readBoardReadyFlag = (eventSlug?: string, userId?: string) => {
  if (typeof window === "undefined" || !eventSlug || !userId) {
    return false;
  }

  return window.sessionStorage.getItem(getBoardReadyStorageKey(eventSlug, userId)) === "1";
};

type LanguageSwitchProps = {
  language: BingoGameLanguage;
  onChange: (language: BingoGameLanguage) => void;
};

const LanguageSwitch = ({ language, onChange }: LanguageSwitchProps) => (
  <div className="bingo-language-switch" aria-label="Language setting">
    {([
      { value: "ko", label: "한국어" },
      { value: "en", label: "English" },
    ] as const).map((option) => (
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

const BingoGame = () => {
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
  const [testModeEnabled] = useState(() => syncTestModeFromUrl(location.search));
  const [language, setLanguage] = useState<BingoGameLanguage>(() =>
    readBingoGameLanguage(
      typeof window === "undefined" ? undefined : window.localStorage
    )
  );
  const copy = bingoGameCopy[language];
  const boardSize = eventProfile.boardSize;
  const boardCellCount = boardSize * boardSize;
  const cellValues = useMemo(() => eventProfile.keywords, [eventProfile.keywords]);
  const getKeywordDisplayLabel = useCallback(
    (keyword: string) => {
      if (!eventProfile.englishSupportEnabled || language !== "en") {
        return keyword;
      }

      return eventProfile.keywordTranslations[keyword]?.trim() || keyword;
    },
    [
      eventProfile.englishSupportEnabled,
      eventProfile.keywordTranslations,
      language,
    ]
  );
  const keywordSetupOptions = useMemo(
    () =>
      cellValues.map((keyword) => ({
        value: keyword,
        label: getKeywordDisplayLabel(keyword),
      })),
    [cellValues, getKeywordDisplayLabel]
  );
  const boardConnectionLines = useMemo(
    () => createBoardConnectionLines(boardSize),
    [boardSize]
  );
  const brandTitle = eventProfile.title;
  const unlockTime = useMemo(() => new Date(eventProfile.startAt).getTime(), [eventProfile.startAt]);
  const eventHomePath = useMemo(
    () => withSearch(getEventHomePath(eventProfile.slug), location.search),
    [eventProfile.slug, location.search]
  );

  const [username, setUsername] = useState("사용자 이름");
  const [participantContact, setParticipantContact] = useState("");
  const [userId, setUserId] = useState("");
  const [myKeywords, setMyKeywords] = useState<string[]>([]);
  const [bingoBoard, setBingoBoard] = useState<BingoCell[] | null>(null);
  const [opponentId, setOpponentId] = useState("");
  const [opponentQuery, setOpponentQuery] = useState("");
  const [opponentSearchResults, setOpponentSearchResults] = useState<BingoParticipantItem[]>([]);
  const [hasCompletedOpponentSearch, setHasCompletedOpponentSearch] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [nameSetupOpen, setNameSetupOpen] = useState(false);
  const [nameSetupMode, setNameSetupMode] = useState<"new-board" | "existing-board">("new-board");
  const [nameInput, setNameInput] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opponentInputRef = useRef<HTMLInputElement | null>(null);
  const opponentSearchRequestIdRef = useRef(0);
  const [completedLines, setCompletedLines] = useState<CompletedLine[]>([]);
  const [bingoCount, setBingoCount] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertKeywords, setAlertKeywords] = useState<string[]>([]);
  const [alertLabel, setAlertLabel] = useState("STATUS");
  const [interactionHistory, setInteractionHistory] = useState<InteractionRecord[]>([]);
  const [newBingoFound, setNewBingoFound] = useState(false);
  const [initialSetupOpen, setInitialSetupOpen] = useState(false);
  const [selectedInitialKeywords, setSelectedInitialKeywords] = useState<string[]>([]);
  const [bingoLineCells, setBingoLineCells] = useState<number[]>([]);
  const [animatedCells, setAnimatedCells] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newBingoCells, setNewBingoCells] = useState<number[]>([]);
  const [hasShownConfetti, setHasShownConfetti] = useState(() =>
    readStoredGoalCelebrationFlag(
      typeof window === "undefined" ? undefined : window.sessionStorage,
      eventSlug,
      getAuthSession()?.userId
    )
  );
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>("success");
  const [latestReceivedKeywords, setLatestReceivedKeywords] = useState<string[]>([]);
  const [boardPreviewPreset, setBoardPreviewPreset] = useState<BoardPreviewPreset | null>(null);
  const [boardPreviewBase, setBoardPreviewBase] = useState<BingoCell[] | null>(null);
  const [remainingTime, setRemainingTime] = useState(() => {
    return unlockTime - Date.now();
  });
  const [locked, setLocked] = useState(
    () =>
      eventProfile.restrictBeforeStart &&
      !testModeEnabled &&
      new Date().getTime() < unlockTime
  );
  const [showAllBingoModal, setShowAllBingoModal] = useState(false);
  const [isInitializingBoard, setIsInitializingBoard] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [lastProcessedIncomingSignature, setLastProcessedIncomingSignature] = useState("");
  const [hasKnownBoardForEvent, setHasKnownBoardForEvent] = useState(() =>
    readBoardReadyFlag(eventSlug, getAuthSession()?.userId)
  );
  const alertTimeoutRef = useRef<number | null>(null);
  const bingoBoardRef = useRef<BingoCell[] | null>(null);
  const lastSeenInteractionIdRef = useRef(0);
  const lastProcessedIncomingSignatureRef = useRef("");
  const isPollingRef = useRef(false);
  const isBoardPreviewActiveRef = useRef(false);

  const bingoMissionCount = eventProfile.bingoMissionCount;
  const exchangeKeywordCount = eventProfile.exchangeKeywordCount;
  const isBoardPreviewActive = boardPreviewPreset !== null;
  const displayBingoBoard = useMemo(
    () =>
      bingoBoard?.map((cell) => ({
        ...cell,
        value: getKeywordDisplayLabel(cell.value),
      })) ?? null,
    [bingoBoard, getKeywordDisplayLabel]
  );
  const displayLatestReceivedKeywords = useMemo(
    () => latestReceivedKeywords.map(getKeywordDisplayLabel),
    [getKeywordDisplayLabel, latestReceivedKeywords]
  );
  const displayAlertKeywords = useMemo(
    () => alertKeywords.map(getKeywordDisplayLabel),
    [alertKeywords, getKeywordDisplayLabel]
  );

  const syncSessionDisplayName = useCallback((nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      return;
    }

    const authSession = getAuthSession();
    if (!authSession?.userId) {
      return;
    }

    if ((authSession.userName ?? "").trim() === trimmedName) {
      return;
    }

    setAuthSession({
      ...authSession,
      userName: trimmedName,
    });

    void syncBingoBridgeUserName(trimmedName);
  }, []);

  const markedKeywordCount = useMemo(
    () => bingoBoard?.filter((cell) => cell.status === 1).length ?? 0,
    [bingoBoard]
  );

  const completionRate = useMemo(() => {
    return getBingoMissionProgressPercent(bingoCount, bingoMissionCount);
  }, [bingoCount, bingoMissionCount]);

  const participantSummary = useMemo(() => {
    const name = displayName || username;
    if (participantContact) {
      return language === "ko"
        ? `${name} ${copy.participantSuffix} | ${participantContact}`
        : `${name} | ${participantContact}`;
    }

    return language === "ko" ? `${name} ${copy.participantSuffix}` : name;
  }, [copy.participantSuffix, displayName, language, participantContact, username]);

  const loadingScreenCopy = useMemo(() => {
    if (!isEventProfileResolved || !hasKnownBoardForEvent) {
      return {
        title: copy.loadingDefaultTitle,
        description: copy.loadingDefaultDescription,
      };
    }

    return {
      title: copy.loadingBoardTitle,
      description: copy.loadingBoardDescription,
    };
  }, [
    copy.loadingBoardDescription,
    copy.loadingBoardTitle,
    copy.loadingDefaultDescription,
    copy.loadingDefaultTitle,
    hasKnownBoardForEvent,
    isEventProfileResolved,
  ]);

  const historySummary = useMemo(() => {
    return buildExchangeHistory(interactionHistory, userId);
  }, [interactionHistory, userId]);

  const exchangeHistory = historySummary.records;
  const metPersonNum = historySummary.metPersonCount;

  const sentHistory = useMemo(() => {
    const numericUserId = Number(userId);
    return exchangeHistory
      .filter((record) => record.sendUserId === numericUserId)
      .map((record) => ({
        ...record,
        given: record.given.map(getKeywordDisplayLabel),
      }));
  }, [exchangeHistory, getKeywordDisplayLabel, userId]);

  const receivedHistory = useMemo(() => {
    const numericUserId = Number(userId);
    return exchangeHistory
      .filter((record) => record.receiveUserId === numericUserId)
      .map((record) => ({
        ...record,
        given: record.given.map(getKeywordDisplayLabel),
      }));
  }, [exchangeHistory, getKeywordDisplayLabel, userId]);

  const handleCloseAlert = useCallback(() => {
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }

    setAlertOpen(false);
  }, []);

  const showAlert = useCallback(
    (
      message: string,
      severity: AlertSeverity = "success",
      payload: AlertPayload = {}
    ) => {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }

      setAlertTitle(payload.title ?? getDefaultAlertTitle(severity));
      setAlertMessage(message);
      setAlertSeverity(severity);
      setAlertKeywords(payload.keywords ?? []);
      setAlertLabel(payload.label ?? "STATUS");
      setAlertOpen(true);

      alertTimeoutRef.current = window.setTimeout(() => {
      setAlertOpen(false);
      alertTimeoutRef.current = null;
    }, payload.durationMs ?? 3400);
    },
    []
  );

  const handleLanguageChange = useCallback((nextLanguage: BingoGameLanguage) => {
    setLanguage(nextLanguage);
    writeBingoGameLanguage(
      typeof window === "undefined" ? undefined : window.localStorage,
      nextLanguage
    );
  }, []);

  useEffect(() => {
    if (testModeEnabled || !eventProfile.restrictBeforeStart) {
      setLocked(false);
      setRemainingTime(0);
      return;
    }

    const initialDiff = unlockTime - new Date().getTime();
    setLocked(initialDiff > 0);
    setRemainingTime(Math.max(0, initialDiff));

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = unlockTime - now;

      if (diff <= 0) {
        setLocked(false);
        clearInterval(interval);
      } else {
        setRemainingTime(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [eventProfile.restrictBeforeStart, testModeEnabled, unlockTime]);

  useEffect(() => {
    bingoBoardRef.current = bingoBoard;
  }, [bingoBoard]);

  useEffect(() => {
    setHasKnownBoardForEvent(readBoardReadyFlag(eventSlug, getAuthSession()?.userId));
  }, [eventSlug]);

  useEffect(() => {
    lastSeenInteractionIdRef.current = getLatestInteractionId(interactionHistory);
  }, [interactionHistory]);

  useEffect(() => {
    lastProcessedIncomingSignatureRef.current = lastProcessedIncomingSignature;
  }, [lastProcessedIncomingSignature]);

  useEffect(() => {
    isBoardPreviewActiveRef.current = isBoardPreviewActive;
  }, [isBoardPreviewActive]);

  const appendInteractionHistory = useCallback((records: InteractionRecord[]) => {
    if (records.length === 0) {
      return;
    }

    setInteractionHistory((previousRecords) => {
      const mergedRecords = mergeInteractionRecords(previousRecords, records);
      lastSeenInteractionIdRef.current = getLatestInteractionId(mergedRecords);
      return mergedRecords;
    });
  }, []);

  const refreshBingoState = useCallback(
    async (activeUserId: string) => {
      if (!activeUserId || isPollingRef.current || isBoardPreviewActiveRef.current) {
        return;
      }

      isPollingRef.current = true;

      try {
        const [boardResult, interactionResponse] = await Promise.all([
          getBingoBoard(activeUserId, eventSlug ?? undefined),
          getUserAllInteraction(activeUserId, eventSlug ?? undefined, lastSeenInteractionIdRef.current),
        ]);
        const latestBoard = boardResult.board;

        const interactionDelta = Array.isArray(interactionResponse.interactions)
          ? (interactionResponse.interactions as InteractionRecord[])
          : [];
        if (interactionDelta.length > 0) {
          appendInteractionHistory(interactionDelta);
        }

        const latestIncomingBatch = getLatestIncomingBatch(
          interactionDelta.filter(
            (interaction) => interaction.receive_user_id === Number(activeUserId)
          )
        );

        if (!latestBoard || latestBoard.length === 0) {
          return;
        }

        if (boardResult.displayName) {
          setDisplayName(boardResult.displayName);
          setUsername(boardResult.displayName);
          syncSessionDisplayName(boardResult.displayName);
        }

        const previousBoard = bingoBoardRef.current;
        if (!previousBoard || previousBoard.length !== latestBoard.length) {
          setBingoBoard(latestBoard);
          bingoBoardRef.current = latestBoard;
          return;
        }

        const newlyUpdatedValues = latestBoard
          .filter((cell, index) => previousBoard[index]?.status === 0 && cell.status === 1)
          .map((cell) => cell.value);

        if (newlyUpdatedValues.length > 0) {
          setBingoBoard(latestBoard);
          bingoBoardRef.current = latestBoard;
          setLatestReceivedKeywords(newlyUpdatedValues);
        }

        if (
          latestIncomingBatch &&
          latestIncomingBatch.signature !== lastProcessedIncomingSignatureRef.current
        ) {
          setLastProcessedIncomingSignature(latestIncomingBatch.signature);
          lastProcessedIncomingSignatureRef.current = latestIncomingBatch.signature;

          const incomingAlert = buildIncomingKeywordAlert(
            latestIncomingBatch,
            newlyUpdatedValues
          );
          if (incomingAlert) {
            showAlert(
              incomingAlert.message,
              incomingAlert.severity,
              incomingAlert.payload
            );
            return;
          }
        }

        if (newlyUpdatedValues.length === 0) {
          return;
        }

        showAlert(copy.alerts.boardUpdated, "success", {
          title: copy.alerts.boardUpdatedTitle,
          keywords: newlyUpdatedValues,
          label: "KEYWORD EXCHANGE",
        });
      } catch (error) {
        console.error("Error refreshing bingo board:", error);
      } finally {
        isPollingRef.current = false;
      }
    },
    [
      appendInteractionHistory,
      copy.alerts.boardUpdated,
      copy.alerts.boardUpdatedTitle,
      eventSlug,
      showAlert,
      syncSessionDisplayName,
    ]
  );

  useEffect(() => {
    if (!isEventProfileAvailable) {
      return;
    }

    const init = async () => {
      const authSession = getAuthSession();
      const storedId = authSession?.userId ?? "";
      let storedName = authSession?.userName ?? "";
      let storedContact = resolveParticipantEmail(authSession);

      if (!storedId) {
        navigate(eventHomePath, { replace: true });
        return;
      }

      const supabase = maybeGetSupabaseClient();
      if (supabase) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const sessionEmail = normalizeAuthEmail(session?.user?.email);

          if (session?.user && authSession?.loginId) {
            const bridgeResult = await ensureBingoGoogleBridge(
              session.user,
              eventSlug ?? undefined
            );
            storedName = bridgeResult.authSession.userName;
            storedContact = resolveParticipantEmail(bridgeResult.authSession) || storedContact;
          } else if (!storedContact && sessionEmail) {
            storedContact = sessionEmail;
            setAuthSession({
              userId: storedId,
              userName: authSession?.userName ?? storedName,
              loginId: authSession?.loginId ?? "",
              userEmail: sessionEmail,
            });
          }
        } catch (error) {
          console.warn("Failed to restore participant email from Supabase session.", error);
        }
      }

      setUserId(storedId);
      setHasKnownBoardForEvent(readBoardReadyFlag(eventSlug, storedId));
      if (storedName) {
        setUsername(storedName);
      }
      if (storedContact) {
        setParticipantContact(storedContact);
      }

      // 빙고 오픈 전이면 카운트다운만 표시 (API 호출 안 함)
      const now = new Date().getTime();
      const isEntryLockedNow =
        eventProfile.restrictBeforeStart &&
        !testModeEnabled &&
        (locked || now < unlockTime);
      if (isEntryLockedNow) {
        setLocked(true);
        setRemainingTime(Math.max(0, unlockTime - now));
        setIsBootstrapping(false);
        return;
      }

      try {
        setIsBootstrapping(true);

        const [boardResult, interactionData] = await Promise.all([
          getBingoBoard(storedId, eventSlug ?? undefined),
          getUserAllInteraction(storedId, eventSlug ?? undefined),
        ]);
        const boardData = boardResult.board;
        const interactionRecords = Array.isArray(interactionData.interactions)
          ? (interactionData.interactions as InteractionRecord[])
          : [];

        setInteractionHistory(interactionRecords);
        lastSeenInteractionIdRef.current = getLatestInteractionId(interactionRecords);

        if (boardData && boardData.length > 0) {
          // 기존 보드가 있으면 빙고 화면으로
          if (typeof window !== "undefined" && eventSlug) {
            window.sessionStorage.setItem(getBoardReadyStorageKey(eventSlug, storedId), "1");
            setHasKnownBoardForEvent(true);
          }
          const resolvedDisplayName = (boardResult.displayName ?? "").trim();
          if (resolvedDisplayName) {
            setDisplayName(resolvedDisplayName);
            setUsername(resolvedDisplayName);
            syncSessionDisplayName(resolvedDisplayName);
          } else {
            setDisplayName("");
            setNameInput(storedName.trim() && storedName !== "사용자 이름" ? storedName : "");
            setNameSetupMode("existing-board");
            setNameSetupOpen(true);
          }
          setBingoBoard(boardData);
          bingoBoardRef.current = boardData;
          setInitialSetupOpen(false);

          const selectedKeywords = boardData
            .filter((cell) => cell.selected === 1)
            .map((cell) => cell.value);
          setMyKeywords(selectedKeywords);

          const latestIncomingBatch = getLatestIncomingBatch(
            interactionRecords.filter(
              (interaction) => interaction.receive_user_id === Number(storedId)
            )
          );
          if (latestIncomingBatch) {
            setLatestReceivedKeywords(latestIncomingBatch.keywords);
            setLastProcessedIncomingSignature(latestIncomingBatch.signature);
            lastProcessedIncomingSignatureRef.current =
              latestIncomingBatch.signature;
          }
        } else {
          // 보드 없음 → 이름 설정부터 시작
          if (typeof window !== "undefined" && eventSlug) {
            window.sessionStorage.removeItem(getBoardReadyStorageKey(eventSlug, storedId));
          }
          setHasKnownBoardForEvent(false);
          enterSetupFlow(storedName);
        }
      } catch (error) {
        console.error("Error loading user board:", error);
        // API 실패해도 셋업 플로우로 진입
        if (typeof window !== "undefined" && eventSlug) {
          window.sessionStorage.removeItem(getBoardReadyStorageKey(eventSlug, storedId));
        }
        setHasKnownBoardForEvent(false);
        enterSetupFlow(storedName);
      } finally {
        setIsBootstrapping(false);
      }
    };

    const enterSetupFlow = (storedName: string) => {
      setNameSetupMode("new-board");
      const shuffledValues = shuffleArray(cellValues);
      const initialBoard: BingoCell[] = Array(boardCellCount)
        .fill(null)
        .map((_, index) => ({
          id: index,
          value: shuffledValues[index % shuffledValues.length],
          selected: 0,
          status: 0,
        }));

      setBingoBoard(initialBoard);
      bingoBoardRef.current = initialBoard;
      setNameSetupOpen(true);
      setNameInput(storedName);
    };

    void init();
  }, [
    boardCellCount,
    cellValues,
    eventProfile.restrictBeforeStart,
    eventHomePath,
    eventSlug,
    isEventProfileAvailable,
    locked,
    unlockTime,
    navigate,
    showAlert,
    syncSessionDisplayName,
    testModeEnabled,
  ]);

  useEffect(() => {
    if (!userId || initialSetupOpen || nameSetupOpen) {
      return;
    }

    const interval = setInterval(() => {
      void refreshBingoState(userId);
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshBingoState, userId, initialSetupOpen, nameSetupOpen]);

  const resetPreviewVisualState = useCallback(() => {
    setShowAllBingoModal(false);
    setShowConfetti(false);
    setHasShownConfetti(
      readStoredGoalCelebrationFlag(
        typeof window === "undefined" ? undefined : window.sessionStorage,
        eventSlug,
        userId || getAuthSession()?.userId
      )
    );
    setNewBingoFound(false);
    setAnimatedCells([]);
    setNewBingoCells([]);
    setLatestReceivedKeywords([]);
  }, [eventSlug, userId]);

  const applyBoardPreview = useCallback(
    (preset: BoardPreviewPreset) => {
      if (!bingoBoard || bingoBoard.length === 0) {
        return;
      }

      const sourceBoard = boardPreviewBase ?? bingoBoard;
      const baseBoard = sourceBoard.map((cell) => ({ ...cell }));

      if (!boardPreviewBase) {
        setBoardPreviewBase(baseBoard);
      }

      setBoardPreviewPreset(preset);
      resetPreviewVisualState();

      const previewBoard = buildPreviewBoard(baseBoard, preset, boardSize);
      setBingoBoard(previewBoard);
      bingoBoardRef.current = previewBoard;

      showAlert(copy.alerts.previewApplied, "info", {
        title: copy.alerts.previewTitle,
        label: "BOARD PREVIEW",
      });
    },
    [
      bingoBoard,
      boardPreviewBase,
      boardSize,
      copy.alerts.previewApplied,
      copy.alerts.previewTitle,
      resetPreviewVisualState,
      showAlert,
    ]
  );

  const clearBoardPreview = useCallback(() => {
    if (!boardPreviewBase) {
      return;
    }

    setBoardPreviewPreset(null);
    resetPreviewVisualState();

    const restoredBoard = boardPreviewBase.map((cell) => ({ ...cell }));
    setBingoBoard(restoredBoard);
    bingoBoardRef.current = restoredBoard;
    setBoardPreviewBase(null);

    showAlert(copy.alerts.previewCleared, "info", {
      title: copy.alerts.previewClearedTitle,
      label: "BOARD PREVIEW",
    });
  }, [
    boardPreviewBase,
    copy.alerts.previewCleared,
    copy.alerts.previewClearedTitle,
    resetPreviewVisualState,
    showAlert,
  ]);

  const initializeBoard = async (selectedKeywords: string[]) => {
    try {
      const boardData: Record<
        string,
        { value: string; status: number; selected: number }
      > = {};

      const nextBoard =
        bingoBoard?.map((item, index) => {
          const isSelected = selectedKeywords.includes(item.value);
          boardData[index] = {
            value: item.value,
            status: 0,
            selected: isSelected ? 1 : 0,
          };

          return {
            ...item,
            status: 0,
            selected: isSelected ? 1 : 0,
          };
        }) ?? [];

      const storedId = getAuthSession()?.userId;
      if (!storedId) {
        return false;
      }

      const result = await createBingoBoard(storedId, boardData, eventSlug ?? undefined, displayName || undefined);
      if (!result.ok) {
        return false;
      }
      if (typeof window !== "undefined" && eventSlug) {
        window.sessionStorage.setItem(getBoardReadyStorageKey(eventSlug, storedId), "1");
        setHasKnownBoardForEvent(true);
      }
      if (result.displayName) {
        setDisplayName(result.displayName);
        setUsername(result.displayName);
        syncSessionDisplayName(result.displayName);
      }

      setUserId(storedId);
      setBingoBoard(nextBoard);
      return true;
    } catch (error) {
      console.error("Failed to initialize bingo board:", error);
      return false;
    }
  };

  const handleInitialSetup = async () => {
    if (selectedInitialKeywords.length !== exchangeKeywordCount) {
      showAlert(copy.alerts.selectKeywordCount(exchangeKeywordCount), "warning");
      return;
    }

    try {
      setIsInitializingBoard(true);
      if (selectedInitialKeywords.length > 0) {
        setMyKeywords(selectedInitialKeywords);
      }

      const isInitialized = await initializeBoard(selectedInitialKeywords);
      if (!isInitialized) {
        showAlert(copy.alerts.keywordSaveError, "error");
        return;
      }

      setInitialSetupOpen(false);
      showAlert(copy.alerts.keywordsReady);
    } catch (error) {
      console.error("Failed initial setup:", error);
      showAlert(copy.alerts.keywordSetupError, "error");
    } finally {
      setIsInitializingBoard(false);
    }
  };

  const toggleInitialKeyword = (keyword: string) => {
    setSelectedInitialKeywords((previousKeywords) => {
      if (previousKeywords.includes(keyword)) {
        return previousKeywords.filter((item) => item !== keyword);
      }

      if (previousKeywords.length >= exchangeKeywordCount) {
        showAlert(
          copy.alerts.keywordLimit(exchangeKeywordCount),
          "warning"
        );
        return previousKeywords;
      }

      return [...previousKeywords, keyword];
    });
  };

  const checkBingoLines = useCallback(() => {
    if (!bingoBoard) {
      return;
    }

    const newCompletedLines = getCompletedLines(bingoBoard, boardSize);
    const newBingoCount = newCompletedLines.length;
    const celebrationAlreadySeen = readStoredGoalCelebrationFlag(
      typeof window === "undefined" ? undefined : window.sessionStorage,
      eventSlug,
      userId || getAuthSession()?.userId
    );
    if (celebrationAlreadySeen) {
      const lineCells = newCompletedLines.flatMap((line) =>
        getCellsInLine(line.type, line.index, boardSize)
      );
      setBingoLineCells([...new Set(lineCells)]);
    }

    setCompletedLines(newCompletedLines);
    setBingoCount(newBingoCount);
    if (newBingoCount >= bingoMissionCount && !celebrationAlreadySeen) {
      writeStoredGoalCelebrationFlag(
        typeof window === "undefined" ? undefined : window.sessionStorage,
        eventSlug,
        userId || getAuthSession()?.userId
      );
      setShowAllBingoModal(true);
    }
  }, [bingoBoard, bingoMissionCount, boardSize, eventSlug, userId]);

  useEffect(() => {
    setHasShownConfetti(
      readStoredGoalCelebrationFlag(
        typeof window === "undefined" ? undefined : window.sessionStorage,
        eventSlug,
        userId || getAuthSession()?.userId
      )
    );
  }, [eventSlug, userId]);

  useEffect(() => {
    let resetAnimationTimer: number | null = null;

    const newLines = completedLines.filter(
      (newLine) =>
        !getCellsInLine(newLine.type, newLine.index, boardSize).every((lineCell) =>
          bingoLineCells.includes(lineCell)
        )
    );

    const newCells: number[] = [];
    newLines.forEach((line) => {
      newCells.push(...getCellsInLine(line.type, line.index, boardSize));
    });

    const uniqueNewCells = [...new Set(newCells)];

    if (uniqueNewCells.length > 0) {
      const hasReachedMissionGoal = bingoCount >= bingoMissionCount;
      setNewBingoCells(uniqueNewCells);
      setAnimatedCells(uniqueNewCells);
      setNewBingoFound(true);

      if (hasReachedMissionGoal) {
        handleCloseAlert();
      } else {
        showAlert(copy.alerts.bingoLine);
      }

      if (!hasShownConfetti && hasReachedMissionGoal) {
        setShowConfetti(true);
        setHasShownConfetti(true);
      }

      resetAnimationTimer = window.setTimeout(() => {
        setAnimatedCells([]);
        setNewBingoCells([]);
        setNewBingoFound(false);
        setShowConfetti(false);
      }, 3000);
    }

    const allCellsFromLines: number[] = [];
    completedLines.forEach((line) => {
      allCellsFromLines.push(...getCellsInLine(line.type, line.index, boardSize));
    });

    const uniqueAllCells = [...new Set(allCellsFromLines)];
    const hasSameCells =
      uniqueAllCells.length === bingoLineCells.length &&
      uniqueAllCells.every((cell, index) => cell === bingoLineCells[index]);

    if (!hasSameCells) {
      setBingoLineCells(uniqueAllCells);
    }

    return () => {
      if (resetAnimationTimer) {
        window.clearTimeout(resetAnimationTimer);
      }
    };
  }, [
    bingoCount,
    bingoLineCells,
    bingoMissionCount,
    boardSize,
    completedLines,
    handleCloseAlert,
    hasShownConfetti,
    showAlert,
    copy.alerts.bingoLine,
  ]);

  useEffect(() => {
    if (bingoBoard?.length === boardCellCount) {
      checkBingoLines();
    }
  }, [boardCellCount, bingoBoard, checkBingoLines]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  const alertToast = (
    <BingoAlertToast
      open={alertOpen}
      severity={alertSeverity}
      title={alertTitle}
      message={alertMessage}
      keywords={displayAlertKeywords}
      label={alertLabel}
      closeLabel={copy.toastCloseLabel}
      closeText={copy.toastCloseText}
      onClose={handleCloseAlert}
    />
  );

  const handleOpponentSearch = useCallback(
    (query: string) => {
      const normalizedEventSlug = eventSlug?.trim() ?? "";
      const normalizedQuery = query.trim();
      setOpponentQuery(query);
      setOpponentId("");
      setHasCompletedOpponentSearch(false);
      opponentSearchRequestIdRef.current += 1;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (normalizedQuery.length === 0) {
        setOpponentSearchResults([]);
        setIsSearching(false);
        return;
      }

      if (!normalizedEventSlug) {
        setOpponentSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const requestId = opponentSearchRequestIdRef.current;
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const activeUserId = userId || getAuthSession()?.userId || "";
          const results = await searchBingoParticipants(
            normalizedQuery,
            normalizedEventSlug,
            activeUserId || undefined
          );
          if (requestId !== opponentSearchRequestIdRef.current) {
            return;
          }
          const filteredResults = results.filter((u) => String(u.user_id) !== activeUserId);
          setOpponentSearchResults(filteredResults);
          setHasCompletedOpponentSearch(true);
        } catch {
          if (requestId !== opponentSearchRequestIdRef.current) {
            return;
          }
          setOpponentSearchResults([]);
        } finally {
          if (requestId === opponentSearchRequestIdRef.current) {
            setIsSearching(false);
          }
        }
      }, 300);
    },
    [eventSlug, userId]
  );

  const handleSelectOpponent = useCallback(
    (user: BingoParticipantItem) => {
      setOpponentId(String(user.user_id));
      setOpponentQuery(user.display_name);
      setOpponentSearchResults([]);
      setHasCompletedOpponentSearch(false);
      opponentInputRef.current?.blur();
    },
    []
  );

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed.length === 0) {
      showAlert(copy.alerts.nameRequired, "warning");
      return false;
    }

    const storedId = getAuthSession()?.userId;
    if (nameSetupMode === "existing-board") {
      if (!storedId || !eventSlug) {
        showAlert(copy.alerts.missingLogin, "error");
        return false;
      }

      const result = await updateBingoDisplayName(storedId, eventSlug, trimmed);
      if (!result.ok) {
        showAlert(result.message || copy.alerts.nameSaveError, "error");
        return false;
      }

      const nextName = (result.display_name ?? trimmed).trim();
      setUsername(nextName);
      setDisplayName(nextName);
      syncSessionDisplayName(nextName);
      setNameInput(nextName);
      return true;
    }

    // 새 보드는 보드 생성 시 display_name을 함께 전달한다.
    setUsername(trimmed);
    setDisplayName(trimmed);
    syncSessionDisplayName(trimmed);
    setNameInput(trimmed);
    return true;
  };

  const handleExchange = async () => {
    opponentInputRef.current?.blur();

    if (isBoardPreviewActive) {
      showAlert(copy.alerts.previewLocked, "info", {
        title: copy.alerts.previewLockedTitle,
        label: "BOARD PREVIEW",
      });
      return;
    }

    if (!opponentId.trim()) {
      showAlert(copy.alerts.selectOpponent, "warning");
      return;
    }

    const myId = getAuthSession()?.userId;
    if (!myId) {
      showAlert(copy.alerts.missingLogin, "error");
      return;
    }

    if (myId === opponentId.trim()) {
      showAlert(copy.alerts.selfExchange, "warning");
      return;
    }

    try {
      const targetId = opponentId.trim();
      const alreadyExchanged = interactionHistory.some((interaction) => {
        return interaction.send_user_id === Number(myId) &&
          interaction.receive_user_id === Number(targetId);
      });
      if (alreadyExchanged) {
        showAlert(
          copy.alerts.duplicateExchange,
          "warning",
          {
            title: copy.alerts.duplicateExchangeTitle,
            label: "KEYWORD EXCHANGE",
          }
        );
        return;
      }

      const exchangeResult = await createUserBingoInteraction(
        serializeInteractionKeywords(myKeywords),
        Number(myId),
        Number(targetId),
        eventSlug ?? undefined
      );

      if (!exchangeResult.ok) {
        showAlert(
          exchangeResult.message || copy.alerts.exchangeFailed,
          "error"
        );
        return;
      }

      appendInteractionHistory([exchangeResult.interaction]);
      setOpponentId("");
      setOpponentQuery("");

      const sentKeywords = getUniqueKeywords(
        getInteractionKeywords(exchangeResult.interaction)
      );
      const receiverName =
        exchangeResult.interaction.receive_user_name ??
        `${copy.participantFallback} ${targetId}`;

      showAlert(
        copy.alerts.exchangeSuccessMessage(receiverName),
        "success",
        {
          title: copy.alerts.exchangeSuccessTitle,
          keywords: sentKeywords,
          label: "KEYWORD EXCHANGE",
        }
      );
    } catch (error) {
      console.error("Exchange failed:", error);
      showAlert(copy.alerts.unknownError, "error");
    }
  };

  if (nameSetupOpen) {
    return (
      <div className="keyword-setup-page">
        <div className="keyword-setup-page__mesh" aria-hidden="true" />
        <main className="keyword-setup-shell">
          <header className="keyword-setup-header">
            <div className="keyword-setup-header__title">
              <span className="keyword-setup-header__spark keyword-setup-header__spark--left" />
              <h1>{copy.nameSetupTitle}</h1>
              <span className="keyword-setup-header__spark keyword-setup-header__spark--right" />
            </div>
            <p>{copy.nameSetupDescription}</p>
          </header>

          <section className="keyword-setup-card">
            <div style={{ padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={copy.namePlaceholder}
                maxLength={100}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  fontSize: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div className="keyword-setup-card__footer">
              <button
                type="button"
                className="keyword-setup-submit"
                onClick={async () => {
                  const saved = await handleSaveName();
                  if (!saved) {
                    return;
                  }

                  setNameSetupOpen(false);
                  if (nameSetupMode === "new-board") {
                    setInitialSetupOpen(true);
                  }
                }}
                disabled={nameInput.trim().length === 0}
              >
                {nameSetupMode === "existing-board" ? copy.save : copy.next}
              </button>
            </div>
          </section>
        </main>
        <LanguageSwitch language={language} onChange={handleLanguageChange} />
        {alertToast}
      </div>
    );
  }

  if (initialSetupOpen) {
    return (
      <KeywordSetupScreen
        exchangeKeywordCount={exchangeKeywordCount}
        isInitializingBoard={isInitializingBoard}
        keywords={keywordSetupOptions}
        selectedKeywords={selectedInitialKeywords}
        copy={{
          title: copy.keywordSetupTitle,
          description: copy.keywordSetupDescription(exchangeKeywordCount),
          ariaLabel: copy.keywordSetupAriaLabel,
          preparing: copy.setupPreparing,
          start: copy.setupStart,
        }}
        onToggleKeyword={toggleInitialKeyword}
        onSubmit={handleInitialSetup}
        alertToast={
          <>
            <LanguageSwitch language={language} onChange={handleLanguageChange} />
            {alertToast}
          </>
        }
      />
    );
  }

  if (eventProfileLoadState === "not_found") {
    return (
      <PublicEventStatePage
        eyebrow="Bingo Access"
        title={copy.notFoundTitle}
        description={copy.notFoundDescription}
      />
    );
  }

  if (eventProfileLoadState === "error") {
    return (
      <PublicEventStatePage
        eyebrow="Bingo Access"
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

  if (!isEventProfileResolved || isBootstrapping) {
    return (
      <BingoLoadingScreen
        brandTitle={brandTitle}
        title={loadingScreenCopy.title}
        description={loadingScreenCopy.description}
      />
    );
  }

  if (locked) {
    return (
      <BingoCountdownScreen
        brandTitle={brandTitle}
        remainingTime={remainingTime}
        title={copy.countdownTitle}
        units={copy.countdownUnits}
      />
    );
  }

  return (
    <div className="bingo-game-page">
      <div className="bingo-game-page__mesh" aria-hidden="true" />

      <main className="bingo-game-shell">
        <header className="bingo-game-header">
          <button
            type="button"
            className="bingo-game-header__brand"
            aria-label={copy.eventHomeLabel}
            onClick={() => navigate(eventHomePath, { replace: true })}
          >
            <img src={bingoNetworkingWordmark} alt="Bingo Networking" />
          </button>
          <LanguageSwitch language={language} onChange={handleLanguageChange} />
        </header>

        <section className="bingo-game-top">
          <article className="bingo-card bingo-hero">
            <p className="bingo-hero__identity">{participantSummary}</p>
            <div className="bingo-hero__content">
              <div className="bingo-hero__copy">
                <h1>
                  {copy.heroTitleLines.map((line, index) => (
                    <span key={line}>
                      {index > 0 ? <br /> : null}
                      {line}
                    </span>
                  ))}
                </h1>
                <form
                  className="bingo-hero__form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleExchange();
                  }}
                >
                  <div className="bingo-hero__form-field">
                    <input
                      ref={opponentInputRef}
                      value={opponentQuery}
                      onChange={(event) => handleOpponentSearch(event.target.value)}
                      placeholder={
                        isBoardPreviewActive
                          ? copy.previewLockedPlaceholder
                          : copy.opponentSearchPlaceholder
                      }
                      aria-label={copy.opponentSearchAriaLabel}
                      disabled={isBoardPreviewActive}
                    />
                    {opponentSearchResults.length > 0 && (
                      <ul className="bingo-hero__search-results">
                        {opponentSearchResults.map((user) => (
                          <li key={user.user_id} className="bingo-hero__search-result-item">
                            <button
                              type="button"
                              className="bingo-hero__search-result-button"
                              onClick={() => handleSelectOpponent(user)}
                            >
                              {user.display_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {isSearching && opponentQuery.trim().length > 0 && (
                      <div className="bingo-hero__search-status">
                        {copy.searching}
                      </div>
                    )}
                    {!isSearching &&
                      hasCompletedOpponentSearch &&
                      opponentQuery.trim().length > 0 &&
                      opponentSearchResults.length === 0 && (
                        <div className="bingo-hero__search-status">
                          {copy.noSearchResults}
                        </div>
                      )}
                  </div>
                  <button type="submit" disabled={isBoardPreviewActive || !opponentId}>
                    {copy.send}
                  </button>
                </form>
              </div>
              <NetworkingIllustration />
            </div>
          </article>

          <article className="bingo-card bingo-stats">
            <span className="bingo-stats__badge">{copy.soloBadge}</span>
            <div className="bingo-stats__score">
              <strong>{completionRate}%</strong>
              <p>{copy.completionRate}</p>
            </div>
            <div
              className={`bingo-stats__progress ${newBingoFound ? "is-animating" : ""}`}
              aria-hidden="true"
            >
              <span style={{ width: `${completionRate}%` }} />
            </div>
            <section className="bingo-stats__selected" aria-label={copy.selectedKeywordsLabel}>
              <div className="bingo-stats__selected-head">
                <h3>{copy.selectedKeywordsLabel}</h3>
                <strong>{copy.selectedKeywordCount(myKeywords.length)}</strong>
              </div>
              <div className="bingo-stats__selected-list">
                {myKeywords.length > 0 ? (
                  myKeywords.map((keyword) => (
                    <span key={keyword} className="bingo-stats__selected-chip">
                      {getKeywordDisplayLabel(keyword)}
                    </span>
                  ))
                ) : (
                  <p className="bingo-stats__selected-empty">
                    {copy.noSelectedKeywords}
                  </p>
                )}
              </div>
            </section>
            <dl className="bingo-stats__meta">
              <div>
                <dt>{copy.collectedKeywords}</dt>
                <dd>
                  {markedKeywordCount}/{boardCellCount}
                </dd>
              </div>
              <div>
                <dt>{copy.metParticipants}</dt>
                <dd>{copy.metParticipantCount(metPersonNum)}</dd>
              </div>
            </dl>
          </article>
        </section>

        {displayBingoBoard ? (
          <BingoBoardSection
            board={displayBingoBoard}
            boardSize={boardSize}
            connectionLines={boardConnectionLines}
            completedLines={completedLines}
            newBingoCells={newBingoCells}
            latestReceivedKeywords={displayLatestReceivedKeywords}
            animatedCells={animatedCells}
            completedCellIndexes={bingoLineCells}
            previewTools={
              testModeEnabled
                ? {
                    options: BOARD_PREVIEW_OPTIONS,
                    activePreset: boardPreviewPreset,
                    onSelectPreview: applyBoardPreview,
                    onResetPreview: clearBoardPreview,
                    copy: {
                      eyebrow: copy.previewEyebrow,
                      activeTitle: copy.previewActiveTitle,
                      idleTitle: copy.previewIdleTitle,
                      description: copy.previewDescription,
                      reset: copy.previewReset,
                    },
                  }
                : undefined
            }
          />
        ) : null}

        <section className="bingo-history-grid">
          <HistoryPanel
            title={copy.sentHistoryTitle}
            count={sentHistory.length}
            records={sentHistory}
            emptyMessage={copy.sentHistoryEmpty}
            participantKey="receivePerson"
          />
          <HistoryPanel
            title={copy.receivedHistoryTitle}
            count={receivedHistory.length}
            records={receivedHistory}
            emptyMessage={copy.receivedHistoryEmpty}
            participantKey="sendPerson"
          />
        </section>

        <div className="bingo-game-footer">
          <button
            type="button"
            className="bingo-game-footer__home"
            onClick={() => navigate(eventHomePath, { replace: true })}
          >
            {copy.homeButton}
          </button>
          <p>© 2023 DevFactory.</p>
        </div>
      </main>

      {showConfetti ? (
        <div className="bingo-confetti" aria-hidden="true">
          {Array.from({ length: 42 }).map((_, index) => {
            const size = (index % 5) * 4 + 8;
            const left = ((index * 17) % 100) + 1;
            const duration = 2.8 + (index % 4) * 0.45;
            const delay = (index % 6) * 0.08;
            const colors = [
              "#ff784f",
              "#9ef35d",
              "#f6ffb1",
              "#0e7c61",
              "#fff3da",
              "#1ed6a1",
            ];

            return (
              <span
                key={index}
                className="bingo-confetti__piece"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: colors[index % colors.length],
                  animationDuration: `${duration}s`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
      ) : null}

      <BingoCelebrationDialog
        open={showAllBingoModal}
        bingoCount={bingoCount}
        markedKeywordCount={markedKeywordCount}
        metPersonNum={metPersonNum}
        copy={{
          title: copy.celebrationTitle,
          description: copy.celebrationCopy(bingoMissionCount),
          completedLines: copy.completedLines,
          openedCells: copy.openedCells,
          metParticipants: copy.metParticipants,
          continue: copy.continue,
        }}
        onClose={() => setShowAllBingoModal(false)}
      />

      {alertToast}
    </div>
  );
};

export default BingoGame;

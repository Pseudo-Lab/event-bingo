import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createBingoBoard,
  createUserBingoInteraction,
  getBingoBoard,
  getUserAllInteraction,
  searchBingoParticipants,
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
import { ensureBingoGoogleBridge } from "../../utils/bingoGoogleBridge";
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
import type {
  AlertPayload,
  AlertSeverity,
  BingoCell,
  CompletedLine,
  InteractionRecord,
} from "./bingoGameTypes";
import {
  buildExchangeHistory,
  buildPreviewBoard,
  BOARD_PREVIEW_OPTIONS,
  createBoardConnectionLines,
  getCellsInLine,
  getCompletedLines,
  getDefaultAlertTitle,
  getLatestIncomingBatch,
  getLatestInteractionId,
  getUniqueKeywords,
  mergeInteractionRecords,
  serializeInteractionKeywords,
  shuffleArray,
} from "./bingoGameUtils";
import type { BoardPreviewPreset } from "./bingoGameTypes";
import { syncTestModeFromUrl } from "../../utils/testMode";
import "./BingoGame.css";

const PSEUDOLAB_URL = "https://pseudo-lab.com/";

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

const BingoGame = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventSlug } = useParams();
  const { eventProfile, isResolved: isEventProfileResolved } = useEventProfile(eventSlug);
  const [testModeEnabled] = useState(() => syncTestModeFromUrl(location.search));
  const boardSize = eventProfile.boardSize;
  const boardCellCount = boardSize * boardSize;
  const cellValues = useMemo(() => eventProfile.keywords, [eventProfile.keywords]);
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
  const [nameInput, setNameInput] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>("success");
  const [latestReceivedKeywords, setLatestReceivedKeywords] = useState<string[]>([]);
  const [boardPreviewPreset, setBoardPreviewPreset] = useState<BoardPreviewPreset | null>(null);
  const [boardPreviewBase, setBoardPreviewBase] = useState<BingoCell[] | null>(null);
  const [remainingTime, setRemainingTime] = useState(() => {
    return unlockTime - Date.now();
  });
  const [locked, setLocked] = useState(
    () => !testModeEnabled && new Date().getTime() < unlockTime
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

  const syncSessionDisplayName = useCallback((nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      return;
    }

    const authSession = getAuthSession();
    if (!authSession?.userId) {
      return;
    }

    setAuthSession({
      ...authSession,
      userName: trimmedName,
    });
  }, []);

  const markedKeywordCount = useMemo(
    () => bingoBoard?.filter((cell) => cell.status === 1).length ?? 0,
    [bingoBoard]
  );

  const completionRate = useMemo(() => {
    return Math.min(
      100,
      Math.round((markedKeywordCount / boardCellCount) * 100)
    );
  }, [boardCellCount, markedKeywordCount]);

  const participantSummary = useMemo(() => {
    const name = displayName || username;
    if (participantContact) {
      return `${name} 님 | ${participantContact}`;
    }

    return `${name} 님`;
  }, [displayName, participantContact, username]);

  const loadingScreenCopy = useMemo(() => {
    if (!isEventProfileResolved || !hasKnownBoardForEvent) {
      return {
        title: "로딩 중입니다",
        description: "잠시만 기다려 주세요.",
      };
    }

    return {
      title: "빙고 보드를 불러오고 있습니다",
      description: "저장된 보드와 교환 기록을 확인하고 있어요.",
    };
  }, [hasKnownBoardForEvent, isEventProfileResolved]);

  const historySummary = useMemo(() => {
    return buildExchangeHistory(interactionHistory, userId);
  }, [interactionHistory, userId]);

  const exchangeHistory = historySummary.records;
  const metPersonNum = historySummary.metPersonCount;

  const sentHistory = useMemo(() => {
    const numericUserId = Number(userId);
    return exchangeHistory.filter((record) => record.sendUserId === numericUserId);
  }, [exchangeHistory, userId]);

  const receivedHistory = useMemo(() => {
    const numericUserId = Number(userId);
    return exchangeHistory.filter((record) => record.receiveUserId === numericUserId);
  }, [exchangeHistory, userId]);

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

  useEffect(() => {
    if (testModeEnabled) {
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
  }, [testModeEnabled, unlockTime]);

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

        if (newlyUpdatedValues.length === 0) {
          return;
        }

        setBingoBoard(latestBoard);
        bingoBoardRef.current = latestBoard;
        setLatestReceivedKeywords(newlyUpdatedValues);

        const latestIncomingBatch = getLatestIncomingBatch(
          interactionDelta.filter(
            (interaction) => interaction.receive_user_id === Number(activeUserId)
          )
        );

        if (
          latestIncomingBatch &&
          latestIncomingBatch.signature !== lastProcessedIncomingSignatureRef.current
        ) {
          const displaySenderName =
            latestIncomingBatch.senderName ||
            `참가자 ${latestIncomingBatch.senderId}`;

          setLastProcessedIncomingSignature(latestIncomingBatch.signature);
          lastProcessedIncomingSignatureRef.current = latestIncomingBatch.signature;

          if (newlyUpdatedValues.length === latestIncomingBatch.keywords.length) {
            showAlert(`"${displaySenderName}"님이 키워드를 보내줬어요.`, "success", {
              title: "새 키워드를 받았어요",
              keywords: newlyUpdatedValues,
              label: "KEYWORD EXCHANGE",
            });
            return;
          }

          if (newlyUpdatedValues.length > 0) {
            showAlert(
              `"${displaySenderName}"님이 보낸 키워드 중 새로운 항목만 반영했어요.`,
              "success",
              {
                title: "새 키워드만 반영했어요",
                keywords: newlyUpdatedValues,
                label: "KEYWORD EXCHANGE",
              }
            );
            return;
          }

          showAlert(
            `"${displaySenderName}"님이 보낸 키워드는 이미 모두 가지고 있어요.`,
            "info",
            {
              title: "이미 키워드가 다 있어요",
              label: "KEYWORD EXCHANGE",
            }
          );
          return;
        }

        showAlert("새 키워드가 반영됐어요.", "success", {
          title: "보드가 업데이트됐어요",
          keywords: newlyUpdatedValues,
          label: "KEYWORD EXCHANGE",
        });
      } catch (error) {
        console.error("Error refreshing bingo board:", error);
      } finally {
        isPollingRef.current = false;
      }
    },
    [appendInteractionHistory, eventSlug, showAlert, syncSessionDisplayName]
  );

  useEffect(() => {
    if (!isEventProfileResolved) {
      return;
    }

    const init = async () => {
      const authSession = getAuthSession();
      const storedId = authSession?.userId ?? "";
      const storedName = authSession?.userName ?? "";
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
      if (!testModeEnabled && Date.now() < unlockTime) {
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
          if (boardResult.displayName) {
            setDisplayName(boardResult.displayName);
            setUsername(boardResult.displayName);
            syncSessionDisplayName(boardResult.displayName);
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
    eventHomePath,
    eventSlug,
    isEventProfileResolved,
    navigate,
    showAlert,
    syncSessionDisplayName,
    testModeEnabled,
    unlockTime,
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
    setHasShownConfetti(false);
    setNewBingoFound(false);
    setAnimatedCells([]);
    setNewBingoCells([]);
    setLatestReceivedKeywords([]);
  }, []);

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

      showAlert("보드 프리뷰를 적용했습니다.", "info", {
        title: "테스트 프리뷰",
        label: "BOARD PREVIEW",
      });
    },
    [bingoBoard, boardPreviewBase, boardSize, resetPreviewVisualState, showAlert]
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

    showAlert("실제 보드 상태로 돌아왔습니다.", "info", {
      title: "프리뷰 해제",
      label: "BOARD PREVIEW",
    });
  }, [boardPreviewBase, resetPreviewVisualState, showAlert]);

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
      showAlert(`관심사는 ${exchangeKeywordCount}개 선택해 주세요.`, "warning");
      return;
    }

    try {
      setIsInitializingBoard(true);
      if (selectedInitialKeywords.length > 0) {
        setMyKeywords(selectedInitialKeywords);
      }

      const isInitialized = await initializeBoard(selectedInitialKeywords);
      if (!isInitialized) {
        showAlert("키워드 저장 중 문제가 발생했습니다.", "error");
        return;
      }

      setInitialSetupOpen(false);
      showAlert("키워드가 설정되었습니다!");
    } catch (error) {
      console.error("Failed initial setup:", error);
      showAlert("초기 설정 중 문제가 발생했습니다.", "error");
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
          `관심사는 ${exchangeKeywordCount}개까지만 선택할 수 있습니다.`,
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
    setCompletedLines(newCompletedLines);
    setBingoCount(newBingoCount);
    if (newBingoCount >= bingoMissionCount) {
      setShowAllBingoModal(true);
    }
  }, [bingoBoard, bingoMissionCount, boardSize]);

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
      setNewBingoCells(uniqueNewCells);
      setAnimatedCells(uniqueNewCells);
      setNewBingoFound(true);
      showAlert("빙고 한 줄을 완성했습니다! 🎉");

      if (!hasShownConfetti && bingoCount >= bingoMissionCount) {
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
    hasShownConfetti,
    showAlert,
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
      keywords={alertKeywords}
      label={alertLabel}
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
          const results = await searchBingoParticipants(normalizedQuery, normalizedEventSlug);
          if (requestId !== opponentSearchRequestIdRef.current) {
            return;
          }
          const myId = getAuthSession()?.userId;
          const filteredResults = results.filter((u) => String(u.user_id) !== myId);
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
    [eventSlug]
  );

  const handleSelectOpponent = useCallback(
    (user: BingoParticipantItem) => {
      setOpponentId(String(user.user_id));
      setOpponentQuery(user.display_name);
      setOpponentSearchResults([]);
      setHasCompletedOpponentSearch(false);
    },
    []
  );

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed.length === 0) {
      showAlert("이름을 입력해주세요.", "warning");
      return;
    }

    // 이름은 보드 생성 시 함께 전달되므로 여기서는 로컬 상태만 설정
    setUsername(trimmed);
    setDisplayName(trimmed);
    syncSessionDisplayName(trimmed);
    setNameInput(trimmed);
  };

  const handleExchange = async () => {
    if (isBoardPreviewActive) {
      showAlert("보드 프리뷰를 해제한 뒤 실제 전송을 진행해 주세요.", "info", {
        title: "프리뷰가 켜져 있어요",
        label: "BOARD PREVIEW",
      });
      return;
    }

    if (!opponentId.trim()) {
      showAlert("상대방을 검색하여 선택해주세요.", "warning");
      return;
    }

    const myId = getAuthSession()?.userId;
    if (!myId) {
      showAlert("로그인 정보가 없습니다.", "error");
      return;
    }

    if (myId === opponentId.trim()) {
      showAlert("본인 ID가 아닌 상대방 ID를 입력해주세요.", "warning");
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
          "이미 같은 참가자에게 키워드를 보냈어요.",
          "warning",
          {
            title: "이미 전송한 참가자예요",
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
          exchangeResult.message || "키워드 교환 요청에 실패했습니다. 다시 시도해주세요.",
          "error"
        );
        return;
      }

      appendInteractionHistory([exchangeResult.interaction]);
      setOpponentId("");
      setOpponentQuery("");

      const deliverableKeywords = getUniqueKeywords(exchangeResult.updatedWords);
      const receiverName =
        exchangeResult.interaction.receive_user_name ?? `참가자 ${targetId}`;

      if (deliverableKeywords.length > 0) {
        showAlert(
          deliverableKeywords.length === myKeywords.length
            ? `"${receiverName}"님에게 새로운 키워드를 전송했어요.`
            : `"${receiverName}"님이 이미 가진 키워드는 제외하고 새로운 키워드만 전송했어요.`,
          "success",
          {
            title:
              deliverableKeywords.length === myKeywords.length
                ? "키워드를 전송했어요"
                : "새 키워드만 전송했어요",
            keywords: deliverableKeywords,
            label: "KEYWORD EXCHANGE",
          }
        );
        return;
      }

      showAlert(
        `"${receiverName}"님은 이미 내 키워드를 모두 가지고 있어요.`,
        "info",
        {
          title: "이미 키워드가 다 있어요",
          label: "KEYWORD EXCHANGE",
        }
      );
    } catch (error) {
      console.error("Exchange failed:", error);
      showAlert("에러가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
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
              <h1>이름 설정</h1>
              <span className="keyword-setup-header__spark keyword-setup-header__spark--right" />
            </div>
            <p>빙고 게임에서 사용할 이름을 입력하세요.</p>
          </header>

          <section className="keyword-setup-card">
            <div style={{ padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="이름을 입력하세요"
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
                onClick={() => {
                  handleSaveName();
                  if (nameInput.trim().length > 0) {
                    setNameSetupOpen(false);
                    setInitialSetupOpen(true);
                  }
                }}
                disabled={nameInput.trim().length === 0}
              >
                다음
              </button>
            </div>
          </section>
        </main>
        {alertToast}
      </div>
    );
  }

  if (initialSetupOpen) {
    return (
      <KeywordSetupScreen
        exchangeKeywordCount={exchangeKeywordCount}
        isInitializingBoard={isInitializingBoard}
        keywords={cellValues}
        selectedKeywords={selectedInitialKeywords}
        onToggleKeyword={toggleInitialKeyword}
        onSubmit={handleInitialSetup}
        alertToast={alertToast}
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
      />
    );
  }

  return (
    <div className="bingo-game-page">
      <div className="bingo-game-page__mesh" aria-hidden="true" />

      <main className="bingo-game-shell">
        <header className="bingo-game-header">
          <a
            className="bingo-game-header__pseudolab"
            href={PSEUDOLAB_URL}
            target="_blank"
            rel="noreferrer"
          >
            PseudoLab
          </a>
          <button
            type="button"
            className="bingo-game-header__brand"
            aria-label={`${brandTitle} 홈으로 이동`}
            onClick={() => navigate(eventHomePath, { replace: true })}
          >
            <img src={bingoNetworkingWordmark} alt={brandTitle} />
          </button>
        </header>

        <section className="bingo-game-top">
          <article className="bingo-card bingo-hero">
            <p className="bingo-hero__identity">{participantSummary}</p>
            <div className="bingo-hero__content">
              <div className="bingo-hero__copy">
                <h1>
                  빙고를 채우며
                  <br />
                  소통해봐요!
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
                      value={opponentQuery}
                      onChange={(event) => handleOpponentSearch(event.target.value)}
                      placeholder={
                        isBoardPreviewActive
                          ? "프리뷰 중에는 전송을 잠시 잠가두었어요"
                          : "상대방 이름 검색"
                      }
                      aria-label="상대방 이름 검색"
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
                        검색 중...
                      </div>
                    )}
                    {!isSearching &&
                      hasCompletedOpponentSearch &&
                      opponentQuery.trim().length > 0 &&
                      opponentSearchResults.length === 0 && (
                        <div className="bingo-hero__search-status">
                          검색 결과가 없습니다.
                        </div>
                      )}
                  </div>
                  <button type="submit" disabled={isBoardPreviewActive || !opponentId}>
                    보내기
                  </button>
                </form>
              </div>
              <NetworkingIllustration />
            </div>
          </article>

          <article className="bingo-card bingo-stats">
            <span className="bingo-stats__badge">개인전</span>
            <div className="bingo-stats__score">
              <strong>{completionRate}%</strong>
              <p>빙고 완성률</p>
            </div>
            <div
              className={`bingo-stats__progress ${newBingoFound ? "is-animating" : ""}`}
              aria-hidden="true"
            >
              <span style={{ width: `${completionRate}%` }} />
            </div>
            <section className="bingo-stats__selected" aria-label="내가 고른 키워드">
              <div className="bingo-stats__selected-head">
                <h3>내가 고른 키워드</h3>
                <strong>{myKeywords.length}개</strong>
              </div>
              <div className="bingo-stats__selected-list">
                {myKeywords.length > 0 ? (
                  myKeywords.map((keyword) => (
                    <span key={keyword} className="bingo-stats__selected-chip">
                      {keyword}
                    </span>
                  ))
                ) : (
                  <p className="bingo-stats__selected-empty">
                    아직 선택한 키워드가 없어요.
                  </p>
                )}
              </div>
            </section>
            <dl className="bingo-stats__meta">
              <div>
                <dt>수집한 키워드</dt>
                <dd>
                  {markedKeywordCount}/{boardCellCount}
                </dd>
              </div>
              <div>
                <dt>만난 참가자</dt>
                <dd>{metPersonNum}명</dd>
              </div>
            </dl>
          </article>
        </section>

        {bingoBoard ? (
          <BingoBoardSection
            board={bingoBoard}
            boardSize={boardSize}
            connectionLines={boardConnectionLines}
            completedLines={completedLines}
            newBingoCells={newBingoCells}
            latestReceivedKeywords={latestReceivedKeywords}
            animatedCells={animatedCells}
            completedCellIndexes={bingoLineCells}
            previewTools={
              testModeEnabled
                ? {
                    options: BOARD_PREVIEW_OPTIONS,
                    activePreset: boardPreviewPreset,
                    onSelectPreview: applyBoardPreview,
                    onResetPreview: clearBoardPreview,
                  }
                : undefined
            }
          />
        ) : null}

        <section className="bingo-history-grid">
          <HistoryPanel
            title="내가 준 사람"
            count={sentHistory.length}
            records={sentHistory}
            emptyMessage="아직 내가 보낸 기록이 없어요."
            participantKey="receivePerson"
          />
          <HistoryPanel
            title="나에게 보낸 사람"
            count={receivedHistory.length}
            records={receivedHistory}
            emptyMessage="아직 받은 기록이 없어요."
            participantKey="sendPerson"
          />
        </section>

        <div className="bingo-game-footer">
          <button
            type="button"
            className="bingo-game-footer__home"
            onClick={() => navigate(eventHomePath, { replace: true })}
          >
            처음으로 돌아가기
          </button>
          <p>Copyright © 2025 가짜연구소 DevFactory</p>
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
        bingoMissionCount={bingoMissionCount}
        bingoCount={bingoCount}
        markedKeywordCount={markedKeywordCount}
        metPersonNum={metPersonNum}
        onClose={() => setShowAllBingoModal(false)}
      />

      {alertToast}
    </div>
  );
};

export default BingoGame;

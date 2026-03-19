import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createBingoBoard,
  createUserBingoInteraction,
  getBingoBoard,
  getUserAllInteraction,
} from "../../api/bingo_api.ts";
import {
  getEventHomePath,
  withSearch,
} from "../../config/eventProfiles";
import { useEventProfile } from "../../hooks/useEventProfile";
import { getAuthSession } from "../../utils/authSession";
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

const BingoGame = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventSlug } = useParams();
  const eventProfile = useEventProfile(eventSlug);
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
  const alertTimeoutRef = useRef<number | null>(null);
  const bingoBoardRef = useRef<BingoCell[] | null>(null);
  const lastSeenInteractionIdRef = useRef(0);
  const lastProcessedIncomingSignatureRef = useRef("");
  const isPollingRef = useRef(false);
  const isBoardPreviewActiveRef = useRef(false);

  const bingoMissionCount = eventProfile.bingoMissionCount;
  const exchangeKeywordCount = eventProfile.exchangeKeywordCount;
  const isBoardPreviewActive = boardPreviewPreset !== null;

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
    if (participantContact) {
      return `${username} 님 | 코드 ${participantContact}`;
    }

    if (userId) {
      return `${username} 님 | ID ${userId}`;
    }

    return `${username} 님`;
  }, [participantContact, userId, username]);

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
        const [latestBoard, interactionResponse] = await Promise.all([
          getBingoBoard(activeUserId),
          getUserAllInteraction(activeUserId, lastSeenInteractionIdRef.current),
        ]);

        const interactionDelta = Array.isArray(interactionResponse.interactions)
          ? (interactionResponse.interactions as InteractionRecord[])
          : [];
        if (interactionDelta.length > 0) {
          appendInteractionHistory(interactionDelta);
        }

        if (!latestBoard || latestBoard.length === 0) {
          return;
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
    [appendInteractionHistory, showAlert]
  );

  useEffect(() => {
    const init = async () => {
      const authSession = getAuthSession();
      const storedId = authSession?.userId ?? "";
      const storedName = authSession?.userName ?? "";
      const storedContact = authSession?.loginId ?? "";

      if (!storedId) {
        navigate(eventHomePath, { replace: true });
        return;
      }

      try {
        setIsBootstrapping(true);
        setUserId(storedId);
        if (storedName) {
          setUsername(storedName);
        }
        if (storedContact) {
          setParticipantContact(storedContact);
        }

        const [boardData, interactionData] = await Promise.all([
          getBingoBoard(storedId),
          getUserAllInteraction(storedId),
        ]);
        const interactionRecords = Array.isArray(interactionData.interactions)
          ? (interactionData.interactions as InteractionRecord[])
          : [];

        setInteractionHistory(interactionRecords);
        lastSeenInteractionIdRef.current = getLatestInteractionId(interactionRecords);

        if (boardData && boardData.length > 0) {
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
          setInitialSetupOpen(true);
        }
      } catch (error) {
        console.error("Error loading user board:", error);
        showAlert("보드 정보를 불러오는 중 문제가 발생했습니다.", "error");
      } finally {
        setIsBootstrapping(false);
      }
    };

    void init();
  }, [boardCellCount, cellValues, eventHomePath, navigate, showAlert]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const interval = setInterval(() => {
      void refreshBingoState(userId);
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshBingoState, userId]);

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

      const isCreated = await createBingoBoard(storedId, boardData);
      if (!isCreated) {
        return false;
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

  const handleExchange = async () => {
    if (isBoardPreviewActive) {
      showAlert("보드 프리뷰를 해제한 뒤 실제 전송을 진행해 주세요.", "info", {
        title: "프리뷰가 켜져 있어요",
        label: "BOARD PREVIEW",
      });
      return;
    }

    if (!opponentId.trim()) {
      showAlert("상대방 ID를 입력해주세요.", "warning");
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
        Number(targetId)
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

  if (isBootstrapping) {
    return <BingoLoadingScreen brandTitle={brandTitle} />;
  }

  if (locked) {
    return (
      <BingoCountdownScreen
        brandTitle={brandTitle}
        remainingTime={remainingTime}
      />
    );
  }

  if (initialSetupOpen) {
    return (
      <KeywordSetupScreen
        brandTitle={brandTitle}
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

  return (
    <div className="bingo-game-page">
      <div className="bingo-game-page__mesh" aria-hidden="true" />

      <main className="bingo-game-shell">
        <button
          type="button"
          className="bingo-game-brand bingo-game-brand--link"
          onClick={() => navigate(eventHomePath, { replace: true })}
        >
          {brandTitle}
        </button>

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
                <p className="bingo-hero__hint">내 ID {userId}를 보여주고 서로 키워드를 교환해 보세요.</p>
                <form
                  className="bingo-hero__form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleExchange();
                  }}
                >
                  <input
                    value={opponentId}
                    onChange={(event) => setOpponentId(event.target.value.replace(/\D/g, ""))}
                    placeholder={
                      isBoardPreviewActive
                        ? "프리뷰 중에는 전송을 잠시 잠가두었어요"
                        : "상대방 ID 입력"
                    }
                    inputMode="numeric"
                    aria-label="상대방 ID 입력"
                    disabled={isBoardPreviewActive}
                  />
                  <button type="submit" disabled={isBoardPreviewActive}>
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

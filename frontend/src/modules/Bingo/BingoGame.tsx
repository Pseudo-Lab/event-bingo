import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "@mui/material";
import {
  createBingoBoard,
  createUserBingoInteraction,
  getBingoBoard,
  getUserAllInteraction,
  getUserLatestInteraction,
  getUserName,
  updateBingoBoard,
} from "../../api/bingo_api.ts";
import { bingoConfig, boardKeywordPool } from "../../config/bingoConfig.ts";
import { getAuthSession } from "../../utils/authSession";
import "./BingoGame.css";

interface BingoCell {
  id: number;
  value: string;
  selected: number;
  status: number;
  note?: string;
}

interface CompletedLine {
  type: string;
  index: number;
}

interface BoardLineCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ExchangeRecord {
  id: string;
  createdAt: string;
  date: string;
  sendUserId: number;
  receiveUserId: number;
  sendPerson?: string;
  receivePerson?: string;
  given: string[];
}

interface InteractionRecord {
  send_user_id: number;
  receive_user_id: number;
  created_at: string;
  word_id_list: string[] | string;
}

type AlertSeverity = "success" | "warning" | "error" | "info";
type AlertPayload = {
  title?: string;
  keywords?: string[];
  label?: string;
  durationMs?: number;
};

type HistoryPanelProps = {
  title: string;
  count: number;
  records: ExchangeRecord[];
  emptyMessage: string;
  participantKey: "sendPerson" | "receivePerson";
};

const cellValues = boardKeywordPool;
const SETUP_BRAND_TITLE = "Bingo Networking";
const BOARD_SIZE = bingoConfig.boardSize;
const BOARD_CELL_COUNT = bingoConfig.boardCellCount;
const BOARD_CENTERS = Array.from(
  { length: BOARD_SIZE },
  (_, index) => ((index + 0.5) * 100) / BOARD_SIZE
);
const BOARD_EDGE_START = BOARD_CENTERS[0] ?? 0;
const BOARD_EDGE_END = BOARD_CENTERS[BOARD_CENTERS.length - 1] ?? 100;
const BOARD_PLACEHOLDER_LABEL = "PseudoLab";
const INTERACTION_BATCH_WINDOW_MS = 1500;
const RECENT_INTERACTION_LIMIT = 12;

const shuffleArray = (array: string[]) => {
  return [...array].sort(() => Math.random() - 0.5);
};

const formatHistoryDate = (value: string) => {
  return value.replace(/-/g, ".").replace("T", " ").slice(0, 16);
};

const getUniqueKeywords = (keywords: string[]) => [...new Set(keywords.filter(Boolean))];

const serializeInteractionKeywords = (keywords: string[]) =>
  JSON.stringify(getUniqueKeywords(keywords));

const parseInteractionKeywords = (payload: string[] | string) => {
  if (Array.isArray(payload)) {
    return getUniqueKeywords(payload);
  }

  const normalizedPayload = payload.trim();
  if (!normalizedPayload) {
    return [];
  }

  if (normalizedPayload.startsWith("[")) {
    try {
      const parsedPayload = JSON.parse(normalizedPayload) as unknown;
      if (Array.isArray(parsedPayload)) {
        return getUniqueKeywords(
          parsedPayload.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0
          )
        );
      }
    } catch (error) {
      console.warn("Failed to parse interaction keyword payload:", error);
    }
  }

  return [normalizedPayload];
};

const getInteractionKeywords = (record: InteractionRecord) =>
  parseInteractionKeywords(record.word_id_list);

const getPendingKeywordsForBoard = (board: BingoCell[], sourceKeywords: string[]) => {
  const sourceKeywordSet = new Set(sourceKeywords);

  return getUniqueKeywords(
    board
      .filter((cell) => sourceKeywordSet.has(cell.value) && cell.status !== 1)
      .map((cell) => cell.value)
  );
};

const getLatestIncomingBatch = (interactions: InteractionRecord[]) => {
  if (!Array.isArray(interactions) || interactions.length === 0) {
    return null;
  }

  const sortedInteractions = [...interactions].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
  const latestInteraction = sortedInteractions[0];
  const latestTimestamp = new Date(latestInteraction.created_at).getTime();
  const batchInteractions = sortedInteractions.filter((interaction) => {
    return (
      interaction.send_user_id === latestInteraction.send_user_id &&
      latestTimestamp - new Date(interaction.created_at).getTime() <=
        INTERACTION_BATCH_WINDOW_MS
    );
  });

  const keywords = getUniqueKeywords(
    batchInteractions.flatMap((interaction) => getInteractionKeywords(interaction))
  );

  return {
    senderId: String(latestInteraction.send_user_id),
    createdAt: latestInteraction.created_at,
    keywords,
    signature: `${latestInteraction.send_user_id}:${latestInteraction.created_at}:${keywords.join("|")}`,
  };
};

const getDefaultAlertTitle = (severity: AlertSeverity) => {
  if (severity === "success") {
    return "완료되었어요";
  }

  if (severity === "warning") {
    return "확인해 주세요";
  }

  if (severity === "error") {
    return "문제가 발생했어요";
  }

  return "안내";
};

const createBoardConnectionLines = (): BoardLineCoordinates[] => {
  const lines: BoardLineCoordinates[] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE - 1; col += 1) {
      lines.push({
        x1: BOARD_CENTERS[col],
        y1: BOARD_CENTERS[row],
        x2: BOARD_CENTERS[col + 1],
        y2: BOARD_CENTERS[row],
      });
      lines.push({
        x1: BOARD_CENTERS[row],
        y1: BOARD_CENTERS[col],
        x2: BOARD_CENTERS[row],
        y2: BOARD_CENTERS[col + 1],
      });
    }
  }

  for (let index = 0; index < BOARD_SIZE - 1; index += 1) {
    lines.push({
      x1: BOARD_CENTERS[index],
      y1: BOARD_CENTERS[index],
      x2: BOARD_CENTERS[index + 1],
      y2: BOARD_CENTERS[index + 1],
    });
    lines.push({
      x1: BOARD_CENTERS[BOARD_SIZE - 1 - index],
      y1: BOARD_CENTERS[index],
      x2: BOARD_CENTERS[BOARD_SIZE - 2 - index],
      y2: BOARD_CENTERS[index + 1],
    });
  }

  return lines;
};

const BOARD_CONNECTION_LINES = createBoardConnectionLines();

const getLineCoordinates = (line: CompletedLine): BoardLineCoordinates => {
  if (line.type === "row") {
    const y = BOARD_CENTERS[line.index];
    return { x1: BOARD_EDGE_START, y1: y, x2: BOARD_EDGE_END, y2: y };
  }

  if (line.type === "col") {
    const x = BOARD_CENTERS[line.index];
    return { x1: x, y1: BOARD_EDGE_START, x2: x, y2: BOARD_EDGE_END };
  }

  if (line.type === "diagonal" && line.index === 1) {
    return {
      x1: BOARD_EDGE_START,
      y1: BOARD_EDGE_START,
      x2: BOARD_EDGE_END,
      y2: BOARD_EDGE_END,
    };
  }

  return {
    x1: BOARD_EDGE_END,
    y1: BOARD_EDGE_START,
    x2: BOARD_EDGE_START,
    y2: BOARD_EDGE_END,
  };
};

function NetworkingIllustration() {
  return (
    <svg
      className="bingo-hero__illustration"
      viewBox="0 0 250 190"
      aria-hidden="true"
    >
      <rect x="84" y="114" width="82" height="14" rx="7" fill="#11785f" opacity="0.2" />
      <path
        d="M156 73c19 0 35 15 35 35v43h-34c-23 0-42-19-42-42 0-20 16-36 36-36h5Z"
        fill="#9EF35D"
        stroke="#1B6A51"
        strokeWidth="2.2"
      />
      <path
        d="M115 95c1-18 16-32 34-32 17 0 31 12 34 28"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M97 104c0-18 14-32 32-32 14 0 26 8 31 20"
        fill="#F9F0E9"
        stroke="#1B6A51"
        strokeWidth="2.2"
      />
      <circle cx="113" cy="70" r="18" fill="#F9F0E9" stroke="#1B6A51" strokeWidth="2.2" />
      <path
        d="M102 62c2-11 12-18 23-16 9 2 15 9 15 18"
        fill="none"
        stroke="#7FDB44"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M131 67c5-6 13-6 18-3 5 4 7 12 3 17"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M104 77c5 6 13 10 21 10 10 0 19-4 25-11"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M153 58c6-14 18-20 31-16 9 3 15 12 15 22"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M198 44v18M189 49l18 8M189 58l17-10"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M84 93 70 88c-9-3-14-12-11-21 3-9 13-13 22-10l16 6"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M95 90c-6 11-17 18-30 18-18 0-32-14-32-32s14-32 32-32c10 0 19 4 25 12"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M73 87c11 0 19-8 19-19 0-8-4-14-10-17"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect x="77" y="102" width="8" height="40" rx="4" fill="#F9F0E9" stroke="#1B6A51" strokeWidth="2.2" />
      <path
        d="M80 141h37M158 151h28"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M96 102c13 4 22 16 24 30"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryPanel({
  title,
  count,
  records,
  emptyMessage,
  participantKey,
}: HistoryPanelProps) {
  return (
    <section className="history-panel">
      <header className="history-panel__header">
        <h2>{title}</h2>
        <span>{count}</span>
      </header>

      {records.length === 0 ? (
        <p className="history-panel__empty">{emptyMessage}</p>
      ) : (
        <div className="history-panel__list">
          {records.map((record, index) => (
            <article key={record.id} className="history-item">
              <div className="history-item__title">
                <span className="history-item__index">{index + 1}</span>
                <strong>{record[participantKey] ?? "참가자"}</strong>
              </div>
              <div className="history-item__chips">
                {record.given.map((word, wordIndex) => (
                  <span key={`${record.id}-${word}-${wordIndex}`} className="history-item__chip">
                    {word}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const BingoGame = () => {
  const navigate = useNavigate();

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
  const [collectedKeywords, setCollectedKeywords] = useState(0);
  const [metPersonNum, setMetPersonNum] = useState(0);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeRecord[]>([]);
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
  const [remainingTime, setRemainingTime] = useState(() => {
    return bingoConfig.unlockTime - Date.now();
  });
  const [locked, setLocked] = useState(() => new Date().getTime() < bingoConfig.unlockTime);
  const [showAllBingoModal, setShowAllBingoModal] = useState(false);
  const [isInitializingBoard, setIsInitializingBoard] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [lastProcessedIncomingSignature, setLastProcessedIncomingSignature] = useState("");
  const alertTimeoutRef = useRef<number | null>(null);

  const bingoMissionCount = bingoConfig.bingoMissionCount;
  const exchangeKeywordCount = bingoConfig.exchangeKeywordCount;

  const markedKeywordCount = useMemo(() => {
    if (!bingoBoard) {
      return collectedKeywords;
    }

    return bingoBoard.filter((cell) => cell.status === 1).length;
  }, [bingoBoard, collectedKeywords]);

  const completionRate = useMemo(() => {
    return Math.min(
      100,
      Math.round((markedKeywordCount / BOARD_CELL_COUNT) * 100)
    );
  }, [markedKeywordCount]);

  const participantSummary = useMemo(() => {
    if (participantContact) {
      return `${username} 님 | 코드 ${participantContact}`;
    }

    if (userId) {
      return `${username} 님 | ID ${userId}`;
    }

    return `${username} 님`;
  }, [participantContact, userId, username]);

  const sentHistory = useMemo(() => {
    const numericUserId = Number(userId);
    return exchangeHistory.filter((record) => record.sendUserId === numericUserId);
  }, [exchangeHistory, userId]);

  const receivedHistory = useMemo(() => {
    const numericUserId = Number(userId);
    return exchangeHistory.filter((record) => record.receiveUserId === numericUserId);
  }, [exchangeHistory, userId]);

  const fetchExchangeHistory = useCallback(async (activeUserId: string) => {
    const rawHistory = await getUserAllInteraction(activeUserId);
    if (!rawHistory || !Array.isArray(rawHistory.interactions)) {
      setExchangeHistory([]);
      setMetPersonNum(0);
      return;
    }

    const activeNumericUserId = Number(activeUserId);
    const counterpartUserIds = new Set<number>();
    const grouped: Record<string, ExchangeRecord> = {};

    for (const record of rawHistory.interactions as InteractionRecord[]) {
      if (record.send_user_id === activeNumericUserId) {
        counterpartUserIds.add(record.receive_user_id);
      }

      if (record.receive_user_id === activeNumericUserId) {
        counterpartUserIds.add(record.send_user_id);
      }

      const groupKey = `${record.send_user_id}-${record.receive_user_id}`;

      if (!grouped[groupKey]) {
        const [senderName, receiverName] = await Promise.all([
          getUserName(String(record.send_user_id)),
          getUserName(String(record.receive_user_id)),
        ]);

        grouped[groupKey] = {
          id: groupKey,
          createdAt: record.created_at,
          date: formatHistoryDate(record.created_at),
          sendUserId: record.send_user_id,
          receiveUserId: record.receive_user_id,
          sendPerson: senderName || `참가자 ${record.send_user_id}`,
          receivePerson: receiverName || `참가자 ${record.receive_user_id}`,
          given: [],
        };
      }

      const wordList = getInteractionKeywords(record);

      grouped[groupKey].given = getUniqueKeywords([
        ...grouped[groupKey].given,
        ...wordList,
      ]);

      if (
        new Date(record.created_at).getTime() >
        new Date(grouped[groupKey].createdAt).getTime()
      ) {
        grouped[groupKey].createdAt = record.created_at;
        grouped[groupKey].date = formatHistoryDate(record.created_at);
      }
    }

    setExchangeHistory(
      Object.values(grouped).sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      )
    );
    setMetPersonNum(counterpartUserIds.size);
  }, []);

  const hasExistingDirectionalExchange = useCallback(
    async (activeUserId: string, targetUserId: string) => {
      const rawHistory = await getUserAllInteraction(activeUserId);
      if (!rawHistory || !Array.isArray(rawHistory.interactions)) {
        return false;
      }

      return (rawHistory.interactions as InteractionRecord[]).some((interaction) => {
        return interaction.send_user_id === Number(activeUserId) &&
          interaction.receive_user_id === Number(targetUserId);
      });
    },
    []
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = bingoConfig.unlockTime - now;

      if (diff <= 0) {
        setLocked(false);
        clearInterval(interval);
      } else {
        setRemainingTime(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const init = async () => {
      const authSession = getAuthSession();
      const storedId = authSession?.userId ?? "";
      const storedName = authSession?.userName ?? "";
      const storedContact = authSession?.loginId ?? "";

      if (!storedId) {
        navigate("/", { replace: true });
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

        const boardData = await getBingoBoard(storedId);

        if (boardData && boardData.length > 0) {
          setBingoBoard(boardData);
          setInitialSetupOpen(false);

          const selectedKeywords = boardData
            .filter((cell) => cell.selected === 1)
            .map((cell) => cell.value);
          setMyKeywords(selectedKeywords);

          const activatedKeywords = boardData.filter(
            (cell) => cell.status === 1
          );
          setCollectedKeywords(activatedKeywords.length);

          const interactionData = await getUserLatestInteraction(storedId, 0);
          if (Array.isArray(interactionData) && interactionData.length > 0) {
            const latestIncomingBatch = getLatestIncomingBatch(interactionData);
            if (latestIncomingBatch) {
              setLatestReceivedKeywords(latestIncomingBatch.keywords);
              setLastProcessedIncomingSignature(latestIncomingBatch.signature);
            }
          }
        } else {
          const shuffledValues = shuffleArray(cellValues);
          const initialBoard: BingoCell[] = Array(BOARD_CELL_COUNT)
            .fill(null)
            .map((_, index) => ({
              id: index,
              value: shuffledValues[index % shuffledValues.length],
              selected: 0,
              status: 0,
            }));

          setBingoBoard(initialBoard);
          setInitialSetupOpen(true);
          setCollectedKeywords(0);
        }
      } catch (error) {
        console.error("Error loading user board:", error);
        showAlert("보드 정보를 불러오는 중 문제가 발생했습니다.", "error");
      } finally {
        setIsBootstrapping(false);
      }
    };

    void init();
  }, [navigate]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void fetchExchangeHistory(userId);
    const interval = setInterval(() => {
      void fetchExchangeHistory(userId);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchExchangeHistory, userId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!userId || !bingoBoard) {
        return;
      }

      try {
        const latestBoard = await getBingoBoard(userId);

        if (!latestBoard || latestBoard.length === 0) {
          return;
        }

        const recentInteractions = await getUserLatestInteraction(
          userId,
          RECENT_INTERACTION_LIMIT
        );
        const latestIncomingBatch = Array.isArray(recentInteractions)
          ? getLatestIncomingBatch(recentInteractions)
          : null;
        const newlyUpdatedValues: string[] = [];

        const updatedBoard = latestBoard.map((newCell, index) => {
          const prevCell = bingoBoard[index];
          if (prevCell.status === 0 && newCell.status === 1) {
            newlyUpdatedValues.push(newCell.value);
          }
          return newCell;
        });

        if (newlyUpdatedValues.length > 0) {
          setBingoBoard(updatedBoard);
          setCollectedKeywords((prev) => prev + newlyUpdatedValues.length);
          setLatestReceivedKeywords(newlyUpdatedValues);
        }

        if (
          latestIncomingBatch &&
          latestIncomingBatch.signature !== lastProcessedIncomingSignature
        ) {
          const senderUserName = await getUserName(latestIncomingBatch.senderId);
          const displaySenderName =
            senderUserName || `참가자 ${latestIncomingBatch.senderId}`;

          setLastProcessedIncomingSignature(latestIncomingBatch.signature);

          if (newlyUpdatedValues.length > 0) {
            const receivedTitle =
              newlyUpdatedValues.length === latestIncomingBatch.keywords.length
                ? "새 키워드를 받았어요"
                : "새 키워드만 반영했어요";
            const receivedMessage =
              newlyUpdatedValues.length === latestIncomingBatch.keywords.length
                ? `"${displaySenderName}"님이 키워드를 보내줬어요.`
                : `"${displaySenderName}"님이 보낸 키워드 중 새로운 항목만 반영했어요.`;

            showAlert(receivedMessage, "success", {
              title: receivedTitle,
              keywords: newlyUpdatedValues,
              label: "KEYWORD EXCHANGE",
            });
          } else {
            showAlert(
              `"${displaySenderName}"님이 보낸 키워드는 이미 모두 가지고 있어요.`,
              "info",
              {
                title: "이미 키워드가 다 있어요",
                label: "KEYWORD EXCHANGE",
              }
            );
          }
        }
      } catch (error) {
        console.error("Error refreshing bingo board:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [bingoBoard, lastProcessedIncomingSignature, userId]);

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
      setCollectedKeywords(0);
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

  const getCellsInLine = (type: string, index: number): number[] => {
    const cells: number[] = [];

    if (type === "row") {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        cells.push(index * BOARD_SIZE + col);
      }
    } else if (type === "col") {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        cells.push(row * BOARD_SIZE + index);
      }
    } else if (type === "diagonal" && index === 1) {
      for (let diagonal = 0; diagonal < BOARD_SIZE; diagonal += 1) {
        cells.push(diagonal * BOARD_SIZE + diagonal);
      }
    } else if (type === "diagonal" && index === 2) {
      for (let diagonal = 0; diagonal < BOARD_SIZE; diagonal += 1) {
        cells.push(diagonal * BOARD_SIZE + (BOARD_SIZE - 1 - diagonal));
      }
    }

    return cells;
  };

  const checkBingoLines = useCallback(() => {
    if (!bingoBoard) {
      return;
    }

    const newCompletedLines: CompletedLine[] = [];
    let newBingoCount = 0;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      let rowComplete = true;
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (!bingoBoard[row * BOARD_SIZE + col].status) {
          rowComplete = false;
          break;
        }
      }

      if (rowComplete) {
        newCompletedLines.push({ type: "row", index: row });
        newBingoCount += 1;
      }
    }

    for (let col = 0; col < BOARD_SIZE; col += 1) {
      let colComplete = true;
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        if (!bingoBoard[row * BOARD_SIZE + col].status) {
          colComplete = false;
          break;
        }
      }

      if (colComplete) {
        newCompletedLines.push({ type: "col", index: col });
        newBingoCount += 1;
      }
    }

    let diagonal1Complete = true;
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      if (!bingoBoard[index * BOARD_SIZE + index].status) {
        diagonal1Complete = false;
        break;
      }
    }

    if (diagonal1Complete) {
      newCompletedLines.push({ type: "diagonal", index: 1 });
      newBingoCount += 1;
    }

    let diagonal2Complete = true;
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      if (!bingoBoard[index * BOARD_SIZE + (BOARD_SIZE - 1 - index)].status) {
        diagonal2Complete = false;
        break;
      }
    }

    if (diagonal2Complete) {
      newCompletedLines.push({ type: "diagonal", index: 2 });
      newBingoCount += 1;
    }

    setCompletedLines(newCompletedLines);
    setBingoCount(newBingoCount);
    if (newBingoCount >= bingoMissionCount) {
      setShowAllBingoModal(true);
    }
  }, [bingoBoard, bingoMissionCount]);

  useEffect(() => {
    const newLines = completedLines.filter(
      (newLine) =>
        !getCellsInLine(newLine.type, newLine.index).every((lineCell) =>
          bingoLineCells.includes(lineCell)
        )
    );

    const newCells: number[] = [];
    newLines.forEach((line) => {
      newCells.push(...getCellsInLine(line.type, line.index));
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

      setTimeout(() => {
        setAnimatedCells([]);
        setNewBingoCells([]);
        setNewBingoFound(false);
        setShowConfetti(false);
      }, 3000);
    }

    const allCellsFromLines: number[] = [];
    completedLines.forEach((line) => {
      allCellsFromLines.push(...getCellsInLine(line.type, line.index));
    });

    const uniqueAllCells = [...new Set(allCellsFromLines)];
    const hasSameCells =
      uniqueAllCells.length === bingoLineCells.length &&
      uniqueAllCells.every((cell, index) => cell === bingoLineCells[index]);

    if (!hasSameCells) {
      setBingoLineCells(uniqueAllCells);
    }
  }, [
    bingoCount,
    bingoLineCells,
    bingoMissionCount,
    completedLines,
    hasShownConfetti,
  ]);

  useEffect(() => {
    if (bingoBoard?.length === BOARD_CELL_COUNT) {
      checkBingoLines();
    }
  }, [bingoBoard, checkBingoLines]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  function handleCloseAlert() {
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }

    setAlertOpen(false);
  }

  function showAlert(
    message: string,
    severity: AlertSeverity = "success",
    payload: AlertPayload = {}
  ) {
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
  }

  const renderAlertToast = () => {
    if (!alertOpen) {
      return null;
    }

    return (
      <div className="bingo-toast" role="status" aria-live="polite">
        <article className={`bingo-toast__card is-${alertSeverity}`}>
          <div className="bingo-toast__head">
            <span className="bingo-toast__badge">{alertLabel}</span>
            <button
              type="button"
              className="bingo-toast__close"
              onClick={handleCloseAlert}
              aria-label="알림 닫기"
            >
              닫기
            </button>
          </div>
          <strong className="bingo-toast__title">{alertTitle}</strong>
          <p className="bingo-toast__message">{alertMessage}</p>
          {alertKeywords.length > 0 ? (
            <div className="bingo-toast__keywords">
              {alertKeywords.map((keyword) => (
                <span key={keyword} className="bingo-toast__keyword">
                  {keyword}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    );
  };

  const handleExchange = async () => {
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
      const receiverName = await getUserName(targetId);
      if (!receiverName) {
        showAlert("존재하지 않는 ID입니다.", "error");
        return;
      }

      const alreadyExchanged = await hasExistingDirectionalExchange(myId, targetId);
      if (alreadyExchanged) {
        showAlert(
          `"${receiverName}"님에게는 이미 키워드를 보냈어요.`,
          "warning",
          {
            title: "이미 전송한 참가자예요",
            label: "KEYWORD EXCHANGE",
          }
        );
        return;
      }

      const receiverBoard = await getBingoBoard(targetId);
      const deliverableKeywords = Array.isArray(receiverBoard)
        ? getPendingKeywordsForBoard(receiverBoard, myKeywords)
        : getUniqueKeywords(myKeywords);

      const result = await updateBingoBoard(myId, targetId);
      if (!result) {
        showAlert("키워드 교환 요청에 실패했습니다. 다시 시도해주세요.", "error");
        return;
      }

      const interactionCreated = await createUserBingoInteraction(
        serializeInteractionKeywords(myKeywords),
        Number(myId),
        Number(targetId)
      );

      if (!interactionCreated) {
        showAlert("키워드 기록 저장에 실패했습니다. 다시 시도해주세요.", "error");
        return;
      }

      await fetchExchangeHistory(myId);
      setOpponentId("");

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

  const isCellInCompletedLine = (index: number) => {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;

    return completedLines.some((line) => {
      if (line.type === "row" && line.index === row) {
        return true;
      }
      if (line.type === "col" && line.index === col) {
        return true;
      }
      if (line.type === "diagonal" && line.index === 1 && row === col) {
        return true;
      }
      if (line.type === "diagonal" && line.index === 2 && col === BOARD_SIZE - 1 - row) {
        return true;
      }
      return false;
    });
  };

  if (isBootstrapping) {
    return (
      <div className="bingo-game-page">
        <div className="bingo-game-page__mesh" aria-hidden="true" />
        <div className="bingo-loading-screen">
          <section className="bingo-loading-card" aria-label="bingo loading">
            <p className="bingo-loading-card__label">{SETUP_BRAND_TITLE}</p>
            <h1>빙고 보드를 준비하고 있어요</h1>
            <p>저장된 보드와 교환 기록을 불러오는 중입니다.</p>
          </section>
        </div>
      </div>
    );
  }

  if (locked) {
    const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
    const seconds = Math.floor((remainingTime / 1000) % 60);

    return (
      <div className="bingo-countdown">
        <div className="bingo-countdown__content">
          <p className="bingo-countdown__brand">{SETUP_BRAND_TITLE}</p>
          <h1>빙고 오픈까지 조금만 기다려 주세요</h1>
          <div className="bingo-countdown__timer">
            {[
              { label: "일", value: days },
              { label: "시간", value: hours },
              { label: "분", value: minutes },
              { label: "초", value: seconds },
            ].map(({ label, value }) => (
              <div key={label} className="bingo-countdown__unit">
                <strong>{String(value).padStart(2, "0")}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (initialSetupOpen) {
    return (
      <div className="keyword-setup-page">
        <div className="keyword-setup-page__mesh" aria-hidden="true" />
        <main className="keyword-setup-shell">
          <p className="keyword-setup-brand">{SETUP_BRAND_TITLE}</p>

          <header className="keyword-setup-header">
            <div className="keyword-setup-header__title">
              <span className="keyword-setup-header__spark keyword-setup-header__spark--left" />
              <h1>관심사 선택</h1>
              <span className="keyword-setup-header__spark keyword-setup-header__spark--right" />
            </div>
            <p>
              당신의 관심사를 잘 표현할 수 있는 키워드를 {exchangeKeywordCount}개 선택하세요.
            </p>
          </header>

          <section className="keyword-setup-card" aria-label="interest keyword selection">
            <div className="keyword-setup-card__scroller">
              <div className="keyword-setup-grid">
                {cellValues.map((keyword) => {
                  const isSelected = selectedInitialKeywords.includes(keyword);

                  return (
                    <button
                      key={keyword}
                      type="button"
                      className={`keyword-chip ${isSelected ? "is-selected" : ""}`}
                      onClick={() => toggleInitialKeyword(keyword)}
                      aria-pressed={isSelected}
                    >
                      {keyword}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="keyword-setup-card__footer">
              <button
                type="button"
                className="keyword-setup-submit"
                onClick={handleInitialSetup}
                disabled={
                  selectedInitialKeywords.length !== exchangeKeywordCount || isInitializingBoard
                }
              >
                {isInitializingBoard ? "준비 중..." : "빙고 시작하기"}
              </button>
            </div>
          </section>
        </main>

        {renderAlertToast()}
      </div>
    );
  }

  return (
    <div className="bingo-game-page">
      <div className="bingo-game-page__mesh" aria-hidden="true" />

      <main className="bingo-game-shell">
        <button
          type="button"
          className="bingo-game-brand bingo-game-brand--link"
          onClick={() => navigate("/", { replace: true })}
        >
          {SETUP_BRAND_TITLE}
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
                    placeholder="상대방 ID 입력"
                    inputMode="numeric"
                    aria-label="상대방 ID 입력"
                  />
                  <button type="submit">
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
                  {markedKeywordCount}/{BOARD_CELL_COUNT}
                </dd>
              </div>
              <div>
                <dt>만난 참가자</dt>
                <dd>{metPersonNum}명</dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="bingo-board-shell" aria-label="bingo board">
          <div className="bingo-board-shell__inner">
            <svg
              className="bingo-board__lines"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {BOARD_CONNECTION_LINES.map((coordinates, index) => (
                <line
                  key={`connection-${index}`}
                  {...coordinates}
                  className="bingo-board__line bingo-board__line--grid"
                />
              ))}
              {completedLines.map((line) => {
                const coordinates = getLineCoordinates(line);
                const key = `${line.type}-${line.index}`;

                return (
                  <g key={key}>
                    <line
                      {...coordinates}
                      className="bingo-board__line bingo-board__line--glow"
                    />
                    <line
                      {...coordinates}
                      className="bingo-board__line bingo-board__line--core"
                    />
                  </g>
                );
              })}
            </svg>

            <div
              className="bingo-board-grid"
              style={
                {
                  "--board-size": BOARD_SIZE,
                } as React.CSSProperties
              }
            >
              {bingoBoard?.map((cell, index) => {
                const isActive = cell.status === 1;
                const isLineCell = isCellInCompletedLine(index);
                const isNew = newBingoCells.includes(index);
                const isLatest = latestReceivedKeywords.includes(cell.value);
                const isAnimated = animatedCells.includes(index);
                const isPlaceholder = !isLineCell && !isActive;
                const isReceived = !isPlaceholder && !isLineCell;
                const displayValue = cell.value;

                const classNames = [
                  "bingo-board-cell",
                  isPlaceholder ? "is-placeholder" : "",
                  isReceived ? "is-received" : "",
                  isLineCell ? "is-complete" : "",
                  isNew ? "is-new" : "",
                  isLatest ? "is-latest" : "",
                  isAnimated ? "is-animated" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <article key={cell.id} className={classNames}>
                    {isPlaceholder ? (
                      <div className="bingo-board-cell__brand">
                        <span>{BOARD_PLACEHOLDER_LABEL}</span>
                      </div>
                    ) : isLineCell ? (
                      <div className="bingo-board-cell__complete-badge">
                        <span className="bingo-board-cell__label">{displayValue}</span>
                      </div>
                    ) : (
                      <span className="bingo-board-cell__label">{displayValue}</span>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

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
            onClick={() => navigate("/", { replace: true })}
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

      <Dialog
        open={showAllBingoModal}
        onClose={() => setShowAllBingoModal(false)}
        PaperProps={{ className: "bingo-celebration-dialog" }}
      >
        <div className="bingo-celebration">
          <p className="bingo-celebration__eyebrow">MISSION CLEAR</p>
          <h2>빙고를 완성했어요</h2>
          <p className="bingo-celebration__copy">
            {bingoMissionCount}줄 미션을 달성했습니다. 더 많은 참가자와 키워드를 나누며
            보드를 계속 채워보세요.
          </p>
          <div className="bingo-celebration__stats">
            <article className="bingo-celebration__stat">
              <strong>{bingoCount}</strong>
              <span>완성한 줄</span>
            </article>
            <article className="bingo-celebration__stat">
              <strong>{markedKeywordCount}</strong>
              <span>열린 칸</span>
            </article>
            <article className="bingo-celebration__stat">
              <strong>{metPersonNum}</strong>
              <span>만난 참가자</span>
            </article>
          </div>
          <div className="bingo-celebration__actions">
            <button
              type="button"
              className="bingo-celebration__button bingo-celebration__button--primary"
              onClick={() => setShowAllBingoModal(false)}
            >
              계속 진행하기
            </button>
            <a
              className="bingo-celebration__button bingo-celebration__button--secondary"
              href="https://github.com/Pseudo-Lab/devfactory"
              target="_blank"
              rel="noopener noreferrer"
            >
              Devfactory Repo 보기
            </a>
          </div>
        </div>
      </Dialog>

      {renderAlertToast()}
    </div>
  );
};

export default BingoGame;

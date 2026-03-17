import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Rating,
  Snackbar,
} from "@mui/material";
import {
  createBingoBoard,
  createUserBingoInteraction,
  getBingoBoard,
  getUserAllInteraction,
  getUserInteractionCount,
  getUserLatestInteraction,
  getUserName,
  submitReview,
  updateBingoBoard,
} from "../../api/bingo_api.ts";
import bingoKeywords from "../../config/bingo-keywords.json";
import { bingoConfig } from "../../config/bingoConfig.ts";
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

type HistoryPanelProps = {
  title: string;
  count: number;
  records: ExchangeRecord[];
  emptyMessage: string;
  participantKey: "sendPerson" | "receivePerson";
};

const cellValues = bingoKeywords.keywords;
const SETUP_BRAND_TITLE = "Bingo Networking";
const TOTAL_PLAYABLE_CELLS = 24;
const BOARD_CENTERS = [10, 30, 50, 70, 90];
const BOARD_PLACEHOLDER_LABEL = "PseudoLab";

const shuffleArray = (array: string[]) => {
  return [...array].sort(() => Math.random() - 0.5);
};

const formatHistoryDate = (value: string) => {
  return value.replace(/-/g, ".").replace("T", " ").slice(0, 16);
};

const createBoardConnectionLines = (): BoardLineCoordinates[] => {
  const lines: BoardLineCoordinates[] = [];

  for (let row = 0; row < BOARD_CENTERS.length; row += 1) {
    for (let col = 0; col < BOARD_CENTERS.length - 1; col += 1) {
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

  for (let index = 0; index < BOARD_CENTERS.length - 1; index += 1) {
    lines.push({
      x1: BOARD_CENTERS[index],
      y1: BOARD_CENTERS[index],
      x2: BOARD_CENTERS[index + 1],
      y2: BOARD_CENTERS[index + 1],
    });
    lines.push({
      x1: BOARD_CENTERS[BOARD_CENTERS.length - 1 - index],
      y1: BOARD_CENTERS[index],
      x2: BOARD_CENTERS[BOARD_CENTERS.length - 2 - index],
      y2: BOARD_CENTERS[index + 1],
    });
  }

  return lines;
};

const BOARD_CONNECTION_LINES = createBoardConnectionLines();

const getLineCoordinates = (line: CompletedLine): BoardLineCoordinates => {
  if (line.type === "row") {
    const y = BOARD_CENTERS[line.index];
    return { x1: 10, y1: y, x2: 90, y2: y };
  }

  if (line.type === "col") {
    const x = BOARD_CENTERS[line.index];
    return { x1: x, y1: 10, x2: x, y2: 90 };
  }

  if (line.type === "diagonal" && line.index === 1) {
    return { x1: 10, y1: 10, x2: 90, y2: 90 };
  }

  return { x1: 90, y1: 10, x2: 10, y2: 90 };
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
  const [alertMessage, setAlertMessage] = useState("");
  const [collectedKeywords, setCollectedKeywords] = useState(0);
  const [metPersonNum, setMetPersonNum] = useState(0);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeRecord[]>([]);
  const [newBingoFound, setNewBingoFound] = useState(false);
  const [initialSetupOpen, setInitialSetupOpen] = useState(true);
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
  const [locked, setLocked] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isTester = urlParams.get("early") === "true";
    return !isTester && new Date().getTime() < bingoConfig.unlockTime;
  });
  const [showAllBingoModal, setShowAllBingoModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStars, setReviewStars] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [hideReviewModal, setHideReviewModal] = useState(
    () => localStorage.getItem("hideReviewModal") === "true"
  );
  const [isInitializingBoard, setIsInitializingBoard] = useState(false);

  const bingoMissionCount = bingoConfig.bingoMissionCount;
  const keywordCount = bingoConfig.keywordCount;

  const visibleModal = showAllBingoModal
    ? "allBingo"
    : showReviewModal
      ? "review"
      : null;

  const markedKeywordCount = useMemo(() => {
    if (!bingoBoard) {
      return collectedKeywords;
    }

    return bingoBoard.filter((cell, index) => index !== 12 && cell.status === 1).length;
  }, [bingoBoard, collectedKeywords]);

  const completionRate = useMemo(() => {
    return Math.min(
      100,
      Math.round((markedKeywordCount / TOTAL_PLAYABLE_CELLS) * 100)
    );
  }, [markedKeywordCount]);

  const participantSummary = useMemo(() => {
    if (participantContact) {
      return `${username} 님 | ${participantContact}`;
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
      return;
    }

    const grouped: Record<string, ExchangeRecord> = {};

    for (const record of rawHistory.interactions as InteractionRecord[]) {
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

      const wordList = Array.isArray(record.word_id_list)
        ? record.word_id_list
        : [record.word_id_list];

      grouped[groupKey].given = [...grouped[groupKey].given, ...wordList];

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
  }, []);

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
      const storedId = localStorage.getItem("myID");
      const storedName = localStorage.getItem("myUserName");
      const storedContact = localStorage.getItem("myEmail");

      if (!storedId) {
        navigate("/", { replace: true });
        return;
      }

      try {
        setUserId(storedId);
        if (storedName) {
          setUsername(storedName);
        }
        if (storedContact) {
          setParticipantContact(storedContact);
        }

        const boardData = await getBingoBoard(storedId);
        const boardInteractionData = await getUserInteractionCount(storedId);
        setMetPersonNum(boardInteractionData);

        if (boardData && boardData.length > 0) {
          setBingoBoard(boardData);
          setInitialSetupOpen(false);

          const selectedKeywords = boardData
            .filter((cell) => cell.selected === 1)
            .map((cell) => cell.value);
          setMyKeywords(selectedKeywords);

          const activatedKeywords = boardData.filter(
            (cell, index) => index !== 12 && cell.status === 1
          );
          setCollectedKeywords(activatedKeywords.length);

          const interactionData = await getUserLatestInteraction(storedId, 0);
          if (Array.isArray(interactionData) && interactionData.length > 0) {
            const latestSenderId = interactionData[0].send_user_id;
            const latestInteractions = interactionData.filter(
              (item) => item.send_user_id === latestSenderId
            );
            const receivedKeywords = latestInteractions.flatMap((item) =>
              Array.isArray(item.word_id_list)
                ? item.word_id_list
                : [item.word_id_list]
            );
            setLatestReceivedKeywords(receivedKeywords);
          }
        } else {
          const shuffledValues = shuffleArray(cellValues);
          const initialBoard: BingoCell[] = Array(25)
            .fill(null)
            .map((_, index) => {
              if (index === 12) {
                return {
                  id: index,
                  value: "Logo",
                  selected: 0,
                  status: 1,
                };
              }

              return {
                id: index,
                value: shuffledValues[index < 12 ? index : index - 1],
                selected: 0,
                status: 0,
              };
            });

          setBingoBoard(initialBoard);
          setInitialSetupOpen(true);
          setCollectedKeywords(0);
        }
      } catch (error) {
        console.error("Error loading user board:", error);
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
        const boardInteractionData = await getUserInteractionCount(userId);
        setMetPersonNum(boardInteractionData);

        if (!latestBoard || latestBoard.length === 0) {
          return;
        }

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

          const interactionData = await getUserLatestInteraction(userId, 1);
          if (Array.isArray(interactionData) && interactionData.length > 0) {
            const latestSenderId = interactionData[0].send_user_id;
            const senderUserName = await getUserName(String(latestSenderId));
            if (senderUserName) {
              showAlert(
                `"${senderUserName}"님에게 "${newlyUpdatedValues.join(
                  '", "'
                )}" 키워드를 공유 받았습니다.`
              );
            }
          }
        }
      } catch (error) {
        console.error("Error refreshing bingo board:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [bingoBoard, userId]);

  const initializeBoard = async (selectedKeywords: string[]) => {
    try {
      const boardData: Record<
        string,
        { value: string; status: number; selected: number }
      > = {};

      const nextBoard =
        bingoBoard?.map((item, index) => {
          if (index === 12) {
            boardData[index] = {
              value: "Logo",
              status: 1,
              selected: 0,
            };

            return {
              ...item,
              value: "Logo",
              status: 1,
              selected: 0,
            };
          }

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

      const storedId = localStorage.getItem("myID");
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
    if (selectedInitialKeywords.length !== keywordCount) {
      showAlert(`관심사는 ${keywordCount}개 선택해 주세요.`, "warning");
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

      if (previousKeywords.length >= keywordCount) {
        showAlert(
          `관심사는 ${keywordCount}개까지만 선택할 수 있습니다.`,
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
      for (let col = 0; col < 5; col += 1) {
        cells.push(index * 5 + col);
      }
    } else if (type === "col") {
      for (let row = 0; row < 5; row += 1) {
        cells.push(row * 5 + index);
      }
    } else if (type === "diagonal" && index === 1) {
      for (let diagonal = 0; diagonal < 5; diagonal += 1) {
        cells.push(diagonal * 5 + diagonal);
      }
    } else if (type === "diagonal" && index === 2) {
      for (let diagonal = 0; diagonal < 5; diagonal += 1) {
        cells.push(diagonal * 5 + (4 - diagonal));
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

    for (let row = 0; row < 5; row += 1) {
      let rowComplete = true;
      for (let col = 0; col < 5; col += 1) {
        if (!bingoBoard[row * 5 + col].status) {
          rowComplete = false;
          break;
        }
      }

      if (rowComplete) {
        newCompletedLines.push({ type: "row", index: row });
        newBingoCount += 1;
      }
    }

    for (let col = 0; col < 5; col += 1) {
      let colComplete = true;
      for (let row = 0; row < 5; row += 1) {
        if (!bingoBoard[row * 5 + col].status) {
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
    for (let index = 0; index < 5; index += 1) {
      if (!bingoBoard[index * 5 + index].status) {
        diagonal1Complete = false;
        break;
      }
    }

    if (diagonal1Complete) {
      newCompletedLines.push({ type: "diagonal", index: 1 });
      newBingoCount += 1;
    }

    let diagonal2Complete = true;
    for (let index = 0; index < 5; index += 1) {
      if (!bingoBoard[index * 5 + (4 - index)].status) {
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

      if (bingoCount >= 1 && !hideReviewModal) {
        setShowReviewModal(true);
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
    hideReviewModal,
  ]);

  useEffect(() => {
    if (bingoBoard?.length === 25) {
      checkBingoLines();
    }
  }, [bingoBoard, checkBingoLines]);

  function handleCloseAlert() {
    setAlertOpen(false);
  }

  function showAlert(message: string, severity: AlertSeverity = "success") {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);

    setTimeout(() => {
      setAlertOpen(false);
    }, 3000);
  }

  const handleExchange = async () => {
    if (!opponentId.trim()) {
      showAlert("상대방 ID를 입력해주세요.", "warning");
      return;
    }

    const myId = localStorage.getItem("myID");
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

      const result = await updateBingoBoard(myId, targetId);
      await Promise.all(
        myKeywords.map((keyword) =>
          createUserBingoInteraction(keyword, Number(myId), Number(targetId))
        )
      );

      if (!result) {
        showAlert("키워드 교환 요청에 실패했습니다. 다시 시도해주세요.", "error");
        return;
      }

      await fetchExchangeHistory(myId);
      const boardInteractionData = await getUserInteractionCount(myId);
      setMetPersonNum(boardInteractionData);
      setOpponentId("");
      showAlert(`"${receiverName}"님에게 키워드를 성공적으로 전송했습니다!`);
    } catch (error) {
      console.error("Exchange failed:", error);
      showAlert("에러가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
    }
  };

  const isCellInCompletedLine = (index: number) => {
    const row = Math.floor(index / 5);
    const col = index % 5;

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
      if (line.type === "diagonal" && line.index === 2 && col === 4 - row) {
        return true;
      }
      return false;
    });
  };

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
              당신의 관심사를 잘 표현할 수 있는 키워드를 {keywordCount}개 선택하세요.
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
                  selectedInitialKeywords.length !== keywordCount || isInitializingBoard
                }
              >
                {isInitializingBoard ? "준비 중..." : "빙고 시작하기"}
              </button>
            </div>
          </section>
        </main>

        <Snackbar
          open={alertOpen}
          autoHideDuration={3000}
          onClose={handleCloseAlert}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleCloseAlert} severity={alertSeverity} sx={{ width: "100%" }}>
            {alertMessage}
          </Alert>
        </Snackbar>
      </div>
    );
  }

  return (
    <div className="bingo-game-page">
      <div className="bingo-game-page__mesh" aria-hidden="true" />

      <main className="bingo-game-shell">
        <p className="bingo-game-brand">{SETUP_BRAND_TITLE}</p>

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
                  <button type="submit">보내기</button>
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
                  {markedKeywordCount}/{TOTAL_PLAYABLE_CELLS}
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

            <div className="bingo-board-grid">
              {bingoBoard?.map((cell, index) => {
                const isCenter = index === 12;
                const isActive = cell.status === 1;
                const isLineCell = isCellInCompletedLine(index);
                const isNew = newBingoCells.includes(index);
                const isLatest = latestReceivedKeywords.includes(cell.value);
                const isAnimated = animatedCells.includes(index);
                const isPlaceholder = !isLineCell && (!isActive || isCenter);
                const isReceived = !isPlaceholder && !isLineCell;
                const displayValue = isCenter ? BOARD_PLACEHOLDER_LABEL : cell.value;

                const classNames = [
                  "bingo-board-cell",
                  isCenter ? "is-center" : "",
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
        open={visibleModal === "review"}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            setShowReviewModal(false);
          }
        }}
      >
        <DialogContent>
          <p className="bingo-dialog__text">빙고 게임에 대한 간단한 피드백을 남겨주세요.</p>
          <div className="bingo-dialog__rating">
            <Rating
              name="review-stars"
              value={reviewStars}
              onChange={(_, nextValue) => setReviewStars(nextValue)}
              sx={{ fontSize: 30 }}
            />
          </div>
          <textarea
            className="bingo-dialog__textarea"
            rows={4}
            placeholder="간단한 리뷰를 작성해주세요"
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={() => {
              localStorage.setItem("hideReviewModal", "true");
              setHideReviewModal(true);
              setShowReviewModal(false);
            }}
          >
            취소
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (userId && reviewStars !== null) {
                try {
                  await submitReview(userId, reviewStars, reviewText);
                  showAlert("소중한 리뷰 감사합니다!");
                  localStorage.setItem("hideReviewModal", "true");
                  setHideReviewModal(true);
                  setShowReviewModal(false);
                } catch (error) {
                  showAlert("리뷰 제출 중 문제가 발생했습니다.", "error");
                }
                return;
              }

              showAlert("별점을 입력해주세요.", "warning");
            }}
          >
            평가 완료
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={visibleModal === "allBingo"}
        onClose={() => {
          setShowAllBingoModal(false);
          if (showReviewModal) {
            setTimeout(() => setShowReviewModal(true), 100);
          }
        }}
      >
        <DialogTitle>3줄 미션 달성</DialogTitle>
        <DialogContent>
          <p className="bingo-dialog__text">축하합니다! 빙고를 완성했습니다.</p>
          <p className="bingo-dialog__text">
            재미있게 즐기셨다면{" "}
            <a
              href="https://github.com/Pseudo-Lab/devfactory"
              target="_blank"
              rel="noopener noreferrer"
            >
              Devfactory Repo
            </a>
            에 별을 남겨 주세요.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAllBingoModal(false)} color="primary">
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alertOpen}
        autoHideDuration={3000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={alertSeverity} variant="filled">
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default BingoGame;

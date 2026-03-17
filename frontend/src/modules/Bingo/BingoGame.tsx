import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Button, Grid, Paper, Chip, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, Divider, Rating, Link, type SxProps, type Theme
} from '@mui/material';
import { styled } from "@mui/system";
import PersonIcon from '@mui/icons-material/Person';
import HomeIcon from '@mui/icons-material/Home';
import {
  getBingoBoard,
  updateBingoBoard,
  createBingoBoard,
  getUserInteractionCount,
  createUserBingoInteraction,
  getUserAllInteraction,
  getUserLatestInteraction,
  getUserName,
  submitReview,
} from "../../api/bingo_api.ts";
import logo from '../../assets/react.svg';
import bingoKeywords from '../../config/bingo-keywords.json';
import { bingoConfig } from '../../config/bingoConfig.ts';
import "./BingoGame.css";

// Define proper interfaces
interface BingoCell {
  id: number;
  value: string;
  selected: number; // 유저가 고른 키워드
  status: number; // 빙고 키워드 활성화 여부
  note?: string;
}

interface CompletedLine {
  type: string;
  index: number;
}

interface ExchangeRecord {
  id: number;
  date: string;
  sendPerson?: string;
  sendPersonProfileUrl?: string;
  receivePerson?: string;
  receivePersonProfileUrl?: string;
  given?: string[];
}

interface InteractionRecord {
  send_user_id: number;
  receive_user_id: number;
  created_at: string;
  word_id_list: string[] | string;
}

const cellValues = bingoKeywords.keywords;
const SETUP_BRAND_TITLE = "Bingo Networking";

const GradientContainer = styled(Container)(() => ({
  minHeight: "75vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #FFE5EC, #E0F7FA)",
  padding: 0,
  textAlign: "center",
}));

const BingoGame = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('사용자 이름');
  const [userId, setUserId] = useState<string>('');
  const [myKeywords, setMyKeywords] = useState<string[]>([]);
  const shuffleArray = (array: string[]) => {
    return [...array].sort(() => Math.random() - 0.5);
  };
  const [bingoBoard, setBingoBoard] = useState<BingoCell[] | null>(null);
  const [opponentId, setOpponentId] = useState('');
  const [completedLines, setCompletedLines] = useState<CompletedLine[]>([]);
  const [bingoCount, setBingoCount] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [collectedKeywords, setCollectedKeywords] = useState(0);
  const [metPersonNum, setMetPersonNum] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeRecord[]>([]);
  // 새로운 빙고 라인이 발견되었는지 확인하기 위한 상태
  const [newBingoFound, setNewBingoFound] = useState(false);
  const [initialSetupOpen, setInitialSetupOpen] = useState(true);
  const [selectedInitialKeywords, setSelectedInitialKeywords] = useState<string[]>([]);
  // 빙고 라인의 셀들을 추적하기 위한 상태
  const [bingoLineCells, setBingoLineCells] = useState<number[]>([]);
  // 현재 애니메이션 효과가 적용되는 셀들
  const [animatedCells, setAnimatedCells] = useState<number[]>([]);
  // 컨페티 상태
  const [showConfetti, setShowConfetti] = useState(false);
  // 새로운 빙고 라인에 추가된 셀을 추적하기 위한 상태
  const [newBingoCells, setNewBingoCells] = useState<number[]>([]);
  // 애니메이션 적용 상태를 관리
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'warning' | 'error' | 'info'>('success');
  const [latestReceivedKeywords, setLatestReceivedKeywords] = useState<string[]>([]);
  const [remainingTime, setRemainingTime] = useState(() => {
    return bingoConfig.unlockTime - Date.now();
  });
  const [locked, setLocked] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isTester = urlParams.get("early") === "true";
    return !isTester && new Date().getTime() < bingoConfig.unlockTime;
  });
  const bingoMissionCount = bingoConfig.bingoMissionCount;
  const keywordCount = bingoConfig.keywordCount;
  const [showAllBingoModal, setShowAllBingoModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStars, setReviewStars] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [hideReviewModal, setHideReviewModal] = useState(
    () => localStorage.getItem("hideReviewModal") === "true"
  );
  const [isInitializingBoard, setIsInitializingBoard] = useState(false);
  const visibleModal = showAllBingoModal
    ? "allBingo"
    : showReviewModal
    ? "review"
    : null;

  // 셀 노트 가져오기
  function getCellNote(): string | undefined {
    return undefined;
  }

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
      const userName = localStorage.getItem("myUserName");

      if (!storedId) {
        window.location.href = "/";
        return;
      }
      if (storedId) {
        try {
          setUserId(storedId);
          const boardData = await getBingoBoard(storedId);
          const boardInteractionData = await getUserInteractionCount(storedId);
          setMetPersonNum(boardInteractionData)
          if (boardData && boardData.length > 0) {
            setBingoBoard(boardData);
            setInitialSetupOpen(false);

            const selectedKeywords = boardData
              .filter(cell => cell.selected === 1)
              .map(cell => cell.value);
            setMyKeywords(selectedKeywords);

            const getBingoKeywords = boardData
              .filter(cell => cell.status === 1)
              .map(cell => cell.value);
            setCollectedKeywords(getBingoKeywords.length - 1);
            setCollectedKeywords(getBingoKeywords.length - 1);

            const interactionData = await getUserLatestInteraction(storedId, 0);
            if (Array.isArray(interactionData) && interactionData.length > 0) {
              const latestSenderId = interactionData[0].send_user_id;
              const latestInteractions = interactionData.filter(
                item => item.send_user_id === latestSenderId
              );
              const receivedKeywords = latestInteractions.flatMap(
                (item) => item.word_id_list ?? []
              );
              setLatestReceivedKeywords(receivedKeywords);
            }
          }
          else {
            const shuffledValues = shuffleArray(cellValues);
            const initialBoard: BingoCell[] = Array(25).fill(null).map((_, i) => {
              if (i === 12) {
                return {
                  id: i,
                  value: 'Logo',
                  selected: 0,
                  status: 1,
                  note: undefined,
                };
              }
              return {
                id: i,
                value: shuffledValues[i < 12 ? i : i - 1],
                selected: 0,
                status: 0,
                note: getCellNote(),
              };
            });
            setBingoBoard(initialBoard);
            setInitialSetupOpen(true);
          }
        } catch (error) {
          console.error("Error loading user board:", error);
        }
      }
      if (userName) setUsername(userName);
    };

    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!userId) return;
  
      try {
        const latestBoard = await getBingoBoard(userId);
        const boardInteractionData = await getUserInteractionCount(userId);
        setMetPersonNum(boardInteractionData)
        if (!latestBoard || latestBoard.length === 0 || !bingoBoard) return;
        if (!latestBoard || latestBoard.length === 0 || !bingoBoard) return;
  
        const newlyUpdatedValues: string[] = [];
  
        const updatedBoard = latestBoard.map((newCell, i) => {
          const prevCell = bingoBoard[i];
          if (prevCell.status === 0 && newCell.status === 1) {
            newlyUpdatedValues.push(newCell.value);
          }
          return newCell;
        });
  
        if (newlyUpdatedValues.length > 0) {
          setBingoBoard(updatedBoard);
          setCollectedKeywords(prev => prev + newlyUpdatedValues.length);
          setLatestReceivedKeywords(newlyUpdatedValues);
          const interactionData = await getUserLatestInteraction(userId, 1);
          if (Array.isArray(interactionData) && interactionData.length > 0) {
            const latestSenderId = interactionData[0].send_user_id;
            const senderUserName = await getUserName(latestSenderId);
            if (senderUserName) showAlert(`"${senderUserName}"님에게 "${newlyUpdatedValues.join('", "')}" 키워드를 공유 받았습니다.`);
          }
        }
        // TODO: 키워드 받았지만 변화 없을 때 메시지?
      } catch (err) {
        console.error("Error refreshing bingo board:", err);
      }
    }, 5000);
  
    return () => clearInterval(interval);
  }, [userId, bingoBoard]);

  useEffect(() => {
    const fetchExchangeHistory = async () => {
      const userId = localStorage.getItem("myID");
      if (!userId) return;
  
      const rawHistory = await getUserAllInteraction(userId);
      if (!Array.isArray(rawHistory.interactions)) return;
  
      const grouped: { [key: string]: ExchangeRecord } = {};
  
      for (const record of rawHistory.interactions as InteractionRecord[]) {
        const isSender = record.send_user_id === parseInt(userId);
        const otherUserId = isSender ? record.receive_user_id : record.send_user_id;
  
        const groupKey = `${record.send_user_id}-${record.receive_user_id}`;
  
        if (!grouped[groupKey]) {
          const senderName = await getUserName(String(isSender ? userId : otherUserId));
          const receiverName = await getUserName(String(isSender ? otherUserId : userId));
  
          grouped[groupKey] = {
            id: Math.random(),
            date: record.created_at.replace(/-/g, '.').replace('T', ' ').slice(0, 16),
            sendPerson: senderName,
            receivePerson: receiverName,
            given: [],
          };
        }
  
        const wordList = Array.isArray(record.word_id_list)
          ? record.word_id_list
          : [record.word_id_list];
  
        grouped[groupKey].given = [...(grouped[groupKey].given || []), ...wordList];
      }
      setExchangeHistory(Object.values(grouped));
    };
  
    fetchExchangeHistory();
    const interval = setInterval(fetchExchangeHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const initializeBoard = async (selectedInitialKeywords: string[]) => {
    try {
      const boardData: {
        [key: string]: { value: string; status: number; selected: number };
      } = {};

      bingoBoard?.forEach((item, index) => {
        if (index === 12) {
          boardData[index] = {
            value: 'Logo',
            status: 1,
            selected: 0,
          };
        } else {
          boardData[index] = {
            value: item.value,
            status: 0,
            selected: selectedInitialKeywords.includes(item.value) ? 1 : 0,
          };
        }
      });
      
      const storedId = localStorage.getItem("myID");
      if (storedId) {
        const isCreated = await createBingoBoard(storedId, boardData);
        if (!isCreated) {
          return false;
        }
        setUserId(storedId);
        return true;
      }
    } catch (error) {
      console.error("Failed to initialize bingo board:", error);
    }

    return false;
  };

  // 첫 화면에서 키워드 선택 후 저장
  const handleInitialSetup = async () => {
    if (selectedInitialKeywords.length !== keywordCount) {
      showAlert(`관심사는 ${keywordCount}개 선택해 주세요.`, 'warning');
      return;
    }

    try {
      setIsInitializingBoard(true);
      if (selectedInitialKeywords.length > 0) {
        setMyKeywords(selectedInitialKeywords);
      }

      const isInitialized = await initializeBoard(selectedInitialKeywords);
      if (!isInitialized) {
        showAlert('키워드 저장 중 문제가 발생했습니다.', 'error');
        return;
      }

      setInitialSetupOpen(false);
      showAlert('키워드가 설정되었습니다!');
    } catch (err) {
      console.error("Failed initial setup:", err);
      showAlert('초기 설정 중 문제가 발생했습니다.', 'error');
    } finally {
      setIsInitializingBoard(false);
    }
  };

  // 초기 키워드 선택 토글
  const toggleInitialKeyword = (keyword: string) => {
    setSelectedInitialKeywords(previousKeywords => {
      if (previousKeywords.includes(keyword)) {
        return previousKeywords.filter(item => item !== keyword);
      }

      if (previousKeywords.length >= keywordCount) {
        showAlert(`관심사는 ${keywordCount}개까지만 선택할 수 있습니다.`, 'warning');
        return previousKeywords;
      }

      return [...previousKeywords, keyword];
    });
  };

  // 빙고 라인에 해당하는 모든 셀의 인덱스 배열을 반환하는 함수
  const getCellsInLine = (type: string, index: number): number[] => {
    const cells: number[] = [];
    
    if (type === 'row') {
      for (let col = 0; col < 5; col++) {
        cells.push(index * 5 + col);
      }
    } else if (type === 'col') {
      for (let row = 0; row < 5; row++) {
        cells.push(row * 5 + index);
      }
    } else if (type === 'diagonal' && index === 1) {
      for (let i = 0; i < 5; i++) {
        cells.push(i * 5 + i);
      }
    } else if (type === 'diagonal' && index === 2) {
      for (let i = 0; i < 5; i++) {
        cells.push(i * 5 + (4 - i));
      }
    }
    
    return cells;
  };

  const checkBingoLines = useCallback(() => {
    const newCompletedLines: CompletedLine[] = [];
    let newBingoCount = 0;

    if (!bingoBoard) return;

    if (!bingoBoard) return;

    // 가로 줄 체크
    for (let row = 0; row < 5; row++) {
      let rowComplete = true;
      for (let col = 0; col < 5; col++) {
        if (!bingoBoard[row * 5 + col].status) {
          rowComplete = false;
          break;
        }
      }
      
      if (rowComplete) {
        newCompletedLines.push({ type: 'row', index: row });
        newBingoCount++;
      }
    }
    
    // 세로 줄 체크
    for (let col = 0; col < 5; col++) {
      let colComplete = true;
      for (let row = 0; row < 5; row++) {
        if (!bingoBoard[row * 5 + col].status) {
          colComplete = false;
          break;
        }
      }
      
      if (colComplete) {
        newCompletedLines.push({ type: 'col', index: col });
        newBingoCount++;
      }
    }
    
    // 대각선 체크 (좌상단 -> 우하단)
    let diagonal1Complete = true;
    for (let i = 0; i < 5; i++) {
      if (!bingoBoard[i * 5 + i].status) {
        diagonal1Complete = false;
        break;
      }
    }
    
    if (diagonal1Complete) {
      newCompletedLines.push({ type: 'diagonal', index: 1 });
      newBingoCount++;
    }
    
    // 대각선 체크 (우상단 -> 좌하단)
    let diagonal2Complete = true;
    for (let i = 0; i < 5; i++) {
      if (!bingoBoard[i * 5 + (4 - i)].status) {
        diagonal2Complete = false;
        break;
      }
    }
    
    if (diagonal2Complete) {
      newCompletedLines.push({ type: 'diagonal', index: 2 });
      newBingoCount++;
    }
    
    setCompletedLines(newCompletedLines);
    setBingoCount(newBingoCount);
    if (newBingoCount >= bingoMissionCount) {
      setShowAllBingoModal(true);
    }
  }, [bingoBoard, bingoMissionCount]);

  // 빙고 라인 체크
  useEffect(() => {
    // Calculate new bingo lines (not previously completed)
    const newLines = completedLines.filter(
      newLine =>
        !getCellsInLine(newLine.type, newLine.index).every(lineCell =>
          bingoLineCells.includes(lineCell)
        )
    );
  
    // Collect cells from the new lines only
    const newCells: number[] = [];
    newLines.forEach(line => {
      newCells.push(...getCellsInLine(line.type, line.index));
    });
  
    const uniqueNewCells = [...new Set(newCells)];
    
    if (uniqueNewCells.length > 0) {
      setNewBingoCells(uniqueNewCells);
      setAnimatedCells(uniqueNewCells);
      setNewBingoFound(true);
      showAlert('빙고 한 줄을 완성했습니다! 🎉');
      if (!hasShownConfetti && bingoCount >= bingoMissionCount) {
        setShowConfetti(true);
        setHasShownConfetti(true);
      }
      
      if (bingoCount >= 1 && !hideReviewModal) {
        setShowReviewModal(true);
      }
  
      // Clear animation after some time
      setTimeout(() => {
        setAnimatedCells([]);
        setNewBingoCells([]);
        setNewBingoFound(false);
        setShowConfetti(false);
        setShowConfetti(false);
      }, 3000);
    }
  
    // Update all cells in bingo lines
    const allCellsFromLines: number[] = [];
    completedLines.forEach(line => {
      allCellsFromLines.push(...getCellsInLine(line.type, line.index));
    });
  
    const uniqueAllCells = [...new Set(allCellsFromLines)];
    const hasSameCells =
      uniqueAllCells.length === bingoLineCells.length &&
      uniqueAllCells.every((cell, index) => cell === bingoLineCells[index]);

    if (!hasSameCells) {
      setBingoLineCells(uniqueAllCells);
    }
  }, [completedLines, bingoCount, bingoLineCells, bingoMissionCount, hasShownConfetti, hideReviewModal]);
  
  useEffect(() => {
    if (bingoBoard?.length === 25) {
      checkBingoLines();
    }
  }, [bingoBoard, checkBingoLines]);

  // 알림 닫기 함수
  function handleCloseAlert() {
    setAlertOpen(false);
  }

  // 알림 표시 함수
  function showAlert(
    message: string,
    severity: 'success' | 'warning' | 'error' | 'info' = 'success'
  ) {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  
    setTimeout(() => {
      setAlertOpen(false);
    }, 3000);
  }

  // 키워드 교환 처리
  const handleExchange = async () => {
    if (!opponentId) {
      showAlert("상대방 ID를 입력해주세요.", 'warning');
      return;
    }
  
    const myId = localStorage.getItem("myID");
    if (!myId) {
      showAlert("로그인 정보가 없습니다.", 'error');
      return;
    }

    if (myId === opponentId) {
      showAlert("본인 ID가 아닌 상대방 ID를 입력해주세요.", 'warning');
      return;
    }
  
    try {
      const result = await updateBingoBoard(myId, opponentId);
      const receiverName = await getUserName(opponentId);
      if (!receiverName) {
        showAlert("존재하지 않는 ID입니다.", 'error');
        return;
      }
      await Promise.all(
        myKeywords.map((myKeyword) =>
          createUserBingoInteraction(myKeyword, parseInt(myId), parseInt(opponentId))
        )
      );
      if (result) {
        showAlert(`"${receiverName}"님에게 키워드를 성공적으로 전송했습니다!`);
      } else {
        showAlert("키워드 교환 요청에 실패했습니다. 다시 시도해주세요.", 'error');
      }
    } catch (err) {
      console.error("Exchange failed:", err);
      showAlert("에러가 발생했습니다. 잠시 후 다시 시도해주세요.", 'error');
    }
  };

  // 셀이 빙고 라인에 포함되어 있는지 확인
  const isCellInCompletedLine = (index: number) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    
    return completedLines.some(line => {
      if (line.type === 'row' && line.index === row) return true;
      if (line.type === 'col' && line.index === col) return true;
      if (line.type === 'diagonal' && line.index === 1 && row === col) return true;
      if (line.type === 'diagonal' && line.index === 2 && col === 4 - row) return true;
      return false;
    });
  };

  // 셀 스타일 관리
  const getCellStyle = (index: number) => {
    if (!bingoBoard) return {};

    if (!bingoBoard) return {};

    const isMarked = bingoBoard[index].status;
    const isInCompletedLine = isCellInCompletedLine(index);
    const isNewBingoCell = newBingoCells.includes(index);
    const isLatestReceived = latestReceivedKeywords.includes(bingoBoard[index].value);
    const orangeBorder = '2px solid #FF9E21 ';
    const baseBorder = '0.5px solid grey';
    const greenBorder = '2px solid #2E7D32';
    
    // Base styles
    const baseStyle: SxProps<Theme> = {
      position: 'relative',
      aspectRatio: '1/1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 1,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: baseBorder,
      '&:hover': {
        bgcolor: isMarked ? undefined : 'grey.100'
      }
    };
    
    if (isNewBingoCell) {
      baseStyle.animation = 'fadeBg 3s ease forwards, pulse 1.5s infinite';
      baseStyle.animationDelay = '1s, 0s';
      baseStyle['@keyframes pulse'] = {
        '0%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)', transform: 'scale(1)' },
        '50%': { boxShadow: '0 0 0 8px rgba(76, 175, 80, 0)', transform: 'scale(1.025)' },
        '100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)', transform: 'scale(1)' }
      };
      baseStyle['@keyframes fadeBg'] = {
        '0%': { backgroundColor: '#FFF59D' },
        '100%': { backgroundColor: '#4CAF50' }
      };
      baseStyle.backgroundColor = '#FFF59D';
      // baseStyle.border = '2px solid #4CAF50';
      baseStyle.border = isLatestReceived? greenBorder : baseBorder,
      baseStyle.color = 'white'; 
      baseStyle.zIndex = 2;
    }
    // Normal styles for cells that are not part of new bingo lines
    else if (isMarked) {
      if (isInCompletedLine) {
        // Already completed bingo line cells - no animation
        return {
          ...baseStyle,
          bgcolor: '#4CAF50',
          // border: '2px solid #2E7D32',
          border: isLatestReceived? greenBorder : baseBorder,
          color: 'white',
          fontWeight: 'bold',
          boxShadow: 1,
        };
      } else {
        // Regular selected cells
        return {
          ...baseStyle,
          bgcolor: '#FFF8E0',
          // border: '2px #FF9E21 solid',
          border: isLatestReceived? orangeBorder : baseBorder,
          boxShadow: 0,
        };
      }
    } else {
      // Unmarked cells
      return {
        ...baseStyle,
        bgcolor: 'white',
      };
    }
    return baseStyle;
  };

  if (locked) {
    const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
    const seconds = Math.floor((remainingTime / 1000) % 60);
  
    return (
      <GradientContainer>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>빙고 카운트다운!</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 4 }}>
            {[{ label: '일', value: days },
              { label: '시간', value: hours },
              { label: '분', value: minutes },
              { label: '초', value: seconds }].map(({ label, value }) => (
              <Box key={label}>
                <Typography variant="h2" fontWeight="bold">
                  {String(value).padStart(2, '0')}
                </Typography>
                <Typography variant="subtitle1">{label}</Typography>
              </Box>
            ))}
          </Box>  
        </Box>
      </GradientContainer>
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
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseAlert} severity={alertSeverity} sx={{ width: '100%' }}>
            {alertMessage}
          </Alert>
        </Snackbar>
      </div>
    );
  }


  return (
    <GradientContainer>
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        {/* 헤더 섹션 */}
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" fontWeight="bold" sx={{ ml: 1 }}>키워드 교환 빙고</Typography>
            </Box>
            <Button
              sx={{ fontSize: 15, color: 'primary.main' }}
              component="a"
              target="_blank"
              rel="noopener"
            >
              {username}
            </Button>
          </Box>
          
          <Divider sx={{ my: 1.5 }} />
          
          {/* 키워드 태그 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" color="text.secondary" mb={1}>나의 키워드</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {myKeywords.map((keyword, index) => (
                <Chip
                  key={index}
                  label={keyword}
                  size="medium"
                  sx={{ bgcolor: 'primary.50', color: 'primary.main', fontWeight: 'bold' }}
                />
              ))}
            </Box>
          </Box>
          
          {/* 수집 현황 */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Paper elevation={0} sx={{ bgcolor: 'grey.200', p: 1, borderRadius: 1, height: '100%' }}>
                <Box sx={{ minHeight: 50 }}>
                  <Typography variant="caption" color="text.secondary">수집한 키워드</Typography>
                </Box>
                <Typography variant="h6" fontWeight="medium">{collectedKeywords}/24</Typography>
              </Paper>  
            </Grid>
            <Grid item xs={6}>
              <Paper elevation={0} sx={{ bgcolor: 'grey.200', p: 1, borderRadius: 1, height: '100%' }}>
                <Box sx={{ minHeight: 50 }}>
                  <Typography variant="caption" color="text.secondary">만난 참가자</Typography>
                </Box>
                <Typography variant="h6" fontWeight="medium">{metPersonNum}명</Typography>
              </Paper>
            </Grid>
          </Grid>
          
          {/* 빙고 진행 상태 */}
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">빙고 상태</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(bingoCount * (100/bingoMissionCount), 100)}
            sx={{ 
              mb: 1, 
              borderRadius: 1, 
              height: 8,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: bingoCount >= bingoMissionCount ? 'success.main' : 'warning.main',
                transition: newBingoFound ? 'width 1s ease-in-out' : undefined
              }
            }}
          />
          <Typography variant="body2" color="text.secondary" align="right">
            {bingoCount >= bingoMissionCount ? "빙고 완성! 🎉" : `${bingoCount}줄 빙고 달성 중`}
          </Typography>
        </Paper>

        {/* 키워드 교환 입력 섹션 */}
        <Paper elevation={2} sx={{ p: 1.5, my: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>키워드 교환</Typography>
            <Typography variant="body2" fontWeight="bold">(</Typography>
            <PersonIcon sx={{ fontSize: 15, color: 'primary.100' }} />
            <Typography variant="body2" fontWeight="bold">내 ID: {userId})</Typography>
          </Box>
          <Box sx={{ display: 'flex',  justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <TextField
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              placeholder="상대방 ID 입력"
              size="small"
            />
            <Button 
              variant="contained" 
              color="warning"
              onClick={handleExchange}
              sx={{
                px: 1,
                width: '50%',
                '&:focus': {
                  outline: 'none',
                },
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: 'none',
                }
              }}
            >
              내 키워드 보내기
            </Button>
          </Box>
        </Paper>
        
        {/* 빙고 보드 */}
        <Box sx={{ mb: 2, position: 'relative' }}>
          <Grid container spacing={0.5}>
            {bingoBoard?.map((cell, index) => (
              <Grid item xs={2.4} sm={2.4} key={cell.id}>
                <Paper
                  elevation={cell.status ? (isCellInCompletedLine(index) ? 3 : 1) : 0}
                  sx={getCellStyle(index)}
                >
                  <Box sx={{ textAlign: 'center' }}>
                  {index === 12 ? (
                    <Box
                      component="img"
                      src={logo}
                      alt="Center Logo"
                      sx={{
                        width: '100%',
                        height: 'auto',
                        mx: 'auto',
                        display: 'block',
                        opacity: 0.9,
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize:
                          cell.value.length <= 7
                            ? 'clamp(0.6rem, 3vw, 1rem)'
                            : cell.value.length <= 14
                            ? 'clamp(0.6rem, 2.8vw, 0.85rem)'
                            : 'clamp(0.5rem, 2.5vw, 0.7rem)',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        width: '100%',
                        color: cell.status ? 
                          (animatedCells.includes(index) ? 'white' : 
                          (isCellInCompletedLine(index) ? 'amber.800' : 'primary.800')) 
                          : 'text.primary'
                      }}
                    >
                      {cell.value}
                    </Typography>
                  )}
                  </Box>
                  
                  {/* 노트 표시 */}
                  {cell.note && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        fontSize: '0.6rem'
                      }}
                    >
                      {cell.note}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* 애니메이션 스타일 추가 */}
        <style>{`
          @keyframes drawLine {
            to {
              stroke-dashoffset: 0;
            }
          }
          @keyframes fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
        
        {/* 기록 보기 버튼 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setShowHistory(!showHistory)}
            sx={{ px: 3, width: '150px' }}
          >
            교환 기록 {showHistory ? '가리기' : '보기'}
          </Button>
          <Button 
            variant="outlined"
            color="primary"
            onClick={() => navigate('/')}
            startIcon={<HomeIcon />}
            sx={{ 
              px: 3, 
              width: '150px', 
              ml: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            홈으로
          </Button>
        </Box>
        
        {/* 교환 기록 */}
        {showHistory && (
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" fontWeight="bold">키워드 교환 기록</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {exchangeHistory.map((history) => (
              <Box key={history.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1, ml: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'centger', gap: 1 }}>
                    <Link href={history.sendPersonProfileUrl} target="_blank" rel="noopener" underline="none">
                      <Typography color="warning.main" fontWeight="medium">{history.sendPerson}</Typography>
                    </Link>
                    <Typography variant="body2" color="text.secondary">→</Typography>
                    <Link href={history.receivePersonProfileUrl} target="_blank" rel="noopener" underline="none">
                      <Typography color="warning.main" fontWeight="medium">{history.receivePerson}</Typography>
                    </Link>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {history.date}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  {history.given?.map((word, i) => (
                    <Chip key={i} label={word} size="small" variant="outlined" sx={{ bgcolor: 'grey.100' }} />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
          </Paper>
        )}

        {showConfetti && (
          <Box sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 9999
          }}>
            {Array.from({ length: 50 }).map((_, i) => {
              const size = Math.random() * 10 + 5;
              const left = Math.random() * 100;
              const duration = Math.random() * 3 + 2;
              const delay = Math.random() * 0.5;
              const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff'];
              return (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    top: '-20px',
                    left: `${left}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    bgcolor: colors[Math.floor(Math.random() * colors.length)],
                    borderRadius: '50%',
                    animation: `fall ${duration}s linear ${delay}s forwards`
                  }}
                />
              );
            })}
            <style>{`
              @keyframes fall {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
              }
              .animate-dash {
                stroke-dashoffset: 100;
                animation: dash 1s linear infinite;
              }
              @keyframes dash {
                to {
                  stroke-dashoffset: 0;
                }
              }
            `}</style>
          </Box>
        )}

        {/* Review Dialog */}
        <Dialog
          open={visibleModal === "review"}
          onClose={(event, reason) => {
            if (reason !== 'backdropClick') {
              setShowReviewModal(false);
            }
          }}
        >
          <DialogContent>
            <Typography mb={2}>빙고 게임에 대한 간단한 피드백을 남겨주세요.</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Rating
                name="review-stars"
                value={reviewStars}
                onChange={(_, newValue) => setReviewStars(newValue)}
                sx={{ fontSize: 30 }}
              />
            </Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="간단한 리뷰를 작성해주세요"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
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
                    localStorage.setItem("hideReviewModal", "true"); // 유저 리뷰 get하는 함수 사용하면 삭제
                    setHideReviewModal(true);
                    setShowReviewModal(false); // 유저 리뷰 get하는 함수 사용하면 삭제
                  } catch (err) {
                    showAlert("리뷰 제출 중 문제가 발생했습니다.", 'error');
                  }
                } else {
                  showAlert("별점을 입력해주세요.", 'warning');
                }
              }}
            >
              평가 완료
            </Button>
          </DialogActions>
        </Dialog>

        {/* Mission Complete Dialog */}
        <Dialog
          open={visibleModal === "allBingo"}
          onClose={() => {
            setShowAllBingoModal(false);
            if (showReviewModal) setTimeout(() => setShowReviewModal(true), 100);
          }}
        >
          <DialogTitle>3줄 미션 달성 🎉</DialogTitle>
          <DialogContent>
            <Typography>축하합니다! 빙고를 완성했습니다.</Typography>
            {/* <Typography>Devfactory 부스로 오셔서 소정의 선물 받아가세요!</Typography> */}
            <br></br>
            <Typography>
              재미있게 즐기셨다면{' '}
              <Link
                href="https://github.com/Pseudo-Lab/devfactory"
                target="_blank"
                rel="noopener"
                underline="always"
              >
                Devfactory Repo
              </Link>
              에 ⭐️ 한번 눌러주세요!
            </Typography>
            <Typography>여러분의 관심이 큰 힘이 됩니다 😊</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAllBingoModal(false)} color="primary">
              닫기
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* 알림 */}
        <Snackbar 
          open={alertOpen} 
          autoHideDuration={3000} 
          onClose={handleCloseAlert}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={alertSeverity} variant="filled">
            {alertMessage}
          </Alert>
        </Snackbar>
      </Box>
    </GradientContainer>
  );
};

export default BingoGame;

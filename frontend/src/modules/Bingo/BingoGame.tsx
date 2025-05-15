import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Rating
} from '@mui/material';
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
  getUserProfileUrl,
} from "../../api/bingo_api.ts";
import logo from '../../assets/pseudo_lab_logo.png';
import bingoKeywords from '../../data/bingo-keywords.json';
import { bingoConfig } from '../../config/bingoConfig.ts';
import BingoBoard from './components/BingoBoard';
import InitialKeywordDialog from './components/InitialKeywordDialog';
import BingoHeader from './components/BingoHeader';
import ExchangeInput from './components/ExchangeInput';
import ExchangeHistory from './components/ExchangeHistory';
import { BingoCell, CompletedLine, ExchangeRecord } from './types';
import { GradientContainer } from '../../styles/containers.ts';
import { animations } from '../../styles/animations.ts';
import { BINGO_BOARD_SIZE, BINGO_GRID_SIZE, ANIMATION_DURATION, ALERT_DURATION, POLLING_INTERVAL, CELL_STYLES } from './constants';
import { shuffleArray, getCellNote, getCellsInLine } from './utils/helpers';

const cellValues = bingoKeywords.keywords;

const BingoGame = () => {
  const [username, setUsername] = useState('사용자 이름');
  const [userId, setUserId] = useState<string>('');
  const [myKeywords, setMyKeywords] = useState<string[]>([]);
  const [bingoBoard, setBingoBoard] = useState<BingoCell[]>(() => {
    const shuffledValues = shuffleArray(cellValues);
    return Array(BINGO_BOARD_SIZE).fill(null).map((_, i) => ({
      id: i,
      value: shuffledValues[i],
      selected: 0,
      status: 0,
      note: getCellNote(i)
    }));
  });
  const [opponentId, setOpponentId] = useState('');
  const [completedLines, setCompletedLines] = useState<CompletedLine[]>([]);
  const [bingoCount, setBingoCount] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [collectedKeywords, setCollectedKeywords] = useState(0);
  const [metPersonNum, setMetPersonNum] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [exchangeHistory, setExchangeHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [lastSelectedCell, setLastSelectedCell] = useState<number | null>(null);
  // 새로운 빙고 라인이 발견되었는지 확인하기 위한 상태
  const [newBingoFound, setNewBingoFound] = useState(false);
  const [initialSetupOpen, setInitialSetupOpen] = useState(false);
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
  const [showAllBingoModal, setShowAllBingoModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [locked, setLocked] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isTester = urlParams.get("early") === "true";
    return !isTester && new Date().getTime() < bingoConfig.unlockTime;
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStars, setReviewStars] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [hideReviewModal, setHideReviewModal] = useState(() =>localStorage.getItem("hideReviewModal") === "true");
  const bingoMissionCount = bingoConfig.bingoMissionCount;
  const keywordCount = bingoConfig.keywordCount;
  const conferenceEndTime = bingoConfig.conferenceEndTime;
  const conferenceInfoPage = bingoConfig.conferenceInfoPage;
  const [userProfileUrl, setUserProfileUrl] = useState(conferenceInfoPage);

  useEffect(() => {
    if (Date.now() > conferenceEndTime) {
      localStorage.removeItem("myID");
      localStorage.removeItem("myEmail");
      localStorage.removeItem("myUserName");
      localStorage.removeItem("hideReviewModal");
    }
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
            setCollectedKeywords(getBingoKeywords.length);

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
            setInitialSetupOpen(true);
          }
          // TODO: use api
          // const userProfileUrl = await getUserProfileUrl(storedId);
          // if (userProfileUrl) setUserProfileUrl(userProfileUrl);
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
        if (!latestBoard || latestBoard.length === 0) return;
  
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
  
      for (const record of rawHistory.interactions) {
        const date = record.created_at;
        const key = `${record.send_user_id}-${record.receive_user_id}-${record.word_id_list}`;
        const isSender = record.send_user_id === parseInt(userId);
        const otherUserId = isSender ? record.receive_user_id : record.send_user_id;
  
        if (!grouped[key]) {
          grouped[key] = {
            id: Math.random(),
            date: date.replace(/-/g, '.').replace('T', ' '),
          };
        }
  
        const senderName = await getUserName(isSender ? userId : otherUserId);
        const receiverName = await getUserName(isSender ? otherUserId : userId);
        // TODO: use api
        // const sendPersonProfileUrl = await getUserProfileUrl(isSender ? userId : otherUserId);
        // const receivePersonProfileUrl = await getUserProfileUrl(isSender ? otherUserId : userId);
  
        grouped[key].given = record.word_id_list;
        grouped[key].sendPerson = senderName;
        grouped[key].sendPersonProfileUrl = conferenceInfoPage;
        grouped[key].receivePerson = receiverName;
        grouped[key].receivePersonProfileUrl = conferenceInfoPage;
      }
  
      setExchangeHistory(Object.values(grouped));
    };
  
    fetchExchangeHistory();
    const interval = setInterval(fetchExchangeHistory, 5000);
  
    return () => clearInterval(interval);
  }, []);

  // TODO: userId 사용하도록 수정 필요
  const initializeBoard = async (userId: string, selectedInitialKeywords: string[]) => {
    try {
      const boardData: {
        [key: string]: { value: string; status: number; selected: number };
      } = {};

      bingoBoard.forEach((item, index) => {
        return (boardData[index] = {
          value: item.value,
          status: 0,
          selected: selectedInitialKeywords.includes(item.value)
            ? 1
            : 0,
        });
      });
      
      const storedId = localStorage.getItem("myID");
      if (storedId) {
        await createBingoBoard(storedId, boardData);
        setUserId(storedId);
      }
    } catch (error) {
      console.error("Failed to initialize bingo board:", error);
    }
  };

  // 첫 화면에서 키워드 선택 후 저장
  const handleInitialSetup = async () => {
    try {
      if (selectedInitialKeywords.length > 0) {
        setMyKeywords(selectedInitialKeywords);
      }
      setInitialSetupOpen(false);
      showAlert('키워드가 설정되었습니다!');
      await initializeBoard(userId, selectedInitialKeywords);
    } catch (err) {
      console.error("Failed initial setup:", err);
    }
  };

  // 초기 키워드 선택 토글
  const toggleInitialKeyword = (keyword: string) => {
    if (selectedInitialKeywords.includes(keyword)) {
      setSelectedInitialKeywords(selectedInitialKeywords.filter(k => k !== keyword));
    } else {
      if (selectedInitialKeywords.length < keywordCount) {
        setSelectedInitialKeywords([...selectedInitialKeywords, keyword]);
      }
    }
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

  // 빙고 라인 체크
  useEffect(() => {
    // Calculate new bingo lines (not previously completed)
    const newLines = completedLines.filter(
      newLine =>
        !bingoLineCells.some(cell =>
          getCellsInLine(newLine.type, newLine.index).every(lineCell => bingoLineCells.includes(lineCell))
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
    setBingoLineCells(uniqueAllCells);
  }, [completedLines, bingoCount]);
  
  useEffect(() => {
    if (bingoBoard.length === 25) {
      checkBingoLines();
    }
  }, [bingoBoard]);

  // 빙고 라인 체크 함수
  const checkBingoLines = () => {
    const newCompletedLines: CompletedLine[] = [];
    let newBingoCount = 0;

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
  };

  // 알림 닫기 함수
  const handleCloseAlert = () => {
    setAlertOpen(false);
  };

  // 알림 표시 함수
  const showAlert = (message: string, severity: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  
    setTimeout(() => {
      setAlertOpen(false);
    }, 3000);
  };

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
    const isMarked = bingoBoard[index].status;
    const isInCompletedLine = isCellInCompletedLine(index);
    const isLastSelected = index === lastSelectedCell;
    const isNewBingoCell = newBingoCells.includes(index);
    const isLatestReceived = latestReceivedKeywords.includes(bingoBoard[index].value);
    const orangeBorder = '2px solid #FF9E21 ';
    const baseBorder = '0.5px solid grey';
    const greenBorder = '2px solid #2E7D32';
    
    // Base styles
    const baseStyle: any = {
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
          boxShadow: isLastSelected ? 3 : 1,
        };
      } else {
        // Regular selected cells
        return {
          ...baseStyle,
          bgcolor: '#FFF8E0',
          // border: '2px #FF9E21 solid',
          border: isLatestReceived? orangeBorder : baseBorder,
          boxShadow: isLastSelected ? 2 : 0,
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
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <Typography variant="h4" gutterBottom>빙고 카운트다운!</Typography>
  
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4 }}>
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


  return (
    <GradientContainer>
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        <InitialKeywordDialog
          open={initialSetupOpen}
          keywords={cellValues}
          selectedKeywords={selectedInitialKeywords}
          onToggle={toggleInitialKeyword}
          onSave={handleInitialSetup}
          onClose={() => setInitialSetupOpen(false)}
          keywordCount={keywordCount}
          logo={logo}
        />
        <BingoHeader
          username={username}
          userProfileUrl={userProfileUrl}
          logo={logo}
          myKeywords={myKeywords}
          collectedKeywords={collectedKeywords}
          metPersonNum={metPersonNum}
          bingoCount={bingoCount}
          bingoMissionCount={bingoMissionCount}
          newBingoFound={newBingoFound}
        />
        <ExchangeInput
          opponentId={opponentId}
          onOpponentIdChange={e => setOpponentId(e.target.value)}
          onExchange={handleExchange}
          userId={userId}
        />
        <BingoBoard
          bingoBoard={bingoBoard}
          animatedCells={animatedCells}
          newBingoCells={newBingoCells}
          completedLines={completedLines}
          newBingoFound={newBingoFound}
          getCellStyle={getCellStyle}
          isCellInCompletedLine={isCellInCompletedLine}
          getCellsInLine={getCellsInLine}
        />
        <ExchangeHistory
          showHistory={showHistory}
          exchangeHistory={exchangeHistory}
          onToggleShowHistory={() => setShowHistory(!showHistory)}
        />
        <style>{`
          ${animations.drawLine}
          ${animations.fall}
        `}</style>
        
        <Dialog open={showReviewModal} onClose={() => setShowReviewModal(false)}>
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
              }}
            >
              닫기
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (userId && reviewStars !== null) {
                  try {
                    await submitReview(userId, reviewStars, reviewText);
                    showAlert("소중한 리뷰 감사합니다!");
                    localStorage.setItem("hideReviewModal", "true"); // 유저 리뷰 get하는 함수 사용하면 삭제
                    setHideReviewModal(true); // 유저 리뷰 get하는 함수 사용하면 삭제
                  } catch (err) {
                    showAlert("리뷰 제출 중 문제가 발생했습니다.", 'error');
                  }
                } else {
                  showAlert("별점을 입력해주세요.", 'warning');
                }
              }}
            >
              제출
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={showAllBingoModal} onClose={() => setShowAllBingoModal(false)}>
          <DialogTitle>빙고 완성 🎉</DialogTitle>
          <DialogContent>
            <Typography>축하합니다! 빙고를 완성했습니다.</Typography>
            <Typography>Devfactory 부스로 오셔서 소정의 선물 받아가세요!</Typography>
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
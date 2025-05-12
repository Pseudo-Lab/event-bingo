import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Grid, Paper, Chip, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, Divider, Card, CardContent, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { styled } from "@mui/system";
import PersonIcon from '@mui/icons-material/Person';
import {
  getBingoBoard,
  updateBingoBoard,
  createBingoBoard,
  getUserInteractionCount,
  getSelectedWords,
  getUser,
  singUpUser,
  createUserBingoInteraction,
  getUserLatestInteraction,
  getUserName,
} from "../../api/bingo_api.ts";
import logo from '../../assets/pseudo_lab_logo.png';
import bingoKeywords from '../../data/bingo-keywords.json';

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
  person: string;
  given: string[];
  received: string;
}

const cellValues = bingoKeywords.keywords;

const GradientContainer = styled(Container)(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #FFE5EC, #E0F7FA)",
  padding: 0,
  textAlign: "center",
}));

const BingoGame = () => {
  const [username, setUsername] = useState('사용자 이름');
  const [userId, setUserId] = useState<string>('');
  const [myKeywords, setMyKeywords] = useState<string[]>([]);
  const shuffleArray = (array: string[]) => {
    return [...array].sort(() => Math.random() - 0.5);
  };
  const [bingoBoard, setBingoBoard] = useState<BingoCell[]>(() => {
    const shuffledValues = shuffleArray(cellValues);
    return Array(25).fill(null).map((_, i) => ({
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
  const bingoMissionCount = 3;
  const keywordCount = 3;
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [collectedKeywords, setCollectedKeywords] = useState(0);
  const [metPersonNum, setMetPersonNum] = useState(0);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeRecord[]>([
    { id: 1, date: '2023.04.10', person: '김데이터 연구원', given: ['머신러닝 모델'], received: '데이터파이프라인 활용' },
    { id: 2, date: '2023.04.05', person: '이백사 교수', given: ['빅데이터 분석'], received: '데이터 마이닝' },
    { id: 3, date: '2023.03.28', person: '정분석가 이사', given: ['알고리즘 개선'], received: '인식 최적화' },
    { id: 4, date: '2023.04.02', person: '박빅데이터 책임', given: ['빅데이터 분석'], received: '데이터 흐름 최적화' }
  ]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [lastSelectedCell, setLastSelectedCell] = useState<number | null>(null);
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
  const [showAllBingoModal, setShowAllBingoModal] = useState(false);

  // 셀 노트 가져오기
  function getCellNote(index: number): string | undefined {
    return undefined;
  }

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
        } catch (error) {
          console.error("Error loading user board:", error);
        }
      }
      if (userName) setUsername(userName);
    };

    if (bingoCount >= bingoMissionCount) {
      setShowAllBingoModal(true);
    }
  
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
          // TODO: 교환한 User ID 가져와서 보여주기
          showAlert(`"${newlyUpdatedValues.join('", "')}" 키워드를 공유 받았습니다.`);
        }
      } catch (err) {
        console.error("Error refreshing bingo board:", err);
      }
    }, 5000);
  
    return () => clearInterval(interval);
  }, [userId, bingoBoard]);

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
      console.log('Current User ID', storedId);
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
      await Promise.all(
        myKeywords.map((myKeyword) =>
          createUserBingoInteraction(myKeyword, parseInt(myId), parseInt(opponentId))
        )
      );
      if (result) {
        showAlert(`"User ${opponentId}"에게 키워드를 성공적으로 전송했습니다!`);
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
    
    // Animation styles - only apply to new bingo cells
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

  // 기록 필터 변경 핸들러
  const handleHistoryFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: string,
  ) => {
    if (newFilter !== null) {
      setHistoryFilter(newFilter);
    }
  };

  return (
    <GradientContainer>
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        {/* 초기 키워드 설정 모달 */}
        <Dialog 
          open={initialSetupOpen} 
          fullWidth 
          maxWidth="sm"
          disableEscapeKeyDown
          onClose={(event, reason) => {
            if (reason !== 'backdropClick') {
              setInitialSetupOpen(false);
            }
          }}
        >
          <DialogTitle>빙고 게임 시작하기</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" mb={1}>나의 키워드를 선택하세요 ({keywordCount}개):</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {cellValues.map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword}
                    clickable
                    color={selectedInitialKeywords.includes(keyword) ? "primary" : "default"}
                    onClick={() => toggleInitialKeyword(keyword)}
                    variant={selectedInitialKeywords.includes(keyword) ? "filled" : "outlined"}
                  />
                ))}
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedInitialKeywords.length}/{keywordCount} 선택됨
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleInitialSetup}
              variant="contained"
              color="primary"
              disabled={selectedInitialKeywords.length !== keywordCount}
            >
              게임 시작하기
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* 헤더 섹션 */}
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box component="img" src={logo} alt="Logo" sx={{ width: 24, height: 24, mr: 1 }} />
              <Typography variant="body1" fontWeight="bold">키워드 교환 빙고</Typography>
            </Box>
            <Button sx={{ fontSize: 15, color: 'primary.main' }}>{username}</Button>
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
                <Typography variant="h6" fontWeight="medium">{collectedKeywords}/25</Typography>
              </Paper>  
            </Grid>
            <Grid item xs={6}>
              <Paper elevation={0} sx={{ bgcolor: 'grey.200', p: 1, borderRadius: 1, height: '100%' }}>
                <Box sx={{ minHeight: 50 }}>
                  <Typography variant="caption" color="text.secondary">만난 PseudoCon<br></br>참가자</Typography>
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
            {bingoBoard.map((cell, index) => (
              <Grid item xs={2.4} sm={2.4} key={cell.id}>
                <Paper
                  elevation={cell.status ? (isCellInCompletedLine(index) ? 3 : 1) : 0}
                  sx={getCellStyle(index)}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: 'clamp(0.45rem, 2.7vw, 0.75rem)', 
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
          
          {/* 빙고 라인 애니메이션 - 실선 */}
          {newBingoFound && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              {completedLines.map((line, lineIndex) => {
                // 라인의 시작점과 끝점 계산 - 박스의 중앙에서 시작하고 끝나도록 수정
                let startX, startY, endX, endY;
                const cellsInLine = getCellsInLine(line.type, line.index);

                // Only draw line if *all* cells in this line are part of new bingo cells
                const isNewLine = cellsInLine.every(cell => newBingoCells.includes(cell));
                
                if (!isNewLine) return null;
                
                if (line.type === 'row') {
                  // 열 라인: 왼쪽 중앙에서 오른쪽 중앙으로
                  startX = '2%';  // 첫 번째 셀의 중앙 x좌표
                  startY = `${line.index * 20 + 10}%`;  // 행의 중앙 y좌표
                  endX = '98%';    // 마지막 셀의 중앙 x좌표
                  endY = `${line.index * 20 + 10}%`;  // 행의 중앙 y좌표
                } else if (line.type === 'col') {
                  // 행 라인: 상단 중앙에서 하단 중앙으로
                  startX = `${line.index * 20 + 10}%`;  // 열의 중앙 x좌표
                  startY = '3%';  // 첫 번째 셀의 중앙 y좌표
                  endX = `${line.index * 20 + 10}%`;  // 열의 중앙 x좌표
                  endY = '98%';    // 마지막 셀의 중앙 y좌표
                } else if (line.type === 'diagonal' && line.index === 1) {
                  // 주 대각선: 좌상단 셀 중앙에서 우하단 셀 중앙으로
                  startX = '2%';
                  startY = '3%';
                  endX = '97%';
                  endY = '97%';
                } else if (line.type === 'diagonal' && line.index === 2) {
                  // 부 대각선: 우상단 셀 중앙에서 좌하단 셀 중앙으로
                  startX = '97%';
                  startY = '3%';
                  endX = '2%';
                  endY = '98%';
                }
                
                // 애니메이션 중인 라인만 표시
                if (animatedCells.length > 0 && getCellsInLine(line.type, line.index).some(cell => animatedCells.includes(cell))) {
                  return (
                    <svg
                      key={`line-${lineIndex}`}
                      width="100%"
                      height="100%"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 5
                      }}
                    >
                      <line
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke="red"
                        strokeWidth="5"
                        strokeLinecap="round"
                        style={{
                          strokeDasharray: '1000',
                          strokeDashoffset: '1000',
                          animation: 'drawLine 1s forwards'
                        }}
                      />
                    </svg>
                  );
                }
                return null;
              })}
            </Box>
          )}
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
        </Box>
        
        {/* 교환 기록 */}
        {showHistory && (
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" fontWeight="bold">키워드 교환 기록</Typography>
              <ToggleButtonGroup
                value={historyFilter}
                exclusive
                onChange={handleHistoryFilterChange}
                size="small"
              >
                <ToggleButton value="all">
                  <Typography variant="caption">전체</Typography>
                </ToggleButton>
                <ToggleButton value="recent">
                  <Typography variant="caption">최근 추가</Typography>
                </ToggleButton>
                <ToggleButton value="person">
                  <Typography variant="caption">사람별</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {exchangeHistory.map(history => (
                <Box key={history.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography color="warning.main" fontWeight="medium">{history.person}</Typography>
                    <Typography variant="caption" color="text.secondary">{history.date}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={history.given} 
                      size="small" 
                      variant="outlined"
                      sx={{ mr: 1, bgcolor: 'grey.100' }} 
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mx: 0.5 }}>→</Typography>
                    <Chip 
                      label={history.received} 
                      size="small" 
                      variant="outlined"
                      sx={{ bgcolor: 'grey.100' }} 
                    />
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

        <Dialog open={showAllBingoModal} onClose={() => setShowAllBingoModal(false)}>
          <DialogTitle>빙고 완성 🎉</DialogTitle>
          <DialogContent>
            <Typography>축하합니다!</Typography>
            <Typography>모든 빙고를 완성했습니다.</Typography>
            <Typography>DevFactory 부스로 오시면 소정의 상품을 드립니다.</Typography>
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
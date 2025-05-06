import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Grid, Paper, Chip, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, Divider, Card, CardContent, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  getBingoBoard,
  getSelectedWords,
  updateBingoBoard,
  createBingoBoard,
  getUser,
  singUpUser,
  createUserBingoInteraction,
  getUserLatestInteraction,
  getUserName,
} from "../../api/bingo_api.ts";
import logo from '../../assets/pseudo_lab_logo.png';

// Define proper interfaces
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

interface ExchangeRecord {
  id: number;
  date: string;
  person: string;
  given: string[];
  received: string;
}

const cellValues = [
  '머신러닝 모델', '딥러닝 프레임워크', '자연어 처리', '컴퓨터 비전', '강화학습',
  '데이터 시각화', '빅데이터 분석', '클라우드 컴퓨팅', '데이터베이스', '분산 시스템',
  '파이썬과 최적화', '모델 배포', '알고리즘 개선', 'DevOps', '마이크로서비스',
  '테스트 자동화', 'CI/CD', '코드 품질', '기술 스택 전환', '성능 최적화',
  '인공지능 구축', '데이터 파이프라인', '보안 최적화', 'API 설계', '프로젝트 관리'
];

const BingoGame = () => {
  const [username, setUsername] = useState('사용자 이름');
  const [userId, setUserId] = useState<string>();
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
  const [modalOpen, setModalOpen] = useState(false);
  const [opponentKeyword, setOpponentKeyword] = useState('');
  const [completedLines, setCompletedLines] = useState<CompletedLine[]>([]);
  const [bingoCount, setBingoCount] = useState(0);
  const bingoMissionCount = 3;
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [collectedKeywords, setCollectedKeywords] = useState(0);
  const [metExperts, setMetExperts] = useState(0);
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
  const [tempUsername, setTempUsername] = useState('사용자 이름');
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

  // 기본 셀 값 생성 함수
  function getDefaultCellValue(index: number): string {
    return cellValues[index];
  }

  // 셀 노트 가져오기
  function getCellNote(index: number): string | undefined {
    return undefined;
  }

  useEffect(() => {
    const init = async () => {
      const storedId = localStorage.getItem("myID");
      if (storedId) {
        try {
          const userId = storedId;
          setUserId(userId);
          const boardData = await getBingoBoard(userId);
          if (boardData && boardData.length > 0) {
            setBingoBoard(boardData);
            setInitialSetupOpen(false);
            const selectedKeywords = boardData
              .filter(cell => cell.status === 1)
              .map(cell => cell.value);

            setMyKeywords(selectedKeywords);
          }
          else {
            setInitialSetupOpen(true);
          }
        } catch (error) {
          console.error("Error loading user board:", error);
        }
      }
    };
  
    init();
  }, []);

  const initializeBoard = async (userId: string, selectedInitialKeywords: string[]) => {
    try {
      const boardData: {
        [key: string]: { value: string; status: number; selected: number };
      } = {};

      bingoBoard.forEach((item, index) => {
        return (boardData[index] = {
          value: item.value,
          status: selectedInitialKeywords.includes(item.value)
            ? 1
            : 0,
          selected: 0
        });
      });

      const result = await createBingoBoard(userId, boardData);
    } catch (error) {
      console.error("Failed to initialize bingo board:", error);
    }
  };

  // 첫 화면에서 키워드 선택 후 저장
  const handleInitialSetup = async () => {
    try {
      const testUserId = '1';
      localStorage.setItem("myID", testUserId);
      if (selectedInitialKeywords.length > 0) {
        setMyKeywords(selectedInitialKeywords);
      }
      setUsername(tempUsername);
      setInitialSetupOpen(false);
      showAlert('키워드가 설정되었습니다!');
      await initializeBoard(testUserId, selectedInitialKeywords);
    } catch (err) {
      console.error("Failed initial setup:", err);
    }
  };

  // 초기 키워드 선택 토글
  const toggleInitialKeyword = (keyword: string) => {
    if (selectedInitialKeywords.includes(keyword)) {
      setSelectedInitialKeywords(selectedInitialKeywords.filter(k => k !== keyword));
    } else {
      if (selectedInitialKeywords.length < 3) {
        setSelectedInitialKeywords([...selectedInitialKeywords, keyword]);
      } else {
        showAlert('최대 3개 키워드만 선택할 수 있습니다.');
      }
    }
  };

  // 모달 상태 관리
  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => {
    setModalOpen(false);
    setOpponentKeyword('');
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
        if (!bingoBoard[row * 5 + col].selected) {
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
        if (!bingoBoard[row * 5 + col].selected) {
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
      if (!bingoBoard[i * 5 + i].selected) {
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
      if (!bingoBoard[i * 5 + (4 - i)].selected) {
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
  };

  // 알림 닫기 함수
  const handleCloseAlert = () => {
    setAlertOpen(false);
  };

  // 알림 표시 함수
  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertOpen(true);
    
    // 3초 후 자동으로 닫기
    setTimeout(() => {
      setAlertOpen(false);
    }, 3000);
  };

  // 키워드 교환 처리
  const handleExchange = () => {
    if (!opponentKeyword) return;
  
    // 상대방 키워드가 내 빙고판에 있는지 확인
    const boardItemIndex = bingoBoard.findIndex(item => item.value === opponentKeyword);
    
    if (boardItemIndex !== -1) {
      // 빙고판 업데이트
      const newBoard = [...bingoBoard];
      // newBoard[boardItemIndex].selected = true;
      newBoard[boardItemIndex].selected = 1;
      setBingoBoard(newBoard);
      setLastSelectedCell(boardItemIndex);
      
      // 키워드 교환 기록 추가
      const newExchangeHistory: ExchangeRecord[] = [
        {
          id: exchangeHistory.length + 1,
          date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.'),
          person: '새로운 교환자',
          given: myKeywords,
          received: opponentKeyword
        },
        ...exchangeHistory
      ];
      setExchangeHistory(newExchangeHistory);
      
      // 수집 키워드 수 증가
      setCollectedKeywords(collectedKeywords + 1);
      // 만난 사람 수 증가
      setMetExperts(collectedKeywords + 1);
      
      // 알림 표시
      showAlert(`"${opponentKeyword}" 키워드를 찾았습니다!`);
    } else {
      // 키워드가 없는 경우 알림
      showAlert(`"${opponentKeyword}" 키워드를 빙고판에서 찾을 수 없습니다.`);
    }
    
    handleCloseModal();
  };

  // 데모 목적으로 칸 토글
  const toggleCell = (index: number) => {
    const newBoard = [...bingoBoard];
    // newBoard[index].selected = !newBoard[index].selected;
    newBoard[index].selected = newBoard[index].selected === 1 ? 0 : 1;
    setBingoBoard(newBoard);
    setLastSelectedCell(index);

    if (newBoard[index].selected) {
      // 수집 키워드 수 증가
      setCollectedKeywords(collectedKeywords + 1);
      // 만난 사람 수 증가
      setMetExperts(collectedKeywords + 1);
    } else {
      // 수집 키워드 수 감소
      setCollectedKeywords(collectedKeywords - 1);
      // 만난 사람 수 감소
      setMetExperts(collectedKeywords - 1);
    }
    
    if (newBoard[index].selected) {
      showAlert(`Anonymous User에게 "${newBoard[index].value}" 키워드를 공유 받았습니다.`);
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
    const isMarked = bingoBoard[index].selected;
    const isInCompletedLine = isCellInCompletedLine(index);
    const isLastSelected = index === lastSelectedCell;
    const isNewBingoCell = newBingoCells.includes(index);
    
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
      border: '0.5px solid grey',
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
        '50%': { boxShadow: '0 0 0 8px rgba(76, 175, 80, 0)', transform: 'scale(1.05)' },
        '100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)', transform: 'scale(1)' }
      };
      baseStyle['@keyframes fadeBg'] = {
        '0%': { backgroundColor: '#FFF59D' },
        '100%': { backgroundColor: '#4CAF50' }
      };
      baseStyle.backgroundColor = '#FFF59D';
      baseStyle.border = '2px solid #4CAF50';
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
          border: '2px solid #2E7D32',
          color: 'white',
          fontWeight: 'bold',
          boxShadow: isLastSelected ? 3 : 1,
        };
      } else {
        // Regular selected cells
        return {
          ...baseStyle,
          bgcolor: '#FFF8E0',
          border: '2px #FF9E21 solid',
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
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography variant="body1" mb={1}>사용자 이름:</Typography>
            <TextField
              fullWidth
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="이름을 입력하세요"
              size="small"
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" mb={1}>나의 키워드를 선택하세요 (최대 3개):</Typography>
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
              {selectedInitialKeywords.length}/3 선택됨
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleInitialSetup}
            variant="contained"
            color="primary"
            disabled={selectedInitialKeywords.length === 0}
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
            <Typography variant="h6" fontWeight="bold">키워드 교환 빙고</Typography>
          </Box>
          <Box>
            <Typography fontWeight="bold">User ID: {userId}</Typography>
            <Button size="small" sx={{ color: 'primary.main' }}>{username}</Button>
          </Box>
        </Box>
        
        <Divider sx={{ my: 1.5 }} />
        
        {/* 키워드 태그 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={1}>나의 키워드</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {myKeywords.map((keyword, index) => (
              <Chip
                key={index}
                label={keyword}
                size="small"
                sx={{ bgcolor: 'primary.50', color: 'primary.main' }}
              />
            ))}
          </Box>
        </Box>
        
        {/* 수집 현황 */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Paper elevation={0} sx={{ bgcolor: 'grey.200', p: 1.5, borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">수집한 키워드</Typography>
              <Typography variant="h6" fontWeight="medium">{collectedKeywords}/25</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={0} sx={{ bgcolor: 'grey.200', p: 1.5, borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">만난 PseudoCon 참가자</Typography>
              <Typography variant="h6" fontWeight="medium">{metExperts}명</Typography>
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
      
      {/* 빙고 보드 */}
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Grid container spacing={1}>
          {bingoBoard.map((cell, index) => (
            <Grid item xs={2.4} key={cell.id}>
              <Paper
                elevation={cell.selected ? (isCellInCompletedLine(index) ? 3 : 1) : 0}
                onClick={() => toggleCell(index)}
                sx={getCellStyle(index)}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="caption" 
                    fontWeight="bold"
                    sx={{ 
                      display: 'block', 
                      mb: 0.5, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap', 
                      width: '100%',
                      color: cell.selected ? 
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
      
      {/* 키워드 교환 입력 섹션 */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
          키워드 교환 (ID 입력으로 변경 예정)
        </Typography>

        <Box sx={{ mb: 2, display: 'flex',  justifyContent: 'center', alignItems: 'center', gap: 1 }}>
          <Typography color="text.secondary">상대방 키워드</Typography>
          <TextField
            value={opponentKeyword}
            onChange={(e) => setOpponentKeyword(e.target.value)}
            placeholder="상대방의 키워드를 입력하세요"
            size="small"
          />
          <Button 
            variant="contained" 
            color="warning"
            onClick={handleExchange}
            sx={{ px: 3, width: '150px' }}
          >
            내 키워드 보내기
          </Button>
        </Box>
      </Paper>
      
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
      
      {/* 알림 */}
      <Snackbar 
        open={alertOpen} 
        autoHideDuration={3000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          {alertMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BingoGame;
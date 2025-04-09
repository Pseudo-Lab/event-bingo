import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Chip, 
  Button, 
  Modal, 
  TextField,
  LinearProgress,
  IconButton,
  Divider,
  Card,
  CardContent,
  Alert,
  Snackbar,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import StarIcon from '@mui/icons-material/Star';

// 빙고 셀 인터페이스
interface BingoCell {
  id: number;
  value: string;
  marked: boolean;
}

// 빙고 라인 인터페이스
interface CompletedLine {
  type: string;
  index: number;
}

const BingoGame: React.FC = () => {
  // 상태 관리
  const [username, setUsername] = useState<string>('사용자 이름');
  const [myKeywords, setMyKeywords] = useState<string[]>(['AI', 'Data Science', 'Data Engineering']);
  const [bingoBoard, setBingoBoard] = useState<BingoCell[]>(
    Array(25).fill(null).map((_, i) => ({
      id: i,
      value: `항목 ${i + 1}`,
      marked: false
    }))
  );
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [opponentKeyword, setOpponentKeyword] = useState<string>('');
  const [completedLines, setCompletedLines] = useState<CompletedLine[]>([]);
  const [bingoCount, setBingoCount] = useState<number>(0);
  const bingoMissionCount: number = 3;
  const [alertOpen, setAlertOpen] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');

  // 모달 상태 관리
  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedKeyword(null);
    setOpponentKeyword('');
  };

  // 빙고 라인 체크
  useEffect(() => {
    checkBingoLines();
  }, [bingoBoard]);

  // 빙고 라인 체크 함수
  const checkBingoLines = () => {
    const newCompletedLines: CompletedLine[] = [];
    let newBingoCount = 0;
    
    // 가로 줄 체크
    for (let row = 0; row < 5; row++) {
      const isRowComplete = Array(5).fill(null).every((_, col) => 
        bingoBoard[row * 5 + col].marked
      );
      
      if (isRowComplete) {
        newCompletedLines.push({ type: 'row', index: row });
        newBingoCount++;
      }
    }
    
    // 세로 줄 체크
    for (let col = 0; col < 5; col++) {
      const isColComplete = Array(5).fill(null).every((_, row) => 
        bingoBoard[row * 5 + col].marked
      );
      
      if (isColComplete) {
        newCompletedLines.push({ type: 'col', index: col });
        newBingoCount++;
      }
    }
    
    // 대각선 체크 (좌상단 -> 우하단)
    const isDiagonal1Complete = Array(5).fill(null).every((_, i) => 
      bingoBoard[i * 5 + i].marked
    );
    
    if (isDiagonal1Complete) {
      newCompletedLines.push({ type: 'diagonal', index: 1 });
      newBingoCount++;
    }
    
    // 대각선 체크 (우상단 -> 좌하단)
    const isDiagonal2Complete = Array(5).fill(null).every((_, i) => 
      bingoBoard[i * 5 + (4 - i)].marked
    );
    
    if (isDiagonal2Complete) {
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
  };

  // 키워드 교환 처리
  const handleExchange = () => {
    if (!selectedKeyword || !opponentKeyword) return;
  
    // 상대방 키워드가 내 빙고판에 있는지 확인
    const boardItemIndex = bingoBoard.findIndex(item => item.value === opponentKeyword);
    
    if (boardItemIndex !== -1) {
      // 빙고판 업데이트
      const newBoard = [...bingoBoard];
      newBoard[boardItemIndex].marked = true;
      setBingoBoard(newBoard);
      
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
    newBoard[index].marked = !newBoard[index].marked;
    setBingoBoard(newBoard);
    
    if (newBoard[index].marked) {
      showAlert(`"${newBoard[index].value}" 항목이 선택되었습니다.`);
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

  // 빙고 상태 표시 함수
  const getBingoStatus = () => {
    if (bingoCount >= bingoMissionCount) return "빙고 완성! 🎉";
    if (bingoCount > 0) return `${bingoCount}줄 빙고 달성 중`;
    return "아직 빙고 없음";
  };

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Bingo
          </Typography>
          <Typography variant="subtitle1" color="primary" fontWeight="medium">
            {username}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />
        
        {/* 나의 키워드 */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ mb: 2 }} variant="body2" color="text.secondary" gutterBottom>
            나의 키워드
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {myKeywords.map((keyword, index) => (
              <Chip 
                key={index} 
                label={keyword} 
                color="primary" 
                variant="outlined" 
                size="small"
              />
            ))}
          </Box>
        </Box>

        {/* 빙고 상태 */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              빙고 상태:
            </Typography>
            <Typography 
              variant="body2"
              fontWeight="medium"
              color={bingoCount > 0 ? 'success.main' : 'text.secondary'}
            >
              {getBingoStatus()}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(bingoCount * (100/bingoMissionCount), 100)} 
            color="success" 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Paper>

      {/* 빙고판 */}
      <Card elevation={3}>
        <CardContent>
          <Grid container spacing={1}>
            {bingoBoard.map((cell, index) => (
              <Grid item xs={12/5} key={cell.id}>
                <Paper
                  elevation={1}
                  onClick={() => toggleCell(index)}
                  sx={{
                    height: 0,
                    paddingTop: '100%', // 정사각형 유지
                    position: 'relative',
                    cursor: 'pointer',
                    bgcolor: cell.marked ? 'primary.50' : 'background.default',
                    border: isCellInCompletedLine(index) 
                      ? '2px solid' 
                      : '1px solid',
                    borderColor: isCellInCompletedLine(index)
                      ? 'success.main'
                      : 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: cell.marked ? 'primary.100' : 'action.hover',
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" align="center" sx={{ fontSize: '0.7rem', mb: 0.5 }}>
                      {cell.value}
                    </Typography>
                    {cell.marked && (
                      <Box sx={{ color: isCellInCompletedLine(index) ? 'success.main' : 'primary.main' }}>
                        {isCellInCompletedLine(index) ? (
                          <StarIcon color="inherit" fontSize="small" />
                        ) : (
                          <CheckCircleOutlineIcon color="inherit" fontSize="small" />
                        )}
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* 키워드 교환 버튼 */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpenModal}
          sx={{ px: 4, py: 1 }}
        >
          키워드 교환하기
        </Button>
      </Box>

      {/* 키워드 교환 모달 */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        aria-labelledby="키워드-교환"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}>
          <Typography id="키워드-교환" variant="h6" component="h2" sx={{ mb: 3 }}>
            키워드 교환
          </Typography>
          
          {/* 내 키워드 선택 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              공유할 키워드 선택:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              {myKeywords.map((keyword, index) => (
                <Chip
                  key={index}
                  label={keyword}
                  color={selectedKeyword === keyword ? 'primary' : 'default'}
                  variant={selectedKeyword === keyword ? 'filled' : 'outlined'}
                  onClick={() => setSelectedKeyword(keyword)}
                  clickable
                />
              ))}
            </Box>
          </Box>
          
          {/* 상대방 키워드 입력 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              상대방 키워드:
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={opponentKeyword}
              onChange={(e) => setOpponentKeyword(e.target.value)}
              placeholder="상대방의 키워드를 입력하세요"
            />
          </Box>
          
          {/* 액션 버튼 */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" onClick={handleCloseModal}>
              취소
            </Button>
            <Button
              variant="contained"
              onClick={handleExchange}
              disabled={!selectedKeyword || !opponentKeyword}
            >
              교환하기
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* 알림 표시 */}
      <Snackbar
        open={alertOpen}
        autoHideDuration={3000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BingoGame;
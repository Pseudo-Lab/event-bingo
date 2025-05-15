import React from 'react';
import { Box, Typography, Button, Paper, Divider, Chip, Grid, LinearProgress } from '@mui/material';

interface BingoHeaderProps {
  username: string;
  userProfileUrl: string;
  logo: string;
  myKeywords: string[];
  collectedKeywords: number;
  metPersonNum: number;
  bingoCount: number;
  bingoMissionCount: number;
  newBingoFound: boolean;
}

const BingoHeader: React.FC<BingoHeaderProps> = ({
  username,
  userProfileUrl,
  logo,
  myKeywords,
  collectedKeywords,
  metPersonNum,
  bingoCount,
  bingoMissionCount,
  newBingoFound,
}) => (
  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box component="img" src={logo} alt="Logo" sx={{ width: 24, height: 24, mr: 1 }} />
        <Typography variant="body1" fontWeight="bold">키워드 교환 빙고</Typography>
      </Box>
      <Button sx={{ fontSize: 15, color: 'primary.main' }}>{username}</Button>
      <Button
        sx={{ fontSize: 15, color: 'primary.main' }}
        component="a"
        href={userProfileUrl}
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
          <Typography variant="h6" fontWeight="medium">{collectedKeywords}/25</Typography>
        </Paper>  
      </Grid>
      <Grid item xs={6}>
        <Paper elevation={0} sx={{ bgcolor: 'grey.200', p: 1, borderRadius: 1, height: '100%' }}>
          <Box sx={{ minHeight: 50 }}>
            <Typography variant="caption" color="text.secondary">만난 PseudoCon<br />참가자</Typography>
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
);

export default BingoHeader; 
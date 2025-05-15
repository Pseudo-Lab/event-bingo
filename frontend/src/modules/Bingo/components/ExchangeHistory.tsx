import React from 'react';
import { Paper, Box, Typography, Button, Chip, Link } from '@mui/material';
import { ExchangeRecord } from '../types';

interface ExchangeHistoryProps {
  showHistory: boolean;
  exchangeHistory: ExchangeRecord[];
  onToggleShowHistory: () => void;
}

const ExchangeHistory: React.FC<ExchangeHistoryProps> = ({ showHistory, exchangeHistory, onToggleShowHistory }) => (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
      <Button 
        variant="contained" 
        color="primary"
        onClick={onToggleShowHistory}
        sx={{ px: 3, width: '150px' }}
      >
        교환 기록 {showHistory ? '가리기' : '보기'}
      </Button>
    </Box>
    {showHistory && (
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" fontWeight="bold">키워드 교환 기록</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {exchangeHistory.map(history => (
            <Box key={history.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1, ml: 0.5}}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="warning.main" fontWeight="medium">{history.sendPerson}
                  <Link href={history.sendPersonProfileUrl} target="_blank" rel="noopener"></Link>
                </Typography>
                <Typography variant="caption" color="text.secondary">{history.date}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip 
                  label={history.given} 
                  size="small" 
                  variant="outlined"
                  sx={{ bgcolor: 'grey.100' }} 
                />
                <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>→</Typography>
                <Typography color="warning.main" fontWeight="medium">{history.receivePerson}
                  <Link href={history.receivePersonProfileUrl} target="_blank" rel="noopener"></Link>
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    )}
  </>
);

export default ExchangeHistory; 
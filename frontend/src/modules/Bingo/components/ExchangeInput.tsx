import React from 'react';
import { Paper, Box, Typography, TextField, Button } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

interface ExchangeInputProps {
  opponentId: string;
  onOpponentIdChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExchange: () => void;
  userId: string;
}

const ExchangeInput: React.FC<ExchangeInputProps> = ({ opponentId, onOpponentIdChange, onExchange, userId }) => (
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
        onChange={onOpponentIdChange}
        placeholder="상대방 ID 입력"
        size="small"
      />
      <Button 
        variant="contained" 
        color="warning"
        onClick={onExchange}
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
);

export default ExchangeInput; 
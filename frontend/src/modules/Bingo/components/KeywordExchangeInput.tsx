// modules/Bingo/components/KeywordExchangeInput.tsx
import { Box, Typography, TextField, Button } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

interface Props {
  userId: string;
  opponentId: string;
  onOpponentChange: (val: string) => void;
  onExchange: () => void;
}

const KeywordExchangeInput = ({ userId, opponentId, onOpponentChange, onExchange }: Props) => (
  <Box sx={{ p: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
      <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>키워드 교환</Typography>
      <Typography variant="body2" fontWeight="bold">(</Typography>
      <PersonIcon sx={{ fontSize: 15, color: 'primary.100' }} />
      <Typography variant="body2" fontWeight="bold">내 ID: {userId})</Typography>
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
      <TextField
        value={opponentId}
        onChange={(e) => onOpponentChange(e.target.value)}
        placeholder="상대방 ID 입력"
        size="small"
      />
      <Button
        variant="contained"
        color="warning"
        onClick={onExchange}
        sx={{ px: 1, width: '50%' }}
      >
        내 키워드 보내기
      </Button>
    </Box>
  </Box>
);

export default KeywordExchangeInput;

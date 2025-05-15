import { Box, Paper, Typography, Chip, Link } from '@mui/material';
import { ExchangeRecord } from './types';

interface Props {
  visible: boolean;
  onToggle: () => void;
  history: ExchangeRecord[];
}

const ExchangeHistory = ({ visible, onToggle, history }: Props) => (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
      <button onClick={onToggle}>
        {visible ? '교환 기록 가리기' : '교환 기록 보기'}
      </button>
    </Box>

    {visible && (
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={1.5}>키워드 교환 기록</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {history.map((record) => (
            <Box key={record.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="warning.main" fontWeight="medium">
                  {record.sendPerson}
                  <Link href={record.sendPersonProfileUrl} target="_blank" rel="noopener" />
                </Typography>
                <Typography variant="caption" color="text.secondary">{record.date}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  label={record.given}
                  size="small"
                  variant="outlined"
                  sx={{ bgcolor: 'grey.100' }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>→</Typography>
                <Typography color="warning.main" fontWeight="medium">
                  {record.receivePerson}
                  <Link href={record.receivePersonProfileUrl} target="_blank" rel="noopener" />
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

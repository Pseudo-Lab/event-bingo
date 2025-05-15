import { Box, Typography } from '@mui/material';
import GradientContainer from '../../../styles/GradientContainer';

interface Props {
  remainingTime: number;
}

const CountdownScreen = ({ remainingTime }: Props) => {
  const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
  const seconds = Math.floor((remainingTime / 1000) % 60);

  return (
    <GradientContainer>
      <Box sx={{ textAlign: 'center', mt: 10 }}>
        <Typography variant="h4" gutterBottom>빙고 카운트다운!</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4 }}>
          {[{ label: '일', value: days }, { label: '시간', value: hours }, { label: '분', value: minutes }, { label: '초', value: seconds }].map(({ label, value }) => (
            <Box key={label}>
              <Typography variant="h2" fontWeight="bold">{String(value).padStart(2, '0')}</Typography>
              <Typography variant="subtitle1">{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </GradientContainer>
  );
};

export default CountdownScreen;

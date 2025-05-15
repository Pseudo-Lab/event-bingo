import { Box, Typography, Button, Divider } from '@mui/material';
import logo from '../../../assets/pseudo_lab_logo.png';

interface Props {
  username: string;
  userId: string;
  userProfileUrl: string;
}

const BingoHeader: React.FC<Props> = ({ username, userId, userProfileUrl }) => (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box component="img" src={logo} alt="Logo" sx={{ width: 24, height: 24, mr: 1 }} />
        <Typography variant="body1" fontWeight="bold">키워드 교환 빙고</Typography>
      </Box>
      <Button sx={{ fontSize: 15, color: 'primary.main' }} component="a" href={userProfileUrl} target="_blank">
        {username}
      </Button>
    </Box>
    <Divider sx={{ my: 1.5 }} />
  </>
);

export default BingoHeader;

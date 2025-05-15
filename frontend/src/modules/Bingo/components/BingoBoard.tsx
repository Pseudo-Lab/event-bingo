import { Box, Grid, Paper, Typography } from '@mui/material';
import { BingoCell } from './types';

interface Props {
  board: BingoCell[];
  getCellStyle: (index: number) => any;
  isCellInCompletedLine: (index: number) => boolean;
}

const BingoBoard = ({ board, getCellStyle, isCellInCompletedLine }: Props) => (
  <Box sx={{ mb: 2 }}>
    <Grid container spacing={0.5}>
      {board.map((cell, index) => (
        <Grid item xs={2.4} sm={2.4} key={cell.id}>
          <Paper
            elevation={cell.status ? (isCellInCompletedLine(index) ? 3 : 1) : 0}
            sx={getCellStyle(index)}
          >
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
                color: cell.status ? 'white' : 'text.primary'
              }}
            >
              {cell.value}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default BingoBoard;

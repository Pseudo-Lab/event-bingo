import React from 'react';
import { Grid, Paper, Box, Typography, Chip } from '@mui/material';
import { BingoCell, CompletedLine } from '../types';

interface BingoBoardProps {
  bingoBoard: BingoCell[];
  animatedCells: number[];
  newBingoCells: number[];
  completedLines: CompletedLine[];
  newBingoFound: boolean;
  getCellStyle: (index: number) => any;
  isCellInCompletedLine: (index: number) => boolean;
  getCellsInLine: (type: string, index: number) => number[];
}

const BingoBoard: React.FC<BingoBoardProps> = ({
  bingoBoard,
  animatedCells,
  newBingoCells,
  completedLines,
  newBingoFound,
  getCellStyle,
  isCellInCompletedLine,
  getCellsInLine,
}) => {
  return (
    <Box sx={{ mb: 2, position: 'relative' }}>
      <Grid container spacing={0.5}>
        {bingoBoard.map((cell, index) => (
          <Grid item xs={2.4} sm={2.4} key={cell.id}>
            <Paper
              elevation={cell.status ? (isCellInCompletedLine(index) ? 3 : 1) : 0}
              sx={getCellStyle(index)}
            >
              <Box sx={{ textAlign: 'center' }}>
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
                    color: cell.status
                      ? animatedCells.includes(index)
                        ? 'white'
                        : isCellInCompletedLine(index)
                        ? 'amber.800'
                        : 'primary.800'
                      : 'text.primary',
                  }}
                >
                  {cell.value}
                </Typography>
              </Box>
              {cell.note && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    position: 'absolute',
                    bottom: 4,
                    left: 4,
                    fontSize: '0.6rem',
                  }}
                >
                  {cell.note}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
      {/* Bingo line animation */}
      {newBingoFound && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {completedLines.map((line, lineIndex) => {
            let startX, startY, endX, endY;
            const cellsInLine = getCellsInLine(line.type, line.index);
            const isNewLine = cellsInLine.every(cell => newBingoCells.includes(cell));
            if (!isNewLine) return null;
            if (line.type === 'row') {
              startX = '2%';
              startY = `${line.index * 20 + 10}%`;
              endX = '98%';
              endY = `${line.index * 20 + 10}%`;
            } else if (line.type === 'col') {
              startX = `${line.index * 20 + 10}%`;
              startY = '3%';
              endX = `${line.index * 20 + 10}%`;
              endY = '98%';
            } else if (line.type === 'diagonal' && line.index === 1) {
              startX = '2%';
              startY = '3%';
              endX = '97%';
              endY = '97%';
            } else if (line.type === 'diagonal' && line.index === 2) {
              startX = '97%';
              startY = '3%';
              endX = '2%';
              endY = '98%';
            }
            if (
              animatedCells.length > 0 &&
              getCellsInLine(line.type, line.index).some(cell => animatedCells.includes(cell))
            ) {
              return (
                <svg
                  key={`line-${lineIndex}`}
                  width="100%"
                  height="100%"
                  style={{ position: 'absolute', top: 0, left: 0, zIndex: 5 }}
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
                      animation: 'drawLine 1s forwards',
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
  );
};

export default BingoBoard; 
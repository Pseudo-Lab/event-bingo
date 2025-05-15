import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Chip, Button } from '@mui/material';

interface InitialKeywordDialogProps {
  open: boolean;
  keywords: string[];
  selectedKeywords: string[];
  onToggle: (keyword: string) => void;
  onSave: () => void;
  onClose: () => void;
  keywordCount: number;
  logo: string;
}

const InitialKeywordDialog: React.FC<InitialKeywordDialogProps> = ({
  open,
  keywords,
  selectedKeywords,
  onToggle,
  onSave,
  onClose,
  keywordCount,
  logo,
}) => (
  <Dialog 
    open={open} 
    fullWidth 
    maxWidth="sm"
    disableEscapeKeyDown
    onClose={(_, reason) => {
      if (reason !== 'backdropClick') {
        onClose();
      }
    }}
  >
    <DialogTitle>빙고 게임 시작하기</DialogTitle>
    <DialogContent>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" mb={1}>나의 키워드를 선택하세요 ({keywordCount}개):</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {keywords.map((keyword, index) => (
            <Chip
              key={index}
              label={keyword}
              clickable
              color={selectedKeywords.includes(keyword) ? "primary" : "default"}
              onClick={() => onToggle(keyword)}
              variant={selectedKeywords.includes(keyword) ? "filled" : "outlined"}
            />
          ))}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {selectedKeywords.length}/{keywordCount} 선택됨
        </Typography>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button
        onClick={() => (window.location.href = "/")}
        startIcon={
          <Box
            component="img"
            src={logo}
            alt="Logo"
            sx={{ width: 20, height: 20 }}
          />
        }
        variant="outlined"
      >
        홈으로
      </Button>
      <Button 
        onClick={onSave}
        variant="contained"
        color="primary"
        disabled={selectedKeywords.length !== keywordCount}
      >
        게임 시작하기
      </Button>
    </DialogActions>
  </Dialog>
);

export default InitialKeywordDialog; 
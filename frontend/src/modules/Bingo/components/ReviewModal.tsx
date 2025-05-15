import { Dialog, DialogContent, DialogActions, Button, Typography, TextField, Rating, Box } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  stars: number | null;
  text: string;
  onChangeStars: (val: number | null) => void;
  onChangeText: (val: string) => void;
  onSubmit: () => void;
  onDismissForever: () => void;
}

const ReviewModal = ({
  open,
  onClose,
  stars,
  text,
  onChangeStars,
  onChangeText,
  onSubmit,
  onDismissForever
}: Props) => (
  <Dialog open={open} onClose={onClose}>
    <DialogContent>
      <Typography mb={2}>빙고 게임에 대한 간단한 피드백을 남겨주세요.</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Rating
          name="review-stars"
          value={stars}
          onChange={(_, newValue) => onChangeStars(newValue)}
          sx={{ fontSize: 30 }}
        />
      </Box>
      <TextField
        fullWidth
        multiline
        rows={3}
        placeholder="간단한 리뷰를 작성해주세요"
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
      />
    </DialogContent>
    <DialogActions>
      <Button variant="text" onClick={onDismissForever}>닫기</Button>
      <Button variant="contained" onClick={onSubmit}>제출</Button>
    </DialogActions>
  </Dialog>
);

export default ReviewModal;

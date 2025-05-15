import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
}

const AllBingoModal = ({ open, onClose }: Props) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>빙고 완성 🎉</DialogTitle>
    <DialogContent>
      <Typography>축하합니다! 빙고를 완성했습니다.</Typography>
      <Typography>Devfactory 부스로 오셔서 소정의 선물을 받아가세요!</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="primary">닫기</Button>
    </DialogActions>
  </Dialog>
);

export default AllBingoModal;

import { Container } from '@mui/material';
import { styled } from '@mui/system';

const GradientContainer = styled(Container)(() => ({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #FFE5EC, #E0F7FA)",
  padding: 0,
  textAlign: "center",
}));

export default GradientContainer;

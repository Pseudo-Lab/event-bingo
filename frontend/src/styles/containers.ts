import { styled } from "@mui/system";
import { Container } from '@mui/material';

export const GradientContainer = styled(Container)(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #FFE5EC, #E0F7FA)",
  padding: 0,
  textAlign: "center",
})); 
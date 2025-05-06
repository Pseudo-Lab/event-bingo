import {
  Container,
  Typography,
  Input,
  Button,
  Theme,
} from "@mui/material";
import { styled } from "@mui/system";
import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import { singUpUser, createBingoBoard, getBingoBoard } from "../../api/bingo_api";

const GradientContainer = styled(Container)(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #FFE5EC, #E0F7FA)",
  padding: theme.spacing(4),
  textAlign: "center",
}));

const StyledInput = styled(Input)({
  marginTop: "1rem",
  padding: "0.5rem 1rem",
  background: "white",
  borderRadius: "8px",
  width: "40%",
  fontSize: "1rem",
});

const Home = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem("myID");
    if (storedId) {
      setIsLoggedIn(true);
    }
  }, []);

  const handLogin = async () => {
    const result = await singUpUser(loginEmail);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    localStorage.setItem("myID", result.user_id);
    localStorage.setItem("myEmail", result.user_email);
    setIsLoggedIn(true);
    window.location.href = "/bingo";
  };

  const handleLogout = () => {
    localStorage.removeItem("myID");
    localStorage.removeItem("myEmail");
    setIsLoggedIn(false);
  };

  return (
    <GradientContainer>
      <Typography variant="h2" sx={{ fontWeight: "bold", marginBottom: "1rem" }}>
        빙고 네트워킹
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
        2025 PseudoCon
      </Typography>
      <Typography variant="h6" sx={{ marginBottom: "2rem", color: "#555" }}>
        05월 17일 | 21서울창업허브(공덕) 10층
      </Typography>
      {!isLoggedIn ? (
        <>
          <StyledInput
            placeholder="이메일을 입력하세요"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
          <Button
            sx={{ marginTop: "5px" }}
            onClick={async () => {
            if (loginEmail === "") {
              toast.error("이메일을 입력해주세요.");
              return;
            }
            await handLogin();
          }}>
            계정 생성 또는 로그인
          </Button>
        </>
      ) : (
        <>
          <Typography variant="h6" sx={{ fontWeight: "bold", marginTop: "1rem", color: "#333" }}>
            {loginEmail || localStorage.getItem("myEmail")}
          </Typography>
          <Button onClick={handleLogout} sx={{ marginTop: "5px" }}>
            로그아웃
          </Button>
        </>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </GradientContainer>
  );
};

export default Home;
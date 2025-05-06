import {
  Container,
  Typography,
  Input,
  Button,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { styled } from "@mui/system";
import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import { singUpUser } from "../../api/bingo_api";

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
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem("myID");
    if (storedId) {
      setIsLoggedIn(true);
    }
  }, []);

  const handLogin = async () => {
    if (!isAgreed) {
      toast.error("개인정보 처리 동의가 필요합니다.");
      return;
    }

    const result = await singUpUser(loginEmail);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    localStorage.setItem("myID", result.user_id);
    localStorage.setItem("myEmail", result.user_email);
    localStorage.setItem("myUserName", result.user_name);
    setIsLoggedIn(true);
    window.location.href = "/bingo";
  };

  const handleLogout = () => {
    localStorage.removeItem("myID");
    localStorage.removeItem("myEmail");
    localStorage.removeItem("myUserName");
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
        05월 17일 | 서울창업허브(공덕) 10층
      </Typography>
      {!isLoggedIn ? (
        <>
          <StyledInput
            placeholder="우모 가입 이메일을 입력하세요"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isAgreed}
                onChange={(e) => {
                  if (!isAgreed) setAgreeOpen(true);
                  else setIsAgreed(false);
                }}
              />
            }
            label="개인정보 처리 동의(필수)"
            sx={{ mt: 1 }}
          />
          <Button
            sx={{ marginTop: "5px" }}
            onClick={handLogin}
            disabled={!isAgreed || loginEmail === ""}
          >
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

      {/* 개인정보 처리 동의 모달 */}
      <Dialog open={agreeOpen} onClose={() => setAgreeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>개인정보 처리 동의서</DialogTitle>
        <DialogContent dividers>
      <Typography gutterBottom>
        <strong>1. 개인정보 수집·이용 및 제3자 제공 동의</strong>
      </Typography>
      <Typography gutterBottom>
        devFactory 팀의 빙고 게임 운영을 위해 아래와 같이 개인정보를 처리합니다.
      </Typography>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', marginBottom: '1rem' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '8px', background: '#f5f5f5' }}>구분</th>
            <th style={{ border: '1px solid #ccc', padding: '8px', background: '#f5f5f5' }}>내용</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>수집 목적</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>빙고 게임 참가자 식별, 결과 분석 및 이벤트 운영</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>수집 항목</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>이름, 이메일, 빙고 키워드 선택 기록, 빙고 키워드 교환 이력</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>보유 기간</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>이벤트 종료 후 3개월</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>보안 조치</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>데이터 전송 시 HTTPS 암호화, 접근 권한 제한</td>
          </tr>
        </tbody>
      </table>

      <Typography variant="body2" color="text.secondary">
        ※ 귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있으나, 동의 거부 시 빙고 게임 서비스 이용이 제한될 수 있습니다.
      </Typography>
    </DialogContent>
        <DialogActions>
          <Button onClick={() => setAgreeOpen(false)} color="error">
            동의 안함
          </Button>
          <Button
            onClick={() => {
              setIsAgreed(true);
              setAgreeOpen(false);
            }}
            color="primary"
          >
            동의함
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer position="top-right" autoClose={3000} />
    </GradientContainer>
  );
};

export default Home;
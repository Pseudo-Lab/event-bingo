import {
  Box,
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
  Snackbar,
  Alert,
  Link,
} from "@mui/material";
import { styled } from "@mui/system";
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { singUpUser, newSingUpUser } from "../../api/bingo_api";
import { bingoConfig } from '../../config/bingoConfig.ts';

const GradientContainer = styled(Container)(({ theme }) => ({
  minHeight: "70vh",
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
  width: "90%",
  fontSize: "1rem",
});

const Home = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<'error' | 'success'>('error');
  const [loginErrorCount, setLoginErrorCount] = useState(0);
  const [newLoginModal, setNewLoginModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const conferenceInfoPage = bingoConfig.conferenceInfoPage;

  const navigate = useNavigate();

  useEffect(() => {
    const storedId = localStorage.getItem("myID");
    if (storedId) {
      setIsLoggedIn(true);
    }
  }, []);

  const handLogin = async () => {
    if (!isAgreed) {
      setAlertMessage("개인정보 처리 동의가 필요합니다.");
      setAlertSeverity("error");
      setAlertOpen(true);
      return;
    }
    
    const result = await singUpUser(loginEmail);
    if (!result.ok) {
      setAlertMessage(result.message);
      setAlertSeverity("error");
      setAlertOpen(true);
      // 못 찾는 경우 가입
      setLoginErrorCount(prev => prev + 1)
      return;
    }

    localStorage.setItem("myID", result.user_id);
    localStorage.setItem("myEmail", result.user_email);
    localStorage.setItem("myUserName", result.user_name);
    setIsLoggedIn(true);
    window.location.href = "/bingo";
  };

  const handleNewSingupModal = () => {
    setNewLoginModal(true);
  }

  const handleNewSignup = async () => {
    if (!newUserName || !newUserEmail) {
      setAlertMessage("이름과 이메일을 모두 입력해주세요.");
      setAlertSeverity("error");
      setAlertOpen(true);
      return;
    }
  
    const result = await newSingUpUser(newUserEmail, newUserName);
    if (!result.ok) {
      setAlertMessage(result.message || "가입에 실패했습니다.");
      setAlertSeverity("error");
      setAlertOpen(true);
      return;
    }
  
    localStorage.setItem("myID", result.user_id);
    localStorage.setItem("myEmail", result.user_email);
    localStorage.setItem("myUserName", result.user_name);
    setIsLoggedIn(true);
    setNewLoginModal(false);
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
      <Typography variant="h3" sx={{ fontWeight: "bold", marginBottom: "1rem" }}>
        빙고 네트워킹 
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
        2025 PseudoCon
      </Typography>
      <Typography variant="h6" sx={{ marginBottom: "1rem", color: "#555" }}>
        05월 17일 | 서울창업허브(공덕)
      </Typography>
      <Typography>
        <Link
          href={conferenceInfoPage}
          target="_blank" 
          rel="noopener"
        >수도콘 행사 페이지(우모)</Link>
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
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: "5px" }}>
            <Button
              variant="contained"
              sx={{ marginRight: '10px', backgroundColor: '#698BFF' }}
              onClick={handLogin}
              disabled={!isAgreed || loginEmail === ""}
            >
              계정 생성 또는 로그인
            </Button>
            <Button
              variant="contained"
              sx={{
                backgroundColor: 'rgba(243, 145, 59, 1)',
                '&:hover': {
                  backgroundColor: 'rgba(243, 145, 59, 1)',
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(243, 145, 59, 0.5)',
                },
                '&:focus': {
                  outline: 'none',
                },
                '&:active': {
                  backgroundColor: '#d46a0d',
                },
              }}
              onClick={handleNewSingupModal}
              disabled={!isAgreed}
              >
              비회원로그인
            </Button>
          </Box>
        </>
      ) : (
        <>
          <Typography variant="h6" sx={{ fontWeight: "bold", marginTop: "1rem", color: "#333" }}>
            {loginEmail || localStorage.getItem("myEmail")}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: "5px" }}>
            <Button variant="contained" onClick={handleLogout} sx={{ marginRight: "10px", backgroundColor: '#698BFF' }}>
              로그아웃
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/bingo')}
            >
              빙고로 이동
            </Button>
          </Box>
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
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>이름, 이메일, 빙고 키워드 교환 이력</td>
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

      <Dialog open={newLoginModal} onClose={() => setNewLoginModal(false)} maxWidth="sm">
        <DialogTitle>비회원로그인</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            우모 이메일을 찾을 수 없는 경우에만 이용해주세요.
          </Typography>
          <StyledInput
            placeholder="이름"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            fullWidth
          />
          <StyledInput
            placeholder="이메일"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLoginModal(false)}>
            닫기
          </Button>
          <Button onClick={handleNewSignup} variant="contained" color="primary">
            로그인
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alertOpen}
        autoHideDuration={8000}
        onClose={() => setAlertOpen(false)}
      >
        <Alert onClose={() => setAlertOpen(false)} severity={alertSeverity} sx={{ width: '100%', textAlign: 'left' }}>
          {alertMessage.split('\n').map((line, idx) => (
            <span key={idx}>
              {line}
              <br />
            </span>
          ))}
        </Alert>
      </Snackbar>
    </GradientContainer>
  );
};

export default Home;
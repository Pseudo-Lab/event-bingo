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
import config from '../../config/settings.json';

const GradientContainer = styled(Container)(({ theme }) => ({
  minHeight: "75vh",
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
  const [newLoginModal, setNewLoginModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");

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
      return;
    }

    localStorage.setItem("myID", result.user_id);
    localStorage.setItem("myEmail", result.user_email);
    localStorage.setItem("myUserName", result.user_name);
    setIsLoggedIn(true);
    window.location.href = "/bingo";
  };

  const handleNewSingupModal = () => {
    setNewUserEmail(loginEmail);
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
    // localStorage.removeItem("hideReviewModal");
    setIsLoggedIn(false);
  };

  return (
    <GradientContainer>
      <Typography variant="h3" sx={{ fontWeight: "bold", marginBottom: "1rem" }}>
        {config.title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
        {config.subTitle}
      </Typography>
      <Typography variant="h6" sx={{ marginBottom: "1rem", color: "#555" }}>
        {config.date} | {config.place}
      </Typography>
      {!isLoggedIn ? (
        <>
          <StyledInput
            placeholder="이메일을 입력하세요"
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
              disabled={!isAgreed || loginEmail === ""}
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
      <Dialog open={agreeOpen} onClose={() => setAgreeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>[필수] 개인정보 수집 및 이용 동의서</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            <strong>{config.host}</strong>는 본 행사 운영 및 네트워킹 서비스 제공을 위해 아래와 같이 개인정보를 수집 및 이용합니다.
          </Typography>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            ■ 수집 항목
          </Typography>
          <Typography variant="body2" gutterBottom>
            이름, 이메일 주소, 키워드 선택 내역, 후기 및 별점, 빙고 보드 구성 정보, 키워드 교환 및 상호작용 기록
          </Typography>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            ■ 수집 목적
          </Typography>
          <Typography variant="body2" gutterBottom>
            - 행사 참가자 식별 및 빙고 서비스 제공<br />
            - 키워드 기반 매칭 및 네트워킹 기능 제공<br />
            - 후기 및 참여 내역 기반 통계 분석<br />
            - 이벤트 참여 확인 및 기념품 지급<br />
            - 추후 행사 기획 및 운영 개선에 활용
          </Typography>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            ■ 보유 및 이용 기간
          </Typography>
          <Typography variant="body2" gutterBottom>
            수집일로부터 <strong>최대 5년</strong>간 보관 또는 이용 목적 달성 시까지 보유하며,
            보유 기간 경과 또는 참가자 요청 시 <strong>즉시 파기</strong>합니다.
          </Typography>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            ■ 귀하의 권리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            귀하는 개인정보 수집 및 이용에 대한 동의를 거부할 수 있습니다.
            다만, <strong>본 동의는 빙고 서비스 이용을 위한 필수 사항</strong>으로,
            동의하지 않을 경우 <strong>빙고 서비스 이용이 제한</strong>될 수 있습니다.
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
            이메일을 찾을 수 없는 경우에만 이용해주세요.
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
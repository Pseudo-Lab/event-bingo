import {
  Box,
  Container,
  Typography,
  Input,
  Button,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import { styled } from "@mui/system";
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { newSingUpUser } from "../../api/bingo_api";
import config from '../../config/settings.json';
import ConsentDialog from './ConsentDialog';

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
    
    const result = await newSingUpUser(loginEmail, newUserName);
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

  const handleLogout = () => {
    localStorage.removeItem("myID");
    localStorage.removeItem("myEmail");
    localStorage.removeItem("myUserName");
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
            placeholder="이름을 입력하세요"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
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
              로그인
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
        <ConsentDialog host={config.host} />
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
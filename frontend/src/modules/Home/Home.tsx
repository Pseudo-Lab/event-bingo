import {
  Box,
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
import { BackgroundContainer } from './BackgroundContainter';

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
    window.location.href = "/business-experimentation2025";
  };

  const handleLogout = () => {
    localStorage.removeItem("myID");
    localStorage.removeItem("myEmail");
    localStorage.removeItem("myUserName");
    setIsLoggedIn(false);
  };

  return (
    <BackgroundContainer>
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%' }}>
      <Typography variant="h3" sx={{ fontWeight: "bold", marginBottom: "1rem", color: "whitesmoke" }}>
        {config.title}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: "bold", marginBottom: "1rem", color: "whitesmoke" }}>
        {config.title2}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: "0.5rem", color: "whitesmoke" }}>
        {config.subTitle}
      </Typography>
      <Typography variant="h6" sx={{ marginBottom: "1rem", color: "whitesmoke" }}>
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
                sx={{ color: "whitesmoke" }}
              />
            }
            label="개인정보 처리 동의(필수)"
            sx={{ mt: 1, color: "whitesmoke" }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: "5px" }}>
            <Button
              variant="contained"
              sx={{ 
                marginRight: '10px',
                backgroundColor: 'primary',
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(105, 139, 255, 0.4)',
                  color: '#eee',
                },
              }}
              onClick={handLogin}
              disabled={!isAgreed || loginEmail === ""}
            >
              로그인
            </Button>
          </Box>
        </>
      ) : (
        <>
          <Typography variant="h6" sx={{ fontWeight: "bold", marginTop: "1rem", color: "whitesmoke" }}>
            {loginEmail || localStorage.getItem("myEmail")}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
            <Button
              variant="outlined"
              onClick={handleLogout}
              sx={{
                marginRight: "10px",
                color: '#fff',
                borderColor: '#fff',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: '#fff',
                },
              }}
            >
              로그아웃
            </Button>
            <Button 
              variant="contained" 
              onClick={() => navigate('/business-experimentation2025/bingo')}
              sx={{ backgroundColor: 'primary' }}
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
      </Box>
    </BackgroundContainer>
  );
};

export default Home;
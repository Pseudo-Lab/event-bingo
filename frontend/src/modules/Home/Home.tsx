import { Container, Typography, Theme, Input, Button } from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import { styled } from "@mui/system";
import { useState } from "react";
import { SHA256 } from "crypto-js";
import {
  singUpUser,
  createBingoBoard,
  getBingoBoard,
} from "../../api/bingo_api";
import {
  defafultBingoBoard,
  shuffleArray,
} from "../Bingo/components/DefaultBingoBoard";

const StyledContainer = styled(Container)({
  textAlign: "center",
  padding: (theme: Theme) => theme.spacing(4),
});

const InputBox = styled(Input)({
  marginTop: "1rem",
});

const Home = () => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const handLogin = async () => {
    console.log(loginId);
    const hash_password = SHA256(password).toString();

    const result = await singUpUser(loginId, hash_password);
    if (result.ok === false) {
      toast.error(result.message);
      localStorage.setItem("myWordList", "");
      localStorage.setItem("recentWords", "");
      localStorage.setItem("recentSendUser", "");
      localStorage.setItem("myID", "");
      return;
    }
    localStorage.setItem("myID", loginId);

    const bingoData = await getBingoBoard(loginId);
    if (bingoData.length == 0) {
      const boardData: {
        [key: string]: { value: string; status: number; selected: number };
      } = {};
      let bingoBoard = shuffleArray(defafultBingoBoard);
      bingoBoard.forEach((item, index) => {
        return (boardData[index] = {
          value: item.value,
          status: 0,
          selected: 0,
        });
      });
      await createBingoBoard(result.user_id, boardData);
    }

    window.location.href = "/bingo";
  };

  return (
    <StyledContainer>
      <Typography
        sx={{
          whiteSpace: "pre-wrap",
          fontSize: "5vw",
          textAlign: "left",
          fontFamily: "Spoqa Han Sans Neo",
          fontWeight: "bold",
        }}
      >
        빙고 네트워킹
      </Typography>

      <Typography
        sx={{
          whiteSpace: "pre-wrap",
          fontSize: "4vw",
          textAlign: "left",
          fontFamily: "Spoqa Han Sans Neo",
          fontWeight: "bold",
        }}
      >
        Sudo Pseudo Explore
      </Typography>

      <Typography
        sx={{
          whiteSpace: "pre-wrap",
          fontSize: "3.5vw",
          textAlign: "left",
          fontFamily: "Spoqa Han Sans Neo",
          fontWeight: "bold",
        }}
      >
        1st Grand Gathering
      </Typography>

      <Typography
        sx={{
          whiteSpace: "pre-wrap",
          fontSize: "3vw",
          textAlign: "left",
          fontFamily: "Spoqa Han Sans Neo",
          fontWeight: "bold",
        }}
      >
        2024.11.23
      </Typography>

      <br />

      <InputBox
        placeholder="아이디 입력"
        value={loginId}
        onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
          setLoginId(event.target.value);
        }}
      ></InputBox>

      <br />

      <InputBox
        placeholder="비밀번호 입력"
        value={password}
        type="Password"
        onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
          setPassword(event.target.value);
        }}
      ></InputBox>
      <br />
      <br />
      <Button
        onClick={async () => {
          if (loginId === "") {
            toast.error("아이디를 입력해주세요.");
            return;
          } else if (password === "") {
            toast.error("비밀번호를 입력해주세요.");
            return;
          } else {
            await handLogin();
          }
        }}
      >
        계정 생성 or 로그인
      </Button>
      <ToastContainer
        position="top-right" // 알람 위치 지정
        autoClose={3000} // 자동 off 시간
        hideProgressBar={false} // 진행시간바 숨김
        closeOnClick // 클릭으로 알람 닫기
        rtl={false} // 알림 좌우 반전
        pauseOnFocusLoss // 화면을 벗어나면 알람 정지
        draggable // 드래그 가능
        pauseOnHover // 마우스를 올리면 알람 정지
        theme="light"
        // limit={1} // 알람 개수 제한
      />
    </StyledContainer>
  );
};

export default Home;

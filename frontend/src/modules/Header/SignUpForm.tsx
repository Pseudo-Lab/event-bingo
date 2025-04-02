import { useState } from "react";
import {
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Link,
  Button,
} from "@mui/material";

interface SignUpProps {
  email: string; // 소셜 로그인으로 자동으로 추가될 수 있다
}

type LoginFormValues = {
  name: string;
  nickname: string;
  phoneNumber: string;
  email: string;
  isInfoUseAgree: boolean;
};

const SignUpForm = (signUpProps: SignUpProps) => {
  const [formValues, setFormValues] = useState<LoginFormValues>({
    name: "",
    nickname: "",
    phoneNumber: "",
    email: signUpProps.email || "", // 소셜 로그인 정보를 기본값으로 설정
    isInfoUseAgree: false,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = event.target;
    console.log(`${name} ${value} 변경`);
    setFormValues((prevState) => ({
      ...prevState,
      [name]: name === "isInfoUseAgree" ? checked : value,
    }));
  };

  return (
    <Box
      component="form"
      sx={{
        "& .MuiTextField-root": { m: 1, width: "50vw", textAlign: "center" },
      }}
    >
      <TextField
        required
        id="outlined-required"
        name="name"
        label="이름"
        placeholder="본명으로 입력"
        value={formValues.name}
        onChange={handleChange}
      />
      <br />

      <TextField
        required
        id="outlined-required"
        name="nickname"
        label="닉네임"
        placeholder="2글자 이상 알파벳, 한글, 숫자"
        value={formValues.nickname}
        onChange={handleChange}
      />
      <br />

      <TextField
        id="outlined"
        name="phoneNumber"
        variant="outlined"
        label="전화번호"
        placeholder="010XXXXXXXX"
        value={formValues.phoneNumber}
        onChange={handleChange}
      />
      <br />

      <TextField
        id="outlined"
        name="email"
        label="이메일"
        defaultValue=""
        placeholder="example@pseudolab.com"
        value={formValues.email}
        onChange={handleChange}
      />
      <br />

      <Box sx={{ marginTop: "3vw" }}>
        <FormControlLabel
          required
          control={
            <Checkbox
              name="isInfoUseAgree"
              checked={formValues.isInfoUseAgree}
              onChange={handleChange}
            />
          }
          label="개인 정보 수집 및 이용 동의"
        />
        <Link href="/">보기</Link>
      </Box>
      <br />

      <Button variant="outlined">가입 하기</Button>
    </Box>
  );
};

export default SignUpForm;

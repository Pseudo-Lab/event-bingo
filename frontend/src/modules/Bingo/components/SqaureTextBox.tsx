import { Container, Typography, Theme } from "@mui/material";
import { styled, keyframes } from "@mui/system";

const Wrapper = styled("div")<SquareTextProps>(
  ({ status, recent_list, value }) => ({
    border: "1px solid black",
    borderRadius: "3px",
    margin: "2px",
    fontSize: "10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: `${status === 1 ? "#FD7329" : "#3E64FF"}`,
    backgroundColor: "#f8f9fa",
    position: "relative",
    boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.16)",
    height: "60px",
    width: "60px",
    "@media (min-width: 768px)": {
      width: "200px",
      height: "200px",
      fontSize: "24px",
    },
    "&::after": recent_list.includes(value)
      ? {
          content: `"✔"`,
          position: "absolute",
          top: "0px",
          right: "1px",
          fontSize: "0.8em",
          fontWeight: "bold",
          color: "red",
        }
      : {},
  })
);

const BingoCircle = styled("div")({
  position: "absolute",
  width: "100%",
  height: "98%",
  borderRadius: "50%",
  animation: `${keyframes({
    "0%": {
      transform: "rotate(0deg); translate(0, 0)",
    },
    "33%": {
      transform: "rotate(360deg); translate(0.375rem, 0.375rem)",
    },
    "66%": {
      transform: "rotate(720deg); translate(-0.375rem, -0.375rem)",
    },
    "100%": {
      transform: "rotate(1080deg); translate(0, 0);",
    },
  })} 4s infinite`,
});

// Specific styles for each circle type
const FirstCircle = styled(BingoCircle)({
  boxShadow:
    "0 -1px 0 0 rgba(255, 64, 0, 0.25), 1px 0 0 0 rgba(255, 192, 0, 0.25), 0 1px 0 0 rgba(255, 192, 0, 0.25), -1px 0 0 0 rgba(255, 64, 0, 0.25), 1px -1px 0 0 rgba(255, 128, 0, 0.5), -1px 1px 0 0 rgba(255, 128, 0, 0.5), -1px -1px 0 0 rgba(255, 0, 0, 0.75), 1px 1px 0 0 rgba(255, 255, 0, 0.75)",
});

const SecondCircle = styled(BingoCircle)({
  animationDelay: "0.5s",
  boxShadow:
    "0 -1px 0 0 rgba(165, 181, 222, 0.25), 1px 0 0 0 rgba(225, 131, 194, 0.25), 0 1px 0 0 rgba(225, 131, 194, 0.25), -1px 0 0 0 rgba(165, 181, 222, 0.25), 1px -1px 0 0 rgba(195, 156, 208, 0.5), -1px 1px 0 0 rgba(195, 156, 208, 0.5), -1px -1px 0 0 rgba(135, 206, 235, 0.75), 1px 1px 0 0 rgba(255, 105, 180, 0.75)",
});

const ThirdCircle = styled(BingoCircle)({
  animationDelay: "0.8s",
  boxShadow:
    "0 -1px 0 0 rgba(0, 255, 255, 0.25), 1px 0 0 0 rgba(0, 255, 255, 0.25), 0 1px 0 0 rgba(0, 255, 255, 0.25), -1px 0 0 0 rgba(0, 255, 255, 0.25), 1px -1px 0 0 rgba(0, 255, 255, 0.5), -1px 1px 0 0 rgba(0, 255, 255, 0.5), -1px -1px 0 0 rgba(0, 255, 255, 0.75), 1px 1px 0 0 rgba(0, 255, 255, 0.75)",
});

type SquareTextProps = {
  value: string;
  status: number;
  recent_list: string[];
};

const SquareTextBox = (props: SquareTextProps) => {
  return (
    <Wrapper {...props}>
      {props.status === 1 && (
        <BingoCircle>
          <FirstCircle />
          <SecondCircle />
          <ThirdCircle />
        </BingoCircle>
      )}
      {props.value}
    </Wrapper>
  );
};

export default SquareTextBox;

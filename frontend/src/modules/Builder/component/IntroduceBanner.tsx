import { styled } from "@mui/system";
import pseudoLabLogo from "../../assets/pseudo_lab_logo.png";
import { Link } from "react-router-dom";

type LogoImageProps = {
  maxWidth: string;
  width: string;
  height: string;
  marginRight?: string;
};

const IntroduceBanner = (props: LogoImageProps) => {
  const LogoImageStyle = styled("img")({
    width: props.width,
    height: props.height,
    marginRight: props.marginRight, // 이미지와 텍스트 사이에 간격을 조절
  });

  return (
    <LogoImageStyle
      src="https://img.freepik.com/free-vector/flat-tropical-jungle-background_23-2148934758.jpg?size=626&ext=jpg"
      alt="PseudoLab Logo"
    ></LogoImageStyle>
  );
};

export default IntroduceBanner;

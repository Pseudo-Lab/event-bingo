import { Container, Typography, Theme } from "@mui/material";
import { styled } from "@mui/system";

const Wrapper = styled("div")({
    border: "1px solid black",
    borderRadius: "4px",
    marginTop: "0.5rem"
});


// const StyledButton = styled(Button)({
//   marginTop: (theme: Theme) => theme.spacing(2),
//   padding: (theme: Theme) => theme.spacing(1.5, 4),
//   fontSize: '1rem',
// });

type LongTextBoxProps = {
    text: string;
};

const LongTextBox = (props: LongTextBoxProps) => {
    return (
        <Wrapper>{props.text}</Wrapper>
        );
};

export default LongTextBox;

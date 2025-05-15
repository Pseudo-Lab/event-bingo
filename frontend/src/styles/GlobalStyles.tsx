import { GlobalStyles as MuiGlobalStyles } from "@mui/material";

const GlobalStyles = () => (
  <MuiGlobalStyles
    styles={(theme) => ({
      ".container-fluid": {
        width: "100%",
        paddingRight: theme.spacing(2),
        paddingLeft: theme.spacing(2),
        marginRight: "auto",
        marginLeft: "auto",
        maxWidth: 1370,
      },
    })}
  />
);

export default GlobalStyles;

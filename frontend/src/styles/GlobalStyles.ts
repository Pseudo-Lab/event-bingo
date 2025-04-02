import { withStyles, Theme } from "@mui/material";

const styles = (theme: Theme) => ({
  ".container-fluid": {
    width: "100%",
    paddingRight: theme.spacing(2),
    paddingLeft: theme.spacing(2),
    marginRight: "auto",
    marginLeft: "auto",
    maxWidth: 1370,
  },
});

function globalStyles() {
  return null;
}

export default withStyles(styles, { withTheme: true })(globalStyles);

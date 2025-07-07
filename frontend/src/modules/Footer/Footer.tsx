// import { Link } from "react-router-dom";
import { Box, Grid, Container, Typography } from "@mui/material";
import CustomLogo from "../../components/common/CustomLogo";
// import ExternalLink from "../../components/common/ExternalLink";

const Footer = () => {
  return (
    <Box
      sx={{
        py: 2,
        marginTop: "2rem",
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={1}>
          <Grid item xs={12} sm={12} md={12}>
            <CustomLogo
              maxWidth="30px"
              height="auto"
              marginRight="8px"
            />
          </Grid>
        </Grid>
        <Box mt={2}>
          <Typography variant="body2" color="inherit" align="center">
            Copyright © 2024 가짜연구소 DevFactory
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

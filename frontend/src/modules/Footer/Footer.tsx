// import { Link } from "react-router-dom";
import { Box, Grid, Container, Typography } from "@mui/material";
import PseudoLabLogo from "../../components/common/PseudoLabLogo";
import { LinkedIn, GitHub } from "@mui/icons-material";
import ExternalLink from "../../components/common/ExternalLink";

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
          <Grid item xs={12} sm={6} md={6}>
            <PseudoLabLogo
              maxWidth="100px"
              height="auto"
              marginRight="8px" // 이미지와 텍스트 사이에 간격을 조절
            />
          </Grid>
          <Grid item xs={12} sm={6} md={6} marginTop={4}>
            <ExternalLink href="https://www.linkedin.com/company/pseudolab">
              <LinkedIn />
            </ExternalLink>
            <ExternalLink href="https://github.com/Pseudo-Lab">
              <GitHub />
            </ExternalLink>
          </Grid>
        </Grid>
        <Box mt={3}>
          <Typography variant="body2" color="inherit" align="center">
            Copyright © {new Date().getFullYear()} 가짜연구소(Pseudo Lab)
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

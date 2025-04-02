import { useState } from "react";
import {
  Box,
  AppBar,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Button,
  Drawer,
  IconButton,
} from "@mui/material";
import { Menu, Close } from "@mui/icons-material";
import PseudoLabLogo from "../../components/common/PseudoLabLogo";
import UserProfile from "./UserProfile";
// import DiscordLoginButton from "../components/common/DiscordLoginButton";

interface Props {
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  window?: () => Window;
}

const drawerWidth = window.innerWidth * 0.7;
const navItems = [
  // { name: "커뮤니티", path: "/community", permission: "" },
  // { name: "빌더", path: "/builder", permission: "" },
  // { name: "러너", path: "/runner", permission: "" },
  { name: "빙고", path: "/bingo", permission: "" },
];

const Header = (props: Props) => {
  const { window } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const userProfileIcon = <UserProfile isLoggedin={false} imgSrc={""} />;

  const drawer = (
    <Box sx={{ textAlign: "center" }}>
      <IconButton onClick={handleDrawerToggle}>
        <Close />
      </IconButton>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton sx={{ textAlign: "center" }} href={item.path}>
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const container =
    window !== undefined ? () => window().document.body : undefined;
  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        component="nav"
        elevation={0}
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <Toolbar
          sx={{ color: "#0077A3", borderBottom: 1, borderColor: "divider" }}
        >
          <PseudoLabLogo maxWidth="5em" height="5em" />

          <Box
            marginLeft="20px"
            sx={{
              display: { xs: "none", sm: "block" },
            }}
          >
            {navItems.map((item) => (
              <Button
                key={item.name}
                sx={{ color: "#0077A3" }}
                href={item.path}
              >
                {item.name}
              </Button>
            ))}
          </Box>

          {/* Login Icon 과 User Profile Icon 양쪽을 가지는 컴포넌트 필요 */}
          {/* 로그인 상태가 아니라면 */}
          {/* <DiscordLoginButton /> */}
          {/* 로그인 상태라면 프로필 얼굴 */}
          <Box marginLeft="auto" marginRight="1em">
            {userProfileIcon}
          </Box>
          <Box>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: "none" } }}
            >
              <Menu />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <nav>
        <Drawer
          anchor="right"
          container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </nav>
    </Box>
  );
};

export default Header;

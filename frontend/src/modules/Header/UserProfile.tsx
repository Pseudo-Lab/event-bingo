import { Box, Avatar, IconButton, Modal, Typography } from "@mui/material";
import { Login } from "@mui/icons-material";
import { useState } from "react";
import DiscordLoginButton from "../../components/common/DiscordLoginButton";

interface ProfileProps {
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  isLoggedin: boolean;
  imgSrc: string;
}

const modalStyle = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "0px solid #000",
  boxShadow: 24,
  p: 4,
  textAlign: "center",
};

const UserProfile = (profileProps: ProfileProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState(profileProps.isLoggedin);
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const loginModal = (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >

      <Box sx={modalStyle}>
        {/* <DiscordLoginButton /> */}
        <Typography>
          준비중입니다
        </Typography>
      </Box>
    </Modal>
  );

  const handleClickProfile = () => {
    // TODO: 프로필 관련 메뉴 출력 (정보, 업적, 로그아웃 등...)
  };

  return (
    <Box>
      {/* {isLoggedIn ? (
        <IconButton size="medium" onClick={handleClickProfile}>
          <Avatar src="" />
        </IconButton>
      ) : (
        <IconButton size="medium" onClick={handleOpen}>
          <Login />
        </IconButton>
      )}
      {loginModal} */}
    </Box>
  );
};

export default UserProfile;

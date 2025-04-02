import { Card, CardContent, Box, IconButton, Typography } from "@mui/material";
import {
  VisibilityOutlined,
  ChatBubbleOutlineOutlined,
  FavoriteBorderOutlined,
} from "@mui/icons-material";
import type { BoardItemProps } from "../types/BoardTypes";
import { getCreatedDurationMessage } from "../../../utils/DateUtils";
import { useNavigate } from 'react-router-dom';


const BoardListItem = (itemProps: BoardItemProps) => {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/community/${itemProps.board_id}`, { state: itemProps }); // 경로 이동
  };

  const title = itemProps.title;
  const author = itemProps.author;
  const createdAt: number = itemProps.created_at;
  const createdMessage = getCreatedDurationMessage(new Date(createdAt), new Date(Date.now()));
  const viewCount = itemProps.view_count;
  const commentCount = itemProps.comment_count;
  const likeCount = itemProps.like_count;

  return (
    <Card sx={{
      width: "auto",
      height: "7rem",
      cursor: "pointer",
      transition: "transform 0.2s, box-shadow 0.2s",
      '&:hover': {
        transform: "scale(1.02)",
        boxShadow: 3,
      },
    }} onClick={handleClick}>
      <CardContent>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          by {author} {createdMessage}
        </Typography>
        <Box display="flex" justifyContent="flex-end">
          <Box display="flex" mr={1}>
            <VisibilityOutlined />
            <Box ml={1}>{viewCount}</Box>
          </Box>

          <Box display="flex" mr={1}>
            <ChatBubbleOutlineOutlined />
            <Box ml={1}>{commentCount}</Box>
          </Box>
          <Box display="flex">
            <FavoriteBorderOutlined />
            <Box ml={1}>{likeCount}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BoardListItem;

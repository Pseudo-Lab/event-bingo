import { ListItem, ListItemText } from "@mui/material";
import {
    FavoriteBorderOutlined,
} from "@mui/icons-material";
import type { CommentProps } from "../types/BoardTypes";
import { getCreatedDurationMessage } from "../../../utils/DateUtils";


const CommentListItem = (itemProps: CommentProps) => {
    const author = itemProps.author;
    const contents = itemProps.contents;
    const createdAt: number = itemProps.created_at;
    const createdMessage = getCreatedDurationMessage(new Date(createdAt), new Date(Date.now()));

    //const likeCount = itemProps.like_count;

    return (
        <ListItem>
            <ListItemText primary={contents} secondary={`${author} ${createdMessage}`} />
            <FavoriteBorderOutlined />
        </ListItem>
    );
};

export default CommentListItem;

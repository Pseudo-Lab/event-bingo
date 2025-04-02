import { Box, List, Divider } from "@mui/material";
import CommentListItem from "./CommentListItem";
import type { CommentListProps, CommentProps } from "../types/BoardTypes";


const CommentList = (itemsProp: CommentListProps) => {
    return (
        <Box my={4}>
            <List>
                {itemsProp.items.map((item: CommentProps) => (
                    <Box key={item.comment_id}>
                        <CommentListItem {...item} />
                        <Divider component="li" />
                    </Box>
                ))}
            </List>
        </Box>
    );
};

export default CommentList;

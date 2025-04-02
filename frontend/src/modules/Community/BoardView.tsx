import { Container, Box, Typography, Divider } from '@mui/material';
import { useState, useEffect } from "react";
import type { BoardItemProps, CommentProps, CommentEditInfo } from './types/BoardTypes';
import { useLocation } from 'react-router-dom';
import { getDummyBoardCommentsResponse, getDummyBoardContentsResponse, requestDummyBoardEditComments } from './DummyData';
import { getBoardCommentsResponse, getBoardContentResponse, requestBoardEditCommentsResponse } from "../../api/board_api";
import CommentList from './components/CommentList';
import CommentEditor from './components/CommentEditor';

const BoardView = () => {
    const { state } = useLocation();
    const itemProps: BoardItemProps = state;
    const [contents, setContents] = useState<string>('');
    const [comments, setComments] = useState<CommentProps[]>([]);
//     const commentList: CommentProps[] = getDummyBoardCommentsResponse(itemProps.board_id);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchContentAndComments = async () => {
            setLoading(true);
            try {
                const fetchedContents = await getBoardContentResponse(itemProps.board_id);
                const fetchedComments = await getBoardCommentsResponse(itemProps.board_id);
                setContents(fetchedContents);
                setComments(fetchedComments.comments);
            } catch (error) {
                setError("Failed to fetch board contents or comments");
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchContentAndComments();
    }, [itemProps.board_id]);


    const handleEditComment = async (commentData: CommentEditInfo) => {
        const board_id = itemProps.board_id;
        try {
            const responseComment: CommentProps | undefined = await requestBoardEditCommentsResponse(
                { board_id, ...commentData }
            );
            if (!responseComment) {
                alert("댓글 추가에 실패하였습니다.");
                return;
            }
            setComments([...comments, responseComment]);
        } catch (error) {
            alert("댓글 추가에 실패하였습니다.");
            console.error("Error adding comment:", error);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <Container maxWidth="md">
            <Box my={4}>
                <Typography variant="h4" gutterBottom>
                    {itemProps.title}
                </Typography>
                <Box my={2}>
                    <Typography variant="body1" gutterBottom>
                        {contents}
                    </Typography>
                </Box>
                <Divider />
                <CommentEditor onEditComment={handleEditComment} />
                <Divider />
                <CommentList items={comments} />
            </Box>
        </Container>
    );
};

export default BoardView;
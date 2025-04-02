import { useState } from "react";
import { Box, TextField, Button, Snackbar, Alert } from "@mui/material";
import type { RequestEditBoard } from "../types/BoardTypes";
import { getNickName, setNickName } from "../../../utils/LocalStorageUtils";
import { createBoardResponse } from "../../../api/board_api";

const DEFAULT_BOARD_EDIT_INFO: RequestEditBoard = { author: getNickName(), title: "", contents: "", password: "" }
const DEFAULT_ERROR_MESSAGE = { author: "", title: "", password: "", contents: "" }

const BoardEditor = () => {
    const [boardInfo, setBoardInfo] = useState(DEFAULT_BOARD_EDIT_INFO)
    const [errorMessages, setErrorMessages] = useState(DEFAULT_ERROR_MESSAGE)
    const [open, setOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        let valid = true;
        const newErrorMessages = DEFAULT_ERROR_MESSAGE;
        let alertMessage: string = ""

        if (!boardInfo.title.trim()) {
            newErrorMessages.title = "제목을 입력해 주세요.";
            alertMessage += "제목을 입력해 주세요.\n";
            valid = false;
        }

        if (!boardInfo.author.trim()) {
            newErrorMessages.author = "닉네임을 입력해 주세요.";
            alertMessage += "닉네임을 입력해 주세요.\n";
            valid = false;
        }

        const passwordRegex = /^\d{4}$/;
        if (!boardInfo.password.trim() || !passwordRegex.test(boardInfo.password)) {
            newErrorMessages.password = "비밀번호를 숫자로만4자리로 입력해 주세요.";
            alertMessage += "비밀번호를 숫자로만 4자리로 입력해 주세요.\n";
            valid = false;
        }

        if (!boardInfo.contents.trim()) {
            newErrorMessages.contents = "내용을 입력해 주세요.";
            alertMessage += "내용을 입력해 주세요.\n";
            valid = false;
        }

        setErrorMessages(newErrorMessages);

        if (!valid) {
            return;
        }

        try {
            setNickName(boardInfo.author);
            const success = await createBoardResponse(boardInfo);
            if (success) {
                setSnackbarMessage("게시물이 성공적으로 등록되었습니다.");
                setSnackbarSeverity("success");
                setBoardInfo(DEFAULT_BOARD_EDIT_INFO); // Reset form on success
            } else {
                setSnackbarMessage("게시물 등록에 실패하였습니다.");
                setSnackbarSeverity("error");
            }
        } catch (error) {
            console.error("Error creating board:", error);
            setSnackbarMessage("게시물 등록 중 오류가 발생하였습니다.");
            setSnackbarSeverity("error");
        } finally {
            window.location.href = "/community"
            setOpen(true);
        }
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <Box
            component="form"
            sx={{
                "& .MuiTextField-root": { m: 1, width: "70vw", textAlign: "center" },
            }}
        >
            <TextField
                required
                id="outlined-required"
                name="title"
                label="제목"
                placeholder="제목을 입력해 주세요"
                value={boardInfo.title}
                onChange={(e) => setBoardInfo({ ...boardInfo, title: e.target.value })}
                error={!!errorMessages.title}
                helperText={errorMessages.title}
            />
            <br />
            <TextField
                required
                id="outlined-required"
                name="author"
                label="닉네임"
                placeholder="닉네임을 입력해 주세요"
                value={boardInfo.author}
                onChange={(e) => setBoardInfo({ ...boardInfo, author: e.target.value })}
                error={!!errorMessages.author}
                helperText={errorMessages.author}
            />
            <br />

            <TextField
                required
                id="outlined-required"
                name="password"
                type="password"
                label="비밀번호"
                placeholder="비밀번호를 4자리를 입력해 주세요."
                value={boardInfo.password}
                onChange={(e) => setBoardInfo({ ...boardInfo, password: e.target.value })}
                inputProps={{
                    maxLength: 4, // 최대 길이 4자로 설정
                }}
                error={!!errorMessages.password}
                helperText={errorMessages.password}
            />
            <br />

            <TextField
                required
                fullWidth
                multiline
                id="outlined-required"
                name="contents"
                label="내용"
                rows={10}
                placeholder="내용을 입력해주세요"
                value={boardInfo.contents}
                onChange={(e) => setBoardInfo({ ...boardInfo, contents: e.target.value })}
                error={!!errorMessages.contents}
                helperText={errorMessages.contents}
            />
            <br />

            <Button variant="outlined" onClick={handleSubmit}>등록</Button>

            <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
                <Alert onClose={handleClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default BoardEditor;

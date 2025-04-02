import { Box, Button } from "@mui/material";
import { useSearchParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import BoardList from "./components/BoardList";
import type { BoardListResponse } from "./types/BoardTypes";
import { getDummyBoardListResponse } from "./DummyData";
import { getBoardListResponse } from "../../api/board_api";

const BoardListView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pageParam = searchParams.get("page");
  const page = pageParam === null ? 1 : parseInt(pageParam);

  const [boardListResponse, setBoardListResponse] = useState<BoardListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBoardList = async () => {
      setLoading(true);
      try {
        const response: BoardListResponse = await getBoardListResponse(page);
        setBoardListResponse(response);
      } catch (err) {
        setError("Failed to fetch board list");
        console.error("Error fetching board list:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardList();
  }, [page]);

  const handlePageChange = (pageNum: number) => {
    navigate(`?page=${pageNum}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!boardListResponse) {
    return <div>No data available</div>;
  }

  const totalPages = Math.ceil(boardListResponse.all_count / 50);

  const renderPageButtons = (currentPage: number) => {
    const maxVisiblePages = 5; // 한 번에 보일 페이지 버튼 수
    let startPage = Math.max(currentPage - Math.floor(maxVisiblePages / 2), 1);
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(endPage - maxVisiblePages + 1, 1);
    }

    let pageButtons = [];

    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <Button
          key={i}
          variant={i === currentPage ? "contained" : "outlined"}
          onClick={() => handlePageChange(i)}
          style={{ margin: '0 0.1rem', minWidth: '4vw', maxWidth: '4vw' }}
        >
          {i}
        </Button>
      );
    }

    return pageButtons;
  };

  return (
    <Box>
        <Box alignItems="left">
            <Button variant="contained" href="/community/new"  >
                글쓰기
            </Button>
        </Box>
      <BoardList items={boardListResponse.boards} />
      <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
        <Button variant="contained" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
          이전
        </Button>
        <Box display="flex" alignItems="center" mx={2}>
          {renderPageButtons(page)}
        </Box>
        <Button variant="contained" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
          다음
        </Button>
      </Box>
    </Box>
  );
};

export default BoardListView;

const API_URL: string = import.meta.env.VITE_API_URL;
import type { BoardItemProps, BoardListResponse, CommentProps, RequestEditComment } from "../modules/Community/types/BoardTypes";
// import type { BoardItemProps, BoardListResponse, CommentProps, RequestEditComment } from "./types/BoardTypes";
// import { createBoard, getBoardList, getBoardContent, getBoardComments, requestBoardEditComments } from "../../api/board_api";

const PAGE_COUNT: number = 50;

export const createBoard = async (boardInfo) => {
  const response = await fetch(`${API_URL}/api/board`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(boardInfo),
  });
  return response.ok;
};

export const getBoardList = async (page: number, pageSize: number): Promise<BoardListResponse> => {
  const response = await fetch(`${API_URL}/api/board/list?page=${page}&page_size=${pageSize}`);
  if (!response.ok) {
    throw new Error("Failed to fetch board list");
  }
  return await response.json();
};

export const getBoardContent = async (id: number): Promise<string> => {
  const response = await fetch(`${API_URL}/api/board/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch board content");
  }
  const data = await response.json();
  return data.contents;  // Assuming the backend returns a field 'contents' in the response
};

export const getBoardComments = async (board_id: number): Promise<CommentProps[]> => {
  // Assuming there's an endpoint for fetching comments for a board
  const response = await fetch(`${API_URL}/api/comment/${board_id}/all`);
  if (!response.ok) {
    throw new Error("Failed to fetch comments");
  }
  return await response.json();
};

export const requestBoardEditComments = async (requestData: RequestEditComment): Promise<CommentProps | undefined> => {
  const response = await fetch(`${API_URL}/api/comment/${requestData.board_id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });
  if (!response.ok) {
    throw new Error("Failed to edit comments");
  }
  return await response.json();
};

export let createBoardResponse = async (boardInfo): Promise<boolean> => {
  try {
    const response = await createBoard(boardInfo);
    return response;
  } catch (error) {
    console.error("Failed to create board:", error);
    throw error;
  }
};

export let getBoardListResponse = async (page: number): Promise<BoardListResponse> => {
  try {
    const response = await getBoardList(page, PAGE_COUNT);
    return response;
  } catch (error) {
    console.error("Failed to fetch board list:", error);
    throw error;
  }
};

export let getBoardContentResponse = async (id: number): Promise<string> => {
  try {
    const response = await getBoardContent(id);
    return response;
  } catch (error) {
    console.error("Failed to fetch board content:", error);
    throw error;
  }
};

export let getBoardCommentsResponse = async (board_id: number): Promise<CommentProps[]> => {
  try {
    const response = await getBoardComments(board_id);
    return response;
  } catch (error) {
    console.error("Failed to fetch board comments:", error);
    throw error;
  }
};

export let requestBoardEditCommentsResponse = async (requestData: RequestEditComment): Promise<CommentProps | undefined> => {
  try {
    const response = await requestBoardEditComments(requestData);
    return response;
  } catch (error) {
    console.error("Failed to edit comments:", error);
    throw error;
  }
};


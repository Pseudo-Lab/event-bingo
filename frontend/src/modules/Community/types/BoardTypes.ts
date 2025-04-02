export interface BoardItemProps {
  board_id: number;
  title: string;
  author: string;
  created_at: number;
  view_count: number;
  comment_count: number;
  like_count: number;
}

export interface BoardListProp {
  items: BoardItemProps[];
}

export interface CommentListProps {
  items: CommentProps[];
}

export interface CommentProps {
  comment_id: number,
  author: string;
  contents: string,
  created_at: number;
}

export interface CommentEditInfo {
  author: string,
  contents: string,
  password: string,
}

export interface RequestEditComment {
  board_id: number,
  comment_id?: number, // id가 존재하면 Edit, 없으면 추가
  author: string,
  contents: string,
  password: string,
}

export interface RequestDeleteComment {
  board_id: number,
  comment_id: number,
  password: string,
}

export interface RequestEditBoard {
  board_id?: number, // id가 있으면 Edit, 없으면 추가
  title: string,
  author: string,
  contents: string,
  password: string,
}


export interface BoardListResponse {
  items: BoardItemProps[];
  all_count: number;
}

export interface BoardResponse {
  board_id: number,
  contents: string,
  comment_list: CommentProps[],
}

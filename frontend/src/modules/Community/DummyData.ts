import type { BoardItemProps, BoardListResponse, CommentProps, RequestEditComment } from "./types/BoardTypes";

const DUMMY_COUNT: number = 1000;
const PAGE_COUNT: number = 50;

let DUMMY_BOARD_ITEMS: BoardItemProps[] = []
for (let i: number = 0; i < DUMMY_COUNT; ++i) {
  const created_at = Date.now() - (i * 8000000);
  //console.log(`${i} ${new Date(created_at)}`)
  DUMMY_BOARD_ITEMS.push({
    board_id: i,
    title: `테스트${i}`,
    author: `${i}`,
    created_at: created_at,
    view_count: Math.floor(Math.random() * 50),
    comment_count: 0,
    like_count: Math.floor(Math.random() * 50),
  });
}
DUMMY_BOARD_ITEMS = DUMMY_BOARD_ITEMS.reverse()

let DUMMY_BOARD_CONTENTS_LIST: string[] = []
for (let i: number = 0; i < DUMMY_COUNT; ++i) {
  DUMMY_BOARD_CONTENTS_LIST.push(`컨텐츠 ${i}`);
}

let commentIndex = 0;
// key: board_id
let DUMMY_BOARD_COMMMENT_LIST: Map<number, CommentProps[]> = new Map<number, CommentProps[]>()
for (let i: number = 0; i < DUMMY_COUNT; ++i) {
  const commentCount: number = Math.floor(Math.random() * 5) + 2
  const id = DUMMY_BOARD_ITEMS[i].board_id
  DUMMY_BOARD_COMMMENT_LIST.set(id, [])
  for (let j: number = 0; j < commentCount; ++j) {
    DUMMY_BOARD_COMMMENT_LIST.get(id)?.push({
      comment_id: commentIndex++,
      author: `${i + j}`,
      contents: `댓글 ${j}`,
      created_at: Date.now(),
    })
  }

  const commentList: CommentProps[] | undefined = DUMMY_BOARD_COMMMENT_LIST.get(i)
  if (commentList !== undefined)
    DUMMY_BOARD_ITEMS[id].comment_count = commentList.length;
}

export let getDummyBoardListResponse = (page: number): BoardListResponse => {
  const pageStart = (page - 1) * PAGE_COUNT
  return {
    items: DUMMY_BOARD_ITEMS.slice(pageStart, pageStart + PAGE_COUNT),
    all_count: DUMMY_BOARD_ITEMS.length,
  };
}

export let getDummyBoardContentsResponse = (id: number): string => {
  return DUMMY_BOARD_CONTENTS_LIST[id];
}

export let getDummyBoardCommentsResponse = (board_id: number): CommentProps[] => {
  const commentList: CommentProps[] | undefined = DUMMY_BOARD_COMMMENT_LIST.get(board_id)
  if (commentList === undefined)
    return []
  return commentList;
}

export let requestDummyBoardEditComments = (requestData: RequestEditComment): CommentProps | undefined => {
  let commentList: CommentProps[] | undefined = DUMMY_BOARD_COMMMENT_LIST.get(requestData.board_id)
  if (commentList === undefined)
    return undefined

  const commentProp = {
    comment_id: commentIndex++,
    author: requestData.author,
    contents: requestData.contents,
    created_at: Date.now()
  }

  commentList.push(commentProp)
  return commentProp;
}
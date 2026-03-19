import { describe, expect, it } from "vitest";
import type {
  BingoCell,
  BoardPreviewPreset,
  InteractionRecord,
} from "./bingoGameTypes";
import {
  buildPreviewBoard,
  buildExchangeHistory,
  getCompletedLines,
  getLatestIncomingBatch,
} from "./bingoGameUtils";

describe("getLatestIncomingBatch", () => {
  it("groups the latest interactions from the same sender within the batch window", () => {
    const interactions: InteractionRecord[] = [
      {
        interaction_id: 3,
        send_user_id: 12,
        receive_user_id: 7,
        send_user_name: "민지",
        created_at: "2026-03-19T10:00:01.000Z",
        word_id_list: ["AI", "ML"],
      },
      {
        interaction_id: 2,
        send_user_id: 12,
        receive_user_id: 7,
        send_user_name: "민지",
        created_at: "2026-03-19T10:00:00.300Z",
        word_id_list: "[\"ML\",\"Infra\"]",
      },
      {
        interaction_id: 1,
        send_user_id: 4,
        receive_user_id: 7,
        send_user_name: "준호",
        created_at: "2026-03-19T09:59:57.000Z",
        word_id_list: "[\"Design\"]",
      },
    ];

    expect(getLatestIncomingBatch(interactions)).toEqual({
      senderId: "12",
      senderName: "민지",
      createdAt: "2026-03-19T10:00:01.000Z",
      keywords: ["AI", "ML", "Infra"],
      signature: "12:2026-03-19T10:00:01.000Z:AI|ML|Infra",
    });
  });
});

describe("buildExchangeHistory", () => {
  it("groups interactions by direction and counts unique counterparts", () => {
    const interactions: InteractionRecord[] = [
      {
        interaction_id: 10,
        send_user_id: 1,
        receive_user_id: 2,
        send_user_name: "나",
        receive_user_name: "상대 A",
        created_at: "2026-03-19T10:00:00.000Z",
        word_id_list: "[\"AI\"]",
      },
      {
        interaction_id: 11,
        send_user_id: 1,
        receive_user_id: 2,
        send_user_name: "나",
        receive_user_name: "상대 A",
        created_at: "2026-03-19T10:01:00.000Z",
        word_id_list: "[\"ML\"]",
      },
      {
        interaction_id: 12,
        send_user_id: 3,
        receive_user_id: 1,
        send_user_name: "상대 B",
        receive_user_name: "나",
        created_at: "2026-03-19T10:02:00.000Z",
        word_id_list: "[\"Infra\"]",
      },
    ];

    const result = buildExchangeHistory(interactions, "1");

    expect(result.metPersonCount).toBe(2);
    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      id: "3-1",
      sendPerson: "상대 B",
      receivePerson: "나",
      given: ["Infra"],
    });
    expect(result.records[1]).toMatchObject({
      id: "1-2",
      sendPerson: "나",
      receivePerson: "상대 A",
      given: ["AI", "ML"],
    });
  });
});

describe("getCompletedLines", () => {
  it("returns completed rows, columns, and diagonals", () => {
    const board: BingoCell[] = Array.from({ length: 9 }, (_, index) => ({
      id: index,
      value: `키워드 ${index + 1}`,
      selected: 0,
      status: [0, 2, 4, 6, 8].includes(index) ? 1 : 0,
    }));

    expect(getCompletedLines(board, 3)).toEqual([
      { type: "diagonal", index: 1 },
      { type: "diagonal", index: 2 },
    ]);
  });
});

describe("buildPreviewBoard", () => {
  const board: BingoCell[] = Array.from({ length: 25 }, (_, index) => ({
    id: index,
    value: `키워드 ${index + 1}`,
    selected: 0,
    status: 0,
  }));

  it.each([
    ["one-line", 5],
    ["two-lines", 9],
    ["three-lines", 13],
    ["full", 25],
  ] satisfies Array<[BoardPreviewPreset, number]>)(
    "marks the expected number of cells for %s",
    (preset, expectedCount) => {
      const previewBoard = buildPreviewBoard(board, preset, 5);

      expect(previewBoard.filter((cell) => cell.status === 1)).toHaveLength(expectedCount);
    }
  );
});

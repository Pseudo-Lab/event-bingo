import { describe, expect, it } from "vitest";
import {
  DEMO_PLAY_BOARD_VARIANTS,
  DEMO_PLAY_BOARD_SIZE,
  DEMO_PLAY_GOAL_LINES,
  applyDemoPlayExchangeStep,
  createDemoPlayBoard,
  createDemoPlayExchangeSteps,
  DEMO_PLAY_MAX_SELECTED_KEYWORDS,
} from "./demoPlayUtils";

describe("demo play scenario", () => {
  it("creates a deterministic two-person exchange scenario", () => {
    const board = createDemoPlayBoard(["AI", "디자인", "프로덕트"], {
      shuffleRemaining: false,
    });
    const steps = createDemoPlayExchangeSteps(board, ["AI", "디자인", "프로덕트"]);

    expect(board).toHaveLength(DEMO_PLAY_BOARD_SIZE * DEMO_PLAY_BOARD_SIZE);
    expect(steps.map((step) => `${step.senderId}->${step.receiverId}`)).toEqual([
      "host->guest",
      "guest->host",
      "guest->host",
      "guest->host",
      "guest->host",
    ]);
    expect(steps.map((step) => step.sentKeywords.length)).toEqual([4, 4, 4, 4, 4]);
    expect(new Set(steps.map((step) => step.senderName)).size).toBeGreaterThan(2);
  });

  it("keeps every board variant aligned to the demo no-bingo, one-line, goal flow", () => {
    DEMO_PLAY_BOARD_VARIANTS.forEach((_, boardVariantIndex) => {
      const board = createDemoPlayBoard(["AI", "디자인", "프로덕트"], {
        boardVariantIndex,
        shuffleRemaining: false,
      });
      const steps = createDemoPlayExchangeSteps(board, ["AI", "디자인", "프로덕트"], {
        boardVariantIndex,
      });

      const sendOutcome = applyDemoPlayExchangeStep(board, steps[0]);
      expect(sendOutcome.board.filter((cell) => cell.status === 1)).toHaveLength(0);

      const firstReceiveOutcome = applyDemoPlayExchangeStep(sendOutcome.board, steps[1]);
      expect(firstReceiveOutcome.board.filter((cell) => cell.status === 1)).toHaveLength(4);
      expect(firstReceiveOutcome.completedLines).toHaveLength(0);
      expect(steps[1].sentKeywords).toHaveLength(4);
      expect(steps[1].hostReceivedKeywords).toHaveLength(4);

      const secondReceiveOutcome = applyDemoPlayExchangeStep(firstReceiveOutcome.board, steps[2]);
      expect(secondReceiveOutcome.newCompletedLines).toHaveLength(1);
      expect(secondReceiveOutcome.completedLines).toHaveLength(1);

      const thirdReceiveOutcome = applyDemoPlayExchangeStep(secondReceiveOutcome.board, steps[3]);
      expect(thirdReceiveOutcome.board.filter((cell) => cell.status === 1)).toHaveLength(12);
      expect(thirdReceiveOutcome.newCompletedLines).toHaveLength(1);
      expect(thirdReceiveOutcome.completedLines).toHaveLength(2);

      const finalOutcome = applyDemoPlayExchangeStep(thirdReceiveOutcome.board, steps[4]);
      expect(finalOutcome.board.filter((cell) => cell.status === 1)).toHaveLength(16);
      expect(finalOutcome.completedLines).toHaveLength(DEMO_PLAY_GOAL_LINES);
      expect(new Set(finalOutcome.completedLines.map((line) => line.type)).size).toBeGreaterThanOrEqual(3);

      const allReceivedKeywords = steps.flatMap((step) => step.hostReceivedKeywords);
      expect(new Set(allReceivedKeywords)).toHaveLength(allReceivedKeywords.length);
    });
  });

  it("keeps the keyword selection limit aligned to the demo requirement", () => {
    expect(DEMO_PLAY_MAX_SELECTED_KEYWORDS).toBe(3);
  });
});

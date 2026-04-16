import { describe, expect, it } from "vitest";
import {
  getGoalCelebrationStorageKey,
  readGoalCelebrationFlag,
  writeGoalCelebrationFlag,
} from "./bingoSessionState";

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
};

describe("bingoSessionState", () => {
  it("uses an event and user scoped celebration key", () => {
    expect(getGoalCelebrationStorageKey("spring-event", "42")).toBe(
      "event-bingo.goal-celebration.v1:spring-event:42"
    );
  });

  it("returns false when the celebration was never stored", () => {
    expect(readGoalCelebrationFlag(createStorage(), "spring-event", "42")).toBe(false);
  });

  it("stores and reads the celebration flag per tab session", () => {
    const storage = createStorage();

    writeGoalCelebrationFlag(storage, "spring-event", "42");

    expect(readGoalCelebrationFlag(storage, "spring-event", "42")).toBe(true);
    expect(readGoalCelebrationFlag(storage, "spring-event", "43")).toBe(false);
  });

  it("ignores incomplete storage inputs", () => {
    const storage = createStorage();

    writeGoalCelebrationFlag(storage, undefined, "42");

    expect(readGoalCelebrationFlag(storage, undefined, "42")).toBe(false);
    expect(readGoalCelebrationFlag(undefined, "spring-event", "42")).toBe(false);
  });
});

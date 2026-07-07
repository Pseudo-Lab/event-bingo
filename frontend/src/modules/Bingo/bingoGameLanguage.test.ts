import { describe, expect, it } from "vitest";
import {
  BINGO_GAME_LANGUAGE_STORAGE_KEY,
  readBingoGameLanguage,
  writeBingoGameLanguage,
} from "./bingoGameLanguage";

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  } as Storage;
};

describe("bingoGameLanguage", () => {
  it("defaults to Korean when no language is stored", () => {
    expect(readBingoGameLanguage(createStorage())).toBe("ko");
    expect(readBingoGameLanguage(undefined)).toBe("ko");
  });

  it("stores and reads the selected game language", () => {
    const storage = createStorage();

    writeBingoGameLanguage(storage, "en");

    expect(storage.getItem(BINGO_GAME_LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(readBingoGameLanguage(storage)).toBe("en");
  });

  it("ignores unknown stored values", () => {
    const storage = createStorage();
    storage.setItem(BINGO_GAME_LANGUAGE_STORAGE_KEY, "jp");

    expect(readBingoGameLanguage(storage)).toBe("ko");
  });
});

import { describe, expect, it } from "vitest";

import {
  normalizeSlugDraftInput,
  normalizeSlugForSave,
  recommendEnglishSlugFromName,
} from "./adminSlugUtils";

describe("adminSlugUtils", () => {
  it("keeps a trailing hyphen while the user is typing", () => {
    expect(normalizeSlugDraftInput("Festival Networking-")).toBe("festival-networking-");
  });

  it("preserves Korean characters while normalizing separators", () => {
    expect(normalizeSlugDraftInput("가짜 연구소 2026-")).toBe("가짜-연구소-2026-");
    expect(normalizeSlugForSave("가짜 연구소 2026-")).toBe("가짜-연구소-2026");
  });

  it("recommends an English slug from a Korean event name", () => {
    expect(recommendEnglishSlugFromName("가짜 연구소 2026")).toBe("gajja-yeonguso-2026");
    expect(recommendEnglishSlugFromName("!!!")).toBe("");
  });

  it("normalizes to a clean slug before save", () => {
    expect(normalizeSlugForSave("Festival Networking-")).toBe("festival-networking");
    expect(normalizeSlugForSave("--Festival__2026--")).toBe("festival-2026");
  });
});

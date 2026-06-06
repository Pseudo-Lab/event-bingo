import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const robotsText = readFileSync(new URL("../../public/robots.txt", import.meta.url), "utf8");
const robotsLines = robotsText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

describe("robots.txt policy", () => {
  it("allows public event entry pages while excluding participant and admin paths", () => {
    expect(robotsLines).toContain("Allow: /event/");
    expect(robotsLines).not.toContain("Disallow: /event/");
    expect(robotsLines).toContain("Disallow: /event/*/bingo");
    expect(robotsLines).toContain("Disallow: /event/*/privacy");
    expect(robotsLines).toContain("Disallow: /event/*/admin*");
  });
});

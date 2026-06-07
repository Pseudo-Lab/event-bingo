import { describe, expect, it } from "vitest";
import type { AdminMember } from "./adminTypes";
import { sortAdminMembersByCreatedAtDesc } from "./adminMemberUtils";

const member = (
  id: number,
  createdAt: string,
  name = `관리자 ${id}`,
): AdminMember => ({
  id,
  email: `admin-${id}@example.com`,
  name,
  createdAt,
  role: "event_manager",
});

describe("sortAdminMembersByCreatedAtDesc", () => {
  it("sorts recently created members first", () => {
    const sorted = sortAdminMembersByCreatedAtDesc([
      member(1, "2026-06-01T10:00:00+09:00"),
      member(2, "2026-06-03T10:00:00+09:00"),
      member(3, "2026-06-02T10:00:00+09:00"),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it("uses larger id first when created dates are equal", () => {
    const sorted = sortAdminMembersByCreatedAtDesc([
      member(1, "2026-06-01T10:00:00+09:00"),
      member(3, "2026-06-01T10:00:00+09:00"),
      member(2, "2026-06-01T10:00:00+09:00"),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([3, 2, 1]);
  });
});

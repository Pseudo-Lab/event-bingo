import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiRequestError,
  getPublicEventProfile,
  isNotFoundApiError,
  submitEventManagerApplication,
} from "./public_event_api";

const createJsonResponse = (body: unknown, status: number) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

describe("getPublicEventProfile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws a typed 404 error for missing public events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse(
          {
            detail: "이벤트를 찾을 수 없습니다.",
          },
          404
        )
      )
    );

    const error = await getPublicEventProfile("missing-event-token").catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      message: "이벤트를 찾을 수 없습니다.",
      status: 404,
    });
    expect(isNotFoundApiError(error)).toBe(true);
  });

  it("requests the raw route slug instead of rewriting it to the default event", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          detail: "이벤트를 찾을 수 없습니다.",
        },
        404
      )
    );
    vi.stubGlobal("fetch", fetchSpy);

    await getPublicEventProfile("!!!").catch(() => undefined);

    expect(fetchSpy).toHaveBeenCalledWith("http://localhost:8000/api/events/!!!");
  });
});

describe("submitEventManagerApplication", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("submits expected event date and attendee count when provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          ok: true,
          message: "이벤트 관리자 신청을 접수했습니다.",
          request: {
            id: 1,
            status: "pending",
            created_at: "2026-06-01T00:00:00+09:00",
          },
        },
        200
      )
    );
    vi.stubGlobal("fetch", fetchSpy);

    await submitEventManagerApplication({
      name: " 홍길동 ",
      email: " Organizer@Example.COM ",
      eventName: " Summer Meetup 운영 ",
      eventPurpose: " 참가자 네트워킹 ",
      expectedEventDate: "2026-06-10T09:00:00+09:00",
      expectedAttendeeCount: 200,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8000/api/events/manager-requests",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "홍길동",
          email: "organizer@example.com",
          organization: undefined,
          event_name: "Summer Meetup 운영",
          event_purpose: "참가자 네트워킹",
          expected_event_date: "2026-06-10T09:00:00+09:00",
          expected_attendee_count: 200,
          notes: undefined,
        }),
      })
    );
  });

  it("omits optional scheduling fields when they are not provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          ok: true,
          message: "이벤트 관리자 신청을 접수했습니다.",
          request: null,
        },
        200
      )
    );
    vi.stubGlobal("fetch", fetchSpy);

    await submitEventManagerApplication({
      name: "홍길동",
      email: "organizer@example.com",
      eventName: "Summer Meetup 운영",
      eventPurpose: "미입력",
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "홍길동",
      email: "organizer@example.com",
      event_name: "Summer Meetup 운영",
      event_purpose: "미입력",
    });
    expect(JSON.parse(init.body as string)).not.toHaveProperty("expected_event_date");
    expect(JSON.parse(init.body as string)).not.toHaveProperty("expected_attendee_count");
  });
});

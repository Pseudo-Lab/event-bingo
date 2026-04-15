import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiRequestError,
  getPublicEventProfile,
  isNotFoundApiError,
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

import { describe, expect, it } from "vitest";
import {
  createSiteAnalyticsPayload,
  getAnalyticsEnvironment,
  getReferrerType,
  getViewportContext,
} from "./siteAnalytics";

describe("siteAnalytics", () => {
  it("maps production and private hostnames to separated analytics environments", () => {
    expect(getAnalyticsEnvironment("bingo.pseudolab-devfactory.com")).toMatchObject({
      environment: "production",
      deployment_channel: "bingo",
      is_production_domain: true,
    });
    expect(getAnalyticsEnvironment("bingo-private.pseudolab-devfactory.com")).toMatchObject({
      environment: "private_dev",
      deployment_channel: "bingo-private",
      is_production_domain: false,
    });
  });

  it("buckets viewport width without storing raw user agent data", () => {
    expect(getViewportContext(390)).toEqual({
      viewport_bucket: "mobile",
      device_class: "mobile",
    });
    expect(getViewportContext(1440)).toEqual({
      viewport_bucket: "desktop-md",
      device_class: "desktop",
    });
  });

  it("classifies referrers by hostname only", () => {
    expect(getReferrerType("", "bingo.pseudolab-devfactory.com")).toBe("direct");
    expect(
      getReferrerType(
        "https://bingo.pseudolab-devfactory.com/demo/play",
        "bingo.pseudolab-devfactory.com"
      )
    ).toBe("internal");
    expect(getReferrerType("https://example.com/path", "bingo.pseudolab-devfactory.com")).toBe(
      "external"
    );
  });

  it("builds a versioned payload with safe core fields", () => {
    const payload = createSiteAnalyticsPayload({
      eventName: "demo_start_clicked",
      properties: { selected_count: 3 },
      route: "/demo/play",
      pageViewId: "page-1",
      analyticsSessionId: "session-1",
      now: new Date("2026-05-18T00:00:00.000Z"),
      locationHostname: "bingo.pseudolab-devfactory.com",
      referrer: "",
      viewportWidth: 1728,
    });

    expect(payload).toMatchObject({
      schema_version: 1,
      event_name: "demo_start_clicked",
      event_source: "frontend",
      analytics_session_id: "session-1",
      page_view_id: "page-1",
      occurred_at: "2026-05-18T00:00:00.000Z",
      route: "/demo/play",
      hostname: "bingo.pseudolab-devfactory.com",
      environment: "production",
      deployment_channel: "bingo",
      is_production_domain: true,
      viewport_bucket: "desktop-lg",
      device_class: "desktop",
      referrer_type: "direct",
      properties: { selected_count: 3 },
      experiments: [],
    });
    expect(payload.event_id).toBeTruthy();
  });
});

import { describe, expect, it } from "vitest";
import {
  createSiteAnalyticsPayload,
  getAnalyticsEnvironment,
  getCampaignContext,
  getReferrerDomainBucket,
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

  it("buckets external referrer domains without storing full referrer paths", () => {
    expect(getReferrerDomainBucket("", "bingo.pseudolab-devfactory.com")).toBe("direct");
    expect(
      getReferrerDomainBucket(
        "https://bingo.pseudolab-devfactory.com/demo/play",
        "bingo.pseudolab-devfactory.com"
      )
    ).toBe("internal");
    expect(
      getReferrerDomainBucket("https://lu.ma/promo-event", "bingo.pseudolab-devfactory.com")
    ).toBe("luma");
    expect(
      getReferrerDomainBucket("https://example.com/path", "bingo.pseudolab-devfactory.com")
    ).toBe("other_external");
  });

  it("normalizes UTM fields and QA traffic type from query parameters", () => {
    expect(
      getCampaignContext(
        "?utm_source=Lu.ma&utm_medium=Event Page&utm_campaign=Networking Promo 20260521&utm_content=Poster A&qa=1&raw_url=https://example.com"
      )
    ).toEqual({
      traffic_type: "internal_qa",
      utm_source: "lu.ma",
      utm_medium: "event_page",
      utm_campaign: "networking_promo_20260521",
      utm_content: "poster_a",
    });
    expect(getCampaignContext("?traffic_type=internal_qa")).toEqual({
      traffic_type: "internal_qa",
    });
    expect(getCampaignContext("?traffic_type=unexpected")).toEqual({
      traffic_type: "public",
    });
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
      locationSearch:
        "?utm_source=luma&utm_medium=event_page&utm_campaign=networking_promo_20260521&traffic_type=internal_qa",
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
      properties: {
        selected_count: 3,
        traffic_type: "internal_qa",
        utm_source: "luma",
        utm_medium: "event_page",
        utm_campaign: "networking_promo_20260521",
        referrer_domain_bucket: "direct",
        session_entry_route: "/demo/play",
        session_entry_referrer_type: "direct",
        session_entry_referrer_domain_bucket: "direct",
        session_entry_utm_source: "luma",
        session_entry_utm_medium: "event_page",
        session_entry_utm_campaign: "networking_promo_20260521",
      },
      experiments: [],
    });
    expect(payload.event_id).toBeTruthy();
  });
});

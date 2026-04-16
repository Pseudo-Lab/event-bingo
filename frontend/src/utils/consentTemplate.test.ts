import { describe, expect, it } from "vitest";

import {
  interpolateConsentTemplate,
  parseConsentTemplate,
} from "./consentTemplate";

describe("consentTemplate", () => {
  it("replaces placeholders with the provided variables", () => {
    expect(
      interpolateConsentTemplate("**{host}** / **{eventTeam}** / **{eventContactEmail}**", {
        host: "가짜연구소",
        eventTeam: "가짜연구소",
        eventContactEmail: "team@example.com",
      })
    ).toBe("**가짜연구소** / **가짜연구소** / **team@example.com**");
  });

  it("parses sectioned markdown into intro and numbered sections", () => {
    expect(
      parseConsentTemplate(
        "# 제목\n\n**{host}** 소개 문구\n\n■ 항목\n값\n\n■ 목적\n- 하나",
        { host: "행사 운영팀" }
      )
    ).toEqual({
      title: "제목",
      intro: "**행사 운영팀** 소개 문구",
      sections: [
        { title: "항목", markdown: "값" },
        { title: "목적", markdown: "- 하나" },
      ],
    });
  });

  it("preserves nested list indentation for policy sections", () => {
    expect(
      parseConsentTemplate(
        "# 제목\n\n■ 항목\n\\- 상위\n  \\- 하위",
        { eventTeam: "행사 운영팀" }
      ).sections[0]?.markdown
    ).toBe("- 상위\n  - 하위");
  });
});

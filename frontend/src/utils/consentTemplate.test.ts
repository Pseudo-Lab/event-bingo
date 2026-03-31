import { describe, expect, it } from "vitest";

import {
  interpolateConsentTemplate,
  parseConsentTemplate,
} from "./consentTemplate";

describe("consentTemplate", () => {
  it("replaces host placeholders with the event team name", () => {
    expect(interpolateConsentTemplate("**{host}** / **{eventTeam}**", "가짜연구소")).toBe(
      "**가짜연구소** / **가짜연구소**"
    );
  });

  it("parses sectioned markdown into intro and numbered sections", () => {
    expect(
      parseConsentTemplate(
        "# 제목\n\n**{host}** 소개 문구\n\n■ 항목\n값\n\n■ 목적\n- 하나",
        "행사 운영팀"
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
});

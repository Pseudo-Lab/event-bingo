import { describe, expect, it } from "vitest";

import {
  interpolateConsentTemplate,
  parseConsentTemplate,
} from "./consentTemplate";

describe("consentTemplate", () => {
  it("replaces placeholders with the provided variables", () => {
    expect(
      interpolateConsentTemplate("**{host}** / **{eventTeam}** / **{eventContactEmail}**", {
        host: "DevFactory",
        eventTeam: "행사 운영팀",
        eventContactEmail: "team@example.com",
      })
    ).toBe("**DevFactory** / **행사 운영팀** / **team@example.com**");
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

  it("normalizes simple pre-numbered section titles before UI numbering is applied", () => {
    const parsedContent = parseConsentTemplate(
      "# 제목\n\n■ 1. 개인정보 처리 주체 및 적용 범위\n내용\n\n■ 10. 안내의 변경\n내용",
      {}
    );

    expect(parsedContent.sections.map((section) => section.title)).toEqual([
      "개인정보 처리 주체 및 적용 범위",
      "안내의 변경",
    ]);
  });

  it("keeps dotted subsection numbers in authored section titles", () => {
    expect(
      parseConsentTemplate("# 제목\n\n■ 3.3. 세부 기준\n내용", {}).sections[0]?.title
    ).toBe("3.3. 세부 기준");
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

export type ConsentSection = {
  title: string;
  markdown: string;
};

export type ParsedConsentContent = {
  title: string;
  intro: string;
  sections: ConsentSection[];
};

const normalizeMarkdown = (lines: string[]) =>
  lines
    .join("\n")
    .replace(/^\s*\\-\s*/gm, "- ")
    .trim();

export const interpolateConsentTemplate = (template: string, eventTeam: string) => {
  return template
    .replace(/{eventTeam}/g, eventTeam)
    .replace(/{host}/g, eventTeam)
    .replace(/\r\n/g, "\n")
    .trim();
};

export const parseConsentTemplate = (
  template: string,
  eventTeam: string
): ParsedConsentContent => {
  const interpolated = interpolateConsentTemplate(template, eventTeam);
  const lines = interpolated.split("\n");
  const firstLine = lines[0]?.trim();

  let title = "[필수] 개인정보 수집 및 이용 동의서";
  let contentStartIndex = 0;

  if (firstLine?.startsWith("#")) {
    title = firstLine.replace(/^#\s*/, "");
    contentStartIndex = 1;
  }

  const introLines: string[] = [];
  const sections: Array<{ title: string; lines: string[] }> = [];
  let currentSection: { title: string; lines: string[] } | null = null;

  const flushSection = () => {
    if (!currentSection) {
      return;
    }

    sections.push(currentSection);
    currentSection = null;
  };

  lines.slice(contentStartIndex).forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("■")) {
      flushSection();
      currentSection = {
        title: trimmedLine.replace(/^■\s*/, ""),
        lines: [],
      };
      return;
    }

    if (currentSection) {
      currentSection.lines.push(line);
      return;
    }

    introLines.push(line);
  });

  flushSection();

  return {
    title,
    intro: normalizeMarkdown(introLines),
    sections: sections
      .map((section) => ({
        title: section.title,
        markdown: normalizeMarkdown(section.lines),
      }))
      .filter((section) => section.markdown.length > 0),
  };
};

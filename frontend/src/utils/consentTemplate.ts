export type ConsentSection = {
  title: string;
  markdown: string;
};

export type ParsedConsentContent = {
  title: string;
  intro: string;
  sections: ConsentSection[];
};

export type ConsentTemplateVariables = Record<string, string>;

const normalizeMarkdown = (lines: string[]) =>
  lines
    .join("\n")
    .replace(/^(\s*)\\-\s*/gm, "$1- ")
    .trim();

const normalizeSectionTitle = (line: string) =>
  line
    .replace(/^■\s*/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();

export const interpolateConsentTemplate = (
  template: string,
  variables: ConsentTemplateVariables = {}
) =>
  template
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => variables[key] ?? match)
    .replace(/\r\n/g, "\n")
    .trim();

export const parseConsentTemplate = (
  template: string,
  variables: ConsentTemplateVariables = {}
): ParsedConsentContent => {
  const interpolated = interpolateConsentTemplate(template, variables);
  const lines = interpolated.split("\n");
  const firstLine = lines[0]?.trim();

  let title = "개인정보 처리 안내";
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
        title: normalizeSectionTitle(trimmedLine),
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

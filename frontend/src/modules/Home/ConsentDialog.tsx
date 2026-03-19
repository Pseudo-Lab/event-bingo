import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

type ConsentDialogProps = {
  host: string;
  onDecline: () => void;
  onAccept: () => void;
};

type ConsentSection = {
  title: string;
  markdown: string;
};

type ParsedConsentContent = {
  title: string;
  intro: string;
  sections: ConsentSection[];
};

const FALLBACK_TEMPLATE = `# [필수] 개인정보 수집 및 이용 동의서

**{host}**는 본 행사 운영 및 네트워킹 서비스 제공을 위해 아래와 같이 개인정보를 수집 및 이용합니다.

■ 수집 항목
이름, 이메일 주소, 키워드 선택 내역, 후기 및 별점, 빙고 보드 구성 정보, 키워드 교환 및 상호작용 기록

■ 수집 목적
\\- 행사 참가자 식별 및 빙고 서비스 제공
\\- 키워드 기반 매칭 및 네트워킹 기능 제공
\\- 후기 및 참여 내역 기반 통계 분석
\\- 이벤트 참여 확인 및 기념품 지급
\\- 추후 행사 기획 및 운영 개선에 활용

■ 보유 및 이용 기간
수집일로부터 **최대 5년**간 보관 또는 이용 목적 달성 시까지 보유하며, 보유 기간 경과 또는 참가자 요청 시 **즉시 파기**합니다.

■ 귀하의 권리
귀하는 개인정보 수집 및 이용에 대한 동의를 거부할 수 있습니다. 다만, **본 동의는 빙고 서비스 이용을 위한 필수 사항**으로, 동의하지 않을 경우 **빙고 서비스 이용이 제한**될 수 있습니다.`;

const normalizeMarkdown = (lines: string[]) =>
  lines
    .join("\n")
    .replace(/^\s*\\-\s*/gm, "- ")
    .trim();

const parseConsentTemplate = (template: string, host: string): ParsedConsentContent => {
  const interpolated = template.replace(/{host}/g, host).replace(/\r\n/g, "\n").trim();
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

const ConsentDialog: React.FC<ConsentDialogProps> = ({
  host,
  onDecline,
  onAccept,
}) => {
  const [content, setContent] = useState<ParsedConsentContent>(() =>
    parseConsentTemplate(FALLBACK_TEMPLATE, host)
  );

  useEffect(() => {
    let isMounted = true;

    const loadTemplate = async () => {
      try {
        const response = await fetch("/templates/consent.md");

        if (!response.ok) {
          throw new Error(`Failed to fetch consent template: ${response.status}`);
        }

        const template = await response.text();

        if (isMounted) {
          setContent(parseConsentTemplate(template, host));
        }
      } catch (error) {
        console.error("Failed to load consent template", error);

        if (isMounted) {
          setContent(parseConsentTemplate(FALLBACK_TEMPLATE, host));
        }
      }
    };

    void loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [host]);

  return (
    <div className="consent-sheet">
      <div className="consent-sheet__header">
        <p className="consent-sheet__label">필수 동의</p>
        <h2>{content.title}</h2>
        <p className="consent-sheet__summary">
          로그인 전에 아래 내용을 읽고 동의 여부를 선택해 주세요. 동의하지 않으면
          이벤트 네트워킹 기능을 이용할 수 없습니다.
        </p>
      </div>

      <div className="consent-sheet__scroll">
        <div className="consent-sheet__document">
          {content.intro ? (
            <section className="consent-sheet__section">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="consent-markdown__paragraph consent-markdown__paragraph--intro">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="consent-markdown__strong">{children}</strong>
                  ),
                }}
              >
                {content.intro}
              </ReactMarkdown>
            </section>
          ) : null}

          {content.sections.map((section, index) => (
            <section key={section.title} className="consent-sheet__section">
              <h3>
                {index + 1}. {section.title}
              </h3>
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="consent-markdown__paragraph">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="consent-markdown__list">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="consent-markdown__item">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="consent-markdown__strong">{children}</strong>
                  ),
                }}
              >
                {section.markdown}
              </ReactMarkdown>
            </section>
          ))}
        </div>
      </div>

      <div className="consent-sheet__footer">
        <p className="consent-sheet__footer-copy">
          개인정보 처리 내용을 모두 확인하셨다면 아래에서 동의 여부를 선택해
          주세요.
        </p>
        <div className="consent-sheet__actions">
          <button
            type="button"
            className="consent-action consent-action--secondary"
            onClick={onDecline}
          >
            동의 안함
          </button>
          <button
            type="button"
            className="consent-action consent-action--primary"
            onClick={onAccept}
          >
            동의하고 계속
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentDialog;

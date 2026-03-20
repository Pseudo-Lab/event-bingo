import React, { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { getPublicConsentTemplate } from "../../api/public_event_api";
import { parseConsentTemplate, type ParsedConsentContent } from "../../utils/consentTemplate";

type ConsentDialogProps = {
  eventTeam: string;
  onDecline: () => void;
  onAccept: () => void;
};

const ConsentDialog: React.FC<ConsentDialogProps> = ({
  eventTeam,
  onDecline,
  onAccept,
}) => {
  const [content, setContent] = useState<ParsedConsentContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const template = await getPublicConsentTemplate();
      setContent(parseConsentTemplate(template, eventTeam));
    } catch (error) {
      console.error("Failed to load consent template", error);
      setContent(null);
      setLoadError("동의 문안을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }, [eventTeam]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  return (
    <div className="consent-sheet">
      <div className="consent-sheet__header">
        <p className="consent-sheet__label">필수 동의</p>
        <h2>{content?.title ?? "[필수] 개인정보 수집 및 이용 동의서"}</h2>
        <p className="consent-sheet__summary">
          로그인 전에 아래 내용을 읽고 동의 여부를 선택해 주세요. 동의하지 않으면
          이벤트 네트워킹 기능을 이용할 수 없습니다.
        </p>
      </div>

      <div className="consent-sheet__scroll">
        <div className="consent-sheet__document">
          {isLoading ? (
            <section className="consent-sheet__section">
              <p className="consent-markdown__paragraph">동의 문안을 불러오는 중입니다.</p>
            </section>
          ) : null}

          {!isLoading && loadError ? (
            <section className="consent-sheet__section">
              <p className="consent-markdown__paragraph">{loadError}</p>
            </section>
          ) : null}

          {content?.intro ? (
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

          {(content?.sections ?? []).map((section, index) => (
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
          {loadError
            ? "문안을 불러온 뒤 동의 여부를 선택할 수 있습니다."
            : "개인정보 처리 내용을 모두 확인하셨다면 아래에서 동의 여부를 선택해 주세요."}
        </p>
        <div className="consent-sheet__actions">
          <button
            type="button"
            className="consent-action consent-action--secondary"
            onClick={onDecline}
          >
            {loadError ? "닫기" : "동의 안함"}
          </button>
          <button
            type="button"
            className="consent-action consent-action--primary"
            onClick={loadError ? () => void loadTemplate() : onAccept}
            disabled={isLoading}
          >
            {isLoading ? "불러오는 중" : loadError ? "다시 불러오기" : "동의하고 계속"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentDialog;

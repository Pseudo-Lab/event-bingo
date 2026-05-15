import React, { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

import { getPublicEventPrivacyNoticeRecord } from "../../api/public_event_api";
import { parseConsentTemplate, type ParsedConsentContent } from "../../utils/consentTemplate";

type ConsentDialogProps = {
  eventSlug: string;
  eventName: string;
  onClose: () => void;
};

const ConsentDialog: React.FC<ConsentDialogProps> = ({
  eventSlug,
  eventName,
  onClose,
}) => {
  const [content, setContent] = useState<ParsedConsentContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const template = await getPublicEventPrivacyNoticeRecord(eventSlug);
      setContent(parseConsentTemplate(template.content));
    } catch (error) {
      console.error("Failed to load event privacy notice", error);
      setContent(null);
      setLoadError("개인정보 처리 안내를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  return (
    <div className="consent-sheet">
      <div className="consent-sheet__header">
        <p className="consent-sheet__label">개인정보 안내</p>
        <h2>{content?.title ?? "행사 참가자 개인정보 처리 안내"}</h2>
        <p className="consent-sheet__summary">
          {eventName} 참가 흐름에서 어떤 정보를 어떤 목적으로 처리하는지 확인할 수
          있습니다.{" "}
          행사 운영 안내와 문의 맥락에서 제공되며, Bingo Networking 개인정보
          처리방침은 별도로 확인할 수 있습니다.
        </p>
      </div>

      <div className="consent-sheet__scroll">
        <div className="consent-sheet__document">
          {isLoading ? (
            <section className="consent-sheet__section">
              <p className="consent-markdown__paragraph">
                개인정보 처리 안내를 불러오는 중입니다.
              </p>
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
                    <ul className="consent-markdown__list consent-markdown__list--unordered">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="consent-markdown__list consent-markdown__list--ordered">
                      {children}
                    </ol>
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
        {loadError ? (
          <p className="consent-sheet__footer-copy">
            새로고침 후 다시 시도하거나 전체 페이지에서 안내를 확인해 주세요.
          </p>
        ) : null}
        {!loadError ? (
          <p className="consent-sheet__footer-links">
            <Link
              to={`/event/${encodeURIComponent(eventSlug)}/privacy`}
              target="_blank"
              rel="noreferrer"
            >
              전체 안내 보기
            </Link>
          </p>
        ) : null}
        <div className="consent-sheet__actions">
          <button
            type="button"
            className="consent-action consent-action--primary"
            onClick={onClose}
          >
            닫기
          </button>
          {loadError ? (
            <button
              type="button"
              className="consent-action consent-action--primary"
              onClick={() => void loadTemplate()}
              disabled={isLoading}
            >
              {isLoading ? "불러오는 중" : "다시 불러오기"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ConsentDialog;

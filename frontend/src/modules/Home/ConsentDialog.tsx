import React, { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

import { getPublicEventPrivacyNoticeRecord } from "../../api/public_event_api";
import { parseConsentTemplate, type ParsedConsentContent } from "../../utils/consentTemplate";
import type { BingoGameLanguage } from "../Bingo/bingoGameLanguage";

type ConsentDialogProps = {
  eventSlug: string;
  eventName: string;
  language?: BingoGameLanguage;
  onClose: () => void;
};

const consentDialogCopy = {
  ko: {
    loadError: "개인정보 처리 안내를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    label: "개인정보 안내",
    title: "행사 참가자 개인정보 처리 안내",
    summary: (eventName: string) =>
      `${eventName} 참가 흐름에서 어떤 정보를 어떤 목적으로 처리하는지 확인할 수 있습니다. 행사 운영 안내와 문의 맥락에서 제공되며, Bingo Networking 개인정보 처리방침은 별도로 확인할 수 있습니다.`,
    loading: "개인정보 처리 안내를 불러오는 중입니다.",
    footerError: "새로고침 후 다시 시도하거나 전체 페이지에서 안내를 확인해 주세요.",
    viewFull: "전체 안내 보기",
    close: "닫기",
    retryLoading: "불러오는 중",
    retry: "다시 불러오기",
  },
  en: {
    loadError: "Could not load the privacy notice. Please try again shortly.",
    label: "Privacy Notice",
    title: "Event Participant Privacy Notice",
    summary: (eventName: string) =>
      `Review what information is processed, and why, when joining ${eventName}. This notice is provided for event operations and inquiries. The Bingo Networking privacy policy is available separately.`,
    loading: "Loading the privacy notice.",
    footerError: "Refresh and try again, or review the notice on the full page.",
    viewFull: "View Full Notice",
    close: "Close",
    retryLoading: "Loading",
    retry: "Retry",
  },
} as const;

const ConsentDialog: React.FC<ConsentDialogProps> = ({
  eventSlug,
  eventName,
  language = "ko",
  onClose,
}) => {
  const copy = consentDialogCopy[language];
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
      setLoadError(copy.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError, eventSlug]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  return (
    <div className="consent-sheet">
      <div className="consent-sheet__header">
        <p className="consent-sheet__label">{copy.label}</p>
        <h2>{content?.title ?? copy.title}</h2>
        <p className="consent-sheet__summary">{copy.summary(eventName)}</p>
      </div>

      <div className="consent-sheet__scroll">
        <div className="consent-sheet__document">
          {isLoading ? (
            <section className="consent-sheet__section">
              <p className="consent-markdown__paragraph">
                {copy.loading}
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
            {copy.footerError}
          </p>
        ) : null}
        {!loadError ? (
          <p className="consent-sheet__footer-links">
            <Link
              to={`/event/${encodeURIComponent(eventSlug)}/privacy`}
              target="_blank"
              rel="noreferrer"
            >
              {copy.viewFull}
            </Link>
          </p>
        ) : null}
        <div className="consent-sheet__actions">
          <button
            type="button"
            className="consent-action consent-action--primary"
            onClick={onClose}
          >
            {copy.close}
          </button>
          {loadError ? (
            <button
              type="button"
              className="consent-action consent-action--primary"
              onClick={() => void loadTemplate()}
              disabled={isLoading}
          >
              {isLoading ? copy.retryLoading : copy.retry}
          </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ConsentDialog;

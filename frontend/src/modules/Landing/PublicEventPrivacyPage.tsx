import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";

import PublicEventStatePage from "../../components/PublicEventStatePage";
import {
  getPublicEventPrivacyNoticeRecord,
  isNotFoundApiError,
} from "../../api/public_event_api";
import { getEventHomePath } from "../../config/eventProfiles";
import { parseConsentTemplate, type ParsedConsentContent } from "../../utils/consentTemplate";

const PublicEventPrivacyPage = () => {
  const { eventSlug } = useParams();
  const [content, setContent] = useState<ParsedConsentContent | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventTeam, setEventTeam] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");

  const formatPolicyDate = (value: string) => {
    if (!value) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  useEffect(() => {
    if (!eventSlug) {
      setIsNotFound(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadTemplate = async () => {
      try {
        setIsLoading(true);
        setIsNotFound(false);
        setLoadError("");
        const template = await getPublicEventPrivacyNoticeRecord(eventSlug);

        if (!cancelled) {
          setContent(parseConsentTemplate(template.content));
          setEventName(template.eventName);
          setEventTeam(template.eventTeam);
          setContactEmail(template.contactEmail);
          setUpdatedAt(template.updatedAt);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isNotFoundApiError(error)) {
          setIsNotFound(true);
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "행사 참가자 개인정보 처리 안내를 불러오지 못했습니다."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  if (isNotFound) {
    return (
      <PublicEventStatePage
        eyebrow="Event Privacy"
        title="행사 안내를 찾을 수 없습니다"
        description="행사 주소가 올바른지 다시 확인해 주세요. 문제가 계속되면 행사 주최자에게 최신 링크를 요청해 주세요."
      />
    );
  }

  const eventHomePath = getEventHomePath(eventSlug);

  return (
    <div className="min-h-screen bg-[#f4f8f2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,172,121,0.18),transparent_26%),radial-gradient(circle_at_90%_15%,rgba(12,73,53,0.12),transparent_18%),linear-gradient(180deg,#f4f8f2_0%,#edf5f0_100%)]"
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/70 px-7 py-6 shadow-soft backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-[0.26em] text-brand-700">
              Event Privacy
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                행사 참가자 개인정보 처리 안내
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                이 페이지는 특정 행사 참가자를 위한 안내입니다. 주최자와 문의처, 보관 기준,
                플랫폼 처리 지원 범위를 함께 확인할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={eventHomePath}
              className="inline-flex items-center justify-center rounded-full border border-brand-700 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              행사 홈으로
            </Link>
            <Link
              to="/privacy"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              DevFactory 방침
            </Link>
          </div>
        </header>

        <section className="rounded-[2rem] border border-white/70 bg-white/85 px-6 py-6 shadow-soft sm:px-8 sm:py-8">
          {isLoading ? (
            <div className="rounded-[1.5rem] bg-[#f6f9f5] px-5 py-10 text-center text-sm font-semibold text-slate-400">
              행사 참가자 개인정보 처리 안내를 불러오는 중입니다.
            </div>
          ) : loadError ? (
            <div className="space-y-4 rounded-[1.5rem] border border-rose-100 bg-rose-50 px-5 py-6 text-sm font-semibold text-rose-600">
              <p>{loadError}</p>
              <p className="font-normal text-rose-500">
                잠시 후 다시 시도해 주세요. 문제가 계속되면 행사 주최자에게 문의해 주세요.
              </p>
            </div>
          ) : content ? (
            <div className="space-y-6">
              <div className="grid gap-3 rounded-[1.5rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm leading-7 text-brand-900 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
                    Event
                  </p>
                  <p className="mt-2 font-semibold">{eventName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
                    Organizer
                  </p>
                  <p className="mt-2 font-semibold">{eventTeam}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
                    Contact
                  </p>
                  <p className="mt-2 font-semibold">{contactEmail}</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-100 bg-[#fbfcf8] px-5 py-4 text-sm leading-7 text-slate-600">
                이 페이지는 행사 참가자 기준 최신 안내 문안을 반영합니다.
                {updatedAt ? ` 마지막 반영 시각: ${formatPolicyDate(updatedAt)}` : ""}
              </div>

              {content.intro ? (
                <div className="rounded-[1.5rem] border border-slate-100 bg-[#fbfcf8] px-5 py-5 sm:px-6">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 sm:text-base">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-extrabold text-slate-950">{children}</strong>
                      ),
                    }}
                  >
                    {content.intro}
                  </ReactMarkdown>
                </div>
              ) : null}

              <div className="grid gap-4">
                {content.sections.map((section, index) => (
                  <article
                    key={section.title}
                    className="rounded-[1.5rem] border border-slate-100 bg-[#fbfcf8] px-5 py-5 sm:px-6"
                  >
                    <h2 className="mb-3 text-lg font-black tracking-[-0.03em] text-slate-950 sm:text-xl">
                      {index + 1}. {section.title}
                    </h2>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600 sm:text-base">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600 sm:text-base">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-600 sm:text-base">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => (
                          <strong className="font-extrabold text-slate-950">{children}</strong>
                        ),
                      }}
                    >
                      {section.markdown}
                    </ReactMarkdown>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
};

export default PublicEventPrivacyPage;

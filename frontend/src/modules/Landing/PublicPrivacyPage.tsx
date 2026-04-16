import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

import { getPublicPlatformPolicyTemplateRecord } from "../../api/public_event_api";
import { parseConsentTemplate, type ParsedConsentContent } from "../../utils/consentTemplate";

const PublicPrivacyPage = () => {
  const [content, setContent] = useState<ParsedConsentContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

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
    let cancelled = false;

    const loadTemplate = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        const template = await getPublicPlatformPolicyTemplateRecord();

        if (!cancelled) {
          setContent(parseConsentTemplate(template.content));
          setUpdatedAt(template.updatedAt);
        }
      } catch (error) {
        if (!cancelled) {
          setContent(null);
          setUpdatedAt("");
          setLoadError(
            error instanceof Error
              ? error.message
              : "개인정보 처리 안내를 불러오지 못했습니다."
          );
        }
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
  }, []);

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
              Privacy
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                DevFactory 플랫폼 개인정보처리방침
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                DevFactory가 행사 개설자와 관리자 계정, 플랫폼 운영, 외부 인프라 사용을
                위해 처리하는 개인정보 기준을 안내합니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-brand-700 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              홈으로
            </Link>
          </div>
        </header>

        <section className="rounded-[2rem] border border-white/70 bg-white/85 px-6 py-6 shadow-soft sm:px-8 sm:py-8">
          {isLoading ? (
            <div className="rounded-[1.5rem] bg-[#f6f9f5] px-5 py-10 text-center text-sm font-semibold text-slate-400">
              개인정보 처리 안내를 불러오는 중입니다.
            </div>
          ) : loadError ? (
            <div className="space-y-4 rounded-[1.5rem] border border-rose-100 bg-rose-50 px-5 py-6 text-sm font-semibold text-rose-600">
              <p>{loadError}</p>
              <p className="font-normal text-rose-500">
                잠시 후 다시 시도해 주세요. 문제가 계속되면 서비스 운영팀에 문의해 주세요.
              </p>
            </div>
          ) : content ? (
            <div className="space-y-6">
              <div className="rounded-[1.5rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm leading-7 text-brand-900">
                이 페이지는 플랫폼 차원의 최신 처리방침 문안을 반영합니다. 개별 행사
                참가자 개인정보 처리 안내는 각 행사 페이지에서 별도로 확인해 주세요.
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

export default PublicPrivacyPage;

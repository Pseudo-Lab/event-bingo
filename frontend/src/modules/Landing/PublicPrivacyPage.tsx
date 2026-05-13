import ReactMarkdown from "react-markdown";

import { parseConsentTemplate } from "../../utils/consentTemplate";
import LegalDocumentLayout from "./components/LegalDocumentLayout";
import {
  PLATFORM_PRIVACY_LAST_UPDATED,
  PLATFORM_PRIVACY_POLICY_MARKDOWN,
} from "./platformPrivacyPolicy";

const platformPrivacyContent = parseConsentTemplate(PLATFORM_PRIVACY_POLICY_MARKDOWN);

const PublicPrivacyPage = () => {
  return (
    <LegalDocumentLayout
      activeDocument="privacy"
      eyebrow="Privacy"
      title="플랫폼 개인정보처리방침"
      meta={`최종 수정일: ${PLATFORM_PRIVACY_LAST_UPDATED}`}
      description="DevFactory 서비스 운영팀이 관리자 신청, 운영자 계정, 서비스 운영을 위해 처리하는 개인정보 기준을 안내합니다."
    >
      <div className="space-y-6">
        <div className="rounded-[1.5rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm leading-7 text-brand-900">
          이 페이지는 플랫폼 차원의 고정 처리방침 문안을 반영합니다. <br></br>개별 행사 참가자
          개인정보 처리 안내는 각 행사 페이지에서 별도로 확인해 주세요.
        </div>

        {platformPrivacyContent.intro ? (
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
              {platformPrivacyContent.intro}
            </ReactMarkdown>
          </div>
        ) : null}

        <div className="grid gap-4">
          {platformPrivacyContent.sections.map((section, index) => (
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
    </LegalDocumentLayout>
  );
};

export default PublicPrivacyPage;

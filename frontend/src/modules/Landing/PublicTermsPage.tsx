import LegalDocumentLayout from "./components/LegalDocumentLayout";

const TERMS_LAST_UPDATED = "2026.05.14";

const TERMS_SECTIONS = [
  {
    title: "운영 주체와 약관의 목적",
    body:
      "DevFactory 서비스 운영팀은 Bingo Networking 서비스를 운영합니다. 본 약관은 행사 참가자와 관리자 신청자, 행사 운영자가 서비스를 이용할 때 필요한 기본 조건과 책임 범위를 안내합니다.",
  },
  {
    title: "서비스의 역할",
    body:
      "Bingo Networking은 행사별 빙고 보드, 키워드 교환, 진행 현황 확인, 관리자 도구를 제공하는 서비스입니다. 개별 행사의 일정, 장소, 운영 방식, 참가자 안내와 현장 운영은 해당 행사 주최자 또는 운영팀이 담당합니다.",
  },
  {
    title: "계정 및 접근",
    body:
      "관리자 기능은 승인된 운영자에게 제공되며, 참가자 기능은 행사별 공개 링크 또는 인증 절차를 통해 사용할 수 있습니다. 사용자는 본인에게 부여된 권한 범위 안에서만 서비스를 이용해야 하며, 타인의 계정이나 행사 링크를 부정하게 사용해서는 안 됩니다.",
  },
  {
    title: "사용자와 행사 운영자의 책임",
    body:
      "사용자는 행사 운영을 방해하거나 타인의 개인정보, 계정, 콘텐츠를 무단으로 이용해서는 안 됩니다. 후기, 문의, 행사 목적, 커스텀 키워드 같은 자유 입력란에 민감정보, 고유식별정보, 제3자의 개인정보, 공개되어서는 안 되는 정보를 입력해서는 안 됩니다. 행사 운영자는 참가자에게 필요한 행사 정보와 추가 개인정보 처리 안내를 정확하게 제공해야 하며, 행사 운영 과정에서 직접 수집하거나 활용하는 정보에 대해 책임을 집니다.",
  },
  {
    title: "콘텐츠 및 데이터 처리",
    body:
      "행사명, 참가자 표시 이름, 이름, 이메일 주소, 로그인 ID, Google/Supabase 식별자, 빙고 키워드, 빙고 보드, 진행률, 키워드 교환 기록, 진행 결과, 후기와 평점, 관리자 이름, 관리자 이메일, 권한, 세션 정보 같은 데이터는 행사 운영과 서비스 제공을 위해 처리될 수 있습니다. 관리자 도구에서는 행사 운영과 리포트 제공을 위해 참가자 이름, 이메일, 후기, 선택 키워드, 상호작용 기록 등이 CSV로 내보내질 수 있습니다. 개인정보 처리 기준은 Bingo Networking 개인정보처리방침과 행사별 참가자 개인정보 처리 안내를 따릅니다.",
  },
  {
    title: "서비스 변경 및 접근 제한",
    body:
      "서비스 운영팀은 기능 개선, 보안 조치, 인프라 점검, 장애 대응을 위해 서비스의 일부 기능을 변경하거나 일시 중단할 수 있습니다. 허위 정보 입력, 부정 참가, 시스템 방해, 타인 권리 침해가 확인되는 경우 서비스 이용이 제한될 수 있습니다.",
  },
  {
    title: "면책 및 책임 범위",
    body:
      "서비스 운영팀은 안정적인 서비스 제공을 위해 합리적인 노력을 다합니다. 다만 개별 행사의 취소, 현장 운영, 주최자가 제공한 정보의 정확성, 이용자 간 분쟁에 대해서는 해당 행사 주최자 또는 당사자가 우선 책임을 집니다.",
  },
  {
    title: "약관 변경 및 문의",
    body:
      "서비스 운영 방식이나 법령, 개인정보 처리 기준이 변경되는 경우 본 약관이 수정될 수 있습니다. 중요한 변경은 서비스 화면 또는 공개 정책 페이지를 통해 안내합니다. 서비스 이용과 관련한 문의는 devfactory.ops@gmail.com 으로 전달해 주세요.",
  },
] as const;

const PublicTermsPage = () => {
  return (
    <LegalDocumentLayout
      activeDocument="terms"
      eyebrow="Terms"
      title="서비스 이용약관"
      meta={`최종 수정일: ${TERMS_LAST_UPDATED}`}
      description="Bingo Networking 서비스 이용 기준과 사용자 책임을 안내합니다."
    >
      <div className="space-y-4">
        {TERMS_SECTIONS.map((section, index) => (
          <article
            key={section.title}
            className="rounded-[1.5rem] border border-slate-100 bg-[#fbfcf8] px-5 py-5 sm:px-6"
          >
            <h2 className="mb-3 text-lg font-black tracking-[-0.03em] text-slate-950 sm:text-xl">
              {index + 1}. {section.title}
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600 sm:text-base">
              {section.body}
            </p>
          </article>
        ))}
      </div>
    </LegalDocumentLayout>
  );
};

export default PublicTermsPage;

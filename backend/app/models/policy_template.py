import re
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, select
from sqlalchemy.orm import Mapped, mapped_column

from core.db import AsyncSession
from models.base import Base


KST = ZoneInfo("Asia/Seoul")
DEFAULT_PLATFORM_HOST = "DevFactory 서비스 운영팀"
DEFAULT_PLATFORM_CONTACT_EMAIL = "soohyun.dev@gmail.com"
DEFAULT_PLATFORM_PRIVACY_PATH = "/privacy"
PLATFORM_PRIVACY_POLICY_UPDATED_AT = datetime(2026, 5, 14, tzinfo=KST)
CONSENT_POLICY_TEMPLATE_KEY = "consent_markdown"
PARTICIPANT_PRIVACY_NOTICE_TEMPLATE_KEY = CONSENT_POLICY_TEMPLATE_KEY
PLATFORM_PRIVACY_TEMPLATE_KEY = "platform_privacy_markdown"
PLACEHOLDER_PATTERN = re.compile(r"\{([a-zA-Z0-9_]+)\}")

LEGACY_CONSENT_POLICY_TEMPLATE = """# [필수] 개인정보 수집 및 이용 동의서

**{host}**은(는) 본 행사 운영 및 네트워킹 서비스 제공을 위해 아래와 같이 개인정보를 수집 및 이용합니다.

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
귀하는 개인정보 수집 및 이용에 대한 동의를 거부할 수 있습니다. 다만, **본 동의는 빙고 서비스 이용을 위한 필수 사항**으로, 동의하지 않을 경우 **빙고 서비스 이용이 제한**될 수 있습니다."""

PREVIOUS_DEFAULT_CONSENT_POLICY_TEMPLATE = """# 개인정보처리방침

**{host}**은(는) 행사 참가자 식별, 빙고 서비스 제공, 참가 내역 관리에 필요한 범위에서 개인정보를 처리합니다.
이 방침은 로그인 전 확인할 수 있도록 공개되며, Google 로그인 동의와 별도로 **본 서비스 내부의 개인정보 처리 기준**을 설명합니다.

■ 1. 개인정보처리자 및 적용 범위
본 방침은 **{host}**이(가) 운영하는 이벤트 빙고 서비스와 행사 참가 페이지에 적용됩니다.
행사별 주최자 또는 운영사가 별도의 개인정보처리자인 경우, 해당 주체는 자신의 처리 범위와 연락처를 행사 공지 또는 추가 안내를 통해 별도로 고지해야 합니다.

■ 2. 동의 없이 처리하는 개인정보의 항목, 목적 및 법적 근거
\\- **계정 및 참가자 식별**
  \\- 항목: 이름, 이메일 주소(Google 로그인 사용 시), 내부 식별자, 로그인 시각
  \\- 목적: 로그인 처리, 참가자 식별, 행사별 참여 이력 관리
  \\- 근거: 정보주체와의 계약 체결·이행 및 정보주체 요청에 따른 조치 이행
\\- **빙고 서비스 운영**
  \\- 항목: 행사별 빙고 보드 구성 정보, 키워드 선택 및 교환 내역, 진행 현황, 참가 시각과 이용 기록
  \\- 목적: 보드 생성, 키워드 교환, 진행률 계산, 이벤트 운영 및 오류 대응
  \\- 근거: 정보주체와의 계약 체결·이행 및 정보주체 요청에 따른 조치 이행
\\- **후기 및 평점**
  \\- 항목: 사용자가 직접 작성한 후기 및 평점
  \\- 목적: 행사 결과 확인 및 운영 개선 참고
  \\- 근거: 서비스 기능 제공 및 운영 개선에 필요한 정당한 업무 처리

■ 3. 동의를 받아 처리하는 개인정보 항목
기본 서비스에서는 행사 운영에 필요한 최소 범위의 개인정보만 처리합니다.
마케팅 활용, 스폰서 제공, 민감정보 처리 등 **별도의 동의가 필요한 항목이 생기는 경우에는 본 방침과 별도로 항목별 안내 및 동의를 받습니다.**

■ 4. 개인정보의 처리 및 보유 기간
개인정보는 행사 운영과 서비스 제공에 필요한 기간 동안 보관합니다.
목적 달성 후에는 지체 없이 파기하는 것을 원칙으로 하며, 관계 법령에 따라 보관이 필요한 경우에는 해당 기간 동안 분리 보관합니다.
구체적인 보관 기간이 행사별로 달라지는 경우에는 행사 공지 또는 추가 안내에 반영합니다.

■ 5. 개인정보의 제3자 제공에 관한 사항
기본 서비스에서는 개인정보를 정보주체 동의 없이 제3자에게 제공하지 않습니다.
다만 법령상 근거가 있거나, 행사 운영에 필수적이지 않은 별도 제공이 필요한 경우에는 제공받는 자, 목적, 항목, 보유 기간을 안내하고 필요한 절차를 진행합니다.

■ 6. 개인정보 처리의 위탁에 관한 사항
서비스 운영 과정에서 외부 전문업체를 이용할 수 있습니다.
현재 구현 기준으로는 **Google 로그인**, **Supabase 기반 인증 및 데이터 저장**, **이메일 발송 기능(활성화된 경우)** 이 포함될 수 있습니다.
이 경우 관련 법령에 따라 위탁계약을 체결하고, 수탁자가 개인정보를 안전하게 처리하도록 관리·감독합니다.
실제 위탁 또는 외부 서비스 사용 내역이 확정되면 본 방침 또는 추가 안내에 반영합니다.

■ 7. 개인정보의 국외 이전에 관한 사항
서비스 운영에 Supabase 등 국외 클라우드 또는 해외 서비스가 실제 사용되는 경우 개인정보가 대한민국 외 지역에서 처리될 수 있습니다.
이 경우 이전받는 자, 이전 국가, 이전 항목, 이전 목적, 보유·이용 기간 등 법령상 필요한 사항을 본 방침 또는 추가 안내에 반영합니다.

■ 8. 정보주체의 권리·의무 및 행사방법
정보주체는 개인정보 열람, 정정·삭제, 처리정지 등을 요청할 수 있습니다.
권리 행사는 행사 운영팀 또는 서비스 관리자에게 요청할 수 있으며, 법령에서 정한 사유가 없는 한 지체 없이 처리합니다.

■ 9. 개인정보의 파기 절차 및 방법
보유기간 경과, 처리 목적 달성 등으로 개인정보가 불필요해진 경우 지체 없이 파기합니다.
전자적 파일은 복구 또는 재생되지 않도록 안전한 기술적 방법으로 삭제하고, 출력물은 분쇄 또는 소각 등으로 파기합니다.

■ 10. 개인정보의 안전성 확보조치
개인정보 접근 권한 관리, 인증정보 보호, 접속 통제, 로그 관리 등 합리적인 보안 조치를 적용합니다.
운영상 필요한 경우 보안 조치는 서비스 구조와 위험 수준에 맞추어 추가 또는 조정될 수 있습니다.

■ 11. 개인정보 보호 문의처
개인정보 보호 관련 문의, 열람청구, 정정·삭제 요구는 행사 운영팀 또는 서비스 관리자에게 할 수 있습니다.
문의 이메일: **pseudolab.operator@gmail.com**
실제 운영 연락처가 변경되거나 행사별 별도 문의처가 필요한 경우 본 항목을 최신 정보로 수정해야 합니다.

■ 12. 개인정보처리방침의 변경
본 방침은 법령, 서비스 기능, 운영 구조 변경에 따라 수정될 수 있습니다.
중요한 변경이 있는 경우 시행 전에 서비스 화면, 공지사항 또는 공개 정책 페이지를 통해 안내합니다."""

DEFAULT_CONSENT_POLICY_TEMPLATE = """# 행사 참가자 개인정보 처리 안내

본 안내는 **{eventTeam}**이(가) 운영하는 **{eventName}** 행사 참가 페이지에 적용됩니다.
이 행사 참가 흐름에서 개인정보처리자는 **{eventTeam}**이며, 개인정보 관련 문의는 **{eventContactEmail}**로 접수할 수 있습니다.
행사 페이지와 관리자 도구를 제공하는 플랫폼 사업자 **{platformHost}**의 자체 처리 기준은 별도 공개된 플랫폼 개인정보처리방침(**{platformPrivacyPath}**)을 따릅니다.

■ 1. 개인정보처리자 및 적용 범위
본 안내는 특정 행사 참가자 로그인, 빙고 보드 생성, 키워드 교환, 진행 현황 확인, 후기 및 평점 작성 흐름에 적용됩니다.
이 행사 목적의 개인정보처리자는 **{eventTeam}**입니다.
플랫폼 사업자 **{platformHost}**는 행사 페이지 제공, 장애 대응, 계정 인증, 데이터 저장 등 행사 운영 지원 범위에서 개인정보 처리 업무를 수행할 수 있습니다.

■ 2. 동의 없이 처리하는 개인정보의 항목, 목적 및 법적 근거
\\- **참가자 식별 및 로그인**
  \\- 항목: 이름, 이메일 주소(Google 로그인 사용 시), 내부 식별자, 로그인 시각
  \\- 목적: 참가자 본인 확인, 행사별 참가 이력 관리, 중복 로그인 방지
  \\- 근거: 정보주체와의 계약 체결·이행 및 정보주체 요청에 따른 조치 이행
\\- **빙고 서비스 운영**
  \\- 항목: 행사별 빙고 보드 구성 정보, 키워드 선택 및 교환 내역, 진행 현황, 참가 시각과 이용 기록
  \\- 목적: 보드 생성, 키워드 교환, 진행률 계산, 행사 운영 및 오류 대응
  \\- 근거: 정보주체와의 계약 체결·이행 및 정당한 업무 처리
\\- **후기 및 평점**
  \\- 항목: 사용자가 직접 작성한 후기 및 평점
  \\- 목적: 행사 결과 확인 및 운영 개선 참고
  \\- 근거: 서비스 기능 제공 및 정당한 업무 처리

■ 3. 동의를 받아 처리하는 개인정보 항목
기본 행사 참가 흐름에서는 행사 운영에 필요한 최소 범위의 개인정보만 처리합니다.
마케팅 활용, 스폰서 제공, 민감정보 처리 등 **행사 운영에 필수적이지 않은 추가 활용**이 필요한 경우에는 본 안내와 별도로 항목별 고지와 동의를 받아야 합니다.

■ 4. 개인정보의 처리 및 보유 기간
이름, 이메일 주소, 로그인 식별정보, 빙고 표시 이름 등 **개인식별이 가능한 정보**는 행사 종료 후 **1년 이내** 삭제 또는 익명화하는 것을 기본 운영 기준으로 합니다.
후기 원문과 같이 개인을 다시 식별할 수 있는 자유서술형 정보도 같은 기준으로 삭제 또는 익명화합니다.
반면 행사명, 일정, 장소, 운영팀 정보, 참가자 수, 빙고 완성 수, 키워드 교환 건수, 평균 평점 등 **개인을 식별할 수 없도록 익명화되거나 집계된 정보**는 행사 아카이브, 운영 통계, 행사 품질 분석을 위해 더 오래 보관할 수 있습니다.
다만 행사 문의 대응, 분쟁 대응, 법령상 보관 의무 이행이 필요한 경우에는 그 목적 달성 시까지 또는 법령상 보관 기간 동안 분리 보관할 수 있습니다.

■ 5. 제3자 제공 및 처리 지원 사업자
기본 행사 참가 흐름에서는 개인정보를 정보주체 동의 없이 제3자에게 제공하지 않습니다.
다만 행사 페이지 제공을 위해 아래 사업자가 개인정보 처리 업무를 지원할 수 있습니다.
\\- **{platformHost}**: 행사 페이지, 관리자 도구, 운영 지원
\\- **Supabase**: 사용자 인증, 세션 관리, 데이터베이스 호스팅 및 저장
\\- **[SMTP 이메일 발송 사업자명]**: 관리자 초대, 운영 알림 등 시스템 이메일 발송
실제 행사 운영에서 사용하는 사업자명, 역할, 국외 이전 사실이 다르면 행사 공지 또는 추가 안내를 통해 최신 기준으로 고지합니다.

■ 6. 정보주체의 권리·의무 및 행사방법
정보주체는 개인정보 열람, 정정·삭제, 처리정지 등을 요청할 수 있습니다.
행사 참가 흐름과 관련한 권리 행사는 **{eventTeam}** 또는 **{eventContactEmail}**로 요청할 수 있으며, 법령에서 정한 사유가 없는 한 지체 없이 처리합니다.

■ 7. 개인정보의 파기 절차 및 방법
보유기간 경과, 처리 목적 달성 등으로 개인정보가 불필요해진 경우 지체 없이 파기합니다.
전자적 파일은 복구 또는 재생되지 않도록 안전한 기술적 방법으로 삭제하고, 출력물은 분쇄 또는 소각 등으로 파기합니다.

■ 8. 안내의 변경
행사 운영 구조, 보유기간, 처리 지원 사업자, 문의처가 바뀌는 경우 행사 페이지 또는 별도 공지를 통해 최신 내용을 안내합니다."""

DEFAULT_PLATFORM_POLICY_TEMPLATE = """# DevFactory 플랫폼 개인정보처리방침

본 방침은 **{platformHost}**가 제공하는 이벤트 빙고 플랫폼과 관리자 도구, 행사 개설 신청, 공개 랜딩 페이지 운영에 적용됩니다.
개별 행사 참가자 개인정보 처리에 관한 내용은 각 행사 페이지에서 별도로 제공되는 **행사 참가자 개인정보 처리 안내**를 우선 확인해 주세요.

■ 1. 개인정보처리자 및 적용 범위
플랫폼 개인정보처리자는 **{platformHost}**입니다.
본 방침은 행사 개설 문의, 관리자/운영자 계정 생성 및 로그인, 플랫폼 운영과 보안 대응, 고객 문의 처리 흐름에 적용됩니다.
개별 행사 참가자의 이름, 이메일, 빙고 기록 등은 기본적으로 해당 행사 주최자 또는 운영팀의 안내에 따라 처리되며, **{platformHost}**는 플랫폼 제공과 지원을 위해 필요한 범위에서만 접근할 수 있습니다.

■ 2. 동의 없이 처리하는 개인정보의 항목, 목적 및 법적 근거
\\- **행사 개설 문의 및 관리자 승인**
  \\- 항목: 이름, 이메일 주소, 소속, 행사명, 행사 목적, 예상 일정, 예상 참가자 수, 기타 문의 내용
  \\- 목적: 행사 개설 요청 검토, 답변, 관리자 권한 부여 여부 판단
  \\- 근거: 정보주체 요청에 따른 조치 이행 및 계약 체결·이행
\\- **관리자 및 운영자 계정 관리**
  \\- 항목: 이름, 이메일 주소, 로그인 식별정보, 권한, 최근 접속 시각
  \\- 목적: 관리자 인증, 권한 제어, 운영 이력 확인, 보안 대응
  \\- 근거: 계약 체결·이행 및 정당한 업무 처리
\\- **플랫폼 운영 및 지원**
  \\- 항목: 서비스 이용 로그, 장애 대응 기록, 행사 설정 정보, 행사 참가 데이터에 대한 최소한의 운영 메타데이터
  \\- 목적: 플랫폼 제공, 장애 분석, 보안 대응, 고객 지원
  \\- 근거: 정당한 업무 처리 및 계약 체결·이행

■ 3. 동의를 받아 처리하는 개인정보 항목
기본 플랫폼 운영에서는 서비스 제공에 필요한 최소 범위의 개인정보만 처리합니다.
마케팅 발송, 행사 추천, 스폰서 연계 등 **플랫폼 운영에 필수적이지 않은 추가 활용**이 필요한 경우에는 별도 고지와 동의를 받습니다.

■ 4. 개인정보의 처리 및 보유 기간
행사 개설 문의 정보는 검토 완료 후 **1년 이내** 파기하는 것을 기본으로 합니다.
관리자 및 운영자 계정 정보는 계정이 활성 상태인 동안 보관하고, 계정 종료 또는 권한 회수 후 **1년 이내** 파기 또는 분리 보관하는 것을 기본으로 합니다.
개별 행사 참가자 데이터는 각 행사 안내에서 정한 보유기간과 주최자 지시에 따르며, **{platformHost}**가 직접 별도 목적으로 장기 보관하지 않습니다.
법령상 보관 의무, 분쟁 대응, 보안 사고 조사에 필요한 경우에는 해당 목적 달성 시까지 또는 법령상 보관 기간 동안 분리 보관할 수 있습니다.

■ 5. 개인정보 처리의 위탁에 관한 사항
플랫폼 운영을 위해 다음과 같은 외부 수탁자를 이용할 수 있습니다.
\\- **수탁자: Supabase**
  \\- 위탁업무: 사용자 인증(Google 로그인 연동 포함), 세션 관리, 데이터베이스 호스팅 및 저장, 서비스 운영에 필요한 데이터 처리
\\- **수탁자: [SMTP 이메일 발송 사업자명]**
  \\- 위탁업무: 관리자 초대, 운영 알림 등 시스템 이메일 발송
실제 운영에서 사용하는 사업자명과 위탁업무 범위가 다르면 본 방침을 그 기준에 맞게 수정합니다.

■ 6. 개인정보의 국외 이전에 관한 사항
플랫폼 운영 과정에서 아래와 같이 개인정보가 국외에서 처리될 수 있습니다. 아래 항목 중 대괄호로 표시된 값은 실제 운영 환경에 맞게 확정해야 합니다.
\\- **이전받는 자: Supabase**
  \\- 이전 국가: **[실제 Supabase 프로젝트 리전 국가/도시]**
  \\- 이전 일시 및 방법: 사용자가 로그인하거나 서비스를 이용하는 때에 정보통신망을 통해 전송
  \\- 이전 항목: 관리자 계정 정보, 행사 설정 정보, 행사 참가 데이터, 로그인/세션 정보, 운영 로그
  \\- 이전 목적: 사용자 인증, 세션 유지, 데이터베이스 호스팅 및 저장, 플랫폼 운영
  \\- 보유 및 이용 기간: 제4항의 보유기간 기준 또는 관련 계약 종료 시까지
\\- **이전받는 자: [SMTP 이메일 발송 사업자명]**
  \\- 이전 국가: **[실제 SMTP 사업자 소재 국가/도시]**
  \\- 이전 일시 및 방법: 관리자 초대 또는 운영 알림 이메일 발송 시 정보통신망을 통해 전송
  \\- 이전 항목: 이메일 주소, 이름, 발송 메시지에 포함된 최소한의 운영 정보
  \\- 이전 목적: 관리자 초대 및 시스템 이메일 발송
  \\- 보유 및 이용 기간: 발송 처리에 필요한 기간 또는 관련 계약 종료 시까지
실제 운영에서 국외 이전이 없는 사업자를 사용하거나 국내 사업자로 대체하는 경우에는 그 사실에 맞게 본 항목을 수정합니다.

■ 7. 정보주체의 권리·의무 및 행사방법
정보주체는 개인정보 열람, 정정·삭제, 처리정지 등을 요청할 수 있습니다.
플랫폼 개인정보 보호 관련 문의, 열람청구, 정정·삭제 요구는 **{platformContactEmail}**로 할 수 있으며, 법령에서 정한 사유가 없는 한 지체 없이 처리합니다.

■ 8. 개인정보의 파기 절차 및 방법
보유기간 경과, 처리 목적 달성 등으로 개인정보가 불필요해진 경우 지체 없이 파기합니다.
전자적 파일은 복구 또는 재생되지 않도록 안전한 기술적 방법으로 삭제하고, 출력물은 분쇄 또는 소각 등으로 파기합니다.

■ 9. 개인정보의 안전성 확보조치
개인정보 접근 권한 관리, 인증정보 보호, 접속 통제, 로그 관리 등 합리적인 보안 조치를 적용합니다.
운영상 필요한 경우 보안 조치는 서비스 구조와 위험 수준에 맞추어 추가 또는 조정될 수 있습니다.

■ 10. 개인정보처리방침의 변경
본 방침은 법령, 서비스 기능, 운영 구조 변경에 따라 수정될 수 있습니다.
중요한 변경이 있는 경우 시행 전에 서비스 화면, 공지사항 또는 공개 정책 페이지를 통해 안내합니다."""

PREVIOUS_DEFAULT_PARTICIPANT_NOTICE_TEMPLATE = DEFAULT_CONSENT_POLICY_TEMPLATE
PREVIOUS_DEFAULT_PLATFORM_POLICY_TEMPLATE = DEFAULT_PLATFORM_POLICY_TEMPLATE

PREVIOUS_PUBLIC_EVENT_PRIVACY_NOTICE_TEMPLATE = """# 개인정보 처리 안내

**{host}**은(는) 행사 참가자 식별, 빙고 서비스 제공, 참가 내역 관리에 필요한 범위에서 개인정보를 처리합니다.
이 안내는 로그인 전 확인할 수 있도록 제공되며, Google 로그인 동의와 별도로 **본 서비스 내부의 개인정보 처리 기준**을 설명합니다.

■ 처리하는 개인정보 항목
이름, 이메일 주소(Google 로그인 사용 시), 행사별 빙고 보드 구성 정보, 키워드 선택 및 교환 내역, 참가 시각과 이용 기록, 사용자가 직접 작성한 후기 및 평점

■ 처리 목적 및 처리 근거
\\- 행사 참가자 식별 및 참가 이력 관리
\\- 빙고 보드 생성, 키워드 교환, 진행 현황 표시 등 행사 운영 기능 제공
\\- 사용자가 직접 작성한 후기 및 평점의 저장과 운영 개선 참고
\\- 행사 운영에 필요한 최소 범위의 처리는 행사 참가 및 서비스 제공을 위한 계약 이행과 정보주체 요청에 따른 조치 이행을 근거로 처리

■ 보유 및 파기
행사 운영에 필요한 기간 동안 보관한 뒤 지체 없이 파기하는 것을 원칙으로 합니다. 관계 법령에 따라 별도 보관이 필요한 경우에는 해당 기간 동안 분리 보관합니다.

■ 제3자 제공 및 추가 동의
행사 운영에 필수적이지 않은 추가 활용, 제3자 제공, 민감정보 처리가 필요한 경우에는 본 안내와 별도로 항목별 안내 및 동의를 받습니다.

■ 정보주체 권리 안내
귀하는 개인정보 열람, 정정, 삭제, 처리정지 등을 요청할 수 있습니다. 문의가 필요한 경우 행사 운영팀 또는 서비스 관리자에게 요청해 주세요."""

DEFAULT_CONSENT_POLICY_TEMPLATE = """# 행사 참가자 개인정보 처리 안내

본 안내는 **{eventTeam}**이(가) 운영하는 **{eventName}** 행사 참가 페이지에 적용됩니다.
행사 참가와 관련한 개인정보 문의는 **{eventContactEmail}**로 접수할 수 있습니다.
DevFactory 서비스 운영팀은 행사 페이지와 관리자 도구를 제공하는 운영 지원 주체이며, 서비스 운영팀의 개인정보 처리 기준은 별도 공개된 플랫폼 개인정보처리방침(**{platformPrivacyPath}**)을 따릅니다.

■ 1. 적용 범위와 역할
본 안내는 특정 행사 참가자의 로그인, 빙고 보드 생성, 키워드 교환, 진행 현황 확인, 후기 및 평점 작성 흐름에 적용됩니다.
행사명, 행사 운영 방식, 참가자 안내, 현장 운영과 관련된 사항은 **{eventTeam}**이 담당합니다.
DevFactory 서비스 운영팀은 행사 페이지 제공, 장애 대응, 계정 인증, 데이터 저장 등 서비스 운영 지원 범위에서 필요한 정보를 처리할 수 있습니다.

■ 2. 처리하는 개인정보 항목과 목적
\\- **참가자 식별 및 로그인**
  \\- 항목: 이름, 이메일 주소, 로그인 ID, Google/Supabase 식별자, 내부 식별자, 로그인 시각
  \\- 목적: 참가자 본인 확인, 행사별 참가 이력 관리, 중복 로그인 방지
\\- **빙고 서비스 운영**
  \\- 항목: 참가자 표시 이름, 선택 키워드, 행사별 빙고 보드 구성 정보, 진행률, 키워드 교환 및 상호작용 기록, 참가 시각과 이용 기록
  \\- 목적: 보드 생성, 키워드 교환, 진행률 계산, 행사 운영 및 오류 대응
\\- **후기 및 평점**
  \\- 항목: 사용자가 직접 작성한 후기 및 평점
  \\- 목적: 행사 결과 확인 및 운영 개선 참고

■ 3. 참가자 정보의 공개 및 공유 범위
행사 운영에 필요한 범위에서 참가자 이름, 이메일, 참가자 표시 이름, 선택 키워드, 빙고 보드 구성 정보, 빙고 진행 현황, 키워드 교환 기록, 후기 및 평점이 행사 관리자 또는 승인된 운영자에게 제공될 수 있습니다.
관리자 도구는 참가자 이름, 이메일, 후기, 선택 키워드, 빙고 진행 현황, 키워드 교환 및 상호작용 기록을 CSV 파일로 내보내는 기능을 제공할 수 있습니다.
서비스 화면에서 다른 참가자에게 표시되는 정보가 있는 경우 해당 기능 제공에 필요한 범위에서만 표시됩니다.
행사 운영에 필수적이지 않은 마케팅 활용, 스폰서 제공, 민감정보 처리 등이 필요한 경우에는 별도의 안내와 필요한 절차를 진행해야 합니다.

■ 4. 자유 입력 정보와 민감정보 제한
서비스의 후기, 문의 내용, 행사 목적, 커스텀 키워드와 같은 자유 입력란에는 민감정보, 고유식별정보, 제3자의 개인정보, 공개되어서는 안 되는 정보를 입력하지 않아야 합니다.
기본 행사 참가 흐름은 주민등록번호, 운전면허번호, 여권번호, 외국인등록번호, 결제 카드 원문 정보, 건강·정치·종교·범죄·노동조합 관련 정보 등 민감하거나 고위험인 정보를 의도적으로 수집하지 않습니다.
특정 행사에서 이러한 정보 처리가 필요해지는 경우에는 별도의 검토, 안내, 동의 또는 법적 근거 확인 절차를 거쳐야 합니다.

■ 5. 개인정보의 처리 및 보유 기간
이름, 이메일 주소, 로그인 식별정보, 빙고 표시 이름 등 개인식별이 가능한 정보는 행사 종료 후 **1년 이내** 삭제 또는 익명화하는 것을 기본 운영 기준으로 합니다.
후기 원문과 같이 개인을 다시 식별할 수 있는 자유서술형 정보도 같은 기준으로 삭제 또는 익명화합니다.
반면 행사명, 일정, 장소, 운영팀 정보, 참가자 수, 빙고 완성 수, 키워드 교환 건수, 평균 평점 등 개인을 식별할 수 없도록 익명화되거나 집계된 정보는 행사 아카이브, 운영 통계, 행사 품질 분석을 위해 더 오래 보관할 수 있습니다.
다만 행사 문의 대응, 분쟁 대응, 법령상 보관 의무 이행이 필요한 경우에는 그 목적 달성 시까지 또는 법령상 보관 기간 동안 분리 보관할 수 있습니다.

■ 6. 외부 서비스 사용 및 처리 지원
서비스 운영에는 Google 로그인, Supabase 기반 인증 및 데이터 저장, 이메일 발송 기능이 사용될 수 있습니다.
Google 또는 Supabase와 관련한 개인정보 처리위탁, 제3자 제공, 국외 이전 해당 여부와 세부 내용은 실제 연동 방식, 계약관계, 데이터 저장 위치 확인 후 본 안내 또는 별도 안내에 반영합니다.
확정되지 않은 외부 서비스 이용 내용은 단정하여 고지하지 않습니다.

■ 7. 정보주체의 권리·의무 및 행사방법
정보주체는 개인정보 열람, 정정·삭제, 처리정지 등을 요청할 수 있습니다.
행사 참가 흐름과 관련한 권리 행사는 **{eventTeam}** 또는 **{eventContactEmail}**로 요청할 수 있으며, 법령에서 정한 사유가 없는 한 지체 없이 처리합니다.

■ 8. 개인정보의 파기 절차 및 방법
보유기간 경과, 처리 목적 달성 등으로 개인정보가 불필요해진 경우 지체 없이 파기합니다.
전자적 파일은 복구 또는 재생되지 않도록 안전한 기술적 방법으로 삭제하고, 출력물은 분쇄 또는 소각 등으로 파기합니다.

■ 9. 안내의 변경
행사 운영 구조, 보유기간, 처리 지원 방식, 문의처가 바뀌는 경우 행사 페이지 또는 별도 공지를 통해 최신 내용을 안내합니다."""

DEFAULT_PLATFORM_POLICY_TEMPLATE = """# 플랫폼 개인정보처리방침

DevFactory 서비스 운영팀은 가짜연구소에서 시작된 사이드프로젝트 팀으로, Bingo Networking 서비스와 관리자 도구를 운영합니다.
본 방침은 관리자 신청, 관리자/운영자 계정, 공개 랜딩 페이지, 서비스 운영과 보안 대응 과정에서 처리되는 개인정보에 적용됩니다.
개별 행사 참가자 개인정보 처리에 관한 내용은 각 행사 페이지에서 별도로 제공되는 **행사 참가자 개인정보 처리 안내**를 우선 확인해 주세요.
서비스 운영팀은 현재 행사 운영, 참가자 식별, 빙고 진행, 관리자 도구 제공, 문의 대응과 보안 대응에 필요한 범위에서 개인정보를 처리합니다.
향후 실험 플랫폼, 데이터 분석, 추천, 연구/통계, 고도화된 리포트 기능이 도입되는 경우, 개인을 식별할 수 있는 정보의 추가 처리 여부, 처리 목적, 처리 항목, 보유기간, 제3자 제공 또는 처리위탁 여부를 별도로 안내하고 필요한 동의 또는 법적 근거를 확인합니다.
개인을 식별할 수 없도록 익명화되거나 집계된 통계 정보는 서비스 품질 개선, 행사 운영 리포트, 기능 개선 검토를 위해 활용될 수 있습니다.

■ 1. 개인정보 처리 주체 및 적용 범위
본 방침의 개인정보 처리 및 문의 주체는 **{platformHost}**입니다.
본 방침은 행사 개설 문의, 관리자/운영자 계정 생성 및 로그인, 서비스 운영과 보안 대응, 고객 문의 처리 흐름에 적용됩니다.
개별 행사 참가자의 이름, 이메일, 빙고 기록 등은 기본적으로 해당 행사 주최자 또는 운영팀의 안내에 따라 처리되며, DevFactory 서비스 운영팀은 서비스 제공과 지원에 필요한 범위에서만 접근할 수 있습니다.

■ 2. 처리하는 개인정보 항목과 목적
\\- **행사 개설 문의 및 관리자 신청**
  \\- 항목: 이름, 이메일 주소, 소속, 행사명, 행사 목적, 예상 일정, 예상 참가자 수, 사용자가 추가로 입력한 문의 내용
  \\- 목적: 행사 개설 요청 검토, 답변, 관리자 권한 부여 여부 판단
\\- **관리자 및 운영자 계정 관리**
  \\- 항목: 이름, 이메일 주소, 로그인 식별정보, 권한, 최근 접속 시각, 관리자 세션 정보
  \\- 목적: 관리자 인증, 권한 제어, 운영 이력 확인, 보안 대응
\\- **서비스 운영 및 지원**
  \\- 항목: 서비스 이용 로그, 장애 대응 기록, 행사 설정 정보, 행사 참가 데이터에 대한 최소한의 운영 메타데이터
  \\- 목적: 서비스 제공, 장애 분석, 보안 대응, 고객 지원
\\- **Google 로그인 사용 시**
  \\- 항목: Google 계정 식별자, 이메일 주소, 프로필 정보 중 서비스가 실제 제공받는 항목
  \\- 목적: 이용자 인증, 행사 참가자 또는 관리자 계정 연결
\\- **브라우저 저장 정보**
  \\- 항목: sessionStorage에 저장되는 참가자 세션 정보, 관리자 세션 정보, Supabase 인증 세션, localStorage에 저장되는 최근 사용 계정 이름과 로그인 ID
  \\- 목적: 로그인 상태 유지, 재방문 편의 제공, 중복 로그인 방지

■ 3. 행사 참가 데이터 접근 및 공유 범위
행사 운영에 필요한 범위에서 행사 관리자 또는 승인된 운영자는 참가자 이름, 이메일, 선택 키워드, 빙고 보드 구성 정보, 빙고 진행 현황, 키워드 교환 기록, 후기 및 평점, 집계 분석 결과를 확인할 수 있습니다.
관리자 도구는 참가자 이름, 이메일, 후기, 선택 키워드, 빙고 진행 현황, 키워드 교환 및 상호작용 기록을 CSV 파일로 내보내는 기능을 제공할 수 있습니다.
외부 행사 주최자나 스폰서가 참가자 식별 데이터를 독립적인 목적에 사용하거나 제공받는 경우에는 별도의 안내와 필요한 절차를 진행해야 합니다.

■ 4. 자유 입력 정보와 민감정보 제한
서비스의 후기, 문의 내용, 행사 목적, 키워드와 같은 자유 입력란에는 민감정보, 고유식별정보, 제3자의 개인정보, 공개되어서는 안 되는 정보를 입력하지 않아야 합니다.
기본 서비스는 주민등록번호, 운전면허번호, 여권번호, 외국인등록번호, 결제 카드 원문 정보, 건강·정치·종교·범죄·노동조합 관련 정보 등 민감하거나 고위험인 정보를 의도적으로 수집하지 않습니다.
특정 행사에서 이러한 정보 처리가 필요해지는 경우에는 별도의 검토, 안내, 동의 또는 법적 근거 확인 절차를 거쳐야 합니다.

■ 5. 개인정보의 처리 및 보유 기간
행사 개설 문의 및 관리자 신청 정보는 검토 완료 후 **1년 이내** 파기하는 것을 기본으로 합니다.
관리자 및 운영자 계정 정보는 계정이 활성 상태인 동안 보관하고, 계정 종료 또는 권한 회수 후 **1년 이내** 파기 또는 분리 보관하는 것을 기본으로 합니다.
개별 행사 참가자 데이터는 각 행사 안내에서 정한 보유기간과 행사 운영 기준에 따르며, DevFactory 서비스 운영팀이 직접 별도 목적으로 장기 보관하지 않습니다.
브라우저에 저장되는 최근 사용 계정 정보는 편의 기능 제공을 위해 최대 30일 동안 보관될 수 있으며, 이용자가 브라우저 저장소를 삭제하면 함께 삭제됩니다.
법령상 보관 의무, 분쟁 대응, 보안 사고 조사에 필요한 경우에는 해당 목적 달성 시까지 또는 법령상 보관 기간 동안 분리 보관할 수 있습니다.

■ 6. 개인정보의 제3자 제공
서비스 운영팀은 개인정보를 정보주체에게 안내한 목적 범위 내에서 처리하며, 별도 동의가 필요한 제3자 제공이 발생하는 경우 제공받는 자, 제공 목적, 제공 항목, 보유 및 이용 기간을 별도로 안내합니다.
개별 행사 참가자 정보가 행사 관리자에게 제공되는 범위는 각 행사별 참가자 개인정보 처리 안내에서 확인할 수 있습니다.

■ 7. 외부 서비스 사용 및 처리 지원
서비스 운영에는 Google 로그인, Supabase 기반 인증 및 데이터 저장, 이메일 발송 기능이 사용될 수 있습니다.
Google 또는 Supabase와 관련한 개인정보 처리위탁, 제3자 제공, 국외 이전 해당 여부와 세부 내용은 실제 연동 방식, 계약관계, 데이터 저장 위치 확인 후 본 방침 또는 별도 안내에 반영합니다.
확정되지 않은 외부 서비스 이용 내용은 단정하여 고지하지 않습니다.

■ 8. 정보주체의 권리·의무 및 행사방법
정보주체는 개인정보 열람, 정정·삭제, 처리정지 등을 요청할 수 있습니다.
플랫폼 개인정보 보호 관련 문의, 열람청구, 정정·삭제 요구는 **{platformContactEmail}**로 할 수 있으며, 법령에서 정한 사유가 없는 한 지체 없이 처리합니다.

■ 9. 개인정보의 파기 절차 및 방법
보유기간 경과, 처리 목적 달성 등으로 개인정보가 불필요해진 경우 지체 없이 파기합니다.
전자적 파일은 복구 또는 재생되지 않도록 안전한 기술적 방법으로 삭제하고, 출력물은 분쇄 또는 소각 등으로 파기합니다.

■ 10. 개인정보의 안전성 확보조치
개인정보 접근 권한 관리, 인증정보 보호, 접속 통제, 로그 관리 등 합리적인 보안 조치를 적용합니다.
운영상 필요한 경우 보안 조치는 서비스 구조와 위험 수준에 맞추어 추가 또는 조정될 수 있습니다.

■ 11. 개인정보처리방침의 변경
본 방침은 법령, 서비스 기능, 운영 구조 변경에 따라 수정될 수 있습니다.
중요한 변경이 있는 경우 시행 전에 서비스 화면, 공지사항 또는 공개 정책 페이지를 통해 안내합니다."""

DEFAULT_TEMPLATE_BY_KEY = {
    PARTICIPANT_PRIVACY_NOTICE_TEMPLATE_KEY: DEFAULT_CONSENT_POLICY_TEMPLATE,
    PLATFORM_PRIVACY_TEMPLATE_KEY: DEFAULT_PLATFORM_POLICY_TEMPLATE,
}

BUILTIN_TEMPLATE_REVISIONS = {
    PARTICIPANT_PRIVACY_NOTICE_TEMPLATE_KEY: (
        LEGACY_CONSENT_POLICY_TEMPLATE.strip(),
        PREVIOUS_DEFAULT_CONSENT_POLICY_TEMPLATE.strip(),
        PREVIOUS_DEFAULT_PARTICIPANT_NOTICE_TEMPLATE.strip(),
        PREVIOUS_PUBLIC_EVENT_PRIVACY_NOTICE_TEMPLATE.strip(),
        DEFAULT_CONSENT_POLICY_TEMPLATE.strip(),
    ),
    PLATFORM_PRIVACY_TEMPLATE_KEY: (
        PREVIOUS_DEFAULT_PLATFORM_POLICY_TEMPLATE.strip(),
        DEFAULT_PLATFORM_POLICY_TEMPLATE.strip(),
    ),
}


def _builtin_policy_templates(template_key: Optional[str] = None) -> tuple[str, ...]:
    if template_key is None:
        builtins: list[str] = []
        for revisions in BUILTIN_TEMPLATE_REVISIONS.values():
            builtins.extend(revisions)
        return tuple(builtins)

    return BUILTIN_TEMPLATE_REVISIONS.get(
        template_key,
        (DEFAULT_TEMPLATE_BY_KEY[template_key].strip(),),
    )


class PolicyTemplate(Base):
    __tablename__ = "policy_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    template_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    updated_by_admin_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("admins.id"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(KST),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(KST),
        onupdate=lambda: datetime.now(KST),
        nullable=False,
    )

    @classmethod
    async def get_by_key(
        cls,
        session: AsyncSession,
        template_key: str,
    ) -> Optional["PolicyTemplate"]:
        result = await session.execute(select(cls).where(cls.template_key == template_key))
        return result.scalar_one_or_none()

    @classmethod
    async def ensure_template(
        cls,
        session: AsyncSession,
        template_key: str,
    ) -> "PolicyTemplate":
        default_content = DEFAULT_TEMPLATE_BY_KEY[template_key]
        existing = await cls.get_by_key(session, template_key)
        if existing:
            normalized_content = existing.content_markdown.strip()
            if (
                normalized_content in _builtin_policy_templates(template_key)
                and normalized_content != default_content.strip()
            ):
                existing.content_markdown = default_content
                await session.commit()
                await session.refresh(existing)
            return existing

        template = cls(
            template_key=template_key,
            content_markdown=default_content,
        )
        session.add(template)
        await session.commit()
        await session.refresh(template)
        return template

    @classmethod
    async def ensure_consent_template(cls, session: AsyncSession) -> "PolicyTemplate":
        return await cls.ensure_template(session, PARTICIPANT_PRIVACY_NOTICE_TEMPLATE_KEY)

    @classmethod
    async def ensure_platform_policy_template(cls, session: AsyncSession) -> "PolicyTemplate":
        return await cls.ensure_template(session, PLATFORM_PRIVACY_TEMPLATE_KEY)

    @classmethod
    async def update_template(
        cls,
        session: AsyncSession,
        *,
        template_key: str,
        content_markdown: str,
        updated_by_admin_id: int,
    ) -> "PolicyTemplate":
        template = await cls.ensure_template(session, template_key)
        template.content_markdown = content_markdown.strip()
        template.updated_by_admin_id = updated_by_admin_id
        await session.commit()
        await session.refresh(template)
        return template

    @classmethod
    async def update_consent_template(
        cls,
        session: AsyncSession,
        *,
        content_markdown: str,
        updated_by_admin_id: int,
    ) -> "PolicyTemplate":
        return await cls.update_template(
            session,
            template_key=PARTICIPANT_PRIVACY_NOTICE_TEMPLATE_KEY,
            content_markdown=content_markdown,
            updated_by_admin_id=updated_by_admin_id,
        )

    @staticmethod
    def interpolate_content(content_markdown: str, variables: dict[str, str]) -> str:
        def replace_placeholder(match: re.Match[str]) -> str:
            key = match.group(1)
            value = variables.get(key)
            return value if value else match.group(0)

        return PLACEHOLDER_PATTERN.sub(replace_placeholder, content_markdown).strip()

    @classmethod
    def render_participant_notice_content(
        cls,
        content_markdown: str,
        *,
        event_name: str,
        event_team: str,
        event_contact_email: str,
    ) -> str:
        return cls.interpolate_content(
            content_markdown,
            {
                "eventName": event_name.strip() or "이 행사",
                "eventTeam": event_team.strip() or "행사 운영팀",
                "host": event_team.strip() or "행사 운영팀",
                "eventContactEmail": event_contact_email.strip() or DEFAULT_PLATFORM_CONTACT_EMAIL,
                "platformHost": DEFAULT_PLATFORM_HOST,
                "platformContactEmail": DEFAULT_PLATFORM_CONTACT_EMAIL,
                "platformPrivacyPath": DEFAULT_PLATFORM_PRIVACY_PATH,
            },
        )

    @classmethod
    def render_platform_policy_content(cls, content_markdown: str) -> str:
        return cls.interpolate_content(
            content_markdown,
            {
                "platformHost": DEFAULT_PLATFORM_HOST,
                "platformContactEmail": DEFAULT_PLATFORM_CONTACT_EMAIL,
                "platformPrivacyPath": DEFAULT_PLATFORM_PRIVACY_PATH,
            },
        )

    @staticmethod
    def is_builtin_template_content(content_markdown: str) -> bool:
        return content_markdown.strip() in _builtin_policy_templates()

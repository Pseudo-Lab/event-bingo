from models.policy_template import (
    DEFAULT_CONSENT_POLICY_TEMPLATE,
    DEFAULT_PLATFORM_POLICY_TEMPLATE,
    LEGACY_CONSENT_POLICY_TEMPLATE,
    PREVIOUS_DEFAULT_CONSENT_POLICY_TEMPLATE,
    PREVIOUS_PUBLIC_EVENT_PRIVACY_NOTICE_TEMPLATE,
    PolicyTemplate,
)


def test_builtin_policy_template_detector_accepts_known_builtin_revisions():
    assert PolicyTemplate.is_builtin_template_content(LEGACY_CONSENT_POLICY_TEMPLATE)
    assert PolicyTemplate.is_builtin_template_content(PREVIOUS_DEFAULT_CONSENT_POLICY_TEMPLATE)
    assert PolicyTemplate.is_builtin_template_content(PREVIOUS_PUBLIC_EVENT_PRIVACY_NOTICE_TEMPLATE)
    assert PolicyTemplate.is_builtin_template_content(DEFAULT_CONSENT_POLICY_TEMPLATE)
    assert PolicyTemplate.is_builtin_template_content(DEFAULT_PLATFORM_POLICY_TEMPLATE)


def test_builtin_policy_template_detector_rejects_customized_policy_content():
    customized_policy = DEFAULT_CONSENT_POLICY_TEMPLATE.replace(
        "행사 종료 후 **1년 이내**",
        "행사 종료 후 **6개월 이내**",
    )

    assert not PolicyTemplate.is_builtin_template_content(customized_policy)


def test_default_policy_template_uses_one_year_identifier_retention_rule():
    assert "개인식별이 가능한 정보" in DEFAULT_CONSENT_POLICY_TEMPLATE
    assert "행사 종료 후 **1년 이내**" in DEFAULT_CONSENT_POLICY_TEMPLATE
    assert "익명화되거나 집계된 정보" in DEFAULT_CONSENT_POLICY_TEMPLATE
    assert "CSV 파일로 내보내는 기능" in DEFAULT_CONSENT_POLICY_TEMPLATE
    assert "빙고 보드 구성 정보" in DEFAULT_CONSENT_POLICY_TEMPLATE
    assert "민감정보, 고유식별정보, 제3자의 개인정보" in DEFAULT_CONSENT_POLICY_TEMPLATE


def test_platform_policy_template_marks_devfactory_scope_separately():
    assert "DevFactory 서비스 운영팀" in DEFAULT_PLATFORM_POLICY_TEMPLATE
    assert "개별 행사 참가자 개인정보 처리" in DEFAULT_PLATFORM_POLICY_TEMPLATE
    assert "행사 개설 문의" in DEFAULT_PLATFORM_POLICY_TEMPLATE
    assert "브라우저 저장 정보" in DEFAULT_PLATFORM_POLICY_TEMPLATE
    assert "빙고 보드 구성 정보" in DEFAULT_PLATFORM_POLICY_TEMPLATE
    assert "키워드 교환 및 상호작용 기록" in DEFAULT_PLATFORM_POLICY_TEMPLATE
    assert "CSV 파일로 내보내는 기능" in DEFAULT_PLATFORM_POLICY_TEMPLATE
    assert "[SMTP 이메일 발송 사업자명]" not in DEFAULT_PLATFORM_POLICY_TEMPLATE
